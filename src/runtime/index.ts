import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { createMcpAdapter, HTTP_METHODS } from '../adapters/mcp';
import { withPaymentRequirement } from '../payment/index';
import {
  type HttpHandlerDefinition,
  type InternalToolDefinition,
  type McpConfig,
  type ToolResponse,
} from '../types/index';
import { Metadata, Tool } from '../types/metadata';

interface AdapterEntry {
  tool: InternalToolDefinition;
  invoke: (params: unknown) => Promise<ToolResponse>;
}

/**
 * Create local development server for MCP tooling.
 */
export function createDevServer(tools: InternalToolDefinition[]): Server {
  const metadata = loadMetadata();
  const metadataMap = buildMetadataMap(metadata);

  const adapters = buildAdapters(tools);

  const server = new Server(
    {
      name: 'opentool-dev',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: adapters.map(({ tool }) => serializeTool(tool, metadataMap)),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const entry = adapters.find(({ tool }) => {
      const toolName = tool.metadata?.name || tool.filename;
      return toolName === request.params.name;
    });

    if (!entry) {
      throw new Error(`Tool ${request.params.name} not found or not MCP-enabled`);
    }

    try {
      return (await entry.invoke(request.params.arguments)) as any;
    } catch (error) {
      const message = (error && (error as Error).message) || String(error);
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      } as any;
    }
  });

  return server;
}

/**
 * Create stdio server for use with AWS Lambda MCP Adapter
 */
export async function createStdioServer(tools?: InternalToolDefinition[]): Promise<void> {
  const metadata = loadMetadata();
  const metadataMap = buildMetadataMap(metadata);
  const toolDefinitions = tools || (await loadToolsFromDirectory(metadataMap));
  const adapters = buildAdapters(toolDefinitions);

  const server = new Server(
    {
      name: 'opentool-runtime',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: adapters.map(({ tool }) => serializeTool(tool, metadataMap)),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const entry = adapters.find(({ tool }) => {
      const toolName = tool.metadata?.name || tool.filename;
      return toolName === request.params.name;
    });

    if (!entry) {
      throw new Error(`Tool ${request.params.name} not found or not MCP-enabled`);
    }

    try {
      return (await entry.invoke(request.params.arguments)) as any;
    } catch (error) {
      const message = (error && (error as Error).message) || String(error);
      return {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      } as any;
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP stdio server started');
}

function buildAdapters(tools: InternalToolDefinition[]): AdapterEntry[] {
  return tools
    .filter((tool) => isMcpEnabled(tool))
    .map((tool) => {
      const httpHandlers = toHttpHandlerMap(tool.httpHandlers);
      const adapterOptions = {
        name: tool.metadata?.name || tool.filename,
        httpHandlers,
        ...(tool.schema ? { schema: tool.schema } : {}),
        ...(tool.legacyTool ? { legacyTool: tool.legacyTool } : {}),
        ...(tool.mcpConfig?.defaultMethod
          ? { defaultMethod: tool.mcpConfig.defaultMethod }
          : {}),
      };
      const adapter = createMcpAdapter(adapterOptions);

      return {
        tool,
        invoke: adapter,
      };
    });
}

/**
 * Load tools from tools directory
 */
async function loadToolsFromDirectory(metadataMap: Map<string, Tool>): Promise<InternalToolDefinition[]> {
  const tools: InternalToolDefinition[] = [];
  const toolsDir = path.join(process.cwd(), 'tools');
  if (!fs.existsSync(toolsDir)) {
    return tools;
  }

  const files = fs.readdirSync(toolsDir);
  for (const file of files) {
    if (!isSupportedToolFile(file)) {
      continue;
    }

    const toolPath = path.join(toolsDir, file);
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const exportsObject = require(toolPath);
      const candidate = resolveModuleCandidate(exportsObject);
      if (!candidate?.schema) {
        continue;
      }

      const baseName = file.replace(/\.[^.]+$/, '');
      const name = candidate.metadata?.name || baseName;
      const meta = metadataMap.get(name);

      let inputSchema = meta?.inputSchema;
      if (!inputSchema) {
        try {
          inputSchema = zodToJsonSchema(candidate.schema, {
            name: `${name}Schema`,
            target: 'jsonSchema7',
            $refStrategy: 'none',
          });
        } catch (error) {
          inputSchema = { type: 'object' };
        }
      }
      inputSchema = normalizeInputSchema(inputSchema);

      const payment = candidate.payment ?? null;
      const httpHandlersRaw = collectHttpHandlers(candidate);
      const httpHandlers = [...httpHandlersRaw];
      let legacyTool =
        typeof candidate.TOOL === 'function' ? wrapLegacyTool(candidate.TOOL.bind(candidate)) : undefined;

      if (httpHandlers.length === 0 && legacyTool) {
        httpHandlers.push({
          method: 'POST',
          handler: synthesizeHttpHandlerFromLegacy(legacyTool, candidate.schema),
        });
      }

      if (httpHandlers.length === 0 && !legacyTool) {
        continue;
      }

      if (payment) {
        for (let index = 0; index < httpHandlers.length; index += 1) {
          const entry = httpHandlers[index];
          httpHandlers[index] = {
            ...entry,
            handler: withPaymentRequirement(entry.handler, payment),
          };
        }
      }

      const mcpConfig = normalizeRuntimeMcpConfig(candidate.mcp, legacyTool);
      const adapterOptions = {
        name,
        httpHandlers: toHttpHandlerMap(httpHandlers),
        ...(candidate.schema ? { schema: candidate.schema } : {}),
        ...(legacyTool ? { legacyTool } : {}),
        ...(typeof candidate.mcp?.defaultMethod === 'string'
          ? { defaultMethod: candidate.mcp.defaultMethod }
          : {}),
      };
      const adapter = createMcpAdapter(adapterOptions);

      const tool: InternalToolDefinition = {
        ...(candidate.schema ? { schema: candidate.schema } : {}),
        inputSchema,
        metadata: candidate.metadata || meta || null,
        filename: baseName,
        httpHandlers,
        ...(legacyTool ? { legacyTool } : {}),
        mcpConfig,
        handler: async (params) => adapter(params),
        payment,
      };
      tools.push(tool);
    } catch (error) {
      console.warn(`Failed to load tool from ${file}: ${error}`);
    }
  }

  return tools;
}

function loadMetadata(): Metadata | null {
  const metadataPath = path.join(process.cwd(), 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    return null;
  }
  try {
    const contents = fs.readFileSync(metadataPath, 'utf8');
    return JSON.parse(contents) as Metadata;
  } catch (error) {
    console.warn(`Failed to parse metadata.json: ${error}`);
    return null;
  }
}

function buildMetadataMap(metadata: Metadata | null): Map<string, Tool> {
  const map = new Map<string, Tool>();
  if (!metadata?.tools) {
    return map;
  }
  metadata.tools.forEach((tool) => {
    map.set(tool.name, tool);
  });
  return map;
}

function serializeTool(tool: InternalToolDefinition, metadataMap: Map<string, Tool>) {
  const name = tool.metadata?.name || tool.filename;
  const meta = metadataMap.get(name);
  return {
    name,
    description: meta?.description || tool.metadata?.description || `${tool.filename} tool`,
    inputSchema: meta?.inputSchema || tool.inputSchema,
    annotations: meta?.annotations || tool.metadata?.annotations,
    payment: meta?.payment || tool.metadata?.payment,
    discovery: meta?.discovery || tool.metadata?.discovery,
  };
}

function isSupportedToolFile(file: string): boolean {
  return /\.(cjs|mjs|js|ts)$/i.test(file);
}

function resolveModuleCandidate(exportsObject: any): any {
  if (!exportsObject) {
    return null;
  }
  if (exportsObject.schema) {
    return exportsObject;
  }
  if (exportsObject.default && exportsObject.default.schema) {
    return exportsObject.default;
  }
  return exportsObject;
}

function collectHttpHandlers(module: any): HttpHandlerDefinition[] {
  const handlers: HttpHandlerDefinition[] = [];
  HTTP_METHODS.forEach((method) => {
    const handler = module?.[method];
    if (typeof handler === 'function') {
      handlers.push({
        method,
        handler: async (request: Request) => handler.call(module, request),
      });
    }
  });
  return handlers;
}

function synthesizeHttpHandlerFromLegacy(
  legacyTool: (params: unknown) => Promise<ToolResponse>,
  schema: any
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    let payload: unknown = {};

    if (request.method === 'GET' || request.method === 'HEAD') {
      const url = new URL(request.url);
      payload = Object.fromEntries(url.searchParams.entries());
    } else {
      const text = await request.text();
      if (text) {
        try {
          payload = JSON.parse(text);
        } catch {
          payload = { raw: text };
        }
      }
    }

    const validated = schema ? schema.parse(payload) : payload;
    const responsePayload = await legacyTool(validated);
    const normalized = normalizeToolResult(responsePayload);
    const status = normalized.isError ? 400 : 200;

    return new Response(JSON.stringify(normalized), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

function wrapLegacyTool(
  toolFn: (params: unknown) => Promise<unknown> | unknown
): (params: unknown) => Promise<ToolResponse> {
  return async (params: unknown) => {
    const result = await toolFn(params);
    return normalizeToolResult(result);
  };
}

function normalizeToolResult(result: unknown): ToolResponse {
  if (typeof result === 'string') {
    return {
      content: [{ type: 'text', text: result }],
      isError: false,
    };
  }

  if (result && typeof result === 'object' && Array.isArray((result as any).content)) {
    const toolResponse = result as ToolResponse;
    return {
      content: toolResponse.content,
      isError: toolResponse.isError ?? false,
    };
  }

  if (result === undefined || result === null) {
    return {
      content: [{ type: 'text', text: '' }],
      isError: false,
    };
  }

  return {
    content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
    isError: false,
  };
}

function toHttpHandlerMap(handlers: HttpHandlerDefinition[]): Record<string, HttpHandlerDefinition['handler']> {
  return handlers.reduce<Record<string, HttpHandlerDefinition['handler']>>((acc, handler) => {
    acc[handler.method.toUpperCase()] = handler.handler;
    return acc;
  }, {});
}

function normalizeInputSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const clone = JSON.parse(JSON.stringify(schema));

  if (typeof clone.$ref === 'string' && clone.$ref.startsWith('#/definitions/')) {
    const refKey = clone.$ref.replace('#/definitions/', '');
    if (clone.definitions && typeof clone.definitions[refKey] === 'object') {
      return normalizeInputSchema(clone.definitions[refKey]);
    }
  }

  delete clone.$ref;
  delete clone.definitions;

  if (!clone.type) {
    clone.type = 'object';
  }

  return clone;
}

function normalizeRuntimeMcpConfig(
  rawConfig: any,
  legacyTool?: (params: unknown) => Promise<ToolResponse>
): McpConfig | null {
  if (isPlainObject(rawConfig) && rawConfig.enabled === true) {
    let normalizedMode: McpConfig['mode'] | undefined;
    if (typeof rawConfig.mode === 'string') {
      const candidate = rawConfig.mode.toLowerCase();
      if (candidate === 'stdio' || candidate === 'lambda' || candidate === 'dual') {
        normalizedMode = candidate as McpConfig['mode'];
      } else {
        throw new Error('mcp.mode must be one of "stdio", "lambda", or "dual"');
      }
    }
    const metadataOverrides = isPlainObject(rawConfig.metadataOverrides)
      ? rawConfig.metadataOverrides
      : undefined;
    const config: McpConfig = { enabled: true };

    if (normalizedMode) {
      config.mode = normalizedMode;
    }

    if (typeof rawConfig.defaultMethod === 'string') {
      config.defaultMethod = rawConfig.defaultMethod.toUpperCase();
    }

    if (metadataOverrides) {
      config.metadataOverrides = metadataOverrides;
    }

    return config;
  }

  if (legacyTool) {
    return { enabled: true, mode: 'stdio' };
  }

  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMcpEnabled(tool: InternalToolDefinition): boolean {
  return Boolean(tool.mcpConfig?.enabled || tool.legacyTool);
}

export function resolveRuntimePath(value: string): string {
  if (value.startsWith('file://')) {
    return fileURLToPath(value);
  }
  return path.resolve(value);
}

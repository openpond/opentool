import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { InternalToolDefinition } from '../types';
import { Metadata, Tool } from '../types/metadata';

/**
 * Create local development server
 */
export function createDevServer(tools: InternalToolDefinition[]): Server {
  const metadata = loadMetadata();
  const metadataMap = buildMetadataMap(metadata);

  const server = new Server({
    name: 'opentool-dev',
    version: '1.0.0',
  }, {
    capabilities: {
      tools: {},
    },
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(tool => serializeTool(tool, metadataMap)),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find(t => {
      const toolName = t.metadata?.name || t.filename;
      return toolName === request.params.name;
    });

    if (!tool) {
      throw new Error(`Tool ${request.params.name} not found`);
    }

    try {
      const validatedParams = tool.schema.parse(request.params.arguments);
      const result = await tool.handler(validatedParams);
      return {
        content: result.content,
        isError: result.isError || false,
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error}` }],
        isError: true,
      };
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
  const toolDefinitions = tools || await loadToolsFromDirectory(metadataMap);

  const server = new Server({
    name: 'opentool-runtime',
    version: '1.0.0',
  }, {
    capabilities: {
      tools: {},
    },
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions.map(tool => serializeTool(tool, metadataMap)),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = toolDefinitions.find(t => {
      const toolName = t.metadata?.name || t.filename;
      return toolName === request.params.name;
    });

    if (!tool) {
      throw new Error(`Tool ${request.params.name} not found`);
    }

    try {
      const validatedParams = tool.schema.parse(request.params.arguments);
      const result = await tool.handler(validatedParams);
      return {
        content: result.content,
        isError: result.isError || false,
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP stdio server started');
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
      const exportsObject = require(toolPath);
      const candidate = exportsObject && exportsObject.schema && exportsObject.TOOL
        ? exportsObject
        : exportsObject?.default;
      if (!candidate?.schema || !candidate?.TOOL) {
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

      const tool: InternalToolDefinition = {
        schema: candidate.schema,
        inputSchema,
        metadata: candidate.metadata || meta || null,
        filename: baseName,
        handler: async (params) => {
          const result = await candidate.TOOL(params);
          if (typeof result === 'string') {
            return {
              content: [{ type: 'text', text: result }],
              isError: false,
            };
          }
          return result;
        },
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

export function resolveRuntimePath(value: string): string {
  if (value.startsWith('file://')) {
    return fileURLToPath(value);
  }
  return path.resolve(value);
}

import * as fs from "fs";
import * as path from "path";
import { z, type ZodSchema } from "zod";
import { zodToJsonSchema, type JsonSchema7Type } from "zod-to-json-schema";
import { createMcpAdapter } from "../adapters/mcp";
import {
  HTTP_METHODS,
  type HttpHandlerDefinition,
  type InternalToolDefinition,
  type McpConfig,
  type ToolResponse,
} from "../types/index";
import { Metadata, ToolMetadataOverrides } from "../types/metadata";
import type { DefinedPayment } from "../payment/index";
import { transpileWithEsbuild } from "../utils/esbuild";
import { importFresh, resolveCompiledPath } from "../utils/module-loader";
import { buildMetadataArtifact } from "./shared/metadata";

export interface ValidateOptions {
  input: string;
}

interface LoadToolsOptions {
  projectRoot?: string;
}

const SUPPORTED_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
];

export async function validateCommand(options: ValidateOptions): Promise<void> {
  console.log("🔍 Validating OpenTool metadata...");
  try {
    const toolsDir = path.resolve(options.input);
    if (!fs.existsSync(toolsDir)) {
      throw new Error(`Tools directory not found: ${toolsDir}`);
    }
    const projectRoot = path.dirname(toolsDir);
    const tools = await loadAndValidateTools(toolsDir, { projectRoot });
    if (tools.length === 0) {
      throw new Error("No valid tools found - metadata validation aborted");
    }

    const { metadata, defaultsApplied, sourceMetadataPath } = await buildMetadataArtifact({
      projectRoot,
      tools,
    });

    logMetadataSummary(metadata, defaultsApplied, sourceMetadataPath);
    console.log("\n✅ Metadata validation passed!\n");
  } catch (error) {
    console.error("❌ Metadata validation failed:", error);
    process.exit(1);
  }
}

export async function validateFullCommand(options: ValidateOptions): Promise<void> {
  console.log("🔍 Running full OpenTool validation...\n");
  try {
    const toolsDir = path.resolve(options.input);
    if (!fs.existsSync(toolsDir)) {
      throw new Error(`Tools directory not found: ${toolsDir}`);
    }
    const projectRoot = path.dirname(toolsDir);
    const tools = await loadAndValidateTools(toolsDir, { projectRoot });
    if (tools.length === 0) {
      throw new Error("No tools discovered in the target directory");
    }

    const names = tools.map((tool) => tool.metadata?.name ?? tool.filename);
    const duplicates = findDuplicates(names);
    if (duplicates.length > 0) {
      throw new Error(`Duplicate tool names found: ${duplicates.join(", ")}`);
    }

    const { metadata, defaultsApplied, sourceMetadataPath } = await buildMetadataArtifact({
      projectRoot,
      tools,
    });

    console.log(`📦 Tools loaded: ${tools.length}`);
    tools.forEach((tool) => {
      const toolName = tool.metadata?.name ?? tool.filename;
      const description = tool.metadata?.description ?? `${toolName} tool`;
      console.log(`  • ${toolName} — ${description}`);
    });

    logMetadataSummary(metadata, defaultsApplied, sourceMetadataPath);
    console.log("\n✅ Full validation completed successfully\n");
  } catch (error) {
    console.error("❌ Full validation failed:", error);
    process.exit(1);
  }
}

export async function loadAndValidateTools(
  toolsDir: string,
  options: LoadToolsOptions = {}
): Promise<InternalToolDefinition[]> {
  const files = fs
    .readdirSync(toolsDir)
    .filter((file) => SUPPORTED_EXTENSIONS.includes(path.extname(file)));

  if (files.length === 0) {
    return [];
  }

  const projectRoot = options.projectRoot ?? path.dirname(toolsDir);
  const tempDir = path.join(toolsDir, ".opentool-temp");
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  const entryPoints = files.map((file) => path.join(toolsDir, file));

  const { outDir, cleanup } = await transpileWithEsbuild({
    entryPoints,
    projectRoot,
    format: "esm",
    outDir: tempDir,
  });

  const tools: InternalToolDefinition[] = [];

  try {
    for (const file of files) {
      const compiledPath = resolveCompiledPath(outDir, file);
      if (!fs.existsSync(compiledPath)) {
        throw new Error(`Failed to compile ${file}`);
      }

      const moduleExports = await importFresh(compiledPath);
      const toolModule = extractToolModule(moduleExports, file);

      const schema = ensureZodSchema(toolModule.schema, file);
      const paymentExport = toolModule.payment as DefinedPayment | undefined;
      const toolName =
        toolModule.metadata?.name ?? toolModule.metadata?.title ?? toBaseName(file);
      const inputSchemaRaw = schema ? toJsonSchema(toolName, schema) : undefined;
      const inputSchema = normalizeInputSchema(inputSchemaRaw);

      const legacyToolRaw =
        typeof toolModule.TOOL === "function" ? toolModule.TOOL.bind(toolModule) : undefined;
      const legacyTool = legacyToolRaw ? wrapLegacyTool(legacyToolRaw) : undefined;

      const httpHandlers = collectHttpHandlers(toolModule, file);
      if (httpHandlers.length === 0 && legacyTool) {
        httpHandlers.push({
          method: "POST",
          handler: synthesizeHttpHandlerFromLegacy(legacyTool, schema),
        });
      }

      if (httpHandlers.length === 0) {
        throw new Error(
          `${file} must export at least one HTTP handler (e.g. POST) or a legacy TOOL function`
        );
      }

      const httpHandlerMap = toHttpHandlerMap(httpHandlers);
      const defaultMethod =
        typeof toolModule.mcp?.defaultMethod === "string"
          ? toolModule.mcp.defaultMethod
          : undefined;

      const adapter = createMcpAdapter({
        name: toolName,
        schema,
        httpHandlers: httpHandlerMap,
        ...(legacyTool ? { legacyTool } : {}),
        ...(defaultMethod ? { defaultMethod } : {}),
      });

      let metadataOverrides: ToolMetadataOverrides | null =
        toolModule.metadata ?? null;

      if (paymentExport?.metadata) {
        if (metadataOverrides) {
          metadataOverrides = {
            ...metadataOverrides,
            payment: metadataOverrides.payment ?? (paymentExport.metadata as any),
            annotations: {
              ...(metadataOverrides.annotations ?? {}),
              requiresPayment:
                metadataOverrides.annotations?.requiresPayment ?? true,
            },
          };
        } else {
          metadataOverrides = {
            payment: paymentExport.metadata as any,
            annotations: { requiresPayment: true },
          } as ToolMetadataOverrides;
        }
      }

      const tool: InternalToolDefinition = {
        schema: schema ?? undefined,
        inputSchema,
        metadata: metadataOverrides,
        httpHandlers,
        ...(legacyTool ? { legacyTool } : {}),
        mcpConfig: normalizeMcpConfig(toolModule.mcp, file),
        filename: toBaseName(file),
        sourcePath: path.join(toolsDir, file),
        handler: async (params: unknown) => adapter(params),
        payment: paymentExport ?? null,
      };

      tools.push(tool);
    }
  } finally {
    cleanup();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  return tools;
}

function extractToolModule(exportsObject: any, filename: string): any {
  const candidates = [exportsObject, exportsObject?.default];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      const hasLegacy = typeof candidate.TOOL === "function";
      const hasSchema = candidate.schema && typeof candidate.schema === "object";
      const hasHttp = HTTP_METHODS.some((method) => typeof candidate[method] === "function");
      if (hasLegacy || hasSchema || hasHttp) {
        return candidate;
      }
    }
  }
  throw new Error(
    `${filename} must export a tool definition. Expected a Zod schema plus either HTTP handlers (export async function POST) or a legacy TOOL function.`
  );
}

function toJsonSchema(name: string, schema?: ZodSchema): JsonSchema7Type | undefined {
  if (!schema) {
    return undefined;
  }
  try {
    return zodToJsonSchema(schema, {
      name: `${name}Schema`,
      target: "jsonSchema7",
      $refStrategy: "none",
    });
  } catch (error) {
    throw new Error(`Failed to convert Zod schema for ${name}: ${error}`);
  }
}

function toBaseName(file: string): string {
  return file.replace(/\.[^.]+$/, "");
}

function ensureZodSchema(schemaCandidate: unknown, filename: string): ZodSchema {
  if (!schemaCandidate) {
    throw new Error(`${filename} must export a Zod schema as "schema"`);
  }

  if (schemaCandidate instanceof z.ZodType) {
    return schemaCandidate as ZodSchema;
  }

  const schema = schemaCandidate as ZodSchema;
  if (typeof (schema as any)?.parse !== "function") {
    throw new Error(`${filename} schema export must be a Zod schema (missing parse method)`);
  }

  return schema;
}

function collectHttpHandlers(module: any, filename: string): HttpHandlerDefinition[] {
  const handlers: HttpHandlerDefinition[] = [];
  for (const method of HTTP_METHODS) {
    const handler = module?.[method];
    if (typeof handler === "function") {
      handlers.push({
        method,
        handler: async (request: Request) => handler.call(module, request),
      });
    }
  }

  // Ensure deterministic ordering
  handlers.sort((a, b) => HTTP_METHODS.indexOf(a.method) - HTTP_METHODS.indexOf(b.method));

  // Warn when duplicate methods detected
  const duplicates = findDuplicates(handlers.map((h) => h.method));
  if (duplicates.length > 0) {
    throw new Error(
      `${filename} exports multiple handlers for HTTP method(s): ${duplicates.join(", ")}`
    );
  }

  return handlers;
}

function synthesizeHttpHandlerFromLegacy(
  legacyTool: (params: unknown) => Promise<ToolResponse>,
  schema?: ZodSchema
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    let payload: unknown = {};

    if (request.method === "GET" || request.method === "HEAD") {
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
      headers: { "Content-Type": "application/json" },
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
  if (typeof result === "string") {
    return {
      content: [{ type: "text", text: result }],
      isError: false,
    };
  }

  if (result && typeof result === "object" && Array.isArray((result as any).content)) {
    const toolResponse = result as ToolResponse;
    return {
      content: toolResponse.content,
      isError: toolResponse.isError ?? false,
    };
  }

  if (result === undefined || result === null) {
    return {
      content: [{ type: "text", text: "" }],
      isError: false,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
      },
    ],
    isError: false,
  };
}

function toHttpHandlerMap(handlers: HttpHandlerDefinition[]): Record<string, HttpHandlerDefinition["handler"]> {
  return handlers.reduce<Record<string, HttpHandlerDefinition["handler"]>>((acc, handler) => {
    acc[handler.method.toUpperCase()] = handler.handler;
    return acc;
  }, {});
}

function normalizeInputSchema(
  schema: JsonSchema7Type | undefined
): JsonSchema7Type | undefined {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  const clone = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;

  if (typeof clone.$ref === "string" && clone.$ref.startsWith("#/definitions/")) {
    const refName = clone.$ref.replace("#/definitions/", "");
    const definitions = clone.definitions as Record<string, unknown> | undefined;
    if (definitions && typeof definitions[refName] === "object") {
      return normalizeInputSchema(definitions[refName] as JsonSchema7Type);
    }
  }

  delete clone.$ref;
  delete clone.definitions;

  if (!("type" in clone)) {
    clone.type = "object";
  }

  return clone as JsonSchema7Type;
}

function normalizeMcpConfig(rawConfig: unknown, filename: string): McpConfig | null {
  if (rawConfig == null) {
    return null;
  }

  if (rawConfig === false) {
    return null;
  }

  if (rawConfig === true) {
    return { enabled: true };
  }

  if (!isPlainObject(rawConfig)) {
    throw new Error(`${filename} export \\"mcp\\" must be an object with an enabled flag`);
  }

  const enabledRaw = (rawConfig as Record<string, unknown>).enabled;
  if (enabledRaw === false) {
    return null;
  }

  if (enabledRaw !== true) {
    throw new Error(`${filename} mcp.enabled must be explicitly set to true to opt-in to MCP`);
  }

  const modeRaw = (rawConfig as Record<string, unknown>).mode;
  let mode: McpConfig["mode"] | undefined;
  if (typeof modeRaw === "string") {
    const normalized = modeRaw.toLowerCase();
    if (["stdio", "lambda", "dual"].includes(normalized)) {
      mode = normalized as McpConfig["mode"];
    } else {
      throw new Error(
        `${filename} mcp.mode must be one of \"stdio\", \"lambda\", or \"dual\" if specified`
      );
    }
  }

  const defaultMethodRaw = (rawConfig as Record<string, unknown>).defaultMethod;
  const defaultMethod =
    typeof defaultMethodRaw === "string" ? defaultMethodRaw.toUpperCase() : undefined;

  const overridesRaw = (rawConfig as Record<string, unknown>).metadataOverrides;
  const metadataOverrides = isPlainObject(overridesRaw)
    ? (overridesRaw as Partial<ToolMetadataOverrides>)
    : undefined;

  const config: McpConfig = {
    enabled: true,
  };

  if (mode) {
    config.mode = mode;
  }

  if (defaultMethod) {
    config.defaultMethod = defaultMethod;
  }

  if (metadataOverrides) {
    config.metadataOverrides = metadataOverrides;
  }

  return config;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findDuplicates(values: string[]): string[] {
  const seen = new Map<string, number>();
  const duplicates = new Set<string>();
  values.forEach((value) => {
    const count = seen.get(value) ?? 0;
    seen.set(value, count + 1);
    if (count >= 1) {
      duplicates.add(value);
    }
  });
  return Array.from(duplicates.values());
}

function logMetadataSummary(
  metadata: Metadata,
  defaultsApplied: string[],
  sourceMetadataPath: string
): void {
  console.log(`📄 metadata loaded from ${sourceMetadataPath}`);
  console.log("\n📊 Metadata Summary:");
  console.log(`  • Name: ${metadata.name}`);
  console.log(`  • Display Name: ${metadata.displayName}`);
  console.log(`  • Version: ${metadata.version}`);
  console.log(`  • Category: ${metadata.category}`);
  console.log(`  • Tools: ${metadata.tools.length}`);
  console.log(`  • Spec Version: ${metadata.metadataSpecVersion}`);
  if (metadata.payment) {
    console.log(`  • Payment: $${metadata.payment.amountUSDC} USDC`);
  }
  if (defaultsApplied.length > 0) {
    console.log("\nDefaults applied during metadata synthesis:");
    defaultsApplied.forEach((entry) => console.log(`  • ${entry}`));
  }
}

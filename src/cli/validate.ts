import * as fs from "fs";
import * as path from "path";
import { z, type ZodSchema } from "zod";
import { zodToJsonSchema, type JsonSchema7Type } from "@alcyone-labs/zod-to-json-schema";
import { createMcpAdapter } from "../adapters/mcp";
import {
  HTTP_METHODS,
  type HttpHandlerDefinition,
  type InternalToolDefinition,
  type McpConfig,
  type NormalizedSchedule,
} from "../types/index";
import { Metadata, ToolMetadataOverrides } from "../types/metadata";
import { withX402Payment, type X402Payment } from "../x402/index";
import { transpileWithEsbuild } from "../utils/esbuild";
import { importFresh, resolveCompiledPath } from "../utils/module-loader";
import { buildMetadataArtifact } from "./shared/metadata";
import { normalizeScheduleExpression } from "../utils/schedule";

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
  // Enforce kebab-case filenames (tool key = filename)
  const kebabCase = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z]+$/;
  for (const f of files) {
    if (!kebabCase.test(f)) {
      throw new Error(`Tool filename must be kebab-case: ${f}`);
    }
  }

  const entryPoints = files.map((file) => path.join(toolsDir, file));

  const { outDir, cleanup } = await transpileWithEsbuild({
    entryPoints,
    projectRoot,
    format: "esm",
    outDir: tempDir,
    bundle: true,
    external: ["opentool", "opentool/*"],
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
      const paymentExport = toolModule.payment as X402Payment | undefined;
      const toolName =
        toolModule.metadata?.name ?? toolModule.metadata?.title ?? toBaseName(file);
      const inputSchemaRaw = schema ? toJsonSchema(toolName, schema) : undefined;
      const inputSchema = normalizeInputSchema(inputSchemaRaw);

      const httpHandlersRaw = collectHttpHandlers(toolModule, file);
      // Enforce strict authoring rules: exactly one of GET or POST
      const hasGET = typeof (toolModule as any).GET === "function";
      const hasPOST = typeof (toolModule as any).POST === "function";
      const otherMethods = HTTP_METHODS.filter((m) => m !== "GET" && m !== "POST").filter(
        (m) => typeof (toolModule as any)[m] === "function"
      );
      if (otherMethods.length > 0) {
        throw new Error(
          `${file} must not export ${otherMethods.join(", ")}. Only one of GET or POST is allowed.`
        );
      }
      if (hasGET === hasPOST) {
        throw new Error(`${file}: export exactly one of GET or POST`);
      }

      let normalizedSchedule: NormalizedSchedule | null = null;
      const schedule = (toolModule as any)?.profile?.schedule;
      const profileNotifyEmail =
        typeof (toolModule as any)?.profile?.notifyEmail === "boolean"
          ? (toolModule as any).profile.notifyEmail
          : undefined;
      const profileCategoryRaw =
        typeof (toolModule as any)?.profile?.category === "string"
          ? (toolModule as any).profile.category
          : undefined;
      const allowedProfileCategories = new Set(["strategy", "tracker", "orchestrator"]);
      if (profileCategoryRaw && !allowedProfileCategories.has(profileCategoryRaw)) {
        throw new Error(
          `${file}: profile.category must be one of ${Array.from(allowedProfileCategories).join(", ")}`
        );
      }
      const profileAssetsRaw = (toolModule as any)?.profile?.assets;
      if (profileAssetsRaw !== undefined) {
        if (!Array.isArray(profileAssetsRaw)) {
          throw new Error(`${file}: profile.assets must be an array.`);
        }
        profileAssetsRaw.forEach((entry, index) => {
          if (!entry || typeof entry !== "object") {
            throw new Error(
              `${file}: profile.assets[${index}] must be an object.`
            );
          }
          const record = entry as Record<string, unknown>;
          const venue = typeof record.venue === "string" ? record.venue.trim() : "";
          if (!venue) {
            throw new Error(
              `${file}: profile.assets[${index}].venue must be a non-empty string.`
            );
          }
          const chain = record.chain;
          if (typeof chain !== "string" && typeof chain !== "number") {
            throw new Error(
              `${file}: profile.assets[${index}].chain must be a string or number.`
            );
          }
          const symbols = record.assetSymbols;
          if (!Array.isArray(symbols) || symbols.length === 0) {
            throw new Error(
              `${file}: profile.assets[${index}].assetSymbols must be a non-empty array.`
            );
          }
          const invalidSymbol = symbols.find(
            (symbol) =>
              typeof symbol !== "string" || symbol.trim().length === 0
          );
          if (invalidSymbol !== undefined) {
            throw new Error(
              `${file}: profile.assets[${index}].assetSymbols must be non-empty strings.`
            );
          }
          const walletAddress = record.walletAddress;
          if (
            walletAddress !== undefined &&
            (typeof walletAddress !== "string" || walletAddress.trim().length === 0)
          ) {
            throw new Error(
              `${file}: profile.assets[${index}].walletAddress must be a non-empty string when provided.`
            );
          }
          const pair = record.pair;
          if (
            pair !== undefined &&
            (typeof pair !== "string" || pair.trim().length === 0)
          ) {
            throw new Error(
              `${file}: profile.assets[${index}].pair must be a non-empty string when provided.`
            );
          }
          const leverage = record.leverage;
          if (
            leverage !== undefined &&
            (typeof leverage !== "number" || !Number.isFinite(leverage) || leverage <= 0)
          ) {
            throw new Error(
              `${file}: profile.assets[${index}].leverage must be a positive number when provided.`
            );
          }
        });
      }
      const templateConfigRaw = (toolModule as any)?.profile?.templateConfig;
      if (templateConfigRaw !== undefined) {
        if (!templateConfigRaw || typeof templateConfigRaw !== "object") {
          throw new Error(`${file}: profile.templateConfig must be an object.`);
        }
        const record = templateConfigRaw as Record<string, unknown>;
        const version = record.version;
        if (
          typeof version !== "string" &&
          typeof version !== "number"
        ) {
          throw new Error(
            `${file}: profile.templateConfig.version must be a string or number.`
          );
        }
        const schema = record.schema;
        if (
          schema !== undefined &&
          (!schema || typeof schema !== "object" || Array.isArray(schema))
        ) {
          throw new Error(
            `${file}: profile.templateConfig.schema must be an object when provided.`
          );
        }
        const defaults = record.defaults;
        if (
          defaults !== undefined &&
          (!defaults || typeof defaults !== "object" || Array.isArray(defaults))
        ) {
          throw new Error(
            `${file}: profile.templateConfig.defaults must be an object when provided.`
          );
        }
      }
      if (hasGET && schedule && typeof schedule.cron === "string" && schedule.cron.trim().length > 0) {
        normalizedSchedule = normalizeScheduleExpression(schedule.cron, file);
        if (typeof schedule.enabled === "boolean") {
          normalizedSchedule.authoredEnabled = schedule.enabled;
        }
        if (typeof schedule.notifyEmail === "boolean") {
          normalizedSchedule.notifyEmail = schedule.notifyEmail;
        }
      }
      if (hasPOST) {
        if (!schema) {
          throw new Error(`${file}: POST tools must export a Zod schema as 'schema'`);
        }
        if (schedule && typeof schedule.cron === "string") {
          throw new Error(`${file}: POST tools must not define profile.schedule; use GET + cron for scheduled tasks.`);
        }
      }
      const httpHandlers = [...httpHandlersRaw];

      if (httpHandlers.length === 0) {
        throw new Error(
          `${file} must export at least one HTTP handler (e.g. POST)`
        );
      }

      if (paymentExport) {
        for (let index = 0; index < httpHandlers.length; index += 1) {
          const entry = httpHandlers[index];
          httpHandlers[index] = {
            ...entry,
            handler: withX402Payment(entry.handler, paymentExport),
          };
        }
      }

      const httpHandlerMap = toHttpHandlerMap(httpHandlers);
      const defaultMethod =
        typeof toolModule.mcp?.defaultMethod === "string"
          ? toolModule.mcp.defaultMethod
          : undefined;

      const adapter = createMcpAdapter({
        name: toolName,
        httpHandlers: httpHandlerMap,
        ...(defaultMethod ? { defaultMethod } : {}),
        ...(schema ? { schema } : {}),
      });

      let metadataOverrides: ToolMetadataOverrides | null =
        toolModule.metadata ?? null;

      if (paymentExport) {
        if (metadataOverrides) {
          metadataOverrides = {
            ...metadataOverrides,
            payment: metadataOverrides.payment ?? (paymentExport as any),
            annotations: {
              ...(metadataOverrides.annotations ?? {}),
              requiresPayment:
                metadataOverrides.annotations?.requiresPayment ?? true,
            },
          };
        } else {
          metadataOverrides = {
            payment: paymentExport as any,
            annotations: { requiresPayment: true },
          } as ToolMetadataOverrides;
        }
      }

      const tool: InternalToolDefinition = {
        schema: schema ?? undefined,
        inputSchema,
        metadata: metadataOverrides,
        httpHandlers,
        mcpConfig: normalizeMcpConfig(toolModule.mcp, file),
        filename: toBaseName(file),
        sourcePath: path.join(toolsDir, file),
        handler: async (params: unknown) => adapter(params),
        payment: paymentExport ?? null,
        schedule: normalizedSchedule,
        profile:
          (toolModule as any)?.profile && typeof (toolModule as any).profile === "object"
            ? (toolModule as any).profile
            : null,
        ...(profileNotifyEmail !== undefined ? { notifyEmail: profileNotifyEmail } : {}),
        profileDescription:
          typeof (toolModule as any)?.profile?.description === "string"
            ? toolModule.profile?.description ?? null
            : null,
        ...(profileCategoryRaw ? { profileCategory: profileCategoryRaw } : {}),
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
      const hasSchema = candidate.schema && typeof candidate.schema === "object";
      const hasHttp = HTTP_METHODS.some((method) => typeof candidate[method] === "function");
      if (hasSchema || hasHttp) {
        return candidate;
      }
    }
  }
  throw new Error(
    `${filename} must export a tool definition. Expected a Zod schema plus HTTP handlers (export async function POST).`
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

function ensureZodSchema(schemaCandidate: unknown, filename: string): ZodSchema | undefined {
  if (schemaCandidate == null) {
    return undefined;
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

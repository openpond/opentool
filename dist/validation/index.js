import * as fs3 from 'fs';
import * as path4 from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { z } from 'zod';
import { zodToJsonSchema } from '@alcyone-labs/zod-to-json-schema';
import { tmpdir } from 'os';
import { build } from 'esbuild';
import { createRequire } from 'module';

// src/cli/validate.ts
var X402_VERSION = 1;
var HEADER_X402 = "X-PAYMENT";
var HEADER_PAYMENT_RESPONSE = "X-PAYMENT-RESPONSE";
var x402RequirementSchema = z.object({
  scheme: z.string().min(1),
  network: z.string().min(1),
  maxAmountRequired: z.string().min(1),
  asset: z.string().min(1),
  payTo: z.string().min(1),
  resource: z.string().optional(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  outputSchema: z.unknown().optional(),
  maxTimeoutSeconds: z.number().int().positive().optional(),
  extra: z.record(z.string(), z.unknown()).nullable().optional()
});
var x402PaymentHeaderSchema = z.object({
  x402Version: z.number().int().positive(),
  scheme: z.string().min(1),
  network: z.string().min(1),
  correlationId: z.string().optional(),
  payload: z.unknown()
});

// src/x402/helpers.ts
function createX402PaymentRequired(definition) {
  const requirement = toX402Requirement(definition);
  const body = {
    schemaVersion: 1,
    message: definition.description ?? "Payment required",
    resource: definition.resource,
    accepts: [
      {
        id: "x402",
        title: `Pay ${definition.amount} ${definition.currency.code}`,
        description: definition.description,
        amount: {
          value: definition.amount,
          currency: {
            code: definition.currency.code,
            symbol: definition.currency.symbol,
            decimals: definition.currency.decimals,
            kind: "crypto"
          }
        },
        asset: {
          symbol: definition.asset.symbol,
          network: definition.asset.network,
          address: definition.asset.address,
          decimals: definition.asset.decimals,
          standard: "erc20"
        },
        payTo: definition.payTo,
        resource: definition.resource,
        proof: {
          mode: "x402",
          scheme: definition.scheme,
          network: definition.network,
          version: X402_VERSION,
          facilitator: definition.facilitator,
          verifier: "x402:facilitator"
        }
      }
    ],
    metadata: definition.metadata ?? {},
    x402: {
      x402Version: X402_VERSION,
      error: definition.description ?? "Payment required",
      accepts: [requirement]
    }
  };
  return new Response(JSON.stringify(body), {
    status: 402,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
function extractX402Attempt(request) {
  const raw = request.headers.get(HEADER_X402);
  if (!raw) {
    return null;
  }
  try {
    const payload = decodeJson(raw, x402PaymentHeaderSchema);
    return {
      type: "x402",
      headerName: HEADER_X402,
      raw,
      payload
    };
  } catch {
    return null;
  }
}
async function verifyX402Payment(attempt, definition, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeout = options.timeout ?? 25e3;
  const facilitator = definition.facilitator;
  const verifierUrl = new URL(
    facilitator.verifyPath ?? "/verify",
    ensureTrailingSlash(facilitator.url)
  ).toString();
  const requirement = toX402Requirement(definition);
  const headers = buildFacilitatorHeaders(facilitator);
  try {
    const verifyBody = {
      x402Version: attempt.payload.x402Version,
      paymentPayload: attempt.payload,
      paymentRequirements: requirement
    };
    console.log("[x402] Calling facilitator /verify", {
      url: verifierUrl,
      fullBody: JSON.stringify(verifyBody, null, 2)
    });
    const verifyResponse = await Promise.race([
      fetchImpl(verifierUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(verifyBody)
      }),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error(`Verification timeout after ${timeout}ms`)), timeout)
      )
    ]);
    console.log("[x402] Facilitator /verify response", { status: verifyResponse.status });
    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text().catch(() => "");
      console.error("[x402] Facilitator /verify error", {
        status: verifyResponse.status,
        body: errorText
      });
      return {
        success: false,
        failure: {
          reason: `Facilitator verify request failed: ${verifyResponse.status}${errorText ? ` - ${errorText}` : ""}`,
          code: "verification_failed"
        }
      };
    }
    const verifyPayload = await verifyResponse.json();
    if (!verifyPayload.isValid) {
      return {
        success: false,
        failure: {
          reason: verifyPayload.invalidReason ?? "Facilitator verification failed",
          code: "verification_failed"
        }
      };
    }
    const responseHeaders = {};
    if (options.settle) {
      const settleUrl = new URL(
        facilitator.settlePath ?? "/settle",
        ensureTrailingSlash(facilitator.url)
      ).toString();
      try {
        const settleBody = {
          x402Version: attempt.payload.x402Version,
          paymentPayload: attempt.payload,
          paymentRequirements: requirement
        };
        console.log("[x402] Calling facilitator /settle", {
          url: settleUrl,
          bodyPreview: JSON.stringify(settleBody).substring(0, 300)
        });
        const settleResponse = await Promise.race([
          fetchImpl(settleUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(settleBody)
          }),
          new Promise(
            (_, reject) => setTimeout(() => reject(new Error(`Settlement timeout after ${timeout}ms`)), timeout)
          )
        ]);
        console.log("[x402] Facilitator /settle response", { status: settleResponse.status });
        if (!settleResponse.ok) {
          const errorText = await settleResponse.text().catch(() => "");
          console.error("[x402] Facilitator /settle error", {
            status: settleResponse.status,
            body: errorText
          });
          return {
            success: false,
            failure: {
              reason: `Facilitator settlement failed: ${settleResponse.status}${errorText ? ` - ${errorText}` : ""}`,
              code: "settlement_failed"
            }
          };
        }
        const settlePayload = await settleResponse.json();
        console.log("[x402] Facilitator /settle success", { txHash: settlePayload.txHash });
        if (settlePayload.txHash) {
          responseHeaders[HEADER_PAYMENT_RESPONSE] = JSON.stringify({
            settled: true,
            txHash: settlePayload.txHash
          });
        }
      } catch (error) {
        console.error("[x402] Settlement exception", {
          error: error instanceof Error ? error.message : String(error)
        });
        return {
          success: false,
          failure: {
            reason: error instanceof Error ? error.message : "Settlement failed",
            code: "settlement_failed"
          }
        };
      }
    }
    const result = {
      success: true,
      metadata: {
        optionId: "x402",
        verifier: "x402:facilitator",
        amount: definition.amount,
        currency: definition.currency.code,
        network: definition.network
      }
    };
    if (Object.keys(responseHeaders).length > 0) {
      result.responseHeaders = responseHeaders;
    }
    return result;
  } catch (error) {
    return {
      success: false,
      failure: {
        reason: error instanceof Error ? error.message : "Unknown error",
        code: "verification_failed"
      }
    };
  }
}
function toX402Requirement(definition) {
  const decimals = definition.asset.decimals;
  const units = decimalToBaseUnits(definition.amount, decimals);
  return x402RequirementSchema.parse({
    scheme: definition.scheme,
    network: definition.network,
    maxAmountRequired: units,
    asset: definition.asset.address,
    payTo: definition.payTo,
    resource: definition.resource,
    description: definition.description,
    mimeType: "application/json",
    maxTimeoutSeconds: 900,
    extra: {
      symbol: definition.asset.symbol,
      currencyCode: definition.currency.code,
      decimals
    }
  });
}
function decimalToBaseUnits(value, decimals) {
  const [whole, fraction = ""] = value.split(".");
  const sanitizedFraction = fraction.slice(0, decimals);
  const paddedFraction = sanitizedFraction.padEnd(decimals, "0");
  const combined = `${whole}${paddedFraction}`.replace(/^0+/, "");
  return combined.length > 0 ? combined : "0";
}
function decodeJson(value, schema) {
  const base64 = normalizeBase64(value);
  const json = Buffer.from(base64, "base64").toString("utf-8");
  const parsed = JSON.parse(json);
  return schema.parse(parsed);
}
function normalizeBase64(input) {
  if (/^[A-Za-z0-9+/=]+$/.test(input)) {
    return input;
  }
  const restored = input.replace(/-/g, "+").replace(/_/g, "/");
  const paddingNeeded = (4 - restored.length % 4) % 4;
  return restored + "=".repeat(paddingNeeded);
}
function buildFacilitatorHeaders(facilitator) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (facilitator.apiKeyHeader && process.env.X402_FACILITATOR_API_KEY) {
    headers[facilitator.apiKeyHeader] = process.env.X402_FACILITATOR_API_KEY;
  }
  return headers;
}
function ensureTrailingSlash(url) {
  return url.endsWith("/") ? url : `${url}/`;
}

// src/x402/payment.ts
var PAYMENT_CONTEXT_SYMBOL = /* @__PURE__ */ Symbol.for("opentool.x402.context");
var X402PaymentRequiredError = class extends Error {
  constructor(response, verification) {
    super("X402 Payment required");
    this.name = "X402PaymentRequiredError";
    this.response = response;
    this.verification = verification;
  }
};
function setPaymentContext(request, context) {
  try {
    Object.defineProperty(request, PAYMENT_CONTEXT_SYMBOL, {
      value: context,
      configurable: true,
      enumerable: false,
      writable: true
    });
  } catch {
    request[PAYMENT_CONTEXT_SYMBOL] = context;
  }
}
async function requireX402Payment(request, payment, options = {}) {
  const definition = isX402Payment(payment) ? payment.definition : payment;
  const attempt = extractX402Attempt(request);
  if (!attempt) {
    const response = createX402PaymentRequired(definition);
    throw new X402PaymentRequiredError(response);
  }
  const verifyOptions = {
    settle: options.settle !== void 0 ? options.settle : true
  };
  if (options.fetchImpl !== void 0) {
    verifyOptions.fetchImpl = options.fetchImpl;
  }
  const verification = await verifyX402Payment(attempt, definition, verifyOptions);
  if (!verification.success || !verification.metadata) {
    if (options.onFailure) {
      return options.onFailure(verification);
    }
    const response = createX402PaymentRequired(definition);
    throw new X402PaymentRequiredError(response, verification);
  }
  return {
    payment: verification.metadata,
    headers: verification.responseHeaders ?? {},
    result: verification
  };
}
function withX402Payment(handler, payment, options = {}) {
  return async (request) => {
    const verification = await requireX402Payment(request, payment, options);
    if (verification instanceof Response) {
      return verification;
    }
    setPaymentContext(request, verification);
    const response = await Promise.resolve(handler(request));
    return applyPaymentHeaders(response, verification.headers);
  };
}
function applyPaymentHeaders(response, headers) {
  const entries = Object.entries(headers ?? {});
  if (entries.length === 0) {
    return response;
  }
  let mutated = false;
  const merged = new Headers(response.headers);
  for (const [key, value] of entries) {
    if (!merged.has(key)) {
      merged.set(key, value);
      mutated = true;
    }
  }
  if (!mutated) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: merged
  });
}
function isX402Payment(value) {
  return !!value && typeof value === "object" && "definition" in value && value.definition !== void 0;
}

// src/adapters/mcp.ts
function createMcpAdapter(options) {
  const normalizedSchema = ensureSchema(options.schema);
  const defaultMethod = resolveDefaultMethod(options);
  const httpHandler = options.httpHandlers[defaultMethod];
  if (!httpHandler) {
    throw new Error(`Tool "${options.name}" does not export an HTTP handler for ${defaultMethod}`);
  }
  return async function invoke(rawArguments) {
    const validated = normalizedSchema ? normalizedSchema.parse(rawArguments ?? {}) : rawArguments;
    const request = buildRequest(options.name, defaultMethod, validated);
    try {
      const response = await Promise.resolve(httpHandler(request));
      return await responseToToolResponse(response);
    } catch (error) {
      if (error instanceof X402PaymentRequiredError) {
        return await responseToToolResponse(error.response);
      }
      throw error;
    }
  };
}
function resolveDefaultMethod(options) {
  const explicit = options.defaultMethod?.toUpperCase();
  if (explicit && typeof options.httpHandlers[explicit] === "function") {
    return explicit;
  }
  const preferredOrder = ["POST", "PUT", "PATCH", "GET", "DELETE", "OPTIONS", "HEAD"];
  for (const method of preferredOrder) {
    if (typeof options.httpHandlers[method] === "function") {
      return method;
    }
  }
  const available = Object.keys(options.httpHandlers).filter(
    (method) => typeof options.httpHandlers[method] === "function"
  );
  if (available.length > 0) {
    return available[0];
  }
  throw new Error(`No HTTP handlers available for tool "${options.name}"`);
}
function ensureSchema(schema) {
  if (!schema) {
    return void 0;
  }
  if (schema instanceof z.ZodType) {
    return schema;
  }
  if (typeof schema?.parse === "function") {
    return schema;
  }
  throw new Error("MCP adapter requires a valid Zod schema to validate arguments");
}
function buildRequest(name, method, params) {
  const url = new URL(`https://opentool.local/${encodeURIComponent(name)}`);
  const headers = new Headers({
    "x-opentool-invocation": "mcp",
    "x-opentool-tool": name
  });
  if (method === "GET" || method === "HEAD") {
    if (params && typeof params === "object") {
      Object.entries(params).forEach(([key, value]) => {
        if (value == null) {
          return;
        }
        url.searchParams.set(key, String(value));
      });
    }
    return new Request(url, { method, headers });
  }
  headers.set("Content-Type", "application/json");
  const init = { method, headers };
  if (params != null) {
    init.body = JSON.stringify(params);
  }
  return new Request(url, init);
}
async function responseToToolResponse(response) {
  const statusIsError = response.status >= 400;
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  if (contentType.includes("application/json")) {
    try {
      const payload = text ? JSON.parse(text) : {};
      if (payload && typeof payload === "object" && Array.isArray(payload.content)) {
        return {
          content: payload.content,
          isError: payload.isError ?? statusIsError
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        isError: statusIsError
      };
    } catch {
      return {
        content: [{ type: "text", text }],
        isError: statusIsError
      };
    }
  }
  if (!text) {
    return {
      content: [],
      isError: statusIsError
    };
  }
  return {
    content: [{ type: "text", text }],
    isError: statusIsError
  };
}

// src/types/index.ts
var HTTP_METHODS = ["GET", "HEAD", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];
function resolveTsconfig(projectRoot) {
  const candidate = path4.join(projectRoot, "tsconfig.json");
  if (fs3.existsSync(candidate)) {
    return candidate;
  }
  return void 0;
}
async function transpileWithEsbuild(options) {
  if (options.entryPoints.length === 0) {
    throw new Error("No entry points provided for esbuild transpilation");
  }
  const projectRoot = options.projectRoot;
  const tempBase = options.outDir ?? fs3.mkdtempSync(path4.join(tmpdir(), "opentool-"));
  if (!fs3.existsSync(tempBase)) {
    fs3.mkdirSync(tempBase, { recursive: true });
  }
  const tsconfig = resolveTsconfig(projectRoot);
  const buildOptions = {
    entryPoints: options.entryPoints,
    outdir: tempBase,
    bundle: options.bundle ?? false,
    format: options.format,
    platform: "node",
    target: "node20",
    logLevel: options.logLevel ?? "warning",
    sourcesContent: false,
    sourcemap: false,
    loader: {
      ".ts": "ts",
      ".tsx": "tsx",
      ".cts": "ts",
      ".mts": "ts",
      ".js": "js",
      ".jsx": "jsx",
      ".mjs": "js",
      ".cjs": "js",
      ".json": "json"
    },
    metafile: options.metafile ?? false,
    allowOverwrite: true,
    absWorkingDir: projectRoot
  };
  if (options.external && options.external.length > 0) {
    buildOptions.external = options.external;
  }
  if (options.nodePaths && options.nodePaths.length > 0) {
    buildOptions.nodePaths = options.nodePaths;
  }
  if (options.outBase) {
    buildOptions.outbase = options.outBase;
  }
  if (!buildOptions.bundle) {
    buildOptions.packages = "external";
  }
  if (tsconfig) {
    buildOptions.tsconfig = tsconfig;
  }
  await build(buildOptions);
  if (options.format === "esm") {
    const packageJsonPath = path4.join(tempBase, "package.json");
    if (!fs3.existsSync(packageJsonPath)) {
      fs3.writeFileSync(packageJsonPath, JSON.stringify({ type: "module" }), "utf8");
    }
  }
  const cleanup = () => {
    if (options.outDir) {
      return;
    }
    fs3.rmSync(tempBase, { recursive: true, force: true });
  };
  return { outDir: tempBase, cleanup };
}
createRequire(
  typeof __filename !== "undefined" ? __filename : import.meta.url
);
function resolveCompiledPath(outDir, originalFile, extension = ".js") {
  const baseName = path4.basename(originalFile).replace(/\.[^.]+$/, "");
  return path4.join(outDir, `${baseName}${extension}`);
}
async function importFresh(modulePath) {
  const fileUrl = pathToFileURL(modulePath).href;
  const cacheBuster = `t=${Date.now()}-${Math.random()}`;
  const separator = fileUrl.includes("?") ? "&" : "?";
  return import(`${fileUrl}${separator}${cacheBuster}`);
}
var METADATA_SPEC_VERSION = "1.1.0";
var McpAnnotationsSchema = z.object({
  title: z.string().optional(),
  readOnlyHint: z.boolean().optional(),
  destructiveHint: z.boolean().optional(),
  idempotentHint: z.boolean().optional(),
  openWorldHint: z.boolean().optional(),
  requiresPayment: z.boolean().optional()
}).strict();
var X402PaymentSchema = z.object({
  definition: z.object({
    amount: z.string(),
    currency: z.object({
      code: z.string(),
      symbol: z.string(),
      decimals: z.number()
    }),
    asset: z.object({
      symbol: z.string(),
      network: z.string(),
      address: z.string(),
      decimals: z.number()
    }),
    payTo: z.string(),
    resource: z.string().optional(),
    description: z.string().optional(),
    scheme: z.string(),
    network: z.string(),
    facilitator: z.object({
      url: z.string(),
      verifyPath: z.string().optional(),
      settlePath: z.string().optional(),
      apiKeyHeader: z.string().optional()
    }),
    metadata: z.record(z.string(), z.unknown()).optional()
  }),
  metadata: z.record(z.string(), z.unknown()).optional()
}).passthrough();
var PaymentConfigSchema = z.union([X402PaymentSchema, z.record(z.string(), z.unknown())]);
var DiscoveryMetadataSchema = z.object({
  keywords: z.array(z.string()).optional(),
  category: z.string().optional(),
  useCases: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  requirements: z.record(z.string(), z.any()).optional(),
  compatibility: z.record(z.string(), z.any()).optional(),
  documentation: z.union([z.string(), z.array(z.string())]).optional()
}).catchall(z.any());
var ToolCategorySchema = z.enum(["strategy", "tracker", "orchestrator"]);
z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  annotations: McpAnnotationsSchema.optional(),
  payment: PaymentConfigSchema.optional(),
  discovery: DiscoveryMetadataSchema.optional(),
  chains: z.array(z.union([z.string(), z.number()])).optional()
}).catchall(z.any());
var ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.any(),
  annotations: McpAnnotationsSchema.optional(),
  payment: PaymentConfigSchema.optional(),
  discovery: DiscoveryMetadataSchema.optional(),
  chains: z.array(z.union([z.string(), z.number()])).optional(),
  notifyEmail: z.boolean().optional(),
  category: ToolCategorySchema.optional()
}).strict();
z.object({
  metadataSpecVersion: z.string().optional(),
  name: z.string().optional(),
  displayName: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  author: z.string().optional(),
  repository: z.string().optional(),
  website: z.string().optional(),
  category: z.string().optional(),
  categories: z.array(z.string()).optional(),
  termsOfService: z.string().optional(),
  mcpUrl: z.string().optional(),
  payment: PaymentConfigSchema.optional(),
  discovery: DiscoveryMetadataSchema.optional(),
  promptExamples: z.array(z.string()).optional(),
  iconPath: z.string().optional(),
  videoPath: z.string().optional(),
  image: z.string().optional(),
  animation_url: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  useCases: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  requirements: z.record(z.string(), z.any()).optional(),
  compatibility: z.record(z.string(), z.any()).optional(),
  chains: z.array(z.union([z.string(), z.number()])).optional()
}).catchall(z.any());
z.object({
  metadataSpecVersion: z.string().default(METADATA_SPEC_VERSION),
  name: z.string(),
  displayName: z.string(),
  version: z.string(),
  description: z.string().optional(),
  author: z.string().optional(),
  repository: z.string().optional(),
  website: z.string().optional(),
  category: z.string(),
  termsOfService: z.string().optional(),
  mcpUrl: z.string().optional(),
  payment: PaymentConfigSchema.optional(),
  tools: z.array(ToolSchema).min(1),
  discovery: DiscoveryMetadataSchema.optional(),
  promptExamples: z.array(z.string()).optional(),
  iconPath: z.string().optional(),
  videoPath: z.string().optional(),
  image: z.string().optional(),
  animation_url: z.string().optional(),
  chains: z.array(z.union([z.string(), z.number()])).optional()
}).strict();

// src/utils/schedule.ts
var CRON_WRAPPED_REGEX = /^cron\((.*)\)$/i;
var CRON_TOKEN_REGEX = /^[A-Za-z0-9*?/,\-#L]+$/;
function normalizeScheduleExpression(raw, context) {
  const value = raw?.trim();
  if (!value) {
    throw new Error(`${context}: profile.schedule.cron must be a non-empty string`);
  }
  const cronBody = extractCronBody(value);
  const cronFields = cronBody.trim().split(/\s+/).filter(Boolean);
  if (cronFields.length !== 5 && cronFields.length !== 6) {
    throw new Error(
      `${context}: cron expression must have 5 or 6 fields (got ${cronFields.length})`
    );
  }
  validateCronTokens(cronFields, context);
  return {
    type: "cron",
    expression: cronFields.join(" ")
  };
}
function extractCronBody(value) {
  const cronMatch = CRON_WRAPPED_REGEX.exec(value);
  if (cronMatch) {
    return (cronMatch[1] ?? "").trim();
  }
  return value;
}
function validateCronTokens(fields, context) {
  fields.forEach((token, idx) => {
    if (!CRON_TOKEN_REGEX.test(token)) {
      throw new Error(`${context}: invalid cron token "${token}" at position ${idx + 1}`);
    }
  });
}

// src/cli/validate.ts
var SUPPORTED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
var OPENTOOL_ROOT = path4.resolve(path4.dirname(fileURLToPath(import.meta.url)), "../..");
var OPENTOOL_NODE_MODULES = path4.join(OPENTOOL_ROOT, "node_modules");
var MIN_TEMPLATE_CONFIG_VERSION = 2;
var TEMPLATE_PREVIEW_TITLE_MAX = 80;
var TEMPLATE_PREVIEW_SUBTITLE_MAX = 120;
var TEMPLATE_PREVIEW_DESCRIPTION_MAX = 1200;
var TEMPLATE_PREVIEW_MIN_LINES = 3;
var TEMPLATE_PREVIEW_MAX_LINES = 8;
function normalizeTemplateConfigVersion(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    const numeric = Number.parseFloat(trimmed);
    return Number.isFinite(numeric) ? numeric : null;
  }
  const majorMatch = /^v?(\d+)(?:\..*)?$/i.exec(trimmed);
  if (!majorMatch) {
    return null;
  }
  const major = Number.parseInt(majorMatch[1], 10);
  return Number.isFinite(major) ? major : null;
}
function parseNonEmptyString(value, fieldPath, opts = {}) {
  const { max, required = false } = opts;
  if (value == null) {
    if (required) {
      throw new Error(`${fieldPath} is required and must be a non-empty string.`);
    }
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`${fieldPath} must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${fieldPath} must be a non-empty string.`);
  }
  if (typeof max === "number" && trimmed.length > max) {
    throw new Error(`${fieldPath} must be <= ${max} characters.`);
  }
  return trimmed;
}
function normalizeTemplatePreview(value, file, toolName, requirePreview) {
  const pathPrefix = `${file}: profile.templatePreview`;
  if (value == null) {
    if (requirePreview) {
      throw new Error(
        `${pathPrefix} is required for strategy tools and must define subtitle + description.`
      );
    }
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${pathPrefix} must be an object.`);
  }
  const record = value;
  const title = parseNonEmptyString(record.title, `${pathPrefix}.title`, {
    max: TEMPLATE_PREVIEW_TITLE_MAX
  }) ?? toolName;
  const subtitle = parseNonEmptyString(record.subtitle, `${pathPrefix}.subtitle`, {
    required: true,
    max: TEMPLATE_PREVIEW_SUBTITLE_MAX
  });
  const description = parseNonEmptyString(record.description, `${pathPrefix}.description`, {
    required: true,
    max: TEMPLATE_PREVIEW_DESCRIPTION_MAX
  });
  const descriptionLineCount = description.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0).length;
  if (descriptionLineCount < TEMPLATE_PREVIEW_MIN_LINES || descriptionLineCount > TEMPLATE_PREVIEW_MAX_LINES) {
    throw new Error(
      `${pathPrefix}.description must contain ${TEMPLATE_PREVIEW_MIN_LINES}-${TEMPLATE_PREVIEW_MAX_LINES} non-empty lines (target ~5 lines).`
    );
  }
  return {
    title,
    subtitle,
    description
  };
}
async function loadAndValidateTools(toolsDir, options = {}) {
  const files = fs3.readdirSync(toolsDir).filter((file) => SUPPORTED_EXTENSIONS.includes(path4.extname(file)));
  if (files.length === 0) {
    return [];
  }
  const projectRoot = options.projectRoot ?? path4.dirname(toolsDir);
  const tempDir = path4.join(toolsDir, ".opentool-temp");
  if (fs3.existsSync(tempDir)) {
    fs3.rmSync(tempDir, { recursive: true, force: true });
  }
  const kebabCase = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z]+$/;
  for (const f of files) {
    if (!kebabCase.test(f)) {
      throw new Error(`Tool filename must be kebab-case: ${f}`);
    }
  }
  const entryPoints = files.map((file) => path4.join(toolsDir, file));
  const fallbackNodePaths = [OPENTOOL_NODE_MODULES].filter((dir) => fs3.existsSync(dir));
  const { outDir, cleanup } = await transpileWithEsbuild({
    entryPoints,
    projectRoot,
    format: "esm",
    outDir: tempDir,
    bundle: true,
    external: ["opentool", "opentool/*"],
    ...fallbackNodePaths.length > 0 ? { nodePaths: fallbackNodePaths } : {}
  });
  const tools = [];
  try {
    ensureLocalRuntimeLinks(tempDir);
    for (const file of files) {
      const compiledPath = resolveCompiledPath(outDir, file);
      if (!fs3.existsSync(compiledPath)) {
        throw new Error(`Failed to compile ${file}`);
      }
      const moduleExports = await importFresh(compiledPath);
      const toolModule = extractToolModule(moduleExports, file);
      const schema = ensureZodSchema(toolModule.schema, file);
      const paymentExport = toolModule.payment;
      const toolName = toolModule.metadata?.name ?? toolModule.metadata?.title ?? toBaseName(file);
      const inputSchemaRaw = schema ? toJsonSchema(toolName, schema) : void 0;
      const inputSchema = normalizeInputSchema(inputSchemaRaw);
      const httpHandlersRaw = collectHttpHandlers(toolModule, file);
      const hasGET = typeof toolModule.GET === "function";
      const hasPOST = typeof toolModule.POST === "function";
      const otherMethods = HTTP_METHODS.filter((m) => m !== "GET" && m !== "POST").filter(
        (m) => typeof toolModule[m] === "function"
      );
      if (otherMethods.length > 0) {
        throw new Error(
          `${file} must not export ${otherMethods.join(", ")}. Only one of GET or POST is allowed.`
        );
      }
      if (hasGET === hasPOST) {
        throw new Error(`${file}: export exactly one of GET or POST`);
      }
      let normalizedSchedule = null;
      const profileRaw = toolModule?.profile && typeof toolModule.profile === "object" ? toolModule.profile : null;
      const schedule = profileRaw?.schedule ?? null;
      const profileNotifyEmail = typeof profileRaw?.notifyEmail === "boolean" ? profileRaw.notifyEmail : void 0;
      const allowedProfileCategories = ["strategy", "tracker", "orchestrator"];
      const profileCategoryCandidate = typeof profileRaw?.category === "string" ? profileRaw.category : void 0;
      let profileCategoryRaw;
      if (profileCategoryCandidate !== void 0) {
        const isAllowed = allowedProfileCategories.includes(
          profileCategoryCandidate
        );
        if (!isAllowed) {
          throw new Error(
            `${file}: profile.category must be one of ${allowedProfileCategories.join(", ")}`
          );
        }
        profileCategoryRaw = profileCategoryCandidate;
      }
      const profileAssetsRaw = profileRaw?.assets;
      if (profileAssetsRaw !== void 0) {
        if (!Array.isArray(profileAssetsRaw)) {
          throw new Error(`${file}: profile.assets must be an array.`);
        }
        profileAssetsRaw.forEach((entry, index) => {
          if (!entry || typeof entry !== "object") {
            throw new Error(`${file}: profile.assets[${index}] must be an object.`);
          }
          const record = entry;
          const venue = typeof record.venue === "string" ? record.venue.trim() : "";
          if (!venue) {
            throw new Error(`${file}: profile.assets[${index}].venue must be a non-empty string.`);
          }
          const chain = record.chain;
          if (typeof chain !== "string" && typeof chain !== "number") {
            throw new Error(`${file}: profile.assets[${index}].chain must be a string or number.`);
          }
          const symbols = record.assetSymbols;
          if (!Array.isArray(symbols) || symbols.length === 0) {
            throw new Error(
              `${file}: profile.assets[${index}].assetSymbols must be a non-empty array.`
            );
          }
          const invalidSymbol = symbols.find(
            (symbol) => typeof symbol !== "string" || symbol.trim().length === 0
          );
          if (invalidSymbol !== void 0) {
            throw new Error(
              `${file}: profile.assets[${index}].assetSymbols must be non-empty strings.`
            );
          }
          const walletAddress = record.walletAddress;
          if (walletAddress !== void 0 && (typeof walletAddress !== "string" || walletAddress.trim().length === 0)) {
            throw new Error(
              `${file}: profile.assets[${index}].walletAddress must be a non-empty string when provided.`
            );
          }
          const pair = record.pair;
          if (pair !== void 0 && (typeof pair !== "string" || pair.trim().length === 0)) {
            throw new Error(
              `${file}: profile.assets[${index}].pair must be a non-empty string when provided.`
            );
          }
          const leverage = record.leverage;
          if (leverage !== void 0 && (typeof leverage !== "number" || !Number.isFinite(leverage) || leverage <= 0)) {
            throw new Error(
              `${file}: profile.assets[${index}].leverage must be a positive number when provided.`
            );
          }
        });
      }
      const templateConfigRaw = profileRaw?.templateConfig;
      if (templateConfigRaw !== void 0) {
        if (!templateConfigRaw || typeof templateConfigRaw !== "object") {
          throw new Error(`${file}: profile.templateConfig must be an object.`);
        }
        const record = templateConfigRaw;
        const version = record.version;
        const normalizedTemplateConfigVersion = normalizeTemplateConfigVersion(version);
        if (normalizedTemplateConfigVersion === null) {
          throw new Error(
            `${file}: profile.templateConfig.version must be a numeric string or number.`
          );
        }
        if (normalizedTemplateConfigVersion < MIN_TEMPLATE_CONFIG_VERSION) {
          throw new Error(
            `${file}: profile.templateConfig.version must be >= ${MIN_TEMPLATE_CONFIG_VERSION}.`
          );
        }
        const schema2 = record.schema;
        if (schema2 !== void 0 && (!schema2 || typeof schema2 !== "object" || Array.isArray(schema2))) {
          throw new Error(
            `${file}: profile.templateConfig.schema must be an object when provided.`
          );
        }
        const defaults = record.defaults;
        if (defaults !== void 0 && (!defaults || typeof defaults !== "object" || Array.isArray(defaults))) {
          throw new Error(
            `${file}: profile.templateConfig.defaults must be an object when provided.`
          );
        }
        const envVar = record.envVar;
        if (envVar !== void 0 && (typeof envVar !== "string" || envVar.trim().length === 0)) {
          throw new Error(
            `${file}: profile.templateConfig.envVar must be a non-empty string when provided.`
          );
        }
      }
      const normalizedTemplatePreview = normalizeTemplatePreview(
        profileRaw?.templatePreview,
        file,
        toolName,
        profileCategoryRaw === "strategy"
      );
      const normalizedProfile = profileRaw && normalizedTemplatePreview ? { ...profileRaw, templatePreview: normalizedTemplatePreview } : profileRaw;
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
      }
      const httpHandlers = [...httpHandlersRaw];
      if (httpHandlers.length === 0) {
        throw new Error(`${file} must export at least one HTTP handler (e.g. POST)`);
      }
      if (paymentExport) {
        for (let index = 0; index < httpHandlers.length; index += 1) {
          const entry = httpHandlers[index];
          httpHandlers[index] = {
            ...entry,
            handler: withX402Payment(entry.handler, paymentExport)
          };
        }
      }
      const httpHandlerMap = toHttpHandlerMap(httpHandlers);
      const defaultMethod = typeof toolModule.mcp?.defaultMethod === "string" ? toolModule.mcp.defaultMethod : void 0;
      const adapter = createMcpAdapter({
        name: toolName,
        httpHandlers: httpHandlerMap,
        ...defaultMethod ? { defaultMethod } : {},
        ...schema ? { schema } : {}
      });
      let metadataOverrides = toolModule.metadata ?? null;
      if (paymentExport) {
        if (metadataOverrides) {
          metadataOverrides = {
            ...metadataOverrides,
            payment: metadataOverrides.payment ?? paymentExport,
            annotations: {
              ...metadataOverrides.annotations,
              requiresPayment: metadataOverrides.annotations?.requiresPayment ?? true
            }
          };
        } else {
          metadataOverrides = {
            payment: paymentExport,
            annotations: { requiresPayment: true }
          };
        }
      }
      const tool = {
        schema: schema ?? void 0,
        inputSchema,
        metadata: metadataOverrides,
        httpHandlers,
        mcpConfig: normalizeMcpConfig(toolModule.mcp, file),
        filename: toBaseName(file),
        sourcePath: path4.join(toolsDir, file),
        handler: async (params) => adapter(params),
        payment: paymentExport ?? null,
        schedule: normalizedSchedule,
        profile: normalizedProfile,
        ...profileNotifyEmail !== void 0 ? { notifyEmail: profileNotifyEmail } : {},
        profileDescription: typeof profileRaw?.description === "string" ? profileRaw.description : null,
        ...profileCategoryRaw ? { profileCategory: profileCategoryRaw } : {}
      };
      tools.push(tool);
    }
  } finally {
    cleanup();
    if (fs3.existsSync(tempDir)) {
      fs3.rmSync(tempDir, { recursive: true, force: true });
    }
  }
  return tools;
}
function ensureLocalRuntimeLinks(tempDir) {
  const nodeModulesDir = path4.join(tempDir, "node_modules");
  fs3.mkdirSync(nodeModulesDir, { recursive: true });
  const packageLinks = [
    { name: "opentool", target: OPENTOOL_ROOT },
    { name: "zod", target: path4.join(OPENTOOL_NODE_MODULES, "zod") }
  ];
  for (const { name, target } of packageLinks) {
    if (!fs3.existsSync(target)) {
      continue;
    }
    const linkPath = path4.join(nodeModulesDir, name);
    if (fs3.existsSync(linkPath)) {
      continue;
    }
    fs3.symlinkSync(target, linkPath, "junction");
  }
}
function extractToolModule(exportsObject, filename) {
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
function toJsonSchema(name, schema) {
  if (!schema) {
    return void 0;
  }
  try {
    return zodToJsonSchema(schema, {
      name: `${name}Schema`,
      target: "jsonSchema7",
      $refStrategy: "none"
    });
  } catch (error) {
    throw new Error(`Failed to convert Zod schema for ${name}: ${error}`);
  }
}
function toBaseName(file) {
  return file.replace(/\.[^.]+$/, "");
}
function ensureZodSchema(schemaCandidate, filename) {
  if (schemaCandidate == null) {
    return void 0;
  }
  if (schemaCandidate instanceof z.ZodType) {
    return schemaCandidate;
  }
  const schema = schemaCandidate;
  if (typeof schema?.parse !== "function") {
    throw new Error(`${filename} schema export must be a Zod schema (missing parse method)`);
  }
  return schema;
}
function collectHttpHandlers(module, filename) {
  const handlers = [];
  for (const method of HTTP_METHODS) {
    const handler = module?.[method];
    if (typeof handler === "function") {
      handlers.push({
        method,
        handler: async (request) => handler.call(module, request)
      });
    }
  }
  handlers.sort((a, b) => HTTP_METHODS.indexOf(a.method) - HTTP_METHODS.indexOf(b.method));
  const duplicates = findDuplicates(handlers.map((h) => h.method));
  if (duplicates.length > 0) {
    throw new Error(
      `${filename} exports multiple handlers for HTTP method(s): ${duplicates.join(", ")}`
    );
  }
  return handlers;
}
function toHttpHandlerMap(handlers) {
  return handlers.reduce((acc, handler) => {
    acc[handler.method.toUpperCase()] = handler.handler;
    return acc;
  }, {});
}
function normalizeInputSchema(schema) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  const clone = JSON.parse(JSON.stringify(schema));
  if (typeof clone.$ref === "string" && clone.$ref.startsWith("#/definitions/")) {
    const refName = clone.$ref.replace("#/definitions/", "");
    const definitions = clone.definitions;
    if (definitions && typeof definitions[refName] === "object") {
      return normalizeInputSchema(definitions[refName]);
    }
  }
  delete clone.$ref;
  delete clone.definitions;
  if (!("type" in clone)) {
    clone.type = "object";
  }
  return clone;
}
function normalizeMcpConfig(rawConfig, filename) {
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
  const enabledRaw = rawConfig.enabled;
  if (enabledRaw === false) {
    return null;
  }
  if (enabledRaw !== true) {
    throw new Error(`${filename} mcp.enabled must be explicitly set to true to opt-in to MCP`);
  }
  const modeRaw = rawConfig.mode;
  let mode;
  if (typeof modeRaw === "string") {
    const normalized = modeRaw.toLowerCase();
    if (["stdio", "lambda", "dual"].includes(normalized)) {
      mode = normalized;
    } else {
      throw new Error(
        `${filename} mcp.mode must be one of "stdio", "lambda", or "dual" if specified`
      );
    }
  }
  const defaultMethodRaw = rawConfig.defaultMethod;
  const defaultMethod = typeof defaultMethodRaw === "string" ? defaultMethodRaw.toUpperCase() : void 0;
  const overridesRaw = rawConfig.metadataOverrides;
  const metadataOverrides = isPlainObject(overridesRaw) ? overridesRaw : void 0;
  const config = {
    enabled: true
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
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function findDuplicates(values) {
  const seen = /* @__PURE__ */ new Map();
  const duplicates = /* @__PURE__ */ new Set();
  values.forEach((value) => {
    const count = seen.get(value) ?? 0;
    seen.set(value, count + 1);
    if (count >= 1) {
      duplicates.add(value);
    }
  });
  return Array.from(duplicates.values());
}

export { loadAndValidateTools };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
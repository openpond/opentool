#!/usr/bin/env node
import * as path6 from 'path';
import path6__default from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { program } from 'commander';
import * as fs4 from 'fs';
import { promises } from 'fs';
import { tmpdir } from 'os';
import { build } from 'esbuild';
import { z } from 'zod';
import { createRequire } from 'module';
import { zodToJsonSchema } from '@alcyone-labs/zod-to-json-schema';
import 'viem';
import 'viem/accounts';
import 'viem/chains';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as http2 from 'http';
import dotenv from 'dotenv';

var getFilename = () => fileURLToPath(import.meta.url);
var __filename = /* @__PURE__ */ getFilename();
function resolveTsconfig(projectRoot) {
  const candidate = path6.join(projectRoot, "tsconfig.json");
  if (fs4.existsSync(candidate)) {
    return candidate;
  }
  return void 0;
}
async function transpileWithEsbuild(options) {
  if (options.entryPoints.length === 0) {
    throw new Error("No entry points provided for esbuild transpilation");
  }
  const projectRoot = options.projectRoot;
  const tempBase = options.outDir ?? fs4.mkdtempSync(path6.join(tmpdir(), "opentool-"));
  if (!fs4.existsSync(tempBase)) {
    fs4.mkdirSync(tempBase, { recursive: true });
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
    const packageJsonPath = path6.join(tempBase, "package.json");
    if (!fs4.existsSync(packageJsonPath)) {
      fs4.writeFileSync(packageJsonPath, JSON.stringify({ type: "module" }), "utf8");
    }
  }
  const cleanup = () => {
    if (options.outDir) {
      return;
    }
    fs4.rmSync(tempBase, { recursive: true, force: true });
  };
  return { outDir: tempBase, cleanup };
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
var PaymentConfigSchema = z.union([
  X402PaymentSchema,
  z.record(z.string(), z.unknown())
]);
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
var ToolMetadataOverridesSchema = z.object({
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
var MetadataSchema = z.object({
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
var BuildMetadataSchema = z.object({
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
createRequire(
  typeof __filename !== "undefined" ? __filename : import.meta.url
);
function resolveCompiledPath(outDir, originalFile, extension = ".js") {
  const baseName = path6.basename(originalFile).replace(/\.[^.]+$/, "");
  return path6.join(outDir, `${baseName}${extension}`);
}
async function importFresh(modulePath) {
  const fileUrl = pathToFileURL(modulePath).href;
  const cacheBuster = `t=${Date.now()}-${Math.random()}`;
  const separator = fileUrl.includes("?") ? "&" : "?";
  return import(`${fileUrl}${separator}${cacheBuster}`);
}

// src/cli/shared/metadata.ts
var METADATA_ENTRY = "metadata.ts";
async function loadMetadata(projectRoot) {
  const absPath = path6.join(projectRoot, METADATA_ENTRY);
  if (!fs4.existsSync(absPath)) {
    return {
      metadata: MetadataSchema.parse({}),
      sourcePath: "smart defaults (metadata.ts missing)"
    };
  }
  const tempDir = path6.join(projectRoot, ".opentool-temp");
  if (fs4.existsSync(tempDir)) {
    fs4.rmSync(tempDir, { recursive: true, force: true });
  }
  const { outDir, cleanup } = await transpileWithEsbuild({
    entryPoints: [absPath],
    projectRoot,
    format: "esm",
    outDir: tempDir
  });
  try {
    const compiledPath = resolveCompiledPath(outDir, METADATA_ENTRY);
    const moduleExports = await importFresh(compiledPath);
    const metadataExport = extractMetadataExport(moduleExports);
    const parsed = MetadataSchema.parse(metadataExport);
    return { metadata: parsed, sourcePath: absPath };
  } finally {
    cleanup();
    if (fs4.existsSync(tempDir)) {
      fs4.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}
function extractMetadataExport(moduleExports) {
  if (!moduleExports || typeof moduleExports !== "object") {
    throw new Error("metadata.ts must export a metadata object");
  }
  const exportsObject = moduleExports;
  if (exportsObject.metadata) {
    return exportsObject.metadata;
  }
  if (exportsObject.default && typeof exportsObject.default === "object") {
    const defaultExport = exportsObject.default;
    if (defaultExport.metadata) {
      return defaultExport.metadata;
    }
    return defaultExport;
  }
  return moduleExports;
}
function readPackageJson(projectRoot) {
  const packagePath = path6.join(projectRoot, "package.json");
  if (!fs4.existsSync(packagePath)) {
    return {};
  }
  try {
    const content = fs4.readFileSync(packagePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read package.json: ${error}`);
  }
}
async function buildMetadataArtifact(options) {
  const projectRoot = options.projectRoot;
  const packageInfo = readPackageJson(projectRoot);
  const { metadata: authored, sourcePath } = await loadMetadata(projectRoot);
  const defaultsApplied = [];
  const folderName = path6.basename(projectRoot);
  const name = resolveField(
    "name",
    authored.name,
    () => packageInfo.name ?? folderName,
    defaultsApplied,
    "package.json name"
  );
  const displayName = resolveField(
    "displayName",
    authored.displayName,
    () => {
      const source = packageInfo.name ?? folderName;
      return source.split(/[-_]/).map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1)).join(" ");
    },
    defaultsApplied,
    "package.json name"
  );
  const versionRaw = resolveField(
    "version",
    authored.version,
    () => packageInfo.version ?? "0.1.0",
    defaultsApplied,
    "package.json version"
  );
  const version = typeof versionRaw === "number" ? String(versionRaw) : versionRaw;
  const category = determineCategory(authored, defaultsApplied);
  const description = authored.description ?? packageInfo.description;
  if (!authored.description && packageInfo.description) {
    defaultsApplied.push("description \u2192 package.json description");
  }
  const author = authored.author ?? packageInfo.author;
  if (!authored.author && packageInfo.author) {
    defaultsApplied.push("author \u2192 package.json author");
  }
  const repository = authored.repository ?? extractRepository(packageInfo.repository);
  if (!authored.repository && repository) {
    defaultsApplied.push("repository \u2192 package.json repository");
  }
  const website = authored.website ?? packageInfo.homepage;
  if (!authored.website && packageInfo.homepage) {
    defaultsApplied.push("website \u2192 package.json homepage");
  }
  const payment = resolvePayment(authored);
  const baseImage = authored.image ?? authored.iconPath;
  const animation = authored.animation_url ?? authored.videoPath;
  const discovery = buildDiscovery(authored);
  const metadataTools = options.tools.map((tool) => {
    const overrides = tool.metadata ? ToolMetadataOverridesSchema.parse(tool.metadata) : {};
    const toolName = overrides.name ?? tool.filename;
    const toolDescription = overrides.description ?? `${toolName} tool`;
    const toolPayment = overrides.payment ?? payment ?? void 0;
    if (!overrides.payment && toolPayment && payment && toolPayment === payment) {
      defaultsApplied.push(`tool ${toolName} payment \u2192 agent payment`);
    }
    const toolDiscovery = overrides.discovery ?? void 0;
    const toolChains = overrides.chains ?? authored.chains ?? void 0;
    const toolCategory = tool.profileCategory ?? "tracker";
    if (!tool.profileCategory) {
      defaultsApplied.push(`tool ${toolName} category \u2192 tracker (default)`);
    }
    const toolDefinition = {
      name: toolName,
      description: toolDescription,
      inputSchema: tool.inputSchema
    };
    if (overrides.annotations) {
      toolDefinition.annotations = overrides.annotations;
    }
    if (toolPayment) {
      toolDefinition.payment = toolPayment;
    }
    if (toolDiscovery) {
      toolDefinition.discovery = toolDiscovery;
    }
    if (toolChains) {
      toolDefinition.chains = toolChains;
    }
    toolDefinition.category = toolCategory;
    const notifyEmail = tool.notifyEmail ?? tool.schedule?.notifyEmail;
    if (notifyEmail !== void 0) {
      toolDefinition.notifyEmail = notifyEmail;
    }
    if (tool.profileCategory) {
      toolDefinition.category = tool.profileCategory;
    }
    return toolDefinition;
  });
  const metadata = BuildMetadataSchema.parse({
    metadataSpecVersion: authored.metadataSpecVersion ?? METADATA_SPEC_VERSION,
    name,
    displayName,
    version,
    description,
    author,
    repository,
    website,
    category,
    termsOfService: authored.termsOfService,
    mcpUrl: authored.mcpUrl,
    payment: payment ?? void 0,
    tools: metadataTools,
    discovery,
    promptExamples: authored.promptExamples,
    iconPath: authored.iconPath,
    videoPath: authored.videoPath,
    image: baseImage,
    animation_url: animation,
    chains: authored.chains
  });
  return {
    metadata,
    defaultsApplied,
    sourceMetadataPath: sourcePath
  };
}
function resolveField(field, value, fallback, defaultsApplied, fallbackLabel) {
  if (value !== void 0 && value !== null && value !== "") {
    return value;
  }
  const resolved = fallback();
  defaultsApplied.push(`${field} \u2192 ${fallbackLabel}`);
  return resolved;
}
function determineCategory(authored, defaultsApplied) {
  if (authored.category) {
    return authored.category;
  }
  if (Array.isArray(authored.categories) && authored.categories.length > 0) {
    defaultsApplied.push("category \u2192 metadata.categories[0]");
    return authored.categories[0];
  }
  defaultsApplied.push("category \u2192 default category");
  return "utility";
}
function extractRepository(repository) {
  if (!repository) {
    return void 0;
  }
  if (typeof repository === "string") {
    return repository;
  }
  return repository.url;
}
function resolvePayment(authored, _defaults) {
  return authored.payment ?? void 0;
}
function buildDiscovery(authored) {
  const legacyDiscovery = {};
  if (Array.isArray(authored.keywords) && authored.keywords.length > 0) {
    legacyDiscovery.keywords = authored.keywords;
  }
  if (Array.isArray(authored.useCases) && authored.useCases.length > 0) {
    legacyDiscovery.useCases = authored.useCases;
  }
  if (Array.isArray(authored.capabilities) && authored.capabilities.length > 0) {
    legacyDiscovery.capabilities = authored.capabilities;
  }
  if (authored.requirements) {
    legacyDiscovery.requirements = authored.requirements;
  }
  if (authored.compatibility) {
    legacyDiscovery.compatibility = authored.compatibility;
  }
  if (Array.isArray(authored.categories) && authored.categories.length > 0) {
    legacyDiscovery.category = authored.categories[0];
  }
  const merged = {
    ...legacyDiscovery,
    ...authored.discovery ?? {}
  };
  return Object.keys(merged).length > 0 ? merged : void 0;
}
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
      console.error("[x402] Facilitator /verify error", { status: verifyResponse.status, body: errorText });
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
          console.error("[x402] Facilitator /settle error", { status: settleResponse.status, body: errorText });
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
        console.error("[x402] Settlement exception", { error: error instanceof Error ? error.message : String(error) });
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

// src/x402/index.ts
var PAYMENT_CONTEXT_SYMBOL = Symbol.for("opentool.x402.context");
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
    throw new Error(
      `Tool "${options.name}" does not export an HTTP handler for ${defaultMethod}`
    );
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
var HTTP_METHODS = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OPTIONS"
];

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
    throw new Error(`${context}: cron expression must have 5 or 6 fields (got ${cronFields.length})`);
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
var SUPPORTED_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs"
];
var MIN_TEMPLATE_CONFIG_VERSION = 2;
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
async function validateCommand(options) {
  console.log("\u{1F50D} Validating OpenTool metadata...");
  try {
    const toolsDir = path6.resolve(options.input);
    if (!fs4.existsSync(toolsDir)) {
      throw new Error(`Tools directory not found: ${toolsDir}`);
    }
    const projectRoot = path6.dirname(toolsDir);
    const tools = await loadAndValidateTools(toolsDir, { projectRoot });
    if (tools.length === 0) {
      throw new Error("No valid tools found - metadata validation aborted");
    }
    const { metadata, defaultsApplied, sourceMetadataPath } = await buildMetadataArtifact({
      projectRoot,
      tools
    });
    logMetadataSummary(metadata, defaultsApplied, sourceMetadataPath);
    console.log("\n\u2705 Metadata validation passed!\n");
  } catch (error) {
    console.error("\u274C Metadata validation failed:", error);
    process.exit(1);
  }
}
async function validateFullCommand(options) {
  console.log("\u{1F50D} Running full OpenTool validation...\n");
  try {
    const toolsDir = path6.resolve(options.input);
    if (!fs4.existsSync(toolsDir)) {
      throw new Error(`Tools directory not found: ${toolsDir}`);
    }
    const projectRoot = path6.dirname(toolsDir);
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
      tools
    });
    console.log(`\u{1F4E6} Tools loaded: ${tools.length}`);
    tools.forEach((tool) => {
      const toolName = tool.metadata?.name ?? tool.filename;
      const description = tool.metadata?.description ?? `${toolName} tool`;
      console.log(`  \u2022 ${toolName} \u2014 ${description}`);
    });
    logMetadataSummary(metadata, defaultsApplied, sourceMetadataPath);
    console.log("\n\u2705 Full validation completed successfully\n");
  } catch (error) {
    console.error("\u274C Full validation failed:", error);
    process.exit(1);
  }
}
async function loadAndValidateTools(toolsDir, options = {}) {
  const files = fs4.readdirSync(toolsDir).filter((file) => SUPPORTED_EXTENSIONS.includes(path6.extname(file)));
  if (files.length === 0) {
    return [];
  }
  const projectRoot = options.projectRoot ?? path6.dirname(toolsDir);
  const tempDir = path6.join(toolsDir, ".opentool-temp");
  if (fs4.existsSync(tempDir)) {
    fs4.rmSync(tempDir, { recursive: true, force: true });
  }
  const kebabCase = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z]+$/;
  for (const f of files) {
    if (!kebabCase.test(f)) {
      throw new Error(`Tool filename must be kebab-case: ${f}`);
    }
  }
  const entryPoints = files.map((file) => path6.join(toolsDir, file));
  const { outDir, cleanup } = await transpileWithEsbuild({
    entryPoints,
    projectRoot,
    format: "esm",
    outDir: tempDir,
    bundle: true,
    external: ["opentool", "opentool/*"]
  });
  const tools = [];
  try {
    for (const file of files) {
      const compiledPath = resolveCompiledPath(outDir, file);
      if (!fs4.existsSync(compiledPath)) {
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
      const schedule = toolModule?.profile?.schedule;
      const profileNotifyEmail = typeof toolModule?.profile?.notifyEmail === "boolean" ? toolModule.profile.notifyEmail : void 0;
      const profileCategoryRaw = typeof toolModule?.profile?.category === "string" ? toolModule.profile.category : void 0;
      const allowedProfileCategories = /* @__PURE__ */ new Set(["strategy", "tracker", "orchestrator"]);
      if (profileCategoryRaw && !allowedProfileCategories.has(profileCategoryRaw)) {
        throw new Error(
          `${file}: profile.category must be one of ${Array.from(allowedProfileCategories).join(", ")}`
        );
      }
      const profileAssetsRaw = toolModule?.profile?.assets;
      if (profileAssetsRaw !== void 0) {
        if (!Array.isArray(profileAssetsRaw)) {
          throw new Error(`${file}: profile.assets must be an array.`);
        }
        profileAssetsRaw.forEach((entry, index) => {
          if (!entry || typeof entry !== "object") {
            throw new Error(
              `${file}: profile.assets[${index}] must be an object.`
            );
          }
          const record = entry;
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
      const templateConfigRaw = toolModule?.profile?.templateConfig;
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
              ...metadataOverrides.annotations ?? {},
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
        sourcePath: path6.join(toolsDir, file),
        handler: async (params) => adapter(params),
        payment: paymentExport ?? null,
        schedule: normalizedSchedule,
        profile: toolModule?.profile && typeof toolModule.profile === "object" ? toolModule.profile : null,
        ...profileNotifyEmail !== void 0 ? { notifyEmail: profileNotifyEmail } : {},
        profileDescription: typeof toolModule?.profile?.description === "string" ? toolModule.profile?.description ?? null : null,
        ...profileCategoryRaw ? { profileCategory: profileCategoryRaw } : {}
      };
      tools.push(tool);
    }
  } finally {
    cleanup();
    if (fs4.existsSync(tempDir)) {
      fs4.rmSync(tempDir, { recursive: true, force: true });
    }
  }
  return tools;
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
function logMetadataSummary(metadata, defaultsApplied, sourceMetadataPath) {
  console.log(`\u{1F4C4} metadata loaded from ${sourceMetadataPath}`);
  console.log("\n\u{1F4CA} Metadata Summary:");
  console.log(`  \u2022 Name: ${metadata.name}`);
  console.log(`  \u2022 Display Name: ${metadata.displayName}`);
  console.log(`  \u2022 Version: ${metadata.version}`);
  console.log(`  \u2022 Category: ${metadata.category}`);
  console.log(`  \u2022 Tools: ${metadata.tools.length}`);
  console.log(`  \u2022 Spec Version: ${metadata.metadataSpecVersion}`);
  if (metadata.payment) {
    console.log(`  \u2022 Payment: $${metadata.payment.amountUSDC} USDC`);
  }
  if (defaultsApplied.length > 0) {
    console.log("\nDefaults applied during metadata synthesis:");
    defaultsApplied.forEach((entry) => console.log(`  \u2022 ${entry}`));
  }
}

// src/cli/build.ts
async function buildCommand(options) {
  const start = timestamp();
  console.log(`[${start}] Building OpenTool project...`);
  try {
    const artifacts = await buildProject(options);
    logBuildSummary(artifacts, options);
  } catch (error) {
    const end = timestamp();
    console.error(`[${end}] Build failed:`, error);
    process.exit(1);
  }
}
async function buildProject(options) {
  const toolsDir = path6.resolve(options.input);
  if (!fs4.existsSync(toolsDir)) {
    throw new Error(`Tools directory not found: ${toolsDir}`);
  }
  const projectRoot = path6.dirname(toolsDir);
  const outputDir = path6.resolve(options.output);
  fs4.mkdirSync(outputDir, { recursive: true });
  const serverName = options.name ?? "opentool-server";
  const serverVersion = options.version ?? "1.0.0";
  const tools = await loadAndValidateTools(toolsDir, { projectRoot });
  if (tools.length === 0) {
    throw new Error("No valid tools found - build aborted");
  }
  const { metadata, defaultsApplied } = await buildMetadataArtifact({
    projectRoot,
    tools
  });
  const metadataPath = path6.join(outputDir, "metadata.json");
  fs4.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  const compiledTools = await emitTools(tools, {
    projectRoot,
    outputDir
  });
  const sharedModules = await emitSharedModules({
    projectRoot,
    outputDir
  });
  const toolsManifestPath = await writeToolsManifest({
    tools,
    compiledTools,
    outputDir
  });
  const workflowBundles = await buildWorkflowsIfPresent({
    projectRoot,
    outputDir
  });
  const shouldBuildMcpServer = compiledTools.some((artifact) => artifact.mcpEnabled);
  if (shouldBuildMcpServer) {
    await writeMcpServer({
      outputDir,
      serverName,
      serverVersion,
      compiledTools});
  } else {
    const serverPath = path6.join(outputDir, "mcp-server.js");
    if (fs4.existsSync(serverPath)) {
      fs4.rmSync(serverPath);
    }
  }
  return {
    metadata,
    defaultsApplied,
    tools,
    compiledTools,
    workflowBundles,
    toolsManifestPath,
    sharedModules
  };
}
async function emitTools(tools, config) {
  const toolsOutDir = path6.join(config.outputDir, "tools");
  if (fs4.existsSync(toolsOutDir)) {
    fs4.rmSync(toolsOutDir, { recursive: true, force: true });
  }
  fs4.mkdirSync(toolsOutDir, { recursive: true });
  const entryPoints = tools.map((tool) => {
    if (!tool.sourcePath) {
      throw new Error(`Missing sourcePath for tool ${tool.filename}`);
    }
    return tool.sourcePath;
  });
  await transpileWithEsbuild({
    entryPoints,
    projectRoot: config.projectRoot,
    format: "cjs",
    outDir: toolsOutDir,
    bundle: true
  });
  const compiled = tools.map((tool) => {
    if (!tool.sourcePath) {
      throw new Error(`Missing sourcePath for tool ${tool.filename}`);
    }
    const base = path6.basename(tool.sourcePath).replace(/\.[^.]+$/, "");
    const modulePath = path6.join("tools", `${base}.js`);
    if (!fs4.existsSync(path6.join(config.outputDir, modulePath))) {
      throw new Error(`Expected compiled output missing: ${modulePath}`);
    }
    const defaultMcpMethod = tool.mcpConfig?.defaultMethod;
    return {
      name: tool.metadata?.name ?? tool.filename,
      filename: base,
      modulePath,
      httpMethods: tool.httpHandlers.map((handler) => handler.method),
      mcpEnabled: tool.mcpConfig?.enabled ?? false,
      ...defaultMcpMethod ? { defaultMcpMethod } : {},
      hasWallet: Boolean(tool.payment)
    };
  });
  return compiled;
}
async function emitSharedModules(config) {
  const srcDir = path6.join(config.projectRoot, "src");
  if (!fs4.existsSync(srcDir)) {
    return null;
  }
  const sharedFiles = collectSourceFiles(srcDir);
  if (sharedFiles.length === 0) {
    return null;
  }
  const sharedOutDir = path6.join(config.outputDir, "src");
  await transpileWithEsbuild({
    entryPoints: sharedFiles,
    projectRoot: config.projectRoot,
    outDir: sharedOutDir,
    outBase: srcDir,
    format: "cjs",
    bundle: false,
    logLevel: "warning"
  });
  return { count: sharedFiles.length, outputDir: sharedOutDir };
}
function collectSourceFiles(dir) {
  const supported = /* @__PURE__ */ new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
  const results = [];
  const ignoreDirs = /* @__PURE__ */ new Set(["node_modules", ".git", "dist", ".opentool-temp"]);
  const entries = fs4.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path6.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoreDirs.has(entry.name)) {
        continue;
      }
      results.push(...collectSourceFiles(fullPath));
      continue;
    }
    const ext = path6.extname(entry.name);
    if (supported.has(ext) && !entry.name.endsWith(".d.ts")) {
      results.push(fullPath);
    }
  }
  return results;
}
function renderMcpServer(options) {
  const toolImports = options.compiledTools.map((tool, index) => `const tool${index} = require('./${tool.modulePath}');`).join("\n");
  const registry = options.compiledTools.map((artifact, index) => {
    const config = {
      enabled: artifact.mcpEnabled,
      defaultMethod: artifact.defaultMcpMethod ?? null,
      httpMethods: artifact.httpMethods,
      filename: artifact.filename
    };
    return `  { meta: metadata.tools[${index}], module: tool${index}, config: ${JSON.stringify(config)} }`;
  }).join(",\n");
  return `#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const metadata = require('./metadata.json');
const { createMcpAdapter, HTTP_METHODS } = require('opentool/dist/adapters/mcp.js');

${toolImports}

const toolRegistry = [
${registry}
];

const adapters = toolRegistry.map((entry) => {
  if (!entry.config.enabled) {
    return null;
  }

  const httpHandlers = Object.fromEntries(
    HTTP_METHODS
      .map((method) => [method, entry.module[method]])
      .filter(([, handler]) => typeof handler === 'function')
  );

  return {
    meta: entry.meta,
    invoke: createMcpAdapter({
      name: entry.meta.name,
      schema: entry.module.schema,
      httpHandlers,
      defaultMethod: entry.config.defaultMethod || undefined,
    }),
  };
});

const server = new Server(
  {
    name: '${escapeForJs(options.serverName)}',
    version: '${escapeForJs(options.serverVersion)}',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: adapters
    .filter((entry) => entry !== null)
    .map((entry) => entry.meta),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const adapter = adapters.find((entry) => entry && entry.meta.name === request.params.name);
  if (!adapter) {
    throw new Error('Tool ' + request.params.name + ' is not registered for MCP');
  }

  try {
    return await adapter.invoke(request.params.arguments);
  } catch (error) {
    const message = (error && error.message) || String(error);
    return {
      content: [{ type: 'text', text: 'Error: ' + message }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { server };
`;
}
async function writeMcpServer(options) {
  const serverCode = renderMcpServer(options);
  const serverPath = path6.join(options.outputDir, "mcp-server.js");
  fs4.writeFileSync(serverPath, serverCode);
  fs4.chmodSync(serverPath, 493);
}
function writeToolsManifest(options) {
  const manifestPath = path6.join(options.outputDir, "tools.json");
  const legacyManifestPath = path6.join(
    options.outputDir,
    ".well-known",
    "opentool",
    "cron.json"
  );
  if (fs4.existsSync(legacyManifestPath)) {
    fs4.rmSync(legacyManifestPath, { force: true });
  }
  const entries = options.tools.map((tool) => {
    const compiled = options.compiledTools.find(
      (artifact) => artifact.filename === tool.filename
    );
    if (!compiled) {
      throw new Error(`Internal error: missing compiled artifact for ${tool.filename}`);
    }
    const handler = tool.httpHandlers[0];
    const method = handler ? handler.method.toUpperCase() : "GET";
    const toolPath = compiled.modulePath.replace(/\\/g, "/");
    const entry = {
      name: tool.metadata?.name ?? tool.filename,
      method,
      toolPath
    };
    if (tool.inputSchema) {
      entry.inputSchema = tool.inputSchema;
    }
    if (tool.profile) {
      entry.profile = tool.profile;
    }
    if (tool.schedule) {
      entry.schedule = tool.schedule;
    }
    return entry;
  });
  fs4.writeFileSync(manifestPath, JSON.stringify(entries, null, 2));
  return manifestPath;
}
function logBuildSummary(artifacts, options) {
  const end = timestamp();
  console.log(`[${end}] Build completed successfully!`);
  console.log(`Output directory: ${path6.resolve(options.output)}`);
  console.log("Generated files:");
  const hasMcp = artifacts.compiledTools.some((tool) => tool.mcpEnabled);
  if (hasMcp) {
    console.log("  \u2022 mcp-server.js (stdio server)");
  }
  console.log(`  \u2022 tools/ (${artifacts.compiledTools.length} compiled tools)`);
  if (artifacts.sharedModules) {
    console.log(
      `  \u2022 src/ (${artifacts.sharedModules.count} shared module${artifacts.sharedModules.count === 1 ? "" : "s"} compiled)`
    );
  }
  artifacts.compiledTools.forEach((tool) => {
    const methods = tool.httpMethods.join(", ");
    const walletBadge = tool.hasWallet ? " [wallet]" : "";
    console.log(`     - ${tool.name} [${methods}]${walletBadge}`);
  });
  console.log("  \u2022 metadata.json (registry artifact)");
  if (artifacts.toolsManifestPath) {
    console.log("  \u2022 tools.json (runtime tool manifest)");
  }
  if (artifacts.workflowBundles) {
    console.log("  \u2022 .well-known/workflow/v1/ (workflow bundles)");
    console.log("     - flow.js");
    console.log("     - step.js");
    console.log("     - webhook.js");
    if (artifacts.workflowBundles.clientBundlePath) {
      console.log("     - client.js");
    }
    if (artifacts.workflowBundles.manifestPath) {
      console.log("     - manifest.json");
    }
  }
  if (artifacts.defaultsApplied.length > 0) {
    console.log("\nDefaults applied during metadata synthesis:");
    artifacts.defaultsApplied.forEach((entry) => console.log(`  \u2022 ${entry}`));
  }
  if (!hasMcp) {
    console.log("\n\u2139\uFE0F MCP adapter skipped (no tools opted in)");
  }
}
async function buildWorkflowsIfPresent(options) {
  const workflowsDir = options.workflowsDir ?? path6.join(options.projectRoot, "workflows");
  if (!fs4.existsSync(workflowsDir)) {
    return null;
  }
  if (!hasWorkflowSourceFiles(workflowsDir)) {
    return null;
  }
  const nodeVersion = process.versions?.node ?? "0.0.0";
  const nodeMajor = Number(nodeVersion.split(".")[0] ?? 0);
  if (!Number.isFinite(nodeMajor) || nodeMajor < 22) {
    console.warn(
      `[${timestamp()}] Workflow bundles skipped (requires Node >= 22, current ${nodeVersion})`
    );
    return null;
  }
  let BaseBuilder;
  try {
    ({ BaseBuilder } = await import('@workflow/cli/dist/lib/builders/base-builder.js'));
  } catch (error) {
    const details = error instanceof Error ? `
Reason: ${error.message}` : "";
    throw new Error(
      `[${timestamp()}] Workflow sources detected, but optional dependency '@workflow/cli' is not installed. Install it with "npm install @workflow/cli" (or add it to devDependencies) and rerun the build.` + details
    );
  }
  class OpenToolWorkflowBuilder extends BaseBuilder {
    constructor(config) {
      super(config);
    }
    async build() {
      const inputFiles = await this.getInputFiles();
      const tsConfig = await this.getTsConfigOptions();
      const shared = {
        inputFiles,
        ...tsConfig.baseUrl ? { tsBaseUrl: tsConfig.baseUrl } : {},
        ...tsConfig.paths ? { tsPaths: tsConfig.paths } : {}
      };
      await this.buildStepsBundle(shared);
      await this.buildWorkflowsBundle(shared);
      await this.buildWebhookRoute();
      await this.buildClientLibrary();
    }
    async buildStepsBundle(options2) {
      console.log(
        "Creating OpenTool workflow steps bundle at",
        this.config.stepsBundlePath
      );
      const stepsBundlePath2 = path6.resolve(
        this.config.workingDir,
        this.config.stepsBundlePath
      );
      await fs4.promises.mkdir(path6.dirname(stepsBundlePath2), { recursive: true });
      await this.createStepsBundle({
        outfile: stepsBundlePath2,
        ...options2
      });
    }
    async buildWorkflowsBundle(options2) {
      console.log(
        "Creating OpenTool workflow bundle at",
        this.config.workflowsBundlePath
      );
      const workflowBundlePath = path6.resolve(
        this.config.workingDir,
        this.config.workflowsBundlePath
      );
      await fs4.promises.mkdir(path6.dirname(workflowBundlePath), {
        recursive: true
      });
      await this.createWorkflowsBundle({
        outfile: workflowBundlePath,
        bundleFinalOutput: false,
        ...options2
      });
    }
    async buildWebhookRoute() {
      console.log(
        "Creating OpenTool workflow webhook bundle at",
        this.config.webhookBundlePath
      );
      const webhookBundlePath2 = path6.resolve(
        this.config.workingDir,
        this.config.webhookBundlePath
      );
      await fs4.promises.mkdir(path6.dirname(webhookBundlePath2), {
        recursive: true
      });
      await this.createWebhookBundle({ outfile: webhookBundlePath2 });
    }
    async buildClientLibrary() {
      if (!this.config?.clientBundlePath) {
        return;
      }
      const clientBundlePath2 = path6.resolve(
        this.config.workingDir,
        this.config.clientBundlePath
      );
      await fs4.promises.mkdir(path6.dirname(clientBundlePath2), {
        recursive: true
      });
      await this.createWorkflowsBundle({
        outfile: clientBundlePath2,
        bundleFinalOutput: true
      });
    }
  }
  const relativeSourceDir = path6.relative(options.projectRoot, workflowsDir) || ".";
  const outputBase = path6.join(
    options.outputDir,
    ".well-known",
    "workflow",
    "v1"
  );
  const stepsBundlePath = path6.join(outputBase, "step.js");
  const workflowsBundlePath = path6.join(outputBase, "flow.js");
  const webhookBundlePath = path6.join(outputBase, "webhook.js");
  const manifestPath = path6.join(outputBase, "manifest.json");
  const builder = new OpenToolWorkflowBuilder({
    workingDir: options.projectRoot,
    dirs: [relativeSourceDir],
    buildTarget: "standalone",
    stepsBundlePath,
    workflowsBundlePath,
    webhookBundlePath,
    ...{},
    workflowManifestPath: manifestPath,
    externalPackages: [
      "workflow",
      "workflow/internal/builtins",
      "workflow/internal/private",
      "workflow/runtime",
      "workflow/api"
    ]
  });
  console.log(
    `[${timestamp()}] Building workflows from ${workflowsDir} -> ${outputBase}`
  );
  await builder.build();
  return {
    sourceDir: workflowsDir,
    outputDir: outputBase,
    stepsBundlePath,
    workflowsBundlePath,
    webhookBundlePath,
    ...{},
    manifestPath
  };
}
function hasWorkflowSourceFiles(directory) {
  const entries = fs4.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (hasWorkflowSourceFiles(path6.join(directory, entry.name))) {
        return true;
      }
      continue;
    }
    if (entry.isFile()) {
      const extension = path6.extname(entry.name).toLowerCase();
      if (WORKFLOW_SOURCE_EXTENSIONS.has(extension)) {
        return true;
      }
    }
  }
  return false;
}
var WORKFLOW_SOURCE_EXTENSIONS = /* @__PURE__ */ new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts"
]);
function timestamp() {
  return (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 19);
}
function escapeForJs(value) {
  return value.replace(/'/g, "\\'");
}
var __dirname2 = path6.dirname(fileURLToPath(import.meta.url));
var packageJson = JSON.parse(
  fs4.readFileSync(path6.resolve(__dirname2, "../../package.json"), "utf-8")
);
var cyan = "\x1B[36m";
var bold = "\x1B[1m";
var dim = "\x1B[2m";
var reset = "\x1B[0m";
async function devCommand(options) {
  const port = options.port ?? 7e3;
  const watch2 = options.watch ?? true;
  const enableStdio = options.stdio ?? false;
  const log = enableStdio ? (_message) => {
  } : (message) => console.log(message);
  try {
    const toolsDir = path6.resolve(options.input);
    if (!fs4.existsSync(toolsDir)) {
      throw new Error(`Tools directory not found: ${toolsDir}`);
    }
    const projectRoot = path6.dirname(toolsDir);
    loadEnvFiles(projectRoot);
    let toolDefinitions = await loadToolDefinitions(toolsDir, projectRoot);
    if (toolDefinitions.length === 0) {
      throw new Error("No tools found in the target directory");
    }
    let routes = expandRoutes(toolDefinitions);
    const stdioController = enableStdio ? await startMcpServer(() => toolDefinitions) : null;
    if (watch2) {
      const reloadableExtensions = /\.(ts|js|mjs|cjs|tsx|jsx)$/i;
      const tempDir = path6.join(toolsDir, ".opentool-temp");
      const watchTargets = /* @__PURE__ */ new Set([toolsDir]);
      if (projectRoot !== toolsDir) {
        watchTargets.add(projectRoot);
      }
      let reloading = false;
      const scheduleReload = async (changedPath) => {
        if (reloading) {
          return;
        }
        reloading = true;
        log(
          `${dim}
Detected change in ${changedPath ?? "tools directory"}, reloading...${reset}`
        );
        try {
          toolDefinitions = await loadToolDefinitions(toolsDir, projectRoot);
          routes = expandRoutes(toolDefinitions);
          logReload(toolDefinitions, enableStdio, log);
        } catch (error) {
          console.error("Failed to reload tools:", error);
        } finally {
          reloading = false;
        }
      };
      for (const target of watchTargets) {
        fs4.watch(target, async (_eventType, rawFilename) => {
          const filename = rawFilename?.toString();
          if (filename && !reloadableExtensions.test(filename)) {
            return;
          }
          const fullPath = filename ? path6.join(target, filename) : void 0;
          if (fullPath && fullPath.startsWith(tempDir)) {
            return;
          }
          const displayPath = fullPath ? path6.relative(projectRoot, fullPath) || path6.basename(fullPath) : path6.relative(projectRoot, target) || path6.basename(target);
          await scheduleReload(displayPath);
        });
      }
    }
    const server = http2.createServer(async (req, res) => {
      const method = (req.method || "GET").toUpperCase();
      const url = new URL(req.url || "/", `http://localhost:${port}`);
      const routePath = url.pathname;
      log(`${dim}[request] ${method} ${routePath}${reset}`);
      try {
        await handleRequest({ req, res, port, routes });
        log(
          `${dim}[response] ${method} ${routePath} ${res.statusCode}${reset}`
        );
      } catch (error) {
        console.error("Error handling request:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error.message }));
        log(`${dim}[response] ${method} ${routePath} 500${reset}`);
      }
    });
    server.listen(port, () => {
      log(`${bold}${dim}> dev opentool${reset}`);
      log(
        `   * ${bold}opentool${reset} ${cyan}v${packageJson.version}${reset}`
      );
      log(`   * ${bold}HTTP:${reset} http://localhost:${port}`);
      logStartup(toolDefinitions, enableStdio, log);
    });
    process.on("SIGINT", async () => {
      log(`
${dim}Shutting down dev server...${reset}`);
      server.close();
      if (stdioController) {
        await stdioController.close();
      }
      process.exit(0);
    });
  } catch (error) {
    console.error("Dev server failed:", error);
    process.exit(1);
  }
}
async function startMcpServer(getTools) {
  const server = new Server(
    {
      name: "opentool-dev",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = getTools().filter(isMcpEnabled);
    return {
      tools: tools.map((tool) => ({
        name: tool.metadata?.name ?? tool.filename,
        description: tool.metadata?.description ?? `${tool.filename} tool`,
        inputSchema: tool.inputSchema,
        annotations: tool.metadata?.annotations,
        payment: tool.metadata?.payment,
        discovery: tool.metadata?.discovery
      }))
    };
  });
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tools = getTools().filter(isMcpEnabled);
    const tool = tools.find((entry) => {
      const toolName = entry.metadata?.name ?? entry.filename;
      return toolName === request.params.name;
    });
    if (!tool) {
      throw new Error(`Tool ${request.params.name} not found`);
    }
    try {
      const validatedParams = tool.schema.parse(
        request.params.arguments
      );
      const handler = tool.handler ?? createMcpAdapter({
        name: tool.metadata?.name ?? tool.filename,
        httpHandlers: toHttpHandlerMap2(tool.httpHandlers),
        ...tool.schema ? { schema: tool.schema } : {},
        ...tool.mcpConfig?.defaultMethod ? { defaultMethod: tool.mcpConfig.defaultMethod } : {}
      });
      const result = await handler(validatedParams);
      return result;
    } catch (error) {
      const message = error && error.message || String(error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true
      };
    }
  });
  const transport = new StdioServerTransport();
  server.connect(transport).catch((error) => {
    console.error("MCP transport error:", error);
  });
  return {
    async close() {
      await server.close();
      if (typeof transport.close === "function") {
        transport.close();
      }
    }
  };
}
async function loadToolDefinitions(toolsDir, projectRoot) {
  return loadAndValidateTools(toolsDir, { projectRoot });
}
function expandRoutes(tools) {
  const routes = [];
  tools.forEach((tool) => {
    tool.httpHandlers.forEach((handlerDef) => {
      routes.push({
        tool,
        method: handlerDef.method.toUpperCase(),
        handler: async (request) => handlerDef.handler(request)
      });
    });
  });
  return routes;
}
function logStartup(tools, stdio, log) {
  log(`
Tools: ${tools.length} tool${tools.length === 1 ? "" : "s"}`);
  printToolList(tools, log);
  if (stdio) {
    const mcpTools = tools.filter(isMcpEnabled);
    const label = mcpTools.length > 0 ? `MCP stdio enabled (${mcpTools.length} tool${mcpTools.length === 1 ? "" : "s"})` : "MCP stdio enabled (no tools opted in)";
    log(`${dim}${label}${reset}`);
  }
}
function logReload(tools, stdio, log) {
  log(`
Reloaded ${tools.length} tool${tools.length === 1 ? "" : "s"}`);
  printToolList(tools, log);
  if (stdio) {
    const mcpTools = tools.filter(isMcpEnabled);
    const label = mcpTools.length > 0 ? `MCP stdio enabled (${mcpTools.length} tool${mcpTools.length === 1 ? "" : "s"})` : "MCP stdio enabled (no tools opted in)";
    log(`${dim}${label}${reset}`);
  }
}
function printToolList(tools, log) {
  tools.forEach((tool) => {
    const name = tool.metadata?.name ?? tool.filename;
    const methods = tool.httpHandlers.map((handler) => handler.method).join(", ");
    const tags = [];
    if (tool.mcpConfig?.enabled) {
      tags.push(`${dim}[mcp]${reset}`);
    }
    if (tool.payment || tool.metadata && tool.metadata.payment) {
      tags.push(`${dim}[payments]${reset}`);
    }
    const tagSuffix = tags.length ? ` ${tags.join(" ")}` : "";
    log(`  \u2022 ${name} \u2014 ${methods}${tagSuffix}`);
  });
}
async function handleRequest(params) {
  const { req, res, port, routes } = params;
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    HTTP_METHODS.join(", ") + ", OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }
  const method = (req.method || "GET").toUpperCase();
  const url = new URL(req.url || "/", `http://localhost:${port}`);
  const toolName = url.pathname.slice(1) || "index";
  const route = findRoute(toolName, method, routes);
  if (!route) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: `Tool not found: ${method} /${toolName}`,
        availableTools: routes.map((r) => `${r.method} /${routeName(r.tool)}`)
      })
    );
    return;
  }
  const body = await readRequestBody(req);
  const request = createWebRequest({ req, url, body });
  let response;
  try {
    response = await route.handler(request);
  } catch (error) {
    if (error instanceof X402PaymentRequiredError) {
      response = error.response;
    } else {
      throw error;
    }
  }
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  res.writeHead(response.status, headers);
  if (method === "HEAD") {
    res.end();
    return;
  }
  const arrayBuffer = await response.arrayBuffer();
  res.end(Buffer.from(arrayBuffer));
}
function findRoute(toolName, method, routes) {
  const direct = routes.find(
    (route) => routeName(route.tool) === toolName && route.method === method
  );
  if (direct) {
    return direct;
  }
  if (method === "HEAD") {
    return routes.find(
      (route) => routeName(route.tool) === toolName && route.method === "GET"
    );
  }
  return void 0;
}
function routeName(tool) {
  return tool.metadata?.name ?? tool.filename;
}
function loadEnvFiles(projectRoot) {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const candidate = path6.join(projectRoot, file);
    if (fs4.existsSync(candidate)) {
      dotenv.config({ path: candidate, override: false });
    }
  }
}
async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}
function createWebRequest(params) {
  const { req, url, body } = params;
  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value === void 0) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => headers.append(key, entry));
      return;
    }
    headers.set(key, value);
  });
  const method = (req.method || "GET").toUpperCase();
  const init = {
    method,
    headers
  };
  if (body.length > 0 && method !== "GET" && method !== "HEAD") {
    init.body = body.toString();
  }
  return new Request(url, init);
}
function toHttpHandlerMap2(handlers) {
  return handlers.reduce(
    (acc, handler) => {
      acc[handler.method.toUpperCase()] = handler.handler;
      return acc;
    },
    {}
  );
}
function isMcpEnabled(tool) {
  return Boolean(tool.mcpConfig?.enabled);
}
async function generateMetadataCommand(options) {
  const startTimestamp = timestamp2();
  console.log(`[${startTimestamp}] Generating OpenTool metadata...`);
  try {
    const result = await generateMetadata(options);
    const endTimestamp = timestamp2();
    console.log(`[${endTimestamp}] Metadata generation completed successfully!`);
    console.log(`Output file: ${result.outputPath}`);
    console.log(`Spec version: ${result.metadata.metadataSpecVersion}`);
    console.log(`Tools included: ${result.tools.length}`);
    if (result.defaultsApplied.length > 0) {
      console.log("Applied defaults:");
      for (const entry of result.defaultsApplied) {
        console.log(`  \u2022 ${entry}`);
      }
    }
  } catch (error) {
    const endTimestamp = timestamp2();
    console.error(`[${endTimestamp}] Metadata generation failed:`, error);
    process.exit(1);
  }
}
async function generateMetadata(options) {
  const toolsDir = path6.resolve(options.input);
  if (!fs4.existsSync(toolsDir)) {
    throw new Error(`Tools directory not found: ${toolsDir}`);
  }
  const projectRoot = path6.dirname(toolsDir);
  const tools = await loadAndValidateTools(toolsDir, { projectRoot });
  const { metadata, defaultsApplied } = await buildMetadataArtifact({
    projectRoot,
    tools
  });
  const outputPath = options.output ? path6.resolve(options.output) : path6.join(projectRoot, "metadata.json");
  fs4.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
  return {
    metadata,
    defaultsApplied,
    tools,
    outputPath
  };
}
function timestamp2() {
  return (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 19);
}
function resolveTemplateDir() {
  const here = path6__default.dirname(fileURLToPath(import.meta.url));
  return path6__default.resolve(here, "../../templates/base");
}
async function directoryIsEmpty(targetDir) {
  try {
    const entries = await promises.readdir(targetDir);
    return entries.length === 0;
  } catch (error) {
    if (error.code === "ENOENT") {
      return true;
    }
    throw error;
  }
}
async function copyDir(src, dest) {
  await promises.mkdir(dest, { recursive: true });
  const entries = await promises.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path6__default.join(src, entry.name);
    const destPath = path6__default.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await promises.copyFile(srcPath, destPath);
    }
  }
}
function toPackageName(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "opentool-project";
}
function toDisplayName(value) {
  return value.trim().replace(/[-_]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()) || "OpenTool Project";
}
async function updatePackageJson(targetDir, name, description) {
  const filePath = path6__default.join(targetDir, "package.json");
  const raw = await promises.readFile(filePath, "utf-8");
  const pkg = JSON.parse(raw);
  pkg.name = toPackageName(name);
  if (description) {
    pkg.description = description;
  }
  await promises.writeFile(filePath, `${JSON.stringify(pkg, null, 2)}
`, "utf-8");
}
async function updateMetadata(targetDir, name, description) {
  const filePath = path6__default.join(targetDir, "metadata.ts");
  const raw = await promises.readFile(filePath, "utf-8");
  const displayName = toDisplayName(name);
  const resolvedDescription = description || "OpenTool project";
  const updated = raw.replace(/name:\s*\".*?\"/, `name: "${toPackageName(name)}"`).replace(/displayName:\s*\".*?\"/, `displayName: "${displayName}"`).replace(/description:\s*\".*?\"/, `description: "${resolvedDescription}"`);
  await promises.writeFile(filePath, updated, "utf-8");
}
async function initCommand(options) {
  const targetDir = path6__default.resolve(process.cwd(), options.dir || ".");
  const templateDir = resolveTemplateDir();
  const empty = await directoryIsEmpty(targetDir);
  if (!empty && !options.force) {
    throw new Error(
      `Directory not empty: ${targetDir}. Use --force to overwrite.`
    );
  }
  await copyDir(templateDir, targetDir);
  const projectName = options.name || path6__default.basename(targetDir);
  const description = options.description;
  await updatePackageJson(targetDir, projectName, description);
  await updateMetadata(targetDir, projectName, description);
}

// src/cli/index.ts
program.name("opentool").description("OpenTool CLI for building and developing serverless MCP tools").version("1.0.0");
program.command("dev").description("Start HTTP dev server (optional MCP stdio)").option("-i, --input <dir>", "Input directory containing tools", "tools").option("-p, --port <port>", "Port to listen on", "7000").option("--stdio", "Expose MCP stdio transport", false).option("--no-watch", "Disable file watching").action((cmdOptions) => {
  devCommand({
    input: cmdOptions.input,
    port: Number(cmdOptions.port ?? 7e3),
    watch: cmdOptions.watch,
    stdio: cmdOptions.stdio
  });
});
program.command("build").description("Build tools for deployment").option("-i, --input <dir>", "Input directory containing tools", "tools").option("-o, --output <dir>", "Output directory for built tools", "dist").option("--name <name>", "Server name", "opentool-server").option("--version <version>", "Server version", "1.0.0").action(buildCommand);
program.command("validate").description("Validate metadata for registry submission").option("-i, --input <dir>", "Input directory containing tools", "tools").action(validateCommand);
program.command("validate-full").description("Full validation of tools and metadata").option("-i, --input <dir>", "Input directory containing tools", "tools").action(validateFullCommand);
program.command("metadata").description("Generate OpenTool metadata JSON without building").option("-i, --input <dir>", "Input directory containing tools", "tools").option(
  "-o, --output <file>",
  "Output file path for metadata.json",
  "metadata.json"
).option("--name <name>", "Server name", "opentool-server").option("--version <version>", "Server version", "1.0.0").action(generateMetadataCommand);
program.command("init").description("Create a new OpenTool project in the target directory").option("-d, --dir <dir>", "Target directory", ".").option("-n, --name <name>", "Project name").option("--description <description>", "Project description").option("--force", "Overwrite existing files", false).action(async (cmdOptions) => {
  await initCommand({
    dir: cmdOptions.dir,
    name: cmdOptions.name,
    description: cmdOptions.description,
    force: cmdOptions.force
  });
  console.log(`Initialized OpenTool project in ${cmdOptions.dir || "."}`);
});
program.parse();

export { buildCommand, buildProject, devCommand, generateMetadata, generateMetadataCommand, loadAndValidateTools, validateCommand, validateFullCommand };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { zodToJsonSchema } from '@alcyone-labs/zod-to-json-schema';
import { z } from 'zod';

var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
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
var HTTP_METHODS = ["GET", "HEAD", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];
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

// src/runtime/index.ts
function createDevServer(tools) {
  const metadata = loadMetadata();
  const metadataMap = buildMetadataMap(metadata);
  const adapters = buildAdapters(tools);
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
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: adapters.map(({ tool }) => serializeTool(tool, metadataMap))
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
      return await entry.invoke(request.params.arguments);
    } catch (error) {
      const message = error && error.message || String(error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true
      };
    }
  });
  return server;
}
async function createStdioServer(tools) {
  const metadata = loadMetadata();
  const metadataMap = buildMetadataMap(metadata);
  const toolDefinitions = tools || await loadToolsFromDirectory(metadataMap);
  const adapters = buildAdapters(toolDefinitions);
  const server = new Server(
    {
      name: "opentool-runtime",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: adapters.map(({ tool }) => serializeTool(tool, metadataMap))
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
      return await entry.invoke(request.params.arguments);
    } catch (error) {
      const message = error && error.message || String(error);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true
      };
    }
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP stdio server started");
}
function buildAdapters(tools) {
  return tools.filter((tool) => isMcpEnabled(tool)).map((tool) => {
    const httpHandlers = toHttpHandlerMap(tool.httpHandlers);
    const adapterOptions = {
      name: tool.metadata?.name || tool.filename,
      httpHandlers,
      ...tool.schema ? { schema: tool.schema } : {},
      ...tool.mcpConfig?.defaultMethod ? { defaultMethod: tool.mcpConfig.defaultMethod } : {}
    };
    const adapter = createMcpAdapter(adapterOptions);
    return {
      tool,
      invoke: adapter
    };
  });
}
async function loadToolsFromDirectory(metadataMap) {
  const tools = [];
  const toolsDir = path.join(process.cwd(), "tools");
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
      const exportsObject = __require(toolPath);
      const candidate = resolveModuleCandidate(exportsObject);
      if (!candidate?.schema) {
        continue;
      }
      const baseName = file.replace(/\.[^.]+$/, "");
      const name = candidate.metadata?.name || baseName;
      const meta = metadataMap.get(name);
      let inputSchema = meta?.inputSchema;
      if (!inputSchema) {
        try {
          inputSchema = zodToJsonSchema(candidate.schema, {
            name: `${name}Schema`,
            target: "jsonSchema7",
            $refStrategy: "none"
          });
        } catch {
          inputSchema = { type: "object" };
        }
      }
      inputSchema = normalizeInputSchema(inputSchema);
      const payment = candidate.payment ?? null;
      const httpHandlersRaw = collectHttpHandlers(candidate);
      const httpHandlers = [...httpHandlersRaw];
      if (httpHandlers.length === 0) {
        continue;
      }
      if (payment) {
        for (let index = 0; index < httpHandlers.length; index += 1) {
          const entry = httpHandlers[index];
          httpHandlers[index] = {
            ...entry,
            handler: withX402Payment(entry.handler, payment)
          };
        }
      }
      const mcpConfig = normalizeRuntimeMcpConfig(candidate.mcp);
      const adapterOptions = {
        name,
        httpHandlers: toHttpHandlerMap(httpHandlers),
        ...candidate.schema ? { schema: candidate.schema } : {},
        ...typeof candidate.mcp?.defaultMethod === "string" ? { defaultMethod: candidate.mcp.defaultMethod } : {}
      };
      const adapter = createMcpAdapter(adapterOptions);
      const tool = {
        ...candidate.schema ? { schema: candidate.schema } : {},
        inputSchema,
        metadata: candidate.metadata || meta || null,
        filename: baseName,
        httpHandlers,
        mcpConfig,
        handler: async (params) => adapter(params),
        payment
      };
      tools.push(tool);
    } catch (error) {
      console.warn(`Failed to load tool from ${file}: ${error}`);
    }
  }
  return tools;
}
function loadMetadata() {
  const metadataPath = path.join(process.cwd(), "metadata.json");
  if (!fs.existsSync(metadataPath)) {
    return null;
  }
  try {
    const contents = fs.readFileSync(metadataPath, "utf8");
    return JSON.parse(contents);
  } catch (error) {
    console.warn(`Failed to parse metadata.json: ${error}`);
    return null;
  }
}
function buildMetadataMap(metadata) {
  const map = /* @__PURE__ */ new Map();
  if (!metadata?.tools) {
    return map;
  }
  metadata.tools.forEach((tool) => {
    map.set(tool.name, tool);
  });
  return map;
}
function serializeTool(tool, metadataMap) {
  const name = tool.metadata?.name || tool.filename;
  const meta = metadataMap.get(name);
  return {
    name,
    description: meta?.description || tool.metadata?.description || `${tool.filename} tool`,
    inputSchema: meta?.inputSchema || tool.inputSchema,
    annotations: meta?.annotations || tool.metadata?.annotations,
    payment: meta?.payment || tool.metadata?.payment,
    discovery: meta?.discovery || tool.metadata?.discovery
  };
}
function isSupportedToolFile(file) {
  return /\.(cjs|mjs|js|ts)$/i.test(file);
}
function resolveModuleCandidate(exportsObject) {
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
function collectHttpHandlers(module) {
  const handlers = [];
  HTTP_METHODS.forEach((method) => {
    const handler = module?.[method];
    if (typeof handler === "function") {
      handlers.push({
        method,
        handler: async (request) => handler.call(module, request)
      });
    }
  });
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
    const refKey = clone.$ref.replace("#/definitions/", "");
    if (clone.definitions && typeof clone.definitions[refKey] === "object") {
      return normalizeInputSchema(clone.definitions[refKey]);
    }
  }
  delete clone.$ref;
  delete clone.definitions;
  if (!clone.type) {
    clone.type = "object";
  }
  return clone;
}
function normalizeRuntimeMcpConfig(rawConfig) {
  if (isPlainObject(rawConfig) && rawConfig.enabled === true) {
    let normalizedMode;
    if (typeof rawConfig.mode === "string") {
      const candidate = rawConfig.mode.toLowerCase();
      if (candidate === "stdio" || candidate === "lambda" || candidate === "dual") {
        normalizedMode = candidate;
      } else {
        throw new Error('mcp.mode must be one of "stdio", "lambda", or "dual"');
      }
    }
    const metadataOverrides = isPlainObject(rawConfig.metadataOverrides) ? rawConfig.metadataOverrides : void 0;
    const config = { enabled: true };
    if (normalizedMode) {
      config.mode = normalizedMode;
    }
    if (typeof rawConfig.defaultMethod === "string") {
      config.defaultMethod = rawConfig.defaultMethod.toUpperCase();
    }
    if (metadataOverrides) {
      config.metadataOverrides = metadataOverrides;
    }
    return config;
  }
  return null;
}
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isMcpEnabled(tool) {
  return Boolean(tool.mcpConfig?.enabled);
}
function resolveRuntimePath(value) {
  if (value.startsWith("file://")) {
    return fileURLToPath(value);
  }
  return path.resolve(value);
}

export { createDevServer, createStdioServer, resolveRuntimePath };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as fs2 from 'fs';
import * as path5 from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { zodToJsonSchema } from '@alcyone-labs/zod-to-json-schema';
import { z } from 'zod';
import { zeroAddress, createWalletClient, http, createPublicClient, parseUnits, encodeFunctionData, erc20Abi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrumSepolia, arbitrum, baseSepolia, mainnet, base } from 'viem/chains';
import { Turnkey } from '@turnkey/sdk-server';
import { createAccount } from '@turnkey/viem';
import { encode } from '@msgpack/msgpack';
import { keccak_256 } from '@noble/hashes/sha3';
import { hexToBytes, concatBytes, bytesToHex } from '@noble/hashes/utils';
import { tmpdir } from 'os';
import { build } from 'esbuild';
import { createRequire } from 'module';

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
var SUPPORTED_CURRENCIES = {
  USDC: {
    decimals: 6,
    symbol: "USDC",
    network: "base",
    assetAddress: "0x833589fCD6eDb6E08f4c7C37b7b4c6e997E08A43"
  }
};
var DEFAULT_FACILITATOR = {
  url: "https://facilitator.x402.rs",
  verifyPath: "/verify",
  settlePath: "/settle",
  apiKeyHeader: "Authorization"
};

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
var PAYMENT_HEADERS = [HEADER_X402, HEADER_PAYMENT_RESPONSE];
var X402Client = class {
  constructor(config) {
    this.account = privateKeyToAccount(config.privateKey);
    const chain = baseSepolia;
    this.walletClient = createWalletClient({
      account: this.account,
      chain,
      transport: http(config.rpcUrl)
    });
  }
  async pay(request) {
    try {
      const initialResponse = await fetch(request.url, {
        method: request.method ?? "POST",
        headers: {
          "Content-Type": "application/json",
          ...request.headers
        },
        ...request.body ? { body: JSON.stringify(request.body) } : {}
      });
      if (initialResponse.status !== 402) {
        return {
          success: initialResponse.ok,
          response: initialResponse
        };
      }
      const paymentRequirements = await initialResponse.json();
      const x402Requirements = paymentRequirements.x402?.accepts?.[0];
      if (!x402Requirements) {
        return {
          success: false,
          error: "No x402 payment requirements found in 402 response"
        };
      }
      const authorization = await this.signTransferAuthorization({
        from: this.account.address,
        to: x402Requirements.payTo,
        value: BigInt(x402Requirements.maxAmountRequired),
        validAfter: BigInt(Math.floor(Date.now() / 1e3)),
        validBefore: BigInt(Math.floor(Date.now() / 1e3) + 900),
        // 15 min
        nonce: `0x${Array.from(
          { length: 32 },
          () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
        ).join("")}`,
        tokenAddress: x402Requirements.asset
      });
      const paymentProof = {
        x402Version: 1,
        scheme: x402Requirements.scheme,
        network: x402Requirements.network,
        correlationId: "",
        payload: {
          signature: authorization.signature,
          authorization: {
            from: authorization.from,
            to: authorization.to,
            value: authorization.value.toString(),
            validAfter: authorization.validAfter.toString(),
            validBefore: authorization.validBefore.toString(),
            nonce: authorization.nonce
          }
        }
      };
      const paymentHeader = Buffer.from(JSON.stringify(paymentProof)).toString("base64");
      const paidResponse = await fetch(request.url, {
        method: request.method ?? "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PAYMENT": paymentHeader,
          ...request.headers
        },
        ...request.body ? { body: JSON.stringify(request.body) } : {}
      });
      return {
        success: paidResponse.ok,
        response: paidResponse,
        paymentDetails: {
          amount: x402Requirements.maxAmountRequired,
          currency: x402Requirements.extra?.currencyCode ?? "USDC",
          network: x402Requirements.network,
          signature: authorization.signature
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  async signTransferAuthorization(params) {
    if (!this.walletClient.chain) {
      throw new Error("Wallet client chain not configured");
    }
    const domain = {
      name: "USD Coin",
      version: "2",
      chainId: this.walletClient.chain.id,
      verifyingContract: params.tokenAddress
    };
    const types = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" }
      ]
    };
    const message = {
      from: params.from,
      to: params.to,
      value: params.value,
      validAfter: params.validAfter,
      validBefore: params.validBefore,
      nonce: params.nonce
    };
    const signature = await this.walletClient.signTypedData({
      account: this.account,
      domain,
      types,
      primaryType: "TransferWithAuthorization",
      message
    });
    return {
      signature,
      from: params.from,
      to: params.to,
      value: params.value,
      validAfter: params.validAfter,
      validBefore: params.validBefore,
      nonce: params.nonce
    };
  }
  getAddress() {
    return this.account.address;
  }
};
async function payX402(config) {
  const client = new X402Client({
    privateKey: config.privateKey,
    ...config.rpcUrl ? { rpcUrl: config.rpcUrl } : {}
  });
  return client.pay({
    url: config.url,
    body: config.body
  });
}
var X402BrowserClient = class {
  constructor(config) {
    this.walletClient = config.walletClient;
    this.chainId = config.chainId;
  }
  async pay(request) {
    try {
      const initialResponse = await fetch(request.url, {
        method: request.method ?? "POST",
        headers: {
          "Content-Type": "application/json",
          ...request.headers
        },
        ...request.body ? { body: JSON.stringify(request.body) } : {}
      });
      if (initialResponse.status !== 402) {
        return {
          success: initialResponse.ok,
          response: initialResponse
        };
      }
      const paymentRequirements = await initialResponse.json();
      const x402Requirements = paymentRequirements.x402?.accepts?.[0];
      if (!x402Requirements) {
        return {
          success: false,
          error: "No x402 payment requirements found in 402 response"
        };
      }
      const account = this.walletClient.account;
      if (!account) {
        return {
          success: false,
          error: "No account connected to wallet"
        };
      }
      const authorization = {
        from: account.address,
        to: x402Requirements.payTo,
        value: BigInt(x402Requirements.maxAmountRequired),
        validAfter: BigInt(Math.floor(Date.now() / 1e3)),
        validBefore: BigInt(Math.floor(Date.now() / 1e3) + 900),
        nonce: `0x${Array.from(
          { length: 32 },
          () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
        ).join("")}`
      };
      const signature = await this.signTransferAuthorization(
        authorization,
        x402Requirements.asset
      );
      const paymentProof = {
        x402Version: 1,
        scheme: x402Requirements.scheme,
        network: x402Requirements.network,
        correlationId: "",
        payload: {
          signature,
          authorization: {
            from: authorization.from,
            to: authorization.to,
            value: authorization.value.toString(),
            validAfter: authorization.validAfter.toString(),
            validBefore: authorization.validBefore.toString(),
            nonce: authorization.nonce
          }
        }
      };
      const paymentHeader = btoa(JSON.stringify(paymentProof));
      const paidResponse = await fetch(request.url, {
        method: request.method ?? "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PAYMENT": paymentHeader,
          ...request.headers
        },
        ...request.body ? { body: JSON.stringify(request.body) } : {}
      });
      return {
        success: paidResponse.ok,
        response: paidResponse,
        paymentDetails: {
          amount: x402Requirements.maxAmountRequired,
          currency: x402Requirements.extra?.currencyCode ?? "USDC",
          network: x402Requirements.network,
          signature
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  async signTransferAuthorization(authorization, tokenAddress) {
    const account = this.walletClient.account;
    if (!account) {
      throw new Error("No account connected to wallet");
    }
    const domain = {
      name: "USD Coin",
      version: "2",
      chainId: this.chainId,
      verifyingContract: tokenAddress
    };
    const types = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" }
      ]
    };
    const message = {
      from: authorization.from,
      to: authorization.to,
      value: authorization.value,
      validAfter: authorization.validAfter,
      validBefore: authorization.validBefore,
      nonce: authorization.nonce
    };
    return await this.walletClient.signTypedData({
      account,
      domain,
      types,
      primaryType: "TransferWithAuthorization",
      message
    });
  }
};
async function payX402WithWallet(walletClient, chainId, request) {
  const client = new X402BrowserClient({ walletClient, chainId });
  return client.pay(request);
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
function getX402PaymentContext(request) {
  return request[PAYMENT_CONTEXT_SYMBOL];
}
function defineX402Payment(config) {
  const currencyCode = normalizeCurrency(config.currency);
  const currencySpec = SUPPORTED_CURRENCIES[currencyCode];
  if (!currencySpec) {
    throw new Error(`Unsupported currency for x402 payments: ${currencyCode}`);
  }
  const network = config.network ?? currencySpec.network;
  const assetAddress = config.assetAddress ?? currencySpec.assetAddress;
  if (!network || !assetAddress) {
    throw new Error(
      "x402 payments require a network and assetAddress; supply them or choose a supported currency."
    );
  }
  const facilitator = resolveFacilitator(config.facilitator);
  const value = toDecimalString(config.amount);
  const definition = {
    amount: value,
    currency: {
      code: currencyCode,
      symbol: currencySpec.symbol,
      decimals: currencySpec.decimals
    },
    asset: {
      symbol: currencySpec.symbol,
      network,
      address: assetAddress,
      decimals: currencySpec.decimals
    },
    payTo: config.payTo,
    scheme: config.scheme ?? "exact",
    network,
    facilitator
  };
  if (config.resource) {
    definition.resource = config.resource;
  }
  if (config.message) {
    definition.description = config.message;
  }
  if (config.metadata) {
    definition.metadata = config.metadata;
  }
  const baseMetadata = {
    amountUSDC: currencyCode === "USDC" ? Number(value) : void 0,
    facilitator: "x402rs",
    network
  };
  const metadata = config.metadata ? { ...baseMetadata, ...config.metadata } : baseMetadata;
  return {
    definition,
    metadata
  };
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
function resolveFacilitator(value) {
  if (!value) {
    return DEFAULT_FACILITATOR;
  }
  if (typeof value === "string") {
    return { ...DEFAULT_FACILITATOR, url: value };
  }
  return value;
}
function normalizeCurrency(currency) {
  return (currency ?? "USDC").toUpperCase();
}
function toDecimalString(value) {
  return typeof value === "number" ? value.toString() : value;
}

// src/adapters/mcp.ts
var HTTP_METHODS = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OPTIONS"
];
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
  const toolsDir = path5.join(process.cwd(), "tools");
  if (!fs2.existsSync(toolsDir)) {
    return tools;
  }
  const files = fs2.readdirSync(toolsDir);
  for (const file of files) {
    if (!isSupportedToolFile(file)) {
      continue;
    }
    const toolPath = path5.join(toolsDir, file);
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
        } catch (error) {
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
  const metadataPath = path5.join(process.cwd(), "metadata.json");
  if (!fs2.existsSync(metadataPath)) {
    return null;
  }
  try {
    const contents = fs2.readFileSync(metadataPath, "utf8");
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
  return path5.resolve(value);
}

// src/types/index.ts
var HTTP_METHODS2 = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OPTIONS"
];
var BASE_ALCHEMY_HOST = "https://base-mainnet.g.alchemy.com/v2/";
var ETHEREUM_ALCHEMY_HOST = "https://eth-mainnet.g.alchemy.com/v2/";
var BASE_SEPOLIA_ALCHEMY_HOST = "https://base-sepolia.g.alchemy.com/v2/";
var ARBITRUM_ALCHEMY_HOST = "https://arb-mainnet.g.alchemy.com/v2/";
var ARBITRUM_SEPOLIA_ALCHEMY_HOST = "https://arb-sepolia.g.alchemy.com/v2/";
function buildRpcResolver(host, fallbackUrls) {
  return (options) => {
    if (options?.url) {
      return options.url;
    }
    if (options?.apiKey) {
      return `${host}${options.apiKey}`;
    }
    if (fallbackUrls.length > 0) {
      return fallbackUrls[0];
    }
    throw new Error(
      "No RPC URL available: supply a full url via options or an apiKey for the default host"
    );
  };
}
var chains = {
  base: {
    id: base.id,
    slug: "base",
    name: "Base",
    chain: base,
    rpcUrl: buildRpcResolver(BASE_ALCHEMY_HOST, base.rpcUrls.default.http),
    publicRpcUrls: base.rpcUrls.default.http
  },
  ethereum: {
    id: mainnet.id,
    slug: "ethereum",
    name: "Ethereum",
    chain: mainnet,
    rpcUrl: buildRpcResolver(
      ETHEREUM_ALCHEMY_HOST,
      mainnet.rpcUrls.default.http
    ),
    publicRpcUrls: mainnet.rpcUrls.default.http
  },
  baseSepolia: {
    id: baseSepolia.id,
    slug: "base-sepolia",
    name: "Base Sepolia",
    chain: baseSepolia,
    rpcUrl: buildRpcResolver(
      BASE_SEPOLIA_ALCHEMY_HOST,
      baseSepolia.rpcUrls.default.http
    )
  },
  arbitrum: {
    id: arbitrum.id,
    slug: "arbitrum",
    name: "Arbitrum One",
    chain: arbitrum,
    rpcUrl: buildRpcResolver(
      ARBITRUM_ALCHEMY_HOST,
      arbitrum.rpcUrls.default.http
    ),
    publicRpcUrls: arbitrum.rpcUrls.default.http
  },
  arbitrumSepolia: {
    id: arbitrumSepolia.id,
    slug: "arbitrum-sepolia",
    name: "Arbitrum Sepolia",
    chain: arbitrumSepolia,
    rpcUrl: buildRpcResolver(
      ARBITRUM_SEPOLIA_ALCHEMY_HOST,
      arbitrumSepolia.rpcUrls.default.http
    ),
    publicRpcUrls: arbitrumSepolia.rpcUrls.default.http
  }
};
function createNativeToken(chainId, symbol, name) {
  return {
    [symbol]: {
      symbol,
      name,
      decimals: 18,
      address: zeroAddress,
      chainId,
      isNative: true
    }
  };
}
function token(chainId, symbol, name, address, decimals) {
  return {
    symbol,
    name,
    decimals,
    address,
    chainId
  };
}
var tokens = {
  base: {
    ...createNativeToken(base.id, "ETH", "Ether"),
    USDC: token(
      base.id,
      "USDC",
      "USD Coin",
      "0x833589fCD6eDb6E08f4c7C31c9A8Ba32D74b86B2",
      6
    )
  },
  ethereum: {
    ...createNativeToken(mainnet.id, "ETH", "Ether"),
    USDC: token(
      mainnet.id,
      "USDC",
      "USD Coin",
      "0xA0b86991c6218b36c1d19d4a2e9Eb0cE3606eB48",
      6
    )
  },
  arbitrum: {
    ...createNativeToken(arbitrum.id, "ETH", "Ether"),
    USDC: token(
      arbitrum.id,
      "USDC",
      "USD Coin",
      "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
      6
    )
  },
  arbitrumSepolia: {
    ...createNativeToken(arbitrumSepolia.id, "ETH", "Ether"),
    USDC: token(
      arbitrumSepolia.id,
      "USDC",
      "USD Coin",
      "0x1baAbB04529D43a73232B713C0FE471f7c7334d5",
      6
    )
  }
};
var DEFAULT_CHAIN = chains.base;
var DEFAULT_TOKENS = tokens.base;
var registry = {
  chains,
  tokens
};
function normalizePrivateKey(raw) {
  const trimmed = raw.trim();
  const withPrefix = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(withPrefix)) {
    throw new Error("wallet() privateKey must be a 32-byte hex string");
  }
  return withPrefix;
}
function createNonceSource(start = Date.now()) {
  let last = start;
  return () => {
    const now = Date.now();
    if (now > last) {
      last = now;
    } else {
      last += 1;
    }
    return last;
  };
}
function createPrivateKeyProvider(config) {
  const privateKey = normalizePrivateKey(config.privateKey);
  const account = privateKeyToAccount(privateKey);
  const transport = http(config.rpcUrl);
  const publicClient = createPublicClient({
    chain: config.chain.chain,
    transport
  });
  const walletClient = createWalletClient({
    account,
    chain: config.chain.chain,
    transport
  });
  async function sendTransaction(params) {
    const tx = {
      account
    };
    if (params.to) {
      tx.to = params.to;
    }
    if (params.value !== void 0) {
      tx.value = params.value;
    }
    if (params.data !== void 0) {
      tx.data = params.data;
    }
    return walletClient.sendTransaction(tx);
  }
  async function getNativeBalance() {
    return publicClient.getBalance({ address: account.address });
  }
  async function transfer(params) {
    return sendTransaction({
      to: params.to,
      value: params.amount,
      ...params.data !== void 0 ? { data: params.data } : {}
    });
  }
  return {
    address: account.address,
    account,
    walletClient,
    publicClient,
    sendTransaction,
    getNativeBalance,
    transfer,
    nonceSource: createNonceSource()
  };
}
function createNonceSource2(start = Date.now()) {
  let last = start;
  return () => {
    const now = Date.now();
    if (now > last) {
      last = now;
    } else {
      last += 1;
    }
    return last;
  };
}
async function createTurnkeyProvider(config) {
  const turnkey = new Turnkey({
    apiBaseUrl: config.apiBaseUrl ?? "https://api.turnkey.com",
    // The delegated sub-organization the API key pair belongs to.
    defaultOrganizationId: config.organizationId,
    apiPublicKey: config.apiPublicKey,
    apiPrivateKey: config.apiPrivateKey
  });
  const account = await createAccount({
    client: turnkey.apiClient(),
    organizationId: config.organizationId,
    signWith: config.signWith
  });
  const transport = http(config.rpcUrl);
  const publicClient = createPublicClient({
    chain: config.chain.chain,
    transport
  });
  const walletClient = createWalletClient({
    account,
    chain: config.chain.chain,
    transport
  });
  async function sendTransaction(params) {
    const tx = {
      account
    };
    if (params.to) {
      tx.to = params.to;
    }
    if (params.value !== void 0) {
      tx.value = params.value;
    }
    if (params.data !== void 0) {
      tx.data = params.data;
    }
    return walletClient.sendTransaction(tx);
  }
  async function getNativeBalance() {
    return publicClient.getBalance({ address: account.address });
  }
  async function transfer(params) {
    return sendTransaction({
      to: params.to,
      value: params.amount,
      ...params.data !== void 0 ? { data: params.data } : {}
    });
  }
  return {
    address: account.address,
    account,
    walletClient,
    publicClient,
    sendTransaction,
    getNativeBalance,
    transfer,
    nonceSource: createNonceSource2()
  };
}

// src/wallet/index.ts
function resolveChainSlug(reference) {
  if (reference === void 0) {
    return Object.entries(chains).find(([, meta]) => meta.id === DEFAULT_CHAIN.id)?.[0] || DEFAULT_CHAIN.slug;
  }
  if (typeof reference === "number") {
    const match = Object.entries(chains).find(([, meta]) => meta.id === reference);
    if (match) {
      return match[0];
    }
  } else if (typeof reference === "string") {
    const sanitize = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (reference in chains) {
      return reference;
    }
    const normalized = sanitize(reference);
    const keyMatch = Object.entries(chains).find(([key]) => sanitize(key) === normalized);
    if (keyMatch) {
      return keyMatch[0];
    }
    const slugMatch = Object.entries(chains).find(([, meta]) => {
      return meta.slug && sanitize(meta.slug) === normalized;
    });
    if (slugMatch) {
      return slugMatch[0];
    }
    const asNumber = Number.parseInt(normalized, 10);
    if (!Number.isNaN(asNumber)) {
      const match = Object.entries(chains).find(([, meta]) => meta.id === asNumber);
      if (match) {
        return match[0];
      }
    }
  }
  throw new Error(`Unknown chain reference: ${reference}`);
}
function getRpcUrl(chain, options) {
  const slug = resolveChainSlug(chain);
  const entry = chains[slug];
  return entry.rpcUrl(options);
}
async function wallet(options = {}) {
  const envPrivateKey = process.env.PRIVATE_KEY?.trim();
  const envTurnkey = {
    organizationId: process.env.TURNKEY_SUBORG_ID?.trim(),
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY?.trim(),
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY?.trim(),
    signWith: process.env.TURNKEY_WALLET_ADDRESS?.trim(),
    apiBaseUrl: process.env.TURNKEY_API_BASE_URL?.trim()
  };
  const effectivePrivateKey = options.privateKey ?? envPrivateKey;
  const hasTurnkeyEnv = envTurnkey.organizationId && envTurnkey.apiPublicKey && envTurnkey.apiPrivateKey && envTurnkey.signWith;
  const effectiveTurnkey = options.turnkey ?? (hasTurnkeyEnv ? {
    organizationId: envTurnkey.organizationId,
    apiPublicKey: envTurnkey.apiPublicKey,
    apiPrivateKey: envTurnkey.apiPrivateKey,
    signWith: envTurnkey.signWith,
    ...envTurnkey.apiBaseUrl ? { apiBaseUrl: envTurnkey.apiBaseUrl } : {}
  } : void 0);
  if (effectivePrivateKey && effectiveTurnkey) {
    throw new Error("wallet() cannot be initialized with both privateKey and turnkey credentials");
  }
  const slug = resolveChainSlug(options.chain);
  const chain = chains[slug];
  const tokens2 = tokens[slug] ?? {};
  const overrides = {};
  const envRpcUrl = process.env.RPC_URL?.trim();
  const envApiKey = process.env.ALCHEMY_API_KEY?.trim();
  if (options.rpcUrl ?? envRpcUrl) {
    overrides.url = options.rpcUrl ?? envRpcUrl;
  }
  if (options.apiKey ?? envApiKey) {
    overrides.apiKey = options.apiKey ?? envApiKey;
  }
  const rpcUrl = getRpcUrl(slug, overrides);
  let providerType = "readonly";
  let signerProvider;
  if (effectivePrivateKey) {
    signerProvider = createPrivateKeyProvider({
      chain,
      rpcUrl,
      privateKey: effectivePrivateKey
    });
    providerType = "privateKey";
  } else if (effectiveTurnkey) {
    const turnkeyConfig = {
      chain,
      rpcUrl,
      organizationId: effectiveTurnkey.organizationId,
      apiPublicKey: effectiveTurnkey.apiPublicKey,
      apiPrivateKey: effectiveTurnkey.apiPrivateKey,
      signWith: effectiveTurnkey.signWith
    };
    if (effectiveTurnkey.apiBaseUrl) {
      turnkeyConfig.apiBaseUrl = effectiveTurnkey.apiBaseUrl;
    }
    signerProvider = await createTurnkeyProvider(turnkeyConfig);
    providerType = "turnkey";
  }
  const publicClient = signerProvider?.publicClient ?? createPublicClient({
    chain: chain.chain,
    transport: http(rpcUrl)
  });
  const baseContext = {
    chain,
    tokens: tokens2,
    rpcUrl,
    providerType,
    publicClient,
    getRpcUrl: (override) => getRpcUrl(slug, override),
    ...signerProvider ? { address: signerProvider.address } : {}
  };
  if (signerProvider) {
    const { publicClient: _ignored, ...rest } = signerProvider;
    return {
      ...baseContext,
      ...rest
    };
  }
  return baseContext;
}
var walletToolkit = {
  chains,
  tokens,
  registry,
  defaults: {
    chain: DEFAULT_CHAIN,
    tokens: DEFAULT_TOKENS
  },
  getRpcUrl,
  wallet
};

// src/store/index.ts
var StoreError = class extends Error {
  constructor(message, status, causeData) {
    super(message);
    this.status = status;
    this.causeData = causeData;
    this.name = "StoreError";
  }
};
function resolveConfig(options) {
  const baseUrl = options?.baseUrl ?? process.env.BASE_URL ?? "https://api.openpond.ai";
  const apiKey = options?.apiKey ?? process.env.OPENPOND_API_KEY;
  if (!baseUrl) {
    throw new StoreError("BASE_URL is required to store activity events");
  }
  if (!apiKey) {
    throw new StoreError(
      "OPENPOND_API_KEY is required to store activity events"
    );
  }
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const fetchFn = options?.fetchFn ?? globalThis.fetch;
  if (!fetchFn) {
    throw new StoreError("Fetch is not available in this environment");
  }
  return { baseUrl: normalizedBaseUrl, apiKey, fetchFn };
}
async function store(input, options) {
  const { baseUrl, apiKey, fetchFn } = resolveConfig(options);
  const url = `${baseUrl}/apps/positions/tx`;
  let response;
  try {
    response = await fetchFn(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "openpond-api-key": apiKey
      },
      body: JSON.stringify(input)
    });
  } catch (error) {
    throw new StoreError("Failed to reach store endpoint", void 0, error);
  }
  if (!response.ok) {
    let body;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => void 0);
    }
    throw new StoreError(
      `Store request failed with status ${response.status}`,
      response.status,
      body
    );
  }
  try {
    const data = await response.json();
    return {
      id: data.id ?? "",
      status: data.status ?? null
    };
  } catch {
    return { id: "", status: null };
  }
}
async function retrieve(params, options) {
  const { baseUrl, apiKey, fetchFn } = resolveConfig(options);
  const url = new URL(`${baseUrl}/apps/positions/tx`);
  if (params?.source) url.searchParams.set("source", params.source);
  if (params?.walletAddress) url.searchParams.set("walletAddress", params.walletAddress);
  if (params?.symbol) url.searchParams.set("symbol", params.symbol);
  if (params?.status?.length) url.searchParams.set("status", params.status.join(","));
  if (typeof params?.since === "number") url.searchParams.set("since", params.since.toString());
  if (typeof params?.until === "number") url.searchParams.set("until", params.until.toString());
  if (typeof params?.limit === "number") url.searchParams.set("limit", params.limit.toString());
  if (params?.cursor) url.searchParams.set("cursor", params.cursor);
  if (params?.history) url.searchParams.set("history", "true");
  let response;
  try {
    response = await fetchFn(url.toString(), {
      method: "GET",
      headers: {
        "content-type": "application/json",
        "openpond-api-key": apiKey
      }
    });
  } catch (error) {
    throw new StoreError("Failed to reach store endpoint", void 0, error);
  }
  if (!response.ok) {
    let body;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => void 0);
    }
    throw new StoreError(
      `Store retrieve failed with status ${response.status}`,
      response.status,
      body
    );
  }
  const data = await response.json().catch(() => null);
  if (!data) {
    return { items: [], cursor: null };
  }
  return data;
}
var CACHE_TTL_MS = 5 * 60 * 1e3;
var API_BASES = {
  mainnet: "https://api.hyperliquid.xyz",
  testnet: "https://api.hyperliquid-testnet.xyz"
};
var HL_ENDPOINT = {
  mainnet: "https://api.hyperliquid.xyz",
  testnet: "https://api.hyperliquid-testnet.xyz"
};
var HL_CHAIN_LABEL = {
  mainnet: "Mainnet",
  testnet: "Testnet"
};
var HL_BRIDGE_ADDRESSES = {
  mainnet: "0x2df1c51e09aecf9cacb7bc98cb1742757f163df7",
  testnet: "0x08cfc1b6b2dcf36a1480b99353a354aa8ac56f89"
};
var HL_USDC_ADDRESSES = {
  mainnet: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
  testnet: "0x1baAbB04529D43a73232B713C0FE471f7c7334d5"
};
var HL_SIGNATURE_CHAIN_ID = {
  mainnet: "0xa4b1",
  testnet: "0x66eee"
};
var EXCHANGE_TYPED_DATA_DOMAIN = {
  name: "Exchange",
  version: "1",
  chainId: 1337,
  verifyingContract: "0x0000000000000000000000000000000000000000"
};
var ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
var MIN_DEPOSIT_USDC = 5;
var BUILDER_CODE = {
  address: "0x4b2aec4F91612849d6e20C9c1881FabB1A48cd12",
  fee: 100
};
var metaCache = /* @__PURE__ */ new Map();
var HyperliquidApiError = class extends Error {
  constructor(message, response) {
    super(message);
    this.response = response;
    this.name = "HyperliquidApiError";
  }
};
var HyperliquidGuardError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "HyperliquidGuardError";
  }
};
var HyperliquidTermsError = class extends HyperliquidGuardError {
  constructor(message = "Hyperliquid terms must be accepted before proceeding.") {
    super(message);
    this.name = "HyperliquidTermsError";
  }
};
var HyperliquidBuilderApprovalError = class extends HyperliquidGuardError {
  constructor(message = "Hyperliquid builder approval is required before using builder codes.") {
    super(message);
    this.name = "HyperliquidBuilderApprovalError";
  }
};
function createMonotonicNonceFactory(start = Date.now()) {
  let last = start;
  return () => {
    const now = Date.now();
    if (now > last) {
      last = now;
    } else {
      last += 1;
    }
    return last;
  };
}
async function getUniverse(args) {
  const cacheKey = `${args.environment}:${args.baseUrl}`;
  const cached = metaCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.universe;
  }
  const response = await args.fetcher(`${args.baseUrl}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "meta" })
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.universe) {
    throw new HyperliquidApiError(
      "Unable to load Hyperliquid metadata.",
      json ?? { status: response.status }
    );
  }
  metaCache.set(cacheKey, { fetchedAt: Date.now(), universe: json.universe });
  return json.universe;
}
function resolveAssetIndex(symbol, universe) {
  const [raw] = symbol.split("-");
  const target = raw.trim();
  const index = universe.findIndex(
    (entry) => entry.name.toUpperCase() === target.toUpperCase()
  );
  if (index === -1) {
    throw new Error(`Unknown Hyperliquid asset symbol: ${symbol}`);
  }
  return index;
}
function toApiDecimal(value) {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (!Number.isFinite(value)) {
    throw new Error("Numeric values must be finite.");
  }
  const asString = value.toString();
  if (/e/i.test(asString)) {
    const [mantissa, exponentPart] = asString.split(/e/i);
    const exponent = Number(exponentPart);
    const [integerPart, fractionalPart = ""] = mantissa.split(".");
    if (exponent >= 0) {
      return integerPart + fractionalPart.padEnd(exponent + fractionalPart.length, "0");
    }
    const zeros = "0".repeat(Math.abs(exponent) - 1);
    return `0.${zeros}${integerPart}${fractionalPart}`.replace(/\.0+$/, "");
  }
  return asString;
}
function normalizeHex(value) {
  const lower = value.toLowerCase();
  return lower.replace(/^0x0+/, "0x") || "0x0";
}
function normalizeAddress(value) {
  return normalizeHex(value);
}
async function signL1Action(args) {
  const { wallet: wallet2, action, nonce, vaultAddress, expiresAfter, isTestnet } = args;
  const actionHash = createL1ActionHash({
    action,
    nonce,
    vaultAddress,
    expiresAfter
  });
  const message = {
    source: isTestnet ? "b" : "a",
    connectionId: actionHash
  };
  const signatureHex = await wallet2.walletClient.signTypedData({
    account: wallet2.account,
    domain: EXCHANGE_TYPED_DATA_DOMAIN,
    types: {
      Agent: [
        { name: "source", type: "string" },
        { name: "connectionId", type: "bytes32" }
      ]
    },
    primaryType: "Agent",
    message
  });
  return splitSignature(signatureHex);
}
async function signSpotSend(args) {
  const {
    wallet: wallet2,
    hyperliquidChain,
    signatureChainId,
    destination,
    token: token2,
    amount,
    time
  } = args;
  const domain = {
    name: "HyperliquidSignTransaction",
    version: "1",
    chainId: Number.parseInt(signatureChainId, 16),
    verifyingContract: ZERO_ADDRESS
  };
  const message = {
    hyperliquidChain,
    destination,
    token: token2,
    amount,
    time
  };
  const types = {
    "HyperliquidTransaction:SpotSend": [
      { name: "hyperliquidChain", type: "string" },
      { name: "destination", type: "string" },
      { name: "token", type: "string" },
      { name: "amount", type: "string" },
      { name: "time", type: "uint64" }
    ]
  };
  const signatureHex = await wallet2.walletClient.signTypedData({
    account: wallet2.account,
    domain,
    types,
    primaryType: "HyperliquidTransaction:SpotSend",
    message
  });
  return splitSignature(signatureHex);
}
async function signApproveBuilderFee(args) {
  const { wallet: wallet2, maxFeeRate, nonce, signatureChainId, isTestnet } = args;
  const hyperliquidChain = isTestnet ? "Testnet" : "Mainnet";
  const domain = {
    name: "HyperliquidSignTransaction",
    version: "1",
    chainId: Number.parseInt(signatureChainId, 16),
    verifyingContract: ZERO_ADDRESS
  };
  const message = {
    hyperliquidChain,
    maxFeeRate,
    builder: BUILDER_CODE.address,
    nonce
  };
  const types = {
    "HyperliquidTransaction:ApproveBuilderFee": [
      { name: "hyperliquidChain", type: "string" },
      { name: "maxFeeRate", type: "string" },
      { name: "builder", type: "address" },
      { name: "nonce", type: "uint64" }
    ]
  };
  const signatureHex = await wallet2.walletClient.signTypedData({
    account: wallet2.account,
    domain,
    types,
    primaryType: "HyperliquidTransaction:ApproveBuilderFee",
    message
  });
  return splitSignature(signatureHex);
}
async function signUserPortfolioMargin(args) {
  const { wallet: wallet2, action } = args;
  const domain = {
    name: "HyperliquidSignTransaction",
    version: "1",
    chainId: Number.parseInt(action.signatureChainId, 16),
    verifyingContract: ZERO_ADDRESS
  };
  const message = {
    enabled: action.enabled,
    hyperliquidChain: action.hyperliquidChain,
    user: action.user,
    nonce: BigInt(action.nonce)
  };
  const types = {
    "HyperliquidTransaction:UserPortfolioMargin": [
      { name: "enabled", type: "bool" },
      { name: "hyperliquidChain", type: "string" },
      { name: "user", type: "address" },
      { name: "nonce", type: "uint64" }
    ]
  };
  const signatureHex = await wallet2.walletClient.signTypedData({
    account: wallet2.account,
    domain,
    types,
    primaryType: "HyperliquidTransaction:UserPortfolioMargin",
    message
  });
  return splitSignature(signatureHex);
}
function splitSignature(signature) {
  const cleaned = signature.slice(2);
  const rHex = `0x${cleaned.slice(0, 64)}`;
  const sHex = `0x${cleaned.slice(64, 128)}`;
  let v = parseInt(cleaned.slice(128, 130), 16);
  if (Number.isNaN(v)) {
    throw new Error("Invalid signature returned by wallet client.");
  }
  if (v < 27) {
    v += 27;
  }
  const normalizedV = v === 27 || v === 28 ? v : v % 2 ? 27 : 28;
  return {
    r: normalizeHex(rHex),
    s: normalizeHex(sHex),
    v: normalizedV
  };
}
function createL1ActionHash(args) {
  const { action, nonce, vaultAddress, expiresAfter } = args;
  const actionBytes = encode(action, { ignoreUndefined: true });
  const nonceBytes = toUint64Bytes(nonce);
  const vaultMarker = vaultAddress ? new Uint8Array([1]) : new Uint8Array([0]);
  const vaultBytes = vaultAddress ? hexToBytes(vaultAddress.slice(2)) : new Uint8Array();
  const hasExpiresAfter = typeof expiresAfter === "number";
  const expiresMarker = hasExpiresAfter ? new Uint8Array([0]) : new Uint8Array();
  const expiresBytes = hasExpiresAfter && expiresAfter !== void 0 ? toUint64Bytes(expiresAfter) : new Uint8Array();
  const bytes = concatBytes(
    actionBytes,
    nonceBytes,
    vaultMarker,
    vaultBytes,
    expiresMarker,
    expiresBytes
  );
  const hash = keccak_256(bytes);
  return `0x${bytesToHex(hash)}`;
}
function toUint64Bytes(value) {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(value));
  return bytes;
}
function getBridgeAddress(env) {
  const override = process.env.HYPERLIQUID_BRIDGE_ADDRESS;
  if (override?.trim()) {
    return normalizeAddress(override);
  }
  return HL_BRIDGE_ADDRESSES[env];
}
function getUsdcAddress(env) {
  const override = process.env.HYPERLIQUID_USDC_ADDRESS;
  if (override?.trim()) {
    return normalizeAddress(override);
  }
  return HL_USDC_ADDRESSES[env];
}
function getSignatureChainId(env) {
  const override = process.env.HYPERLIQUID_SIGNATURE_CHAIN_ID;
  const selected = override?.trim() || HL_SIGNATURE_CHAIN_ID[env];
  return normalizeHex(selected);
}
function assertPositiveNumber(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
}

// src/adapters/hyperliquid/exchange.ts
var HyperliquidExchangeClient = class {
  constructor(args) {
    this.wallet = args.wallet;
    this.environment = args.environment ?? "mainnet";
    this.vaultAddress = args.vaultAddress;
    this.expiresAfter = args.expiresAfter;
    const resolvedNonceSource = args.walletNonceProvider ?? args.wallet.nonceSource ?? args.nonceSource;
    if (!resolvedNonceSource) {
      throw new Error(
        "Wallet nonce source is required for Hyperliquid exchange actions."
      );
    }
    this.nonceSource = resolvedNonceSource;
  }
  cancel(cancels) {
    return cancelHyperliquidOrders({
      wallet: this.wallet,
      cancels,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  cancelByCloid(cancels) {
    return cancelHyperliquidOrdersByCloid({
      wallet: this.wallet,
      cancels,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  cancelAll() {
    return cancelAllHyperliquidOrders({
      wallet: this.wallet,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  scheduleCancel(time) {
    return scheduleHyperliquidCancel({
      wallet: this.wallet,
      time,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  modify(modification) {
    return modifyHyperliquidOrder({
      wallet: this.wallet,
      modification,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  batchModify(modifications) {
    return batchModifyHyperliquidOrders({
      wallet: this.wallet,
      modifications,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  twapOrder(twap) {
    return placeHyperliquidTwapOrder({
      wallet: this.wallet,
      twap,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  twapCancel(cancel) {
    return cancelHyperliquidTwapOrder({
      wallet: this.wallet,
      cancel,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  updateLeverage(input) {
    return updateHyperliquidLeverage({
      wallet: this.wallet,
      input,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  updateIsolatedMargin(input) {
    return updateHyperliquidIsolatedMargin({
      wallet: this.wallet,
      input,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  reserveRequestWeight(weight) {
    return reserveHyperliquidRequestWeight({
      wallet: this.wallet,
      weight,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  spotSend(params) {
    return sendHyperliquidSpot({
      wallet: this.wallet,
      environment: this.environment,
      nonceSource: this.nonceSource,
      ...params
    });
  }
  setPortfolioMargin(params) {
    const base2 = {
      wallet: this.wallet,
      enabled: params.enabled,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    };
    return setHyperliquidPortfolioMargin(
      params.user ? { ...base2, user: params.user } : base2
    );
  }
};
async function setHyperliquidPortfolioMargin(options) {
  const env = options.environment ?? "mainnet";
  if (!options.wallet?.account || !options.wallet.walletClient) {
    throw new Error(
      "Wallet with signing capability is required for portfolio margin."
    );
  }
  const nonce = options.nonce ?? options.walletNonceProvider?.() ?? options.wallet.nonceSource?.() ?? options.nonceSource?.() ?? Date.now();
  const signatureChainId = getSignatureChainId(env);
  const hyperliquidChain = HL_CHAIN_LABEL[env];
  const user = normalizeAddress(
    options.user ?? options.wallet.address
  );
  const action = {
    type: "userPortfolioMargin",
    enabled: Boolean(options.enabled),
    hyperliquidChain,
    signatureChainId,
    user,
    nonce
  };
  const signature = await signUserPortfolioMargin({
    wallet: options.wallet,
    action
  });
  const body = {
    action,
    nonce,
    signature
  };
  if (options.vaultAddress) {
    body.vaultAddress = normalizeAddress(options.vaultAddress);
  }
  if (typeof options.expiresAfter === "number") {
    body.expiresAfter = options.expiresAfter;
  }
  return postExchange(env, body);
}
async function cancelHyperliquidOrders(options) {
  options.cancels.forEach((c) => assertSymbol(c.symbol));
  const action = {
    type: "cancel",
    cancels: await withAssetIndexes(options, options.cancels, (idx, entry) => ({
      a: idx,
      o: entry.oid
    }))
  };
  return submitExchangeAction(options, action);
}
async function cancelHyperliquidOrdersByCloid(options) {
  options.cancels.forEach((c) => assertSymbol(c.symbol));
  const action = {
    type: "cancelByCloid",
    cancels: await withAssetIndexes(
      options,
      options.cancels,
      (idx, entry) => ({
        a: idx,
        c: normalizeAddress(entry.cloid)
      })
    )
  };
  return submitExchangeAction(options, action);
}
async function cancelAllHyperliquidOrders(options) {
  const action = { type: "cancelAll" };
  return submitExchangeAction(options, action);
}
async function scheduleHyperliquidCancel(options) {
  if (options.time !== null) {
    assertPositiveNumber(options.time, "time");
  }
  const action = { type: "scheduleCancel", time: options.time };
  return submitExchangeAction(options, action);
}
async function modifyHyperliquidOrder(options) {
  const { modification } = options;
  const order = await buildOrder(modification.order, options);
  const action = {
    type: "modify",
    oid: modification.oid,
    order
  };
  return submitExchangeAction(options, action);
}
async function batchModifyHyperliquidOrders(options) {
  options.modifications.forEach((m) => assertSymbol(m.order.symbol));
  const modifies = await Promise.all(
    options.modifications.map(async (mod) => ({
      oid: mod.oid,
      order: await buildOrder(mod.order, options)
    }))
  );
  const action = {
    type: "batchModify",
    modifies
  };
  return submitExchangeAction(options, action);
}
async function placeHyperliquidTwapOrder(options) {
  const { twap } = options;
  assertSymbol(twap.symbol);
  assertPositiveDecimal(twap.size, "size");
  assertPositiveNumber(twap.minutes, "minutes");
  const env = options.environment ?? "mainnet";
  const universe = await getUniverse({
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch
  });
  const asset = resolveAssetIndex(twap.symbol, universe);
  const action = {
    type: "twapOrder",
    twap: {
      a: asset,
      b: twap.side === "buy",
      s: toApiDecimal(twap.size),
      r: Boolean(twap.reduceOnly),
      m: twap.minutes,
      t: Boolean(twap.randomize)
    }
  };
  return submitExchangeAction(options, action);
}
async function cancelHyperliquidTwapOrder(options) {
  assertSymbol(options.cancel.symbol);
  const env = options.environment ?? "mainnet";
  const universe = await getUniverse({
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch
  });
  const asset = resolveAssetIndex(options.cancel.symbol, universe);
  const action = {
    type: "twapCancel",
    a: asset,
    t: options.cancel.twapId
  };
  return submitExchangeAction(options, action);
}
async function updateHyperliquidLeverage(options) {
  assertSymbol(options.input.symbol);
  assertPositiveNumber(options.input.leverage, "leverage");
  const env = options.environment ?? "mainnet";
  const universe = await getUniverse({
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch
  });
  const asset = resolveAssetIndex(options.input.symbol, universe);
  const action = {
    type: "updateLeverage",
    asset,
    isCross: options.input.leverageMode === "cross",
    leverage: options.input.leverage
  };
  return submitExchangeAction(options, action);
}
async function updateHyperliquidIsolatedMargin(options) {
  assertSymbol(options.input.symbol);
  assertPositiveNumber(options.input.ntli, "ntli");
  const env = options.environment ?? "mainnet";
  const universe = await getUniverse({
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch
  });
  const asset = resolveAssetIndex(options.input.symbol, universe);
  const action = {
    type: "updateIsolatedMargin",
    asset,
    isBuy: options.input.isBuy,
    ntli: options.input.ntli
  };
  return submitExchangeAction(options, action);
}
async function reserveHyperliquidRequestWeight(options) {
  assertPositiveNumber(options.weight, "weight");
  const action = {
    type: "reserveRequestWeight",
    weight: options.weight
  };
  return submitExchangeAction(options, action);
}
async function createHyperliquidSubAccount(options) {
  assertString(options.name, "name");
  const action = {
    type: "createSubAccount",
    name: options.name
  };
  return submitExchangeAction(options, action);
}
async function transferHyperliquidSubAccount(options) {
  assertString(options.subAccountUser, "subAccountUser");
  const usdScaled = normalizeUsdToInt(options.usd);
  const action = {
    type: "subAccountTransfer",
    subAccountUser: normalizeAddress(options.subAccountUser),
    isDeposit: Boolean(options.isDeposit),
    usd: usdScaled
  };
  return submitExchangeAction(options, action);
}
async function sendHyperliquidSpot(options) {
  const env = options.environment ?? "mainnet";
  if (!options.wallet.account || !options.wallet.walletClient) {
    throw new Error("Wallet with signing capability is required for spotSend.");
  }
  assertString(options.token, "token");
  assertPositiveDecimal(options.amount, "amount");
  const signatureChainId = getSignatureChainId(env);
  const hyperliquidChain = HL_CHAIN_LABEL[env];
  const nonce = options.nonce ?? options.nonceSource?.() ?? Date.now();
  const time = BigInt(nonce);
  const signature = await signSpotSend({
    wallet: options.wallet,
    hyperliquidChain,
    signatureChainId,
    destination: normalizeAddress(options.destination),
    token: options.token,
    amount: toApiDecimal(options.amount),
    time
  });
  const action = {
    type: "spotSend",
    hyperliquidChain,
    signatureChainId,
    destination: normalizeAddress(options.destination),
    token: options.token,
    amount: toApiDecimal(options.amount),
    time: nonce
  };
  return postExchange(env, { action, nonce, signature });
}
async function submitExchangeAction(options, action) {
  if (!options.wallet?.account || !options.wallet.walletClient) {
    throw new Error("Hyperliquid exchange actions require a signing wallet.");
  }
  const env = options.environment ?? "mainnet";
  const nonceSource = options.walletNonceProvider ?? options.wallet.nonceSource ?? options.nonceSource;
  if (!nonceSource && options.nonce === void 0) {
    throw new Error("Wallet nonce source is required for Hyperliquid exchange actions.");
  }
  const effectiveNonce = options.nonce ?? nonceSource?.();
  if (effectiveNonce === void 0) {
    throw new Error("Hyperliquid exchange actions require a nonce.");
  }
  const signature = await signL1Action({
    wallet: options.wallet,
    action,
    nonce: effectiveNonce,
    vaultAddress: options.vaultAddress ? normalizeAddress(options.vaultAddress) : void 0,
    expiresAfter: options.expiresAfter,
    isTestnet: env === "testnet"
  });
  const body = {
    action,
    nonce: effectiveNonce,
    signature
  };
  if (options.vaultAddress) {
    body.vaultAddress = normalizeAddress(options.vaultAddress);
  }
  if (typeof options.expiresAfter === "number") {
    body.expiresAfter = options.expiresAfter;
  }
  return postExchange(env, body);
}
async function withAssetIndexes(options, entries, mapper) {
  const env = options.environment ?? "mainnet";
  const universe = await getUniverse({
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch
  });
  return Promise.all(
    entries.map(async (entry) => {
      const assetIndex = resolveAssetIndex(entry.symbol, universe);
      return mapper(assetIndex, entry);
    })
  );
}
async function buildOrder(intent, options) {
  assertSymbol(intent.symbol);
  assertPositiveDecimal(intent.price, "price");
  assertPositiveDecimal(intent.size, "size");
  const env = options.environment ?? "mainnet";
  const universe = await getUniverse({
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch
  });
  const assetIndex = resolveAssetIndex(intent.symbol, universe);
  const limitOrTrigger = intent.trigger ? mapTrigger(intent.trigger) : {
    limit: {
      tif: intent.tif ?? "Ioc"
    }
  };
  return {
    a: assetIndex,
    b: intent.side === "buy",
    p: toApiDecimal(intent.price),
    s: toApiDecimal(intent.size),
    r: intent.reduceOnly ?? false,
    t: limitOrTrigger,
    ...intent.clientId ? {
      c: normalizeAddress(intent.clientId)
    } : {}
  };
}
function mapTrigger(trigger) {
  assertPositiveDecimal(trigger.triggerPx, "triggerPx");
  return {
    trigger: {
      isMarket: Boolean(trigger.isMarket),
      triggerPx: toApiDecimal(trigger.triggerPx),
      tpsl: trigger.tpsl
    }
  };
}
function assertSymbol(value) {
  assertString(value, "symbol");
}
function normalizeUsdToInt(value) {
  if (typeof value === "bigint") {
    if (value < 0n) {
      throw new Error("usd must be non-negative.");
    }
    return Number(value);
  }
  const parsed = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("usd must be a non-negative number.");
  }
  return Math.round(parsed * 1e6);
}
function assertString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}
function assertPositiveDecimal(value, label) {
  if (typeof value === "number") {
    assertPositiveNumber(value, label);
    return;
  }
  if (typeof value === "bigint") {
    if (value <= 0n) {
      throw new Error(`${label} must be positive.`);
    }
    return;
  }
  assertString(value, label);
}
async function postExchange(env, body) {
  const response = await fetch(`${API_BASES[env]}/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json) {
    throw new HyperliquidApiError(
      "Hyperliquid exchange action failed.",
      json ?? { status: response.status }
    );
  }
  if (json.status !== "ok") {
    throw new HyperliquidApiError("Hyperliquid exchange returned error.", json);
  }
  return json;
}

// src/adapters/hyperliquid/info.ts
async function postInfo(environment, payload) {
  const baseUrl = API_BASES[environment];
  const response = await fetch(`${baseUrl}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new HyperliquidApiError(
      "Hyperliquid info request failed.",
      data ?? { status: response.status }
    );
  }
  return data;
}
var HyperliquidInfoClient = class {
  constructor(environment = "mainnet") {
    this.environment = environment;
  }
  meta() {
    return fetchHyperliquidMeta(this.environment);
  }
  metaAndAssetCtxs() {
    return fetchHyperliquidMetaAndAssetCtxs(this.environment);
  }
  spotMeta() {
    return fetchHyperliquidSpotMeta(this.environment);
  }
  spotMetaAndAssetCtxs() {
    return fetchHyperliquidSpotMetaAndAssetCtxs(this.environment);
  }
  assetCtxs() {
    return fetchHyperliquidAssetCtxs(this.environment);
  }
  spotAssetCtxs() {
    return fetchHyperliquidSpotAssetCtxs(this.environment);
  }
  openOrders(user) {
    return fetchHyperliquidOpenOrders({ user, environment: this.environment });
  }
  frontendOpenOrders(user) {
    return fetchHyperliquidFrontendOpenOrders({
      user,
      environment: this.environment
    });
  }
  orderStatus(user, oid) {
    return fetchHyperliquidOrderStatus({
      user,
      oid,
      environment: this.environment
    });
  }
  historicalOrders(user) {
    return fetchHyperliquidHistoricalOrders({
      user,
      environment: this.environment
    });
  }
  userFills(user) {
    return fetchHyperliquidUserFills({ user, environment: this.environment });
  }
  userFillsByTime(user, startTime, endTime) {
    return fetchHyperliquidUserFillsByTime({
      user,
      startTime,
      endTime,
      environment: this.environment
    });
  }
  userRateLimit(user) {
    return fetchHyperliquidUserRateLimit({
      user,
      environment: this.environment
    });
  }
  preTransferCheck(user, source) {
    return fetchHyperliquidPreTransferCheck({
      user,
      source,
      environment: this.environment
    });
  }
  spotClearinghouseState(user) {
    return fetchHyperliquidSpotClearinghouseState({
      user,
      environment: this.environment
    });
  }
};
async function fetchHyperliquidMeta(environment = "mainnet") {
  return postInfo(environment, { type: "meta" });
}
async function fetchHyperliquidMetaAndAssetCtxs(environment = "mainnet") {
  return postInfo(environment, { type: "metaAndAssetCtxs" });
}
async function fetchHyperliquidSpotMeta(environment = "mainnet") {
  return postInfo(environment, { type: "spotMeta" });
}
async function fetchHyperliquidSpotMetaAndAssetCtxs(environment = "mainnet") {
  return postInfo(environment, { type: "spotMetaAndAssetCtxs" });
}
async function fetchHyperliquidAssetCtxs(environment = "mainnet") {
  return postInfo(environment, { type: "assetCtxs" });
}
async function fetchHyperliquidSpotAssetCtxs(environment = "mainnet") {
  return postInfo(environment, { type: "spotAssetCtxs" });
}
async function fetchHyperliquidOpenOrders(params) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, { type: "openOrders", user: normalizeAddress(params.user) });
}
async function fetchHyperliquidFrontendOpenOrders(params) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "frontendOpenOrders",
    user: normalizeAddress(params.user)
  });
}
async function fetchHyperliquidOrderStatus(params) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "orderStatus",
    user: normalizeAddress(params.user),
    oid: params.oid
  });
}
async function fetchHyperliquidHistoricalOrders(params) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "historicalOrders",
    user: normalizeAddress(params.user)
  });
}
async function fetchHyperliquidUserFills(params) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "userFills",
    user: normalizeAddress(params.user)
  });
}
async function fetchHyperliquidUserFillsByTime(params) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "userFillsByTime",
    user: normalizeAddress(params.user),
    startTime: params.startTime,
    endTime: params.endTime
  });
}
async function fetchHyperliquidUserRateLimit(params) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "userRateLimit",
    user: normalizeAddress(params.user)
  });
}
async function fetchHyperliquidPreTransferCheck(params) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "preTransferCheck",
    user: normalizeAddress(params.user),
    source: normalizeAddress(params.source)
  });
}
async function fetchHyperliquidSpotClearinghouseState(params) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "spotClearinghouseState",
    user: normalizeAddress(params.user)
  });
}

// src/adapters/hyperliquid/index.ts
async function placeHyperliquidOrder(options) {
  const {
    wallet: wallet2,
    orders,
    grouping = "na",
    environment,
    vaultAddress,
    expiresAfter,
    nonce
  } = options;
  const effectiveBuilder = BUILDER_CODE;
  if (!wallet2?.account || !wallet2.walletClient) {
    throw new Error(
      "Hyperliquid order signing requires a wallet with signing capabilities."
    );
  }
  if (!orders.length) {
    throw new Error("At least one order is required.");
  }
  const inferredEnvironment = environment ?? "mainnet";
  const resolvedBaseUrl = API_BASES[inferredEnvironment];
  const universe = await getUniverse({
    baseUrl: resolvedBaseUrl,
    environment: inferredEnvironment,
    fetcher: fetch
  });
  const preparedOrders = orders.map((intent) => {
    const assetIndex = resolveAssetIndex(intent.symbol, universe);
    const limitOrTrigger = intent.trigger ? {
      trigger: {
        isMarket: Boolean(intent.trigger.isMarket),
        triggerPx: toApiDecimal(intent.trigger.triggerPx),
        tpsl: intent.trigger.tpsl
      }
    } : {
      limit: {
        tif: intent.tif ?? "Ioc"
      }
    };
    const order = {
      a: assetIndex,
      b: intent.side === "buy",
      p: toApiDecimal(intent.price),
      s: toApiDecimal(intent.size),
      r: intent.reduceOnly ?? false,
      t: limitOrTrigger,
      ...intent.clientId ? {
        c: normalizeHex(intent.clientId)
      } : {}
    };
    return order;
  });
  const action = {
    type: "order",
    orders: preparedOrders,
    grouping
  };
  if (effectiveBuilder) {
    action.builder = {
      b: normalizeAddress(effectiveBuilder.address),
      f: effectiveBuilder.fee
    };
  }
  const effectiveNonce = nonce ?? Date.now();
  const signature = await signL1Action({
    wallet: wallet2,
    action,
    nonce: effectiveNonce,
    ...vaultAddress ? { vaultAddress } : {},
    ...typeof expiresAfter === "number" ? { expiresAfter } : {},
    isTestnet: inferredEnvironment === "testnet"
  });
  const body = {
    action,
    nonce: effectiveNonce,
    signature
  };
  if (vaultAddress) {
    body.vaultAddress = normalizeAddress(vaultAddress);
  }
  if (typeof expiresAfter === "number") {
    body.expiresAfter = expiresAfter;
  }
  const response = await fetch(`${resolvedBaseUrl}/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const rawText = await response.text().catch(() => null);
  let parsed = null;
  if (rawText && rawText.length) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }
  }
  const json = parsed && typeof parsed === "object" && "status" in parsed ? parsed : null;
  if (!response.ok || !json) {
    const detail = parsed?.error ?? parsed?.message ?? (typeof parsed === "string" ? parsed : rawText);
    const suffix = detail ? ` Detail: ${detail}` : "";
    throw new HyperliquidApiError(
      `Failed to submit Hyperliquid order.${suffix}`,
      parsed ?? rawText ?? { status: response.status }
    );
  }
  if (json.status !== "ok") {
    const detail = parsed?.error ?? rawText;
    throw new HyperliquidApiError(
      detail ? `Hyperliquid API returned an error status: ${detail}` : "Hyperliquid API returned an error status.",
      json
    );
  }
  const statuses = json.response?.data?.statuses ?? [];
  const errorStatuses = statuses.filter(
    (entry) => "error" in entry
  );
  if (errorStatuses.length) {
    const message = errorStatuses.map((entry) => entry.error).join(", ");
    throw new HyperliquidApiError(
      message || "Hyperliquid rejected the order.",
      json
    );
  }
  return json;
}
async function depositToHyperliquidBridge(options) {
  const { environment, amount, wallet: wallet2 } = options;
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error("Deposit amount must be a positive number.");
  }
  if (parsedAmount < MIN_DEPOSIT_USDC) {
    throw new Error(`Minimum deposit is ${MIN_DEPOSIT_USDC} USDC.`);
  }
  if (!wallet2.account || !wallet2.walletClient) {
    throw new Error("Wallet with signing capability is required for deposit.");
  }
  const bridgeAddress = getBridgeAddress(environment);
  const usdcAddress = getUsdcAddress(environment);
  const amountUnits = parseUnits(amount, 6);
  if (!wallet2.walletClient || !wallet2.publicClient) {
    throw new Error(
      "Wallet client and public client are required for deposit."
    );
  }
  const walletClient = wallet2.walletClient;
  const publicClient = wallet2.publicClient;
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [bridgeAddress, amountUnits]
  });
  const txHash = await walletClient.sendTransaction({
    account: wallet2.account,
    to: usdcAddress,
    data
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return {
    txHash,
    amount: parsedAmount,
    amountUnits: amountUnits.toString(),
    environment,
    bridgeAddress
  };
}
async function withdrawFromHyperliquid(options) {
  const { environment, amount, destination, wallet: wallet2 } = options;
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error("Withdraw amount must be a positive number.");
  }
  if (!wallet2.account || !wallet2.walletClient || !wallet2.publicClient) {
    throw new Error(
      "Wallet client and public client are required for withdraw."
    );
  }
  const signatureChainId = getSignatureChainId(environment);
  const hyperliquidChain = HL_CHAIN_LABEL[environment];
  const domain = {
    name: "HyperliquidSignTransaction",
    version: "1",
    chainId: Number.parseInt(signatureChainId, 16),
    verifyingContract: ZERO_ADDRESS
  };
  const time = BigInt(Date.now());
  const nonce = Number(time);
  const normalizedDestination = normalizeAddress(destination);
  const message = {
    hyperliquidChain,
    destination: normalizedDestination,
    amount: parsedAmount.toString(),
    time
  };
  const types = {
    "HyperliquidTransaction:Withdraw": [
      { name: "hyperliquidChain", type: "string" },
      { name: "destination", type: "string" },
      { name: "amount", type: "string" },
      { name: "time", type: "uint64" }
    ]
  };
  const signatureHex = await wallet2.walletClient.signTypedData({
    account: wallet2.account,
    domain,
    types,
    primaryType: "HyperliquidTransaction:Withdraw",
    message
  });
  const signature = splitSignature(signatureHex);
  const payload = {
    action: {
      type: "withdraw3",
      signatureChainId,
      hyperliquidChain,
      destination: normalizedDestination,
      amount: parsedAmount.toString(),
      time: nonce
    },
    nonce,
    signature
  };
  const endpoint = `${HL_ENDPOINT[environment]}/exchange`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || json?.status !== "ok") {
    throw new Error(
      `Hyperliquid withdraw failed: ${json?.response ?? json?.error ?? response.statusText}`
    );
  }
  return {
    amount: parsedAmount,
    destination: normalizedDestination,
    environment,
    nonce,
    status: json.status ?? "ok"
  };
}
async function fetchHyperliquidClearinghouseState(params) {
  const { environment, walletAddress } = params;
  const response = await fetch(`${HL_ENDPOINT[environment]}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "clearinghouseState", user: walletAddress })
  });
  const data = await response.json().catch(() => null);
  return {
    ok: response.ok,
    data
  };
}
async function approveHyperliquidBuilderFee(options) {
  const { environment, wallet: wallet2, nonce, signatureChainId } = options;
  if (!wallet2?.account || !wallet2.walletClient) {
    throw new Error(
      "Hyperliquid builder approval requires a wallet with signing capabilities."
    );
  }
  const maxFeeRateValue = BUILDER_CODE.fee / 1e3;
  const formattedPercent = `${maxFeeRateValue}%`;
  const normalizedBuilder = normalizeAddress(BUILDER_CODE.address);
  const inferredEnvironment = environment ?? "mainnet";
  const resolvedBaseUrl = API_BASES[inferredEnvironment];
  const maxFeeRate = formattedPercent;
  const effectiveNonce = nonce ?? Date.now();
  const signatureNonce = BigInt(effectiveNonce);
  const signatureChainHex = signatureChainId ?? getSignatureChainId(inferredEnvironment);
  const approvalSignature = await signApproveBuilderFee({
    wallet: wallet2,
    maxFeeRate,
    nonce: signatureNonce,
    signatureChainId: signatureChainHex,
    isTestnet: inferredEnvironment === "testnet"
  });
  const action = {
    type: "approveBuilderFee",
    maxFeeRate,
    builder: normalizedBuilder,
    hyperliquidChain: HL_CHAIN_LABEL[inferredEnvironment],
    signatureChainId: signatureChainHex,
    nonce: effectiveNonce
  };
  const payload = {
    action,
    nonce: effectiveNonce,
    signature: approvalSignature
  };
  const response = await fetch(`${resolvedBaseUrl}/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const rawText = await response.text().catch(() => null);
  let parsed = null;
  if (rawText && rawText.length) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }
  }
  const json = parsed && typeof parsed === "object" && "status" in parsed ? parsed : null;
  if (!response.ok || !json) {
    const detail = parsed?.error ?? parsed?.message ?? (typeof parsed === "string" ? parsed : rawText);
    const suffix = detail ? ` Detail: ${detail}` : "";
    throw new HyperliquidApiError(
      `Failed to submit builder approval.${suffix}`,
      parsed ?? rawText ?? { status: response.status }
    );
  }
  if (json.status !== "ok") {
    const detail = parsed?.error ?? rawText;
    throw new HyperliquidApiError(
      detail ? `Hyperliquid builder approval returned an error: ${detail}` : "Hyperliquid builder approval returned an error.",
      json
    );
  }
  return json;
}
async function getHyperliquidMaxBuilderFee(params) {
  const { environment, user } = params;
  const resolvedBaseUrl = API_BASES[environment];
  const response = await fetch(`${resolvedBaseUrl}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "maxBuilderFee",
      user: normalizeAddress(user),
      builder: BUILDER_CODE.address
    })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new HyperliquidApiError(
      "Failed to query max builder fee.",
      data ?? { status: response.status }
    );
  }
  return data;
}
async function recordHyperliquidTermsAcceptance(input) {
  const { environment, walletAddress, storeOptions } = input;
  return store(
    {
      source: "hyperliquid",
      ref: `${environment}-terms-${Date.now()}`,
      status: "info",
      walletAddress,
      action: "terms",
      metadata: {
        environment,
        note: "Hyperliquid does not expose a terms endpoint; this records local acknowledgement only."
      }
    },
    storeOptions
  );
}
async function recordHyperliquidBuilderApproval(input) {
  const { environment, walletAddress, storeOptions } = input;
  const maxFeeRate = `${BUILDER_CODE.fee / 1e3}%`;
  return store(
    {
      source: "hyperliquid",
      ref: `${environment}-builder-${Date.now()}`,
      status: "info",
      walletAddress,
      action: "builder-approval",
      metadata: {
        environment,
        builder: BUILDER_CODE.address,
        maxFeeRate
      }
    },
    storeOptions
  );
}
var __hyperliquidInternals = {
  toApiDecimal,
  createL1ActionHash,
  splitSignature
};

// src/ai/errors.ts
var AIError = class extends Error {
  constructor(message, options) {
    super(message);
    this.name = "AIError";
    if (options && "cause" in options) {
      this.cause = options.cause;
    }
  }
};
var AIFetchError = class extends AIError {
  constructor(message, options) {
    super(message, options);
    this.name = "AIFetchError";
  }
};
var AIResponseError = class extends AIError {
  constructor(details, message) {
    super(message ?? `AI response error: ${details.status} ${details.statusText}`);
    this.name = "AIResponseError";
    this.status = details.status;
    this.statusText = details.statusText;
    this.body = details.body;
    this.headers = details.headers ?? {};
  }
};
var AIAbortError = class extends AIError {
  constructor(message = "AI request aborted") {
    super(message);
    this.name = "AIAbortError";
  }
};

// src/ai/config.ts
var DEFAULT_BASE_URL = "https://gateway.openpond.dev";
var DEFAULT_TIMEOUT_MS = 6e4;
var DEFAULT_MODEL = "openai/gpt-5-mini";
function assertFetchAvailable(fetchImplementation) {
  if (!fetchImplementation) {
    throw new Error(
      "No fetch implementation available. Provide one via AIClientConfig.fetchImplementation."
    );
  }
}
function resolveConfig2(config = {}) {
  const fetchImplementation = config.fetchImplementation ?? globalThis.fetch;
  assertFetchAvailable(fetchImplementation);
  const resolved = {
    baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
    defaultModel: config.defaultModel ?? DEFAULT_MODEL,
    defaultHeaders: {
      "Content-Type": "application/json",
      ...config.defaultHeaders
    },
    fetchImplementation,
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  };
  if (config.apiKey !== void 0) {
    resolved.apiKey = config.apiKey;
  }
  return resolved;
}
function mergeHeaders(base2, overrides) {
  if (!overrides) {
    return { ...base2 };
  }
  const merged = { ...base2 };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === void 0) {
      continue;
    }
    merged[key] = value;
  }
  return merged;
}

// src/ai/models.ts
var MODEL_REGISTRY = [
  {
    name: "openai/gpt-5-mini",
    label: "OpenAI GPT-5 Mini",
    provider: "openai",
    supportsStreaming: true,
    supportsTools: true,
    reasoning: true,
    aliases: ["gpt-5-mini", "gpt5-mini", "gpt-5.0-mini"],
    default: true
  },
  {
    name: "anthropic/claude-4-sonnet-20250514",
    label: "Claude 4 Sonnet (20250514)",
    provider: "anthropic",
    supportsStreaming: true,
    supportsTools: true,
    aliases: ["claude-4-sonnet", "claude-sonnet"]
  },
  {
    name: "google/gemini-2.0-flash-001",
    label: "Gemini 2.0 Flash",
    provider: "google",
    supportsStreaming: true,
    supportsTools: true,
    aliases: ["gemini-2.0-flash", "gemini-flash"]
  },
  {
    name: "deepseek/deepseek-chat",
    label: "DeepSeek Chat",
    provider: "deepseek",
    supportsStreaming: true,
    supportsTools: true,
    aliases: ["deepseek-chat", "deepseek"]
  }
];
var ALIAS_LOOKUP = MODEL_REGISTRY.reduce(
  (accumulator, model) => {
    accumulator[model.name.toLowerCase()] = model.name;
    if (model.aliases) {
      for (const alias of model.aliases) {
        accumulator[alias.toLowerCase()] = model.name;
      }
    }
    return accumulator;
  },
  {}
);
var DEFAULT_MODEL_NAME = MODEL_REGISTRY.find((model) => model.default)?.name ?? MODEL_REGISTRY[0].name;
function listModels() {
  return [...MODEL_REGISTRY];
}
function getModelConfig(modelName) {
  if (!modelName) {
    return MODEL_REGISTRY.find((model) => model.default) ?? MODEL_REGISTRY[0];
  }
  const normalized = normalizeModelName(modelName);
  return MODEL_REGISTRY.find((model) => model.name === normalized);
}
function normalizeModelName(modelName) {
  if (!modelName) {
    return DEFAULT_MODEL_NAME;
  }
  const trimmed = modelName.trim();
  if (!trimmed) {
    return DEFAULT_MODEL_NAME;
  }
  const directMatch = ALIAS_LOOKUP[trimmed.toLowerCase()];
  if (directMatch) {
    return directMatch;
  }
  if (trimmed.includes("/")) {
    return trimmed;
  }
  return `openai/${trimmed}`;
}
function isStreamingSupported(modelName) {
  const config = getModelConfig(modelName);
  return config ? config.supportsStreaming : true;
}
function isToolCallingSupported(modelName) {
  const config = getModelConfig(modelName);
  return config ? config.supportsTools : true;
}

// src/ai/tools.ts
var WEBSEARCH_TOOL_NAME = "websearch";
var WEBSEARCH_TOOL_DEFINITION = {
  type: "function",
  function: {
    name: WEBSEARCH_TOOL_NAME,
    description: "Search the web using the OpenPond search engine. Returns relevant results with titles, URLs, and text content.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query"
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 5)"
        }
      },
      required: ["query"]
    }
  }
};
function resolveToolset(tools, policy) {
  if (!policy) {
    return tools;
  }
  const resolved = tools ? [...tools] : [];
  if (policy.webSearch) {
    const alreadyIncluded = resolved.some(
      (tool) => tool.type === "function" && tool.function?.name === WEBSEARCH_TOOL_NAME
    );
    if (!alreadyIncluded) {
      resolved.push(materializeWebSearchTool(policy.webSearch));
    }
  }
  return resolved.length > 0 ? resolved : void 0;
}
function materializeWebSearchTool(options) {
  if (!options || Object.keys(options).length === 0) {
    return WEBSEARCH_TOOL_DEFINITION;
  }
  const baseParameters = WEBSEARCH_TOOL_DEFINITION.function.parameters ?? {};
  const baseProperties = baseParameters.properties ?? {};
  const properties = { ...baseProperties };
  if (options.limit !== void 0) {
    const existingLimit = baseProperties["limit"];
    const limitSchema = typeof existingLimit === "object" && existingLimit !== null ? { ...existingLimit } : {
      type: "number",
      description: "Maximum number of results to return (default: 5)"
    };
    limitSchema.default = options.limit;
    properties.limit = limitSchema;
  }
  if (options.includeImages) {
    properties.includeImages = {
      type: "boolean",
      description: "Whether to include representative images in results.",
      default: true
    };
  }
  return {
    ...WEBSEARCH_TOOL_DEFINITION,
    function: {
      ...WEBSEARCH_TOOL_DEFINITION.function,
      parameters: {
        ...WEBSEARCH_TOOL_DEFINITION.function.parameters,
        properties
      }
    }
  };
}

// src/ai/messages.ts
function flattenMessageContent(content, options = {}) {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return void 0;
  }
  const separator = options.separator ?? "";
  const collected = [];
  for (const part of content) {
    const text = extractTextPart(part, options);
    if (text) {
      collected.push(text);
    }
  }
  if (collected.length === 0) {
    return void 0;
  }
  return collected.join(separator);
}
function ensureTextContent(message, options) {
  const flattened = flattenMessageContent(message.content, options);
  if (flattened !== void 0) {
    return flattened;
  }
  throw new AIError(
    options?.errorMessage ?? "Assistant response did not contain textual content."
  );
}
function extractTextPart(part, options) {
  if (!part || typeof part !== "object") {
    return void 0;
  }
  if ("text" in part && typeof part.text === "string") {
    return part.text;
  }
  if (options.includeUnknown) {
    try {
      return JSON.stringify(part);
    } catch (error) {
      return `[unserializable_part: ${String(error)}]`;
    }
  }
  return void 0;
}

// src/ai/client.ts
var CHAT_COMPLETIONS_PATH = "/v1/chat/completions";
function createAIClient(config = {}) {
  const resolved = resolveConfig2(config);
  return {
    get config() {
      return resolved;
    },
    async generateText(options) {
      return generateText(options, config);
    },
    async streamText(options) {
      return streamText(options, config);
    },
    listModels
  };
}
async function generateText(options, clientConfig = {}) {
  const resolved = resolveConfig2(clientConfig);
  const model = normalizeModelName(options.model ?? resolved.defaultModel);
  const payload = buildRequestPayload(options, model, {
    allowTools: isToolCallingSupported(model)
  });
  const headers = mergeHeaders(resolved.defaultHeaders, options.headers);
  if (resolved.apiKey) {
    headers.Authorization = `Bearer ${resolved.apiKey}`;
  }
  const endpoint = buildUrl(resolved.baseUrl, CHAT_COMPLETIONS_PATH);
  const abortBundle = createAbortBundle(
    options.abortSignal,
    options.timeoutMs ?? resolved.timeoutMs
  );
  let response;
  try {
    response = await resolved.fetchImplementation(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: abortBundle.signal
    });
  } catch (error) {
    if (abortBundle.signal.aborted) {
      throw toAbortError(abortBundle.signal.reason ?? error);
    }
    throw new AIFetchError("Failed to reach AI gateway", { cause: error });
  } finally {
    abortBundle.cleanup();
  }
  if (!response.ok) {
    const errorBody = await safeParseJson(response);
    throw new AIResponseError({
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
      headers: collectHeaders(response.headers)
    });
  }
  const data = await response.json();
  const primaryChoice = data.choices.find(isPrimaryChoice);
  if (!primaryChoice) {
    throw new AIResponseError(
      {
        status: response.status,
        statusText: response.statusText,
        body: data
      },
      "Gateway response did not contain a valid choice"
    );
  }
  const result = {
    id: data.id,
    model: data.model,
    message: primaryChoice.message,
    raw: data
  };
  if (primaryChoice.finish_reason !== void 0) {
    result.finishReason = primaryChoice.finish_reason;
  }
  if (data.usage) {
    result.usage = data.usage;
  }
  return result;
}
async function streamText(options, clientConfig = {}) {
  const resolved = resolveConfig2(clientConfig);
  const model = normalizeModelName(options.model ?? resolved.defaultModel);
  const streamExtras = buildStreamMetadataExtras(options);
  const payload = buildRequestPayload(
    options,
    model,
    {
      allowTools: isToolCallingSupported(model)
    },
    streamExtras
  );
  payload.stream = true;
  if (options.includeUsage) {
    payload.stream_options = { include_usage: true };
  }
  const headers = mergeHeaders(resolved.defaultHeaders, options.headers);
  if (resolved.apiKey) {
    headers.Authorization = `Bearer ${resolved.apiKey}`;
  }
  const endpoint = buildUrl(resolved.baseUrl, CHAT_COMPLETIONS_PATH);
  const abortBundle = createAbortBundle(
    options.abortSignal,
    options.timeoutMs ?? resolved.timeoutMs
  );
  let response;
  try {
    response = await resolved.fetchImplementation(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: abortBundle.signal
    });
  } catch (error) {
    if (abortBundle.signal.aborted) {
      throw toAbortError(abortBundle.signal.reason ?? error);
    }
    throw new AIFetchError("Failed to reach AI gateway", { cause: error });
  }
  if (!response.ok) {
    const errorBody = await safeParseJson(response);
    abortBundle.cleanup();
    throw new AIResponseError({
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
      headers: collectHeaders(response.headers)
    });
  }
  if (!response.body) {
    abortBundle.cleanup();
    throw new AIFetchError("Streaming response did not include a readable body");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const handlers = options.handlers ?? {};
  let finishedResolve;
  let finishedReject;
  const finished = new Promise((resolve4, reject) => {
    finishedResolve = resolve4;
    finishedReject = reject;
  });
  let settled = false;
  const resolveStream = () => {
    if (settled) {
      return;
    }
    settled = true;
    try {
      handlers.onDone?.();
      finishedResolve();
    } catch (error) {
      settled = false;
      rejectStream(error);
    }
  };
  const rejectStream = (reason) => {
    if (settled) {
      return;
    }
    settled = true;
    try {
      handlers.onError?.(reason);
    } catch (handlerError) {
      reason = handlerError;
    }
    finishedReject(reason);
  };
  const abort = () => abortBundle.abort();
  (async () => {
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          buffer += decoder.decode();
          buffer = buffer.replace(/\r\n/g, "\n");
          if (buffer.trim().length > 0) {
            if (processStreamEventChunk(buffer, handlers)) {
              break;
            }
          }
          resolveStream();
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, "\n");
        let boundaryIndex;
        while ((boundaryIndex = buffer.indexOf("\n\n")) !== -1) {
          const chunk = buffer.slice(0, boundaryIndex);
          buffer = buffer.slice(boundaryIndex + 2);
          if (!chunk) {
            continue;
          }
          if (processStreamEventChunk(chunk, handlers)) {
            await reader.cancel().catch(() => void 0);
            resolveStream();
            return;
          }
        }
      }
    } catch (error) {
      if (abortBundle.signal.aborted) {
        rejectStream(toAbortError(abortBundle.signal.reason ?? error));
      } else {
        rejectStream(error);
      }
    } finally {
      try {
        reader.releaseLock();
      } catch (error) {
      }
      abortBundle.cleanup();
    }
  })().catch((error) => {
    rejectStream(error);
  });
  return {
    abort,
    finished
  };
  function processStreamEventChunk(chunk, eventHandlers) {
    const dataString = extractSseData(chunk);
    if (dataString == null) {
      return false;
    }
    const trimmed = dataString.trim();
    if (trimmed === "[DONE]") {
      return true;
    }
    let payload2;
    try {
      payload2 = JSON.parse(dataString);
    } catch (error) {
      rejectStream(new AIError("Failed to parse streaming payload", { cause: error }));
      return true;
    }
    try {
      handleStreamPayload(payload2, eventHandlers);
    } catch (error) {
      rejectStream(error);
      return true;
    }
    return false;
  }
  function handleStreamPayload(payload2, eventHandlers) {
    if (!payload2 || typeof payload2 !== "object") {
      return;
    }
    if ("error" in payload2 && payload2.error) {
      const message = typeof payload2.error === "string" ? payload2.error : payload2.error.message;
      throw new AIError(message ?? "AI stream returned an error payload");
    }
    const structured = payload2;
    if (Array.isArray(structured.choices)) {
      for (const choice of structured.choices) {
        if (!choice || typeof choice !== "object") {
          continue;
        }
        const delta = choice.delta;
        if (!delta || typeof delta !== "object") {
          continue;
        }
        const deltaObject = delta;
        const textDelta = extractDeltaText(deltaObject.content);
        if (textDelta) {
          eventHandlers.onTextDelta?.(textDelta);
        }
        const reasoningDelta = extractDeltaText(deltaObject.reasoning);
        if (reasoningDelta) {
          eventHandlers.onReasoningDelta?.(reasoningDelta);
        }
        if (deltaObject.tool_calls !== void 0) {
          eventHandlers.onToolCallDelta?.(deltaObject.tool_calls);
        }
      }
    }
    if (structured.usage) {
      eventHandlers.onUsage?.(structured.usage);
    }
  }
  function extractDeltaText(value) {
    if (!value) {
      return void 0;
    }
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value)) {
      return flattenMessageContent(value);
    }
    if (typeof value === "object" && value !== null && "content" in value && Array.isArray(value.content)) {
      return flattenMessageContent(
        value.content ?? []
      );
    }
    return void 0;
  }
  function extractSseData(chunk) {
    const lines = chunk.split("\n");
    const dataLines = [];
    for (const rawLine of lines) {
      if (!rawLine) {
        continue;
      }
      const match = /^data:(.*)$/.exec(rawLine);
      if (!match) {
        continue;
      }
      const value = match[1];
      dataLines.push(value.startsWith(" ") ? value.slice(1) : value);
    }
    if (dataLines.length === 0) {
      return null;
    }
    return dataLines.join("\n");
  }
}
function buildStreamMetadataExtras(options) {
  const streamConfig = {};
  if (options.sendReasoning !== void 0) {
    streamConfig.sendReasoning = options.sendReasoning;
  }
  if (options.includeUsage !== void 0) {
    streamConfig.includeUsage = options.includeUsage;
  }
  if (Object.keys(streamConfig).length === 0) {
    return void 0;
  }
  return {
    openpond: {
      stream: streamConfig
    }
  };
}
function buildRequestPayload(options, model, capabilities, metadataExtras) {
  const payload = {
    model,
    messages: options.messages
  };
  const generation = options.generation ?? {};
  assignIfDefined(payload, "temperature", generation.temperature);
  assignIfDefined(payload, "top_p", generation.topP);
  assignIfDefined(payload, "max_tokens", generation.maxTokens);
  assignIfDefined(payload, "stop", generation.stop);
  assignIfDefined(
    payload,
    "frequency_penalty",
    generation.frequencyPenalty
  );
  assignIfDefined(payload, "presence_penalty", generation.presencePenalty);
  assignIfDefined(payload, "response_format", generation.responseFormat);
  const toolExecution = options.toolExecution;
  const enableTools = toolExecution?.enableTools ?? true;
  if (enableTools && capabilities.allowTools) {
    const resolvedTools = resolveToolset(options.tools, toolExecution);
    assignIfDefined(payload, "tools", resolvedTools);
    assignIfDefined(payload, "tool_choice", options.toolChoice);
  } else if (options.toolChoice && options.toolChoice !== "none") {
    payload.tool_choice = "none";
  }
  const metadataPayload = buildMetadataPayload(
    options.metadata,
    toolExecution,
    metadataExtras
  );
  if (metadataPayload) {
    payload.metadata = metadataPayload;
  }
  return payload;
}
function assignIfDefined(target, key, value) {
  if (value !== void 0) {
    target[key] = value;
  }
}
function buildUrl(baseUrl, path7) {
  const sanitizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${sanitizedBase}${path7}`;
}
function createAbortBundle(upstreamSignal, timeoutMs) {
  const controller = new AbortController();
  const cleanupCallbacks = [];
  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      controller.abort(upstreamSignal.reason);
    } else {
      const onAbort = () => controller.abort(upstreamSignal.reason);
      upstreamSignal.addEventListener("abort", onAbort, { once: true });
      cleanupCallbacks.push(
        () => upstreamSignal.removeEventListener("abort", onAbort)
      );
    }
  }
  if (timeoutMs && timeoutMs > 0) {
    const timeoutId = setTimeout(() => {
      controller.abort(new Error("AI request timed out"));
    }, timeoutMs);
    cleanupCallbacks.push(() => clearTimeout(timeoutId));
  }
  return {
    signal: controller.signal,
    abort: () => controller.abort(),
    cleanup: () => {
      cleanupCallbacks.forEach((fn) => fn());
    }
  };
}
function collectHeaders(headers) {
  const result = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}
function buildMetadataPayload(base2, toolExecution, extras) {
  const metadata = base2 ? { ...base2 } : {};
  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      if (value === void 0) {
        continue;
      }
      if (key === "openpond" && typeof value === "object" && value !== null) {
        const existing = {
          ...metadata.openpond ?? {}
        };
        metadata.openpond = {
          ...existing,
          ...value
        };
      } else {
        metadata[key] = value;
      }
    }
  }
  if (toolExecution) {
    const openpond = {
      ...metadata.openpond ?? {},
      toolExecution
    };
    metadata.openpond = openpond;
  }
  return Object.keys(metadata).length > 0 ? metadata : void 0;
}
async function safeParseJson(response) {
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return void 0;
  }
  try {
    return await response.json();
  } catch (error) {
    return { error: "Failed to parse error body", cause: String(error) };
  }
}
function isPrimaryChoice(choice) {
  return choice.index === 0 || choice.message !== void 0;
}
function toAbortError(reason) {
  if (reason instanceof AIAbortError) {
    return reason;
  }
  if (reason instanceof Error) {
    if (reason.name === "AbortError") {
      return new AIAbortError(reason.message || "AI request aborted");
    }
    return new AIAbortError(reason.message);
  }
  return new AIAbortError(String(reason ?? "AI request aborted"));
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
  chains: z.array(z.union([z.string(), z.number()])).optional()
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
function resolveTsconfig(projectRoot) {
  const candidate = path5.join(projectRoot, "tsconfig.json");
  if (fs2.existsSync(candidate)) {
    return candidate;
  }
  return void 0;
}
async function transpileWithEsbuild(options) {
  if (options.entryPoints.length === 0) {
    throw new Error("No entry points provided for esbuild transpilation");
  }
  const projectRoot = options.projectRoot;
  const tempBase = options.outDir ?? fs2.mkdtempSync(path5.join(tmpdir(), "opentool-"));
  if (!fs2.existsSync(tempBase)) {
    fs2.mkdirSync(tempBase, { recursive: true });
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
    const packageJsonPath = path5.join(tempBase, "package.json");
    if (!fs2.existsSync(packageJsonPath)) {
      fs2.writeFileSync(packageJsonPath, JSON.stringify({ type: "module" }), "utf8");
    }
  }
  const cleanup = () => {
    if (options.outDir) {
      return;
    }
    fs2.rmSync(tempBase, { recursive: true, force: true });
  };
  return { outDir: tempBase, cleanup };
}
createRequire(import.meta.url);
function resolveCompiledPath(outDir, originalFile, extension = ".js") {
  const baseName = path5.basename(originalFile).replace(/\.[^.]+$/, "");
  return path5.join(outDir, `${baseName}${extension}`);
}
async function importFresh(modulePath) {
  const fileUrl = pathToFileURL(modulePath).href;
  const cacheBuster = `t=${Date.now()}-${Math.random()}`;
  const separator = fileUrl.includes("?") ? "&" : "?";
  return import(`${fileUrl}${separator}${cacheBuster}`);
}

// src/cli/shared/metadata.ts
var METADATA_ENTRY = "metadata.ts";
async function loadMetadata2(projectRoot) {
  const absPath = path5.join(projectRoot, METADATA_ENTRY);
  if (!fs2.existsSync(absPath)) {
    throw new Error(
      `metadata.ts not found in ${projectRoot}. Create metadata.ts to describe your agent.`
    );
  }
  const tempDir = path5.join(projectRoot, ".opentool-temp");
  if (fs2.existsSync(tempDir)) {
    fs2.rmSync(tempDir, { recursive: true, force: true });
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
    if (fs2.existsSync(tempDir)) {
      fs2.rmSync(tempDir, { recursive: true, force: true });
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
  const packagePath = path5.join(projectRoot, "package.json");
  if (!fs2.existsSync(packagePath)) {
    return {};
  }
  try {
    const content = fs2.readFileSync(packagePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read package.json: ${error}`);
  }
}
async function buildMetadataArtifact(options) {
  const projectRoot = options.projectRoot;
  const packageInfo = readPackageJson(projectRoot);
  const { metadata: authored, sourcePath } = await loadMetadata2(projectRoot);
  const defaultsApplied = [];
  const folderName = path5.basename(projectRoot);
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
  fields.forEach((token2, idx) => {
    if (!CRON_TOKEN_REGEX.test(token2)) {
      throw new Error(`${context}: invalid cron token "${token2}" at position ${idx + 1}`);
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
async function validateCommand(options) {
  console.log("\u{1F50D} Validating OpenTool metadata...");
  try {
    const toolsDir = path5.resolve(options.input);
    if (!fs2.existsSync(toolsDir)) {
      throw new Error(`Tools directory not found: ${toolsDir}`);
    }
    const projectRoot = path5.dirname(toolsDir);
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
async function loadAndValidateTools(toolsDir, options = {}) {
  const files = fs2.readdirSync(toolsDir).filter((file) => SUPPORTED_EXTENSIONS.includes(path5.extname(file)));
  if (files.length === 0) {
    return [];
  }
  const projectRoot = options.projectRoot ?? path5.dirname(toolsDir);
  const tempDir = path5.join(toolsDir, ".opentool-temp");
  if (fs2.existsSync(tempDir)) {
    fs2.rmSync(tempDir, { recursive: true, force: true });
  }
  const kebabCase = /^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z]+$/;
  for (const f of files) {
    if (!kebabCase.test(f)) {
      throw new Error(`Tool filename must be kebab-case: ${f}`);
    }
  }
  const entryPoints = files.map((file) => path5.join(toolsDir, file));
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
      if (!fs2.existsSync(compiledPath)) {
        throw new Error(`Failed to compile ${file}`);
      }
      const moduleExports = await importFresh(compiledPath);
      const toolModule = extractToolModule(moduleExports, file);
      const schema = ensureZodSchema(toolModule.schema, file);
      const paymentExport = toolModule.payment;
      const toolName = toolModule.metadata?.name ?? toolModule.metadata?.title ?? toBaseName(file);
      const inputSchemaRaw = schema ? toJsonSchema(toolName, schema) : void 0;
      const inputSchema = normalizeInputSchema2(inputSchemaRaw);
      const httpHandlersRaw = collectHttpHandlers2(toolModule, file);
      const hasGET = typeof toolModule.GET === "function";
      const hasPOST = typeof toolModule.POST === "function";
      const otherMethods = HTTP_METHODS2.filter((m) => m !== "GET" && m !== "POST").filter(
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
      if (hasGET && schedule && typeof schedule.cron === "string" && schedule.cron.trim().length > 0) {
        normalizedSchedule = normalizeScheduleExpression(schedule.cron, file);
        if (typeof schedule.enabled === "boolean") {
          normalizedSchedule.authoredEnabled = schedule.enabled;
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
      const httpHandlerMap = toHttpHandlerMap2(httpHandlers);
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
        sourcePath: path5.join(toolsDir, file),
        handler: async (params) => adapter(params),
        payment: paymentExport ?? null,
        schedule: normalizedSchedule,
        profileDescription: typeof toolModule?.profile?.description === "string" ? toolModule.profile?.description ?? null : null
      };
      tools.push(tool);
    }
  } finally {
    cleanup();
    if (fs2.existsSync(tempDir)) {
      fs2.rmSync(tempDir, { recursive: true, force: true });
    }
  }
  return tools;
}
function extractToolModule(exportsObject, filename) {
  const candidates = [exportsObject, exportsObject?.default];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      const hasSchema = candidate.schema && typeof candidate.schema === "object";
      const hasHttp = HTTP_METHODS2.some((method) => typeof candidate[method] === "function");
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
function collectHttpHandlers2(module, filename) {
  const handlers = [];
  for (const method of HTTP_METHODS2) {
    const handler = module?.[method];
    if (typeof handler === "function") {
      handlers.push({
        method,
        handler: async (request) => handler.call(module, request)
      });
    }
  }
  handlers.sort((a, b) => HTTP_METHODS2.indexOf(a.method) - HTTP_METHODS2.indexOf(b.method));
  const duplicates = findDuplicates(handlers.map((h) => h.method));
  if (duplicates.length > 0) {
    throw new Error(
      `${filename} exports multiple handlers for HTTP method(s): ${duplicates.join(", ")}`
    );
  }
  return handlers;
}
function toHttpHandlerMap2(handlers) {
  return handlers.reduce((acc, handler) => {
    acc[handler.method.toUpperCase()] = handler.handler;
    return acc;
  }, {});
}
function normalizeInputSchema2(schema) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }
  const clone = JSON.parse(JSON.stringify(schema));
  if (typeof clone.$ref === "string" && clone.$ref.startsWith("#/definitions/")) {
    const refName = clone.$ref.replace("#/definitions/", "");
    const definitions = clone.definitions;
    if (definitions && typeof definitions[refName] === "object") {
      return normalizeInputSchema2(definitions[refName]);
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
  if (!isPlainObject2(rawConfig)) {
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
  const metadataOverrides = isPlainObject2(overridesRaw) ? overridesRaw : void 0;
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
function isPlainObject2(value) {
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

// src/cli/generate-metadata.ts
async function generateMetadataCommand(options) {
  const startTimestamp = timestamp();
  console.log(`[${startTimestamp}] Generating OpenTool metadata...`);
  try {
    const result = await generateMetadata(options);
    const endTimestamp = timestamp();
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
    const endTimestamp = timestamp();
    console.error(`[${endTimestamp}] Metadata generation failed:`, error);
    process.exit(1);
  }
}
async function generateMetadata(options) {
  const toolsDir = path5.resolve(options.input);
  if (!fs2.existsSync(toolsDir)) {
    throw new Error(`Tools directory not found: ${toolsDir}`);
  }
  const projectRoot = path5.dirname(toolsDir);
  const tools = await loadAndValidateTools(toolsDir, { projectRoot });
  const { metadata, defaultsApplied } = await buildMetadataArtifact({
    projectRoot,
    tools
  });
  const outputPath = options.output ? path5.resolve(options.output) : path5.join(projectRoot, "metadata.json");
  fs2.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
  return {
    metadata,
    defaultsApplied,
    tools,
    outputPath
  };
}
function timestamp() {
  return (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 19);
}

export { AIAbortError, AIError, AIFetchError, AIResponseError, DEFAULT_BASE_URL, DEFAULT_CHAIN, DEFAULT_FACILITATOR, DEFAULT_MODEL, DEFAULT_TIMEOUT_MS, DEFAULT_TOKENS, HTTP_METHODS2 as HTTP_METHODS, HyperliquidApiError, HyperliquidBuilderApprovalError, HyperliquidExchangeClient, HyperliquidGuardError, HyperliquidInfoClient, HyperliquidTermsError, PAYMENT_HEADERS, SUPPORTED_CURRENCIES, StoreError, WEBSEARCH_TOOL_DEFINITION, WEBSEARCH_TOOL_NAME, X402BrowserClient, X402Client, X402PaymentRequiredError, __hyperliquidInternals, approveHyperliquidBuilderFee, batchModifyHyperliquidOrders, cancelAllHyperliquidOrders, cancelHyperliquidOrders, cancelHyperliquidOrdersByCloid, cancelHyperliquidTwapOrder, chains, createAIClient, createDevServer, createHyperliquidSubAccount, createMcpAdapter, createMonotonicNonceFactory, createStdioServer, defineX402Payment, depositToHyperliquidBridge, ensureTextContent, fetchHyperliquidAssetCtxs, fetchHyperliquidClearinghouseState, fetchHyperliquidFrontendOpenOrders, fetchHyperliquidHistoricalOrders, fetchHyperliquidMeta, fetchHyperliquidMetaAndAssetCtxs, fetchHyperliquidOpenOrders, fetchHyperliquidOrderStatus, fetchHyperliquidPreTransferCheck, fetchHyperliquidSpotAssetCtxs, fetchHyperliquidSpotClearinghouseState, fetchHyperliquidSpotMeta, fetchHyperliquidSpotMetaAndAssetCtxs, fetchHyperliquidUserFills, fetchHyperliquidUserFillsByTime, fetchHyperliquidUserRateLimit, flattenMessageContent, generateMetadata, generateMetadataCommand, generateText, getHyperliquidMaxBuilderFee, getModelConfig, getRpcUrl, getX402PaymentContext, isStreamingSupported, isToolCallingSupported, listModels, loadAndValidateTools, modifyHyperliquidOrder, normalizeModelName, payX402, payX402WithWallet, placeHyperliquidOrder, placeHyperliquidTwapOrder, recordHyperliquidBuilderApproval, recordHyperliquidTermsAcceptance, registry, requireX402Payment, reserveHyperliquidRequestWeight, resolveConfig2 as resolveConfig, resolveRuntimePath, resolveToolset, responseToToolResponse, retrieve, scheduleHyperliquidCancel, sendHyperliquidSpot, setHyperliquidPortfolioMargin, store, streamText, tokens, transferHyperliquidSubAccount, updateHyperliquidIsolatedMargin, updateHyperliquidLeverage, validateCommand, wallet, walletToolkit, withX402Payment, withdrawFromHyperliquid };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
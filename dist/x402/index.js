import { z } from 'zod';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// src/x402/types.ts
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

export { DEFAULT_FACILITATOR, PAYMENT_HEADERS, SUPPORTED_CURRENCIES, X402BrowserClient, X402Client, X402PaymentRequiredError, defineX402Payment, getX402PaymentContext, payX402, payX402WithWallet, requireX402Payment, withX402Payment };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
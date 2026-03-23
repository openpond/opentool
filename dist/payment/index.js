import { z } from 'zod';

// src/helpers/payment.ts
var PAYMENT_SCHEMA_VERSION = 1;
var paymentSchemaVersionSchema = z.literal(PAYMENT_SCHEMA_VERSION);
var decimalStringSchema = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, "Value must be a positive decimal string");
var currencySchema = z.object({
  code: z.string().min(2).max(12).transform((value) => value.toUpperCase()),
  symbol: z.string().min(1).max(6).optional(),
  decimals: z.number().int().min(0).max(36).optional(),
  kind: z.enum(["fiat", "crypto"]).default("crypto").optional(),
  description: z.string().optional()
});
var paymentAmountSchema = z.object({
  value: decimalStringSchema,
  currency: currencySchema,
  display: z.string().optional()
});
var cryptoAssetSchema = z.object({
  symbol: z.string().min(2).max(12),
  network: z.string().min(1).optional(),
  chainId: z.number().int().min(0).optional(),
  address: z.string().min(1).optional(),
  decimals: z.number().int().min(0).max(36).optional(),
  standard: z.enum(["erc20", "spl", "custom"]).default("erc20").optional(),
  description: z.string().optional()
});
var facilitatorConfigSchema = z.object({
  url: z.string().url(),
  vendor: z.string().optional(),
  verifyPath: z.string().default("/verify").optional(),
  settlePath: z.string().default("/settle").optional(),
  apiKey: z.string().optional(),
  apiKeyEnv: z.string().optional(),
  apiKeyHeader: z.string().default("Authorization").optional(),
  headers: z.record(z.string(), z.string()).optional(),
  timeoutMs: z.number().int().positive().optional()
});
var settlementTermsSchema = z.object({
  windowSeconds: z.number().int().positive().optional(),
  targetConfirmations: z.number().int().positive().optional(),
  finalityDescription: z.string().optional(),
  slaDescription: z.string().optional()
});
var paymentFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean().default(true).optional(),
  description: z.string().optional(),
  example: z.string().optional()
});
var x402ProofSchema = z.object({
  mode: z.literal("x402"),
  scheme: z.string().min(1),
  network: z.string().min(1),
  version: z.number().int().min(1).optional(),
  facilitator: facilitatorConfigSchema.optional(),
  verifier: z.string().optional()
});
var directProofSchema = z.object({
  mode: z.literal("direct"),
  proofTypes: z.array(z.string().min(1)).nonempty(),
  verifier: z.string().optional(),
  instructions: z.string().optional(),
  fields: z.array(paymentFieldSchema).optional(),
  allowsManualReview: z.boolean().optional()
});
var paymentProofSchema = z.discriminatedUnion("mode", [
  x402ProofSchema,
  directProofSchema
]);
var paymentOptionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  amount: paymentAmountSchema,
  asset: cryptoAssetSchema,
  payTo: z.string().min(1),
  resource: z.string().url().optional(),
  proof: paymentProofSchema,
  settlement: settlementTermsSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});
var paymentRequirementsSchema = z.object({
  schemaVersion: paymentSchemaVersionSchema,
  message: z.string().optional(),
  title: z.string().optional(),
  resource: z.string().url().optional(),
  accepts: z.array(paymentOptionSchema).nonempty(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  fallbackText: z.string().optional()
});
var x402PaymentHeaderSchema = z.object({
  x402Version: z.number().int().min(1),
  scheme: z.string().min(1),
  network: z.string().min(1),
  payload: z.unknown(),
  correlationId: z.string().optional()
});
var directPaymentPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  optionId: z.string().min(1),
  proofType: z.string().min(1),
  payload: z.unknown(),
  metadata: z.record(z.string(), z.unknown()).optional()
});
var paymentSuccessMetadataSchema = z.object({
  optionId: z.string().min(1),
  verifier: z.string().optional(),
  txHash: z.string().optional(),
  networkId: z.string().optional(),
  amount: paymentAmountSchema.optional(),
  settledAt: z.string().datetime().optional(),
  payload: z.unknown().optional()
});
var paymentFailureSchema = z.object({
  reason: z.string().min(1),
  code: z.enum([
    "verifier_not_found",
    "verification_failed",
    "invalid_payload",
    "unsupported_option",
    "missing_header",
    "unknown"
  ]).default("unknown").optional(),
  retryable: z.boolean().optional(),
  detail: z.unknown().optional()
});

// src/helpers/payment.ts
var X402_VERSION_DEFAULT = 1;
var HEADER_X402 = "X-PAYMENT";
var HEADER_DIRECT = "X-PAYMENT-PROOF";
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
function createPaymentRequiredBody(definition) {
  const parsed = paymentRequirementsSchema.parse(definition);
  const x402Accepts = parsed.accepts.filter((option) => option.proof.mode === "x402").map(
    (option) => toX402Requirement(option, parsed.resource, option.settlement)
  ).filter((value) => Boolean(value));
  const x402Body = x402Accepts.length > 0 ? {
    x402Version: resolveX402Version(parsed.accepts),
    error: parsed.message ?? "Payment required",
    accepts: x402Accepts
  } : void 0;
  if (x402Body) {
    return {
      ...parsed,
      x402: x402Body
    };
  }
  return parsed;
}
function paymentRequiredResponse(definition, init) {
  const body = createPaymentRequiredBody(definition);
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  return new Response(JSON.stringify(body), {
    ...init,
    status: 402,
    headers
  });
}
function extractPaymentAttempts(source) {
  const attempts = [];
  const failures = [];
  const x402Header = source.headers.get(HEADER_X402);
  if (x402Header) {
    const { attempt, failure } = parseX402Header(x402Header);
    if (attempt) {
      attempts.push(attempt);
    } else if (failure) {
      failures.push(failure);
    }
  }
  const directHeader = source.headers.get(HEADER_DIRECT);
  if (directHeader) {
    const { attempt, failure } = parseDirectHeader(directHeader);
    if (attempt) {
      attempts.push(attempt);
    } else if (failure) {
      failures.push(failure);
    }
  }
  if (attempts.length === 0 && failures.length === 0) {
    failures.push(
      paymentFailureSchema.parse({
        reason: "No payment headers present",
        code: "missing_header",
        retryable: false
      })
    );
  }
  return { attempts, failures };
}
async function verifyPayment(options) {
  const definition = paymentRequirementsSchema.parse(options.definition);
  const attempts = options.attempts ? options.attempts : options.request ? extractPaymentAttempts(options.request).attempts : [];
  if (attempts.length === 0) {
    return {
      success: false,
      optionId: "",
      attemptType: "direct",
      failure: paymentFailureSchema.parse({
        reason: "No payment attempt found",
        code: "missing_header",
        retryable: false
      })
    };
  }
  for (const attempt of attempts) {
    const option = findMatchingOption(definition, attempt);
    if (!option) {
      continue;
    }
    if (attempt.type === "x402") {
      const proof = option.proof;
      const verifierId = proof.verifier ?? (proof.facilitator ? "x402:facilitator" : void 0);
      if (verifierId === "x402:facilitator" && proof.facilitator) {
        const context2 = {
          attempt,
          option,
          definition
        };
        if (options.settle !== void 0) {
          context2.settle = options.settle;
        }
        return runFacilitatorVerifier({
          ...context2,
          fetchImpl: options.fetchImpl ?? fetch
        });
      }
      const verifier = verifierId ? options.verifiers?.[verifierId] : void 0;
      if (!verifier) {
        return {
          success: false,
          optionId: option.id,
          attemptType: attempt.type,
          failure: paymentFailureSchema.parse({
            reason: `No verifier registered for id: ${verifierId ?? "(missing)"}`,
            code: "verifier_not_found",
            retryable: false
          })
        };
      }
      const context = {
        attempt,
        option,
        definition
      };
      if (options.settle !== void 0) {
        context.settle = options.settle;
      }
      return verifier(context);
    }
    if (attempt.type === "direct") {
      const proof = option.proof;
      const verifierId = proof.verifier ?? `direct:${attempt.payload.proofType}`;
      const verifier = verifierId ? options.verifiers?.[verifierId] : void 0;
      if (!verifier) {
        return {
          success: false,
          optionId: option.id,
          attemptType: attempt.type,
          failure: paymentFailureSchema.parse({
            reason: `No verifier registered for id: ${verifierId}`,
            code: "verifier_not_found",
            retryable: false
          })
        };
      }
      const context = {
        attempt,
        option,
        definition
      };
      if (options.settle !== void 0) {
        context.settle = options.settle;
      }
      return verifier(context);
    }
  }
  return {
    success: false,
    optionId: "",
    attemptType: attempts[0]?.type ?? "direct",
    failure: paymentFailureSchema.parse({
      reason: "No matching payment option for attempt",
      code: "unsupported_option",
      retryable: false
    })
  };
}
function createPaymentResponseHeader(metadata) {
  const parsed = paymentSuccessMetadataSchema.parse(metadata);
  return encodeJson(parsed);
}
function parseX402Header(value) {
  try {
    const payload = decodeJson(value, x402PaymentHeaderSchema);
    return {
      attempt: {
        type: "x402",
        headerName: HEADER_X402,
        raw: value,
        payload
      }
    };
  } catch (error) {
    return {
      failure: paymentFailureSchema.parse({
        reason: `Invalid X-PAYMENT header: ${error.message}`,
        code: "invalid_payload",
        retryable: false
      })
    };
  }
}
function parseDirectHeader(value) {
  try {
    const payload = decodeJson(value, directPaymentPayloadSchema);
    return {
      attempt: {
        type: "direct",
        headerName: HEADER_DIRECT,
        raw: value,
        payload
      }
    };
  } catch (error) {
    return {
      failure: paymentFailureSchema.parse({
        reason: `Invalid X-PAYMENT-PROOF header: ${error.message}`,
        code: "invalid_payload",
        retryable: false
      })
    };
  }
}
function findMatchingOption(definition, attempt) {
  return definition.accepts.find((candidate) => {
    const option = paymentOptionSchema.parse(candidate);
    if (attempt.type === "x402" && option.proof.mode === "x402") {
      return option.proof.scheme === attempt.payload.scheme && option.proof.network === attempt.payload.network;
    }
    if (attempt.type === "direct" && option.proof.mode === "direct") {
      return option.id === attempt.payload.optionId;
    }
    return false;
  });
}
function resolveX402Version(options) {
  const versions = [];
  for (const option of options) {
    if (option.proof.mode === "x402" && option.proof.version) {
      versions.push(option.proof.version);
    }
  }
  return versions.length > 0 ? Math.max(...versions) : X402_VERSION_DEFAULT;
}
function toX402Requirement(option, fallbackResource, settlement) {
  if (option.proof.mode !== "x402") {
    return void 0;
  }
  const decimals = resolveDecimals(option);
  const assetAddress = option.asset.address;
  if (!assetAddress) {
    throw new Error(
      `x402 payment option '${option.id}' is missing asset.address`
    );
  }
  const units = decimalToBaseUnits(option.amount.value, decimals);
  return x402RequirementSchema.parse({
    scheme: option.proof.scheme,
    network: option.proof.network,
    maxAmountRequired: units,
    asset: assetAddress,
    payTo: option.payTo,
    resource: option.resource ?? fallbackResource,
    description: option.description,
    maxTimeoutSeconds: settlement?.windowSeconds,
    extra: {
      symbol: option.asset.symbol,
      currencyCode: option.amount.currency.code,
      decimals
    }
  });
}
function resolveDecimals(option) {
  if (typeof option.asset.decimals === "number") {
    return option.asset.decimals;
  }
  if (typeof option.amount.currency.decimals === "number") {
    return option.amount.currency.decimals;
  }
  throw new Error(
    `Payment option '${option.id}' must specify asset.decimals or currency.decimals`
  );
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
function encodeJson(value) {
  const json = JSON.stringify(value);
  return Buffer.from(json, "utf-8").toString("base64");
}
function normalizeBase64(input) {
  if (/^[A-Za-z0-9+/=]+$/.test(input)) {
    return input;
  }
  const restored = input.replace(/-/g, "+").replace(/_/g, "/");
  const paddingNeeded = (4 - restored.length % 4) % 4;
  return restored + "=".repeat(paddingNeeded);
}
async function runFacilitatorVerifier({
  attempt,
  option,
  definition,
  settle,
  fetchImpl
}) {
  if (option.proof.mode !== "x402" || attempt.type !== "x402" || !option.proof.facilitator) {
    return {
      success: false,
      optionId: option.id,
      attemptType: attempt.type,
      failure: paymentFailureSchema.parse({
        reason: "Facilitator verifier invoked for non-x402 option",
        code: "verification_failed",
        retryable: false
      })
    };
  }
  const facilitator = option.proof.facilitator;
  const verifierUrl = new URL(
    facilitator.verifyPath ?? "/verify",
    ensureTrailingSlash(facilitator.url)
  ).toString();
  const requirement = toX402Requirement(option, definition.resource, option.settlement);
  if (!requirement) {
    return {
      success: false,
      optionId: option.id,
      attemptType: attempt.type,
      failure: paymentFailureSchema.parse({
        reason: "Unable to derive x402 requirement for facilitator",
        code: "verification_failed",
        retryable: false
      })
    };
  }
  const headers = buildFacilitatorHeaders(facilitator);
  const controller = facilitator.timeoutMs ? new AbortController() : void 0;
  const timeout = facilitator.timeoutMs ? setTimeout(() => controller?.abort(), facilitator.timeoutMs) : void 0;
  try {
    const verifyResponse = await fetchImpl(verifierUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        x402Version: attempt.payload.x402Version,
        paymentHeader: attempt.raw,
        paymentRequirements: requirement
      }),
      signal: controller?.signal ?? null
    });
    if (!verifyResponse.ok) {
      return {
        success: false,
        optionId: option.id,
        attemptType: attempt.type,
        failure: paymentFailureSchema.parse({
          reason: `Facilitator verify request failed: ${verifyResponse.status}`,
          code: "verification_failed",
          retryable: verifyResponse.status >= 500
        })
      };
    }
    const verifyPayload = await verifyResponse.json();
    if (!verifyPayload.isValid) {
      return {
        success: false,
        optionId: option.id,
        attemptType: attempt.type,
        failure: paymentFailureSchema.parse({
          reason: verifyPayload.invalidReason ?? "Facilitator verification failed",
          code: "verification_failed",
          retryable: false
        })
      };
    }
    if (!settle) {
      return {
        success: true,
        optionId: option.id,
        attemptType: attempt.type,
        metadata: paymentSuccessMetadataSchema.parse({
          optionId: option.id,
          verifier: facilitator.vendor ?? "facilitator"
        })
      };
    }
    const settleUrl = new URL(
      facilitator.settlePath ?? "/settle",
      ensureTrailingSlash(facilitator.url)
    ).toString();
    const settleResponse = await fetchImpl(settleUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        x402Version: attempt.payload.x402Version,
        paymentHeader: attempt.raw,
        paymentRequirements: requirement
      }),
      signal: controller?.signal ?? null
    });
    if (!settleResponse.ok) {
      return {
        success: false,
        optionId: option.id,
        attemptType: attempt.type,
        failure: paymentFailureSchema.parse({
          reason: `Facilitator settle request failed: ${settleResponse.status}`,
          code: "verification_failed",
          retryable: settleResponse.status >= 500
        })
      };
    }
    const settlePayload = await settleResponse.json();
    if (!settlePayload.success) {
      return {
        success: false,
        optionId: option.id,
        attemptType: attempt.type,
        failure: paymentFailureSchema.parse({
          reason: settlePayload.error ?? "Facilitator settlement failed",
          code: "verification_failed",
          retryable: false
        })
      };
    }
    const metadata = paymentSuccessMetadataSchema.parse({
      optionId: option.id,
      verifier: facilitator.vendor ?? "facilitator",
      txHash: settlePayload.txHash ?? void 0,
      networkId: settlePayload.networkId ?? void 0
    });
    return {
      success: true,
      optionId: option.id,
      attemptType: attempt.type,
      metadata,
      responseHeaders: {
        [HEADER_PAYMENT_RESPONSE]: createPaymentResponseHeader(metadata)
      }
    };
  } catch (error) {
    return {
      success: false,
      optionId: option.id,
      attemptType: attempt.type,
      failure: paymentFailureSchema.parse({
        reason: `Facilitator request error: ${error.message}`,
        code: "verification_failed",
        retryable: false
      })
    };
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
function buildFacilitatorHeaders(config) {
  const headers = {
    "content-type": "application/json"
  };
  if (config?.headers) {
    Object.assign(headers, config.headers);
  }
  const apiKey = resolveFacilitatorApiKey(config);
  if (apiKey) {
    const headerName = config?.apiKeyHeader ?? "Authorization";
    headers[headerName] = apiKey;
  }
  return headers;
}
function resolveFacilitatorApiKey(config) {
  if (!config) {
    return void 0;
  }
  if (config.apiKey) {
    return config.apiKey;
  }
  if (config.apiKeyEnv && typeof process !== "undefined") {
    return process.env?.[config.apiKeyEnv];
  }
  return void 0;
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
var PAYMENT_HEADERS = {
  x402: HEADER_X402,
  direct: HEADER_DIRECT,
  response: HEADER_PAYMENT_RESPONSE
};

// src/payment/index.ts
var DEFAULT_ID_X402 = "x402";
var DEFAULT_ID_402 = "402";
var SUPPORTED_CURRENCIES = {
  USDC: {
    decimals: 6,
    symbol: "USDC",
    x402: {
      network: "base",
      assetAddress: "0x833589fCD6eDb6E08f4c7C37b7b4c6e997E08A43"
    }
  }
};
var DEFAULT_FACILITATORS = {
  opentool: "https://facilitator.opentool.dev/x402",
  coinbase: "https://payments.coinbase.com/x402"
};
var PAYMENT_CONTEXT_SYMBOL = Symbol.for("opentool.payment.context");
var PaymentRequiredError = class extends Error {
  constructor(response, verification) {
    super("Payment required");
    this.name = "PaymentRequiredError";
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
function getPaymentContext(request) {
  return request[PAYMENT_CONTEXT_SYMBOL];
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
function withPaymentRequirement(handler, payment, options = {}) {
  return async (request) => {
    const verification = await requirePayment(request, payment, options);
    if (verification instanceof Response) {
      return verification;
    }
    setPaymentContext(request, verification);
    const response = await Promise.resolve(handler(request));
    return applyPaymentHeaders(response, verification.headers);
  };
}
function definePayment(config) {
  const verifiers = {
    ...config.verifiers ?? {}
  };
  const methods = config.acceptedMethods ?? ["402"];
  const includeX402 = methods.includes("x402");
  const includePlain402 = methods.includes("402");
  if (!includeX402 && !includePlain402) {
    throw new Error(
      "definePayment requires at least one payment transport (x402 or 402)"
    );
  }
  const currencyCode = normalizeCurrency(config.currency);
  const currencySpec = SUPPORTED_CURRENCIES[currencyCode];
  if (!currencySpec) {
    throw new Error(`Unsupported currency for payments: ${currencyCode}`);
  }
  const decimals = currencySpec.decimals;
  const symbol = currencySpec.symbol;
  const value = toDecimalString(config.amount);
  const accepts = [];
  if (includeX402) {
    const overrides = config.x402 ?? {};
    const defaults = currencySpec.x402;
    if (!defaults && (!overrides.network || !overrides.assetAddress)) {
      throw new Error(
        "x402 payments require a network and assetAddress; supply them or choose a supported currency."
      );
    }
    const facilitator = resolveFacilitator(
      config.facilitator ?? overrides.facilitator ?? "opentool"
    );
    accepts.push(
      paymentOptionSchema.parse({
        id: overrides.id ?? DEFAULT_ID_X402,
        title: `Pay ${value} ${currencyCode}`,
        amount: {
          value,
          currency: { code: currencyCode, symbol, decimals }
        },
        asset: {
          symbol,
          network: overrides.network ?? defaults?.network ?? "",
          address: overrides.assetAddress ?? defaults?.assetAddress ?? "",
          decimals,
          standard: "erc20"
        },
        payTo: config.payTo,
        proof: {
          mode: "x402",
          network: overrides.network ?? defaults?.network ?? "",
          scheme: overrides.scheme ?? "exact",
          version: overrides.version ?? 1,
          facilitator,
          verifier: facilitator ? "x402:facilitator" : void 0
        },
        settlement: overrides.settlement
      })
    );
  }
  if (includePlain402) {
    const overrides = config.direct ?? {};
    const id = overrides.id ?? DEFAULT_ID_402;
    const verifierId = overrides.verifierId ?? `direct:${id}`;
    const proofType = overrides.proofType ?? id;
    const verifier = overrides.verify ?? buildDefaultDirectVerifier(overrides.token, verifierId, id);
    verifiers[verifierId] = verifier;
    accepts.push(
      paymentOptionSchema.parse({
        id,
        title: `Pay ${value} ${currencyCode}`,
        amount: {
          value,
          currency: { code: currencyCode, symbol, decimals }
        },
        asset: {
          symbol,
          decimals,
          standard: "erc20"
        },
        payTo: config.payTo,
        proof: {
          mode: "direct",
          proofTypes: [proofType],
          verifier: verifierId,
          instructions: overrides.instructions,
          fields: overrides.fields,
          allowsManualReview: overrides.allowsManualReview
        },
        settlement: overrides.settlement
      })
    );
  }
  const facilitatorLabel = includeX402 ? resolveFacilitatorLabel(config.facilitator ?? config.x402?.facilitator) : void 0;
  const baseMetadata = {};
  if (currencyCode === "USDC") {
    baseMetadata.amountUSDC = Number(value);
  }
  baseMetadata.x402 = includeX402;
  baseMetadata.plain402 = includePlain402;
  baseMetadata.acceptedMethods = methods;
  baseMetadata.acceptedCurrencies = config.acceptedCurrencies ?? [currencyCode];
  if (config.chainIds) {
    baseMetadata.chainIds = config.chainIds;
  }
  if (facilitatorLabel) {
    baseMetadata.facilitator = facilitatorLabel;
  }
  const metadata = config.metadata ? { ...baseMetadata, ...config.metadata } : baseMetadata;
  const definition = {
    schemaVersion: PAYMENT_SCHEMA_VERSION,
    accepts,
    metadata
  };
  if (config.message !== void 0) {
    definition.message = config.message;
  }
  if (config.resource !== void 0) {
    definition.resource = config.resource;
  }
  const defined = {
    definition,
    verifiers,
    metadata
  };
  if (config.message !== void 0) {
    defined.message = config.message;
  }
  return defined;
}
async function requirePayment(request, payment, options = {}) {
  const { definition, verifiers } = normalizePayment(payment);
  const mergedVerifiers = {
    ...verifiers,
    ...options.verifiers ?? {}
  };
  const verifyOptions = {
    definition,
    request
  };
  if (Object.keys(mergedVerifiers).length > 0) {
    verifyOptions.verifiers = mergedVerifiers;
  }
  if (options.settle !== void 0) {
    verifyOptions.settle = options.settle;
  }
  if (options.fetchImpl) {
    verifyOptions.fetchImpl = options.fetchImpl;
  }
  const verification = await verifyPayment(verifyOptions);
  if (!verification.success || !verification.metadata) {
    if (options.onFailure) {
      return options.onFailure(verification);
    }
    const response = paymentRequiredResponse(definition);
    throw new PaymentRequiredError(response, verification);
  }
  return {
    payment: verification.metadata,
    headers: verification.responseHeaders ?? {},
    optionId: verification.optionId,
    result: verification
  };
}
function normalizePayment(payment) {
  if (isDefinedPayment(payment)) {
    return {
      definition: payment.definition,
      verifiers: payment.verifiers ?? {}
    };
  }
  return {
    definition: payment,
    verifiers: {}
  };
}
function isDefinedPayment(value) {
  return !!value && typeof value === "object" && "definition" in value && value.definition !== void 0;
}
function resolveFacilitator(value) {
  if (!value) {
    return void 0;
  }
  if (typeof value === "string") {
    if (value in DEFAULT_FACILITATORS) {
      return {
        url: DEFAULT_FACILITATORS[value]
      };
    }
    return { url: value };
  }
  return value;
}
function resolveFacilitatorLabel(value) {
  if (!value) {
    return "opentool";
  }
  if (typeof value === "string") {
    if (value === "opentool" || value === "coinbase") {
      return value;
    }
    return "custom";
  }
  return "custom";
}
function normalizeCurrency(currency) {
  return (currency ?? "USDC").toUpperCase();
}
function toDecimalString(value) {
  return typeof value === "number" ? value.toString() : value;
}
function buildDefaultDirectVerifier(expectedToken, verifierId, optionId) {
  return async ({ attempt, option }) => {
    if (attempt.type !== "direct") {
      return {
        success: false,
        optionId: option.id,
        attemptType: attempt.type,
        failure: {
          reason: "Expected direct payment payload",
          code: "invalid_payload"
        }
      };
    }
    const payload = attempt.payload.payload;
    if (expectedToken) {
      if (payload?.token !== expectedToken) {
        return {
          success: false,
          optionId: option.id,
          attemptType: attempt.type,
          failure: {
            reason: "Invalid or missing payment proof",
            code: "verification_failed"
          }
        };
      }
    } else if (!payload) {
      return {
        success: false,
        optionId: option.id,
        attemptType: attempt.type,
        failure: {
          reason: "Payment proof is required",
          code: "verification_failed"
        }
      };
    }
    return {
      success: true,
      optionId,
      attemptType: attempt.type,
      metadata: {
        optionId,
        verifier: verifierId,
        payload
      }
    };
  };
}

export { PAYMENT_HEADERS, PaymentRequiredError, definePayment, getPaymentContext, requirePayment, withPaymentRequirement };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
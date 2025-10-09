import { z } from "zod";
import {
  DirectPaymentPayload,
  directPaymentPayloadSchema,
  DirectProofConfig,
  PaymentFailure,
  paymentFailureSchema,
  PaymentOption,
  paymentOptionSchema,
  PaymentRequirementsDefinition,
  paymentRequirementsSchema,
  PaymentSuccessMetadata,
  paymentSuccessMetadataSchema,
  SettlementTerms,
  X402PaymentHeader,
  x402PaymentHeaderSchema,
  X402ProofConfig,
} from "../types/payment";

const X402_VERSION_DEFAULT = 1;
const HEADER_X402 = "X-PAYMENT";
const HEADER_DIRECT = "X-PAYMENT-PROOF";
export const HEADER_PAYMENT_RESPONSE = "X-PAYMENT-RESPONSE";

const x402RequirementSchema = z.object({
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
  extra: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type X402Requirement = z.infer<typeof x402RequirementSchema>;

export interface X402RequirementsResponse {
  x402Version: number;
  error?: string;
  accepts: X402Requirement[];
}

export interface PaymentRequiredBody extends PaymentRequirementsDefinition {
  x402?: X402RequirementsResponse;
}

export type PaymentAttempt =
  | {
      type: "x402";
      headerName: typeof HEADER_X402;
      raw: string;
      payload: X402PaymentHeader;
    }
  | {
      type: "direct";
      headerName: typeof HEADER_DIRECT;
      raw: string;
      payload: DirectPaymentPayload;
    };

export interface ExtractAttemptsResult {
  attempts: PaymentAttempt[];
  failures: PaymentFailure[];
}

export interface PaymentVerificationContext {
  attempt: PaymentAttempt;
  option: PaymentOption;
  definition: PaymentRequirementsDefinition;
  settle?: boolean;
}

export interface PaymentVerificationResult {
  success: boolean;
  optionId: string;
  attemptType: PaymentAttempt["type"];
  metadata?: PaymentSuccessMetadata;
  failure?: PaymentFailure;
  responseHeaders?: Record<string, string>;
}

export type PaymentVerifier = (
  context: PaymentVerificationContext
) => Promise<PaymentVerificationResult>;

export interface VerifyPaymentOptions {
  definition: PaymentRequirementsDefinition;
  request?: Request;
  attempts?: PaymentAttempt[];
  settle?: boolean;
  verifiers?: Record<string, PaymentVerifier>;
  fetchImpl?: typeof fetch;
}

export function createPaymentRequiredBody(
  definition: PaymentRequirementsDefinition
): PaymentRequiredBody {
  const parsed = paymentRequirementsSchema.parse(definition);
  const x402Accepts = parsed.accepts
    .filter((option) => option.proof.mode === "x402")
    .map((option) =>
      toX402Requirement(option, parsed.resource, option.settlement)
    )
    .filter((value): value is X402Requirement => Boolean(value));

  const x402Body: X402RequirementsResponse | undefined =
    x402Accepts.length > 0
      ? {
          x402Version: resolveX402Version(parsed.accepts),
          error: parsed.message ?? "Payment required",
          accepts: x402Accepts,
        }
      : undefined;

  if (x402Body) {
    return {
      ...parsed,
      x402: x402Body,
    };
  }

  return parsed;
}

export function paymentRequiredResponse(
  definition: PaymentRequirementsDefinition,
  init?: ResponseInit
): Response {
  const body = createPaymentRequiredBody(definition);
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  return new Response(JSON.stringify(body), {
    ...init,
    status: init?.status ?? 402,
    headers,
  });
}

export function extractPaymentAttempts(
  source: Request
): ExtractAttemptsResult {
  const attempts: PaymentAttempt[] = [];
  const failures: PaymentFailure[] = [];

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
        retryable: false,
      })
    );
  }

  return { attempts, failures };
}

export async function verifyPayment(
  options: VerifyPaymentOptions
): Promise<PaymentVerificationResult> {
  const definition = paymentRequirementsSchema.parse(options.definition);
  const attempts = options.attempts
    ? options.attempts
    : options.request
    ? extractPaymentAttempts(options.request).attempts
    : [];

  if (attempts.length === 0) {
    return {
      success: false,
      optionId: "",
      attemptType: "direct",
      failure: paymentFailureSchema.parse({
        reason: "No payment attempt found",
        code: "missing_header",
        retryable: false,
      }),
    };
  }

  for (const attempt of attempts) {
    const option = findMatchingOption(definition, attempt);
    if (!option) {
      continue;
    }

    if (attempt.type === "x402") {
      const proof = option.proof as X402ProofConfig;
      const verifierId = proof.verifier ?? (proof.facilitator ? "x402:facilitator" : undefined);
      if (verifierId === "x402:facilitator" && proof.facilitator) {
        const context: PaymentVerificationContext = {
          attempt,
          option,
          definition,
        };
        if (options.settle !== undefined) {
          context.settle = options.settle;
        }
        return runFacilitatorVerifier({
          ...context,
          fetchImpl: options.fetchImpl ?? fetch,
        });
      }

      const verifier = verifierId ? options.verifiers?.[verifierId] : undefined;
      if (!verifier) {
        return {
          success: false,
          optionId: option.id,
          attemptType: attempt.type,
          failure: paymentFailureSchema.parse({
            reason: `No verifier registered for id: ${verifierId ?? "(missing)"}`,
            code: "verifier_not_found",
            retryable: false,
          }),
        };
      }

      const context: PaymentVerificationContext = {
        attempt,
        option,
        definition,
      };
      if (options.settle !== undefined) {
        context.settle = options.settle;
      }
      return verifier(context);
    }

    if (attempt.type === "direct") {
      const proof = option.proof as DirectProofConfig;
      const verifierId = proof.verifier ?? `direct:${attempt.payload.proofType}`;
      const verifier = verifierId ? options.verifiers?.[verifierId] : undefined;
      if (!verifier) {
        return {
          success: false,
          optionId: option.id,
          attemptType: attempt.type,
          failure: paymentFailureSchema.parse({
            reason: `No verifier registered for id: ${verifierId}`,
            code: "verifier_not_found",
            retryable: false,
          }),
        };
      }

      const context: PaymentVerificationContext = {
        attempt,
        option,
        definition,
      };
      if (options.settle !== undefined) {
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
      retryable: false,
    }),
  };
}

export function createPaymentResponseHeader(
  metadata: PaymentSuccessMetadata
): string {
  const parsed = paymentSuccessMetadataSchema.parse(metadata);
  return encodeJson(parsed);
}

function parseX402Header(value: string): {
  attempt?: PaymentAttempt;
  failure?: PaymentFailure;
} {
  try {
    const payload = decodeJson(value, x402PaymentHeaderSchema);
    return {
      attempt: {
        type: "x402",
        headerName: HEADER_X402,
        raw: value,
        payload,
      },
    };
  } catch (error) {
    return {
      failure: paymentFailureSchema.parse({
        reason: `Invalid X-PAYMENT header: ${(error as Error).message}`,
        code: "invalid_payload",
        retryable: false,
      }),
    };
  }
}

function parseDirectHeader(value: string): {
  attempt?: PaymentAttempt;
  failure?: PaymentFailure;
} {
  try {
    const payload = decodeJson(value, directPaymentPayloadSchema);
    return {
      attempt: {
        type: "direct",
        headerName: HEADER_DIRECT,
        raw: value,
        payload,
      },
    };
  } catch (error) {
    return {
      failure: paymentFailureSchema.parse({
        reason: `Invalid X-PAYMENT-PROOF header: ${(error as Error).message}`,
        code: "invalid_payload",
        retryable: false,
      }),
    };
  }
}

function findMatchingOption(
  definition: PaymentRequirementsDefinition,
  attempt: PaymentAttempt
): PaymentOption | undefined {
  return definition.accepts.find((candidate) => {
    const option = paymentOptionSchema.parse(candidate);
    if (attempt.type === "x402" && option.proof.mode === "x402") {
      return (
        option.proof.scheme === attempt.payload.scheme &&
        option.proof.network === attempt.payload.network
      );
    }

    if (attempt.type === "direct" && option.proof.mode === "direct") {
      return option.id === attempt.payload.optionId;
    }

    return false;
  });
}

function resolveX402Version(options: PaymentOption[]): number {
  const versions: number[] = [];
  for (const option of options) {
    if (option.proof.mode === "x402" && option.proof.version) {
      versions.push(option.proof.version);
    }
  }
  return versions.length > 0 ? Math.max(...versions) : X402_VERSION_DEFAULT;
}

function toX402Requirement(
  option: PaymentOption,
  fallbackResource?: string,
  settlement?: SettlementTerms
): X402Requirement | undefined {
  if (option.proof.mode !== "x402") {
    return undefined;
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
      decimals,
    },
  });
}

function resolveDecimals(option: PaymentOption): number {
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

function decimalToBaseUnits(value: string, decimals: number): string {
  const [whole, fraction = ""] = value.split(".");
  const sanitizedFraction = fraction.slice(0, decimals);
  const paddedFraction = sanitizedFraction.padEnd(decimals, "0");
  const combined = `${whole}${paddedFraction}`.replace(/^0+/, "");
  return combined.length > 0 ? combined : "0";
}

function decodeJson<T>(value: string, schema: z.ZodSchema<T>): T {
  const base64 = normalizeBase64(value);
  const json = Buffer.from(base64, "base64").toString("utf-8");
  const parsed = JSON.parse(json);
  return schema.parse(parsed);
}

function encodeJson(value: unknown): string {
  const json = JSON.stringify(value);
  return Buffer.from(json, "utf-8").toString("base64");
}

function normalizeBase64(input: string): string {
  if (/^[A-Za-z0-9+/=]+$/.test(input)) {
    return input;
  }
  const restored = input.replace(/-/g, "+").replace(/_/g, "/");
  const paddingNeeded = (4 - (restored.length % 4)) % 4;
  return restored + "=".repeat(paddingNeeded);
}

async function runFacilitatorVerifier({
  attempt,
  option,
  definition,
  settle,
  fetchImpl,
}: PaymentVerificationContext & { fetchImpl: typeof fetch }): Promise<
  PaymentVerificationResult
> {
  if (option.proof.mode !== "x402" || attempt.type !== "x402" || !option.proof.facilitator) {
    return {
      success: false,
      optionId: option.id,
      attemptType: attempt.type,
      failure: paymentFailureSchema.parse({
        reason: "Facilitator verifier invoked for non-x402 option",
        code: "verification_failed",
        retryable: false,
      }),
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
        retryable: false,
      }),
    };
  }

  const headers = buildFacilitatorHeaders(facilitator);
  const controller = facilitator.timeoutMs
    ? new AbortController()
    : undefined;
  const timeout = facilitator.timeoutMs
    ? setTimeout(() => controller?.abort(), facilitator.timeoutMs)
    : undefined;

  try {
    const verifyResponse = await fetchImpl(verifierUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        x402Version: attempt.payload.x402Version,
        paymentHeader: attempt.raw,
        paymentRequirements: requirement,
      }),
      signal: controller?.signal ?? null,
    });

    if (!verifyResponse.ok) {
      return {
        success: false,
        optionId: option.id,
        attemptType: attempt.type,
        failure: paymentFailureSchema.parse({
          reason: `Facilitator verify request failed: ${verifyResponse.status}`,
          code: "verification_failed",
          retryable: verifyResponse.status >= 500,
        }),
      };
    }

    const verifyPayload = (await verifyResponse.json()) as {
      isValid: boolean;
      invalidReason?: string | null;
    };

    if (!verifyPayload.isValid) {
      return {
        success: false,
        optionId: option.id,
        attemptType: attempt.type,
        failure: paymentFailureSchema.parse({
          reason: verifyPayload.invalidReason ?? "Facilitator verification failed",
          code: "verification_failed",
          retryable: false,
        }),
      };
    }

    if (!settle) {
      return {
        success: true,
        optionId: option.id,
        attemptType: attempt.type,
        metadata: paymentSuccessMetadataSchema.parse({
          optionId: option.id,
          verifier: facilitator.vendor ?? "facilitator",
        }),
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
        paymentRequirements: requirement,
      }),
      signal: controller?.signal ?? null,
    });

    if (!settleResponse.ok) {
      return {
        success: false,
        optionId: option.id,
        attemptType: attempt.type,
        failure: paymentFailureSchema.parse({
          reason: `Facilitator settle request failed: ${settleResponse.status}`,
          code: "verification_failed",
          retryable: settleResponse.status >= 500,
        }),
      };
    }

    const settlePayload = (await settleResponse.json()) as {
      success: boolean;
      error?: string | null;
      txHash?: string | null;
      networkId?: string | null;
    };

    if (!settlePayload.success) {
      return {
        success: false,
        optionId: option.id,
        attemptType: attempt.type,
        failure: paymentFailureSchema.parse({
          reason: settlePayload.error ?? "Facilitator settlement failed",
          code: "verification_failed",
          retryable: false,
        }),
      };
    }

    const metadata = paymentSuccessMetadataSchema.parse({
      optionId: option.id,
      verifier: facilitator.vendor ?? "facilitator",
      txHash: settlePayload.txHash ?? undefined,
      networkId: settlePayload.networkId ?? undefined,
    });

    return {
      success: true,
      optionId: option.id,
      attemptType: attempt.type,
      metadata,
      responseHeaders: {
        [HEADER_PAYMENT_RESPONSE]: createPaymentResponseHeader(metadata),
      },
    };
  } catch (error) {
    return {
      success: false,
      optionId: option.id,
      attemptType: attempt.type,
      failure: paymentFailureSchema.parse({
        reason: `Facilitator request error: ${(error as Error).message}`,
        code: "verification_failed",
        retryable: false,
      }),
    };
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function buildFacilitatorHeaders(config: X402ProofConfig["facilitator"]): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
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

function resolveFacilitatorApiKey(
  config: X402ProofConfig["facilitator"]
): string | undefined {
  if (!config) {
    return undefined;
  }
  if (config.apiKey) {
    return config.apiKey;
  }
  if (config.apiKeyEnv && typeof process !== "undefined") {
    return process.env?.[config.apiKeyEnv];
  }
  return undefined;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

export const PAYMENT_HEADERS = {
  x402: HEADER_X402,
  direct: HEADER_DIRECT,
  response: HEADER_PAYMENT_RESPONSE,
} as const;

export { PAYMENT_SCHEMA_VERSION } from "../types/payment";

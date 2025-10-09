import type { PaymentVerifier } from "../helpers/payment";
import {
  PAYMENT_HEADERS,
  paymentRequiredResponse,
  verifyPayment,
  type PaymentVerificationResult,
} from "../helpers/payment";
import {
  PAYMENT_SCHEMA_VERSION,
  paymentOptionSchema,
  type DirectProofConfig,
  type PaymentField,
  type PaymentOption,
  type PaymentRequirementsDefinition,
  type PaymentSuccessMetadata,
  type SettlementTerms,
  type X402ProofConfig,
} from "../types/payment";

const DEFAULT_ID_X402 = "x402";
const DEFAULT_ID_402 = "402";
interface CurrencySpec {
  decimals: number;
  symbol: string;
  x402?: {
    network: string;
    assetAddress: string;
  };
}

const SUPPORTED_CURRENCIES: Record<string, CurrencySpec> = {
  USDC: {
    decimals: 6,
    symbol: "USDC",
    x402: {
      network: "base",
      assetAddress: "0x833589fCD6eDb6E08f4c7C37b7b4c6e997E08A43",
    },
  },
};

const DEFAULT_FACILITATORS = {
  opentool: "https://facilitator.opentool.dev/x402",
  coinbase: "https://payments.coinbase.com/x402",
} as const;

export interface DefinedPayment {
  definition: PaymentRequirementsDefinition;
  verifiers: Record<string, PaymentVerifier>;
  metadata?: Record<string, unknown>;
  message?: string;
}

export interface RequirePaymentOptions {
  settle?: boolean;
  verifiers?: Record<string, PaymentVerifier>;
  fetchImpl?: typeof fetch;
  onFailure?: (result: PaymentVerificationResult) => Response;
}

export interface RequirePaymentSuccess {
  payment: PaymentSuccessMetadata;
  headers: Record<string, string>;
  optionId: string;
  result: PaymentVerificationResult;
}

export type RequirePaymentOutcome = Response | RequirePaymentSuccess;

const PAYMENT_CONTEXT_SYMBOL = Symbol.for("opentool.payment.context");

export class PaymentRequiredError extends Error {
  readonly response: Response;
  readonly verification: PaymentVerificationResult | undefined;

  constructor(response: Response, verification?: PaymentVerificationResult) {
    super("Payment required");
    this.name = "PaymentRequiredError";
    this.response = response;
    this.verification = verification;
  }
}

export type PaymentContext = RequirePaymentSuccess;

function setPaymentContext(request: Request, context: PaymentContext): void {
  try {
    Object.defineProperty(request, PAYMENT_CONTEXT_SYMBOL, {
      value: context,
      configurable: true,
      enumerable: false,
      writable: true,
    });
  } catch {
    (request as any)[PAYMENT_CONTEXT_SYMBOL] = context;
  }
}

export function getPaymentContext(
  request: Request
): PaymentContext | undefined {
  return (request as any)[PAYMENT_CONTEXT_SYMBOL];
}

function applyPaymentHeaders(
  response: Response,
  headers: Record<string, string>
): Response {
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
    headers: merged,
  });
}

export function withPaymentRequirement(
  handler: (request: Request) => Promise<Response> | Response,
  payment: DefinedPayment | PaymentRequirementsDefinition,
  options: RequirePaymentOptions = {}
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const verification = await requirePayment(request, payment, options);
    if (verification instanceof Response) {
      return verification;
    }

    setPaymentContext(request, verification);

    const response = await Promise.resolve(handler(request));
    return applyPaymentHeaders(response, verification.headers);
  };
}

export interface DefinePaymentConfig {
  amount: string | number;
  payTo: string;
  currency?: string;
  message?: string;
  resource?: string;
  acceptedMethods?: ("x402" | "402")[];
  acceptedCurrencies?: string[];
  chainIds?: number[];
  facilitator?:
    | "opentool"
    | "coinbase"
    | string
    | X402ProofConfig["facilitator"];
  metadata?: Record<string, unknown>;
  verifiers?: Record<string, PaymentVerifier>;
  x402?: X402Config;
  direct?: DirectConfig;
}

export interface X402Config {
  id?: string;
  facilitator?: string | X402ProofConfig["facilitator"];
  network?: string;
  assetAddress?: string;
  scheme?: string;
  version?: number;
  settlement?: SettlementTerms;
}

export interface DirectConfig {
  id?: string;
  verifierId?: string;
  proofType?: string;
  token?: string;
  verify?: PaymentVerifier;
  instructions?: string;
  fields?: PaymentField[];
  allowsManualReview?: boolean;
  settlement?: SettlementTerms;
}

export function definePayment(config: DefinePaymentConfig): DefinedPayment {
  const verifiers: Record<string, PaymentVerifier> = {
    ...(config.verifiers ?? {}),
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

  const accepts: PaymentOption[] = [];

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
          currency: { code: currencyCode, symbol, decimals },
        },
        asset: {
          symbol,
          network: overrides.network ?? defaults?.network ?? "",
          address: overrides.assetAddress ?? defaults?.assetAddress ?? "",
          decimals,
          standard: "erc20",
        },
        payTo: config.payTo,
        proof: {
          mode: "x402",
          network: overrides.network ?? defaults?.network ?? "",
          scheme: overrides.scheme ?? "exact",
          version: overrides.version ?? 1,
          facilitator,
          verifier: facilitator ? "x402:facilitator" : undefined,
        },
        settlement: overrides.settlement,
      })
    );
  }

  if (includePlain402) {
    const overrides = config.direct ?? {};
    const id = overrides.id ?? DEFAULT_ID_402;
    const verifierId = overrides.verifierId ?? `direct:${id}`;
    const proofType = overrides.proofType ?? id;
    const verifier =
      overrides.verify ??
      buildDefaultDirectVerifier(overrides.token, verifierId, id);
    verifiers[verifierId] = verifier;
    accepts.push(
      paymentOptionSchema.parse({
        id,
        title: `Pay ${value} ${currencyCode}`,
        amount: {
          value,
          currency: { code: currencyCode, symbol, decimals },
        },
        asset: {
          symbol,
          decimals,
          standard: "erc20",
        },
        payTo: config.payTo,
        proof: {
          mode: "direct",
          proofTypes: [proofType],
          verifier: verifierId,
          instructions: overrides.instructions,
          fields: overrides.fields,
          allowsManualReview: overrides.allowsManualReview,
        } as DirectProofConfig,
        settlement: overrides.settlement,
      })
    );
  }

  const facilitatorLabel = includeX402
    ? resolveFacilitatorLabel(config.facilitator ?? config.x402?.facilitator)
    : undefined;

  const baseMetadata: Record<string, unknown> = {};
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

  const metadata = config.metadata
    ? { ...baseMetadata, ...config.metadata }
    : baseMetadata;

  const definition: PaymentRequirementsDefinition = {
    schemaVersion: PAYMENT_SCHEMA_VERSION,
    accepts,
    metadata,
  } as PaymentRequirementsDefinition;

  if (config.message !== undefined) {
    (definition as any).message = config.message;
  }
  if (config.resource !== undefined) {
    (definition as any).resource = config.resource;
  }

  const defined: DefinedPayment = {
    definition,
    verifiers,
    metadata,
  };
  if (config.message !== undefined) {
    defined.message = config.message;
  }

  return defined;
}

export async function requirePayment(
  request: Request,
  payment: DefinedPayment | PaymentRequirementsDefinition,
  options: RequirePaymentOptions = {}
): Promise<RequirePaymentOutcome> {
  const { definition, verifiers } = normalizePayment(payment);
  const mergedVerifiers: Record<string, PaymentVerifier> = {
    ...verifiers,
    ...(options.verifiers ?? {}),
  };

  const verifyOptions: Parameters<typeof verifyPayment>[0] = {
    definition,
    request,
  };

  if (Object.keys(mergedVerifiers).length > 0) {
    verifyOptions.verifiers = mergedVerifiers;
  }
  if (options.settle !== undefined) {
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
    result: verification,
  };
}

function normalizePayment(
  payment: DefinedPayment | PaymentRequirementsDefinition
): {
  definition: PaymentRequirementsDefinition;
  verifiers: Record<string, PaymentVerifier>;
} {
  if (isDefinedPayment(payment)) {
    return {
      definition: payment.definition,
      verifiers: payment.verifiers ?? {},
    };
  }

  return {
    definition: payment,
    verifiers: {},
  };
}

function isDefinedPayment(value: unknown): value is DefinedPayment {
  return (
    !!value &&
    typeof value === "object" &&
    "definition" in value &&
    (value as DefinedPayment).definition !== undefined
  );
}

function resolveFacilitator(
  value: "opentool" | "coinbase" | string | X402ProofConfig["facilitator"]
): X402ProofConfig["facilitator"] | undefined {
  if (!value) {
    return undefined;
  }
  if (typeof value === "string") {
    if (value in DEFAULT_FACILITATORS) {
      return {
        url: DEFAULT_FACILITATORS[value as keyof typeof DEFAULT_FACILITATORS],
      };
    }
    return { url: value };
  }
  return value;
}

function resolveFacilitatorLabel(
  value: DefinePaymentConfig["facilitator"]
): string | undefined {
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

function normalizeCurrency(currency?: string): string {
  return (currency ?? "USDC").toUpperCase();
}

function toDecimalString(value: string | number): string {
  return typeof value === "number" ? value.toString() : value;
}

function buildDefaultDirectVerifier(
  expectedToken: string | undefined,
  verifierId: string,
  optionId: string
): PaymentVerifier {
  return async ({ attempt, option }) => {
    if (attempt.type !== "direct") {
      return {
        success: false,
        optionId: option.id,
        attemptType: attempt.type,
        failure: {
          reason: "Expected direct payment payload",
          code: "invalid_payload",
        },
      };
    }

    const payload = attempt.payload.payload as { token?: string } | undefined;
    if (expectedToken) {
      if (payload?.token !== expectedToken) {
        return {
          success: false,
          optionId: option.id,
          attemptType: attempt.type,
          failure: {
            reason: "Invalid or missing payment proof",
            code: "verification_failed",
          },
        };
      }
    } else if (!payload) {
      return {
        success: false,
        optionId: option.id,
        attemptType: attempt.type,
        failure: {
          reason: "Payment proof is required",
          code: "verification_failed",
        },
      };
    }

    return {
      success: true,
      optionId,
      attemptType: attempt.type,
      metadata: {
        optionId,
        verifier: verifierId,
        payload,
      },
    };
  };
}

export { PAYMENT_HEADERS };

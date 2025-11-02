import {
  createX402PaymentRequired,
  extractX402Attempt,
  verifyX402Payment,
  PAYMENT_HEADERS,
  type X402PaymentDefinition,
} from "./helpers";
import {
  SUPPORTED_CURRENCIES,
  DEFAULT_FACILITATOR,
  type X402FacilitatorConfig,
  type X402VerificationResult,
  type CurrencySpec,
} from "./types";

export interface DefineX402PaymentConfig {
  amount: string | number;
  payTo: string;
  currency?: string;
  message?: string;
  resource?: string;
  network?: string;
  assetAddress?: string;
  scheme?: "exact" | "bounded";
  facilitator?: string | X402FacilitatorConfig;
  metadata?: Record<string, unknown>;
}

export interface X402Payment {
  definition: X402PaymentDefinition;
  metadata?: Record<string, unknown>;
}

export interface RequireX402PaymentOptions {
  settle?: boolean;
  fetchImpl?: typeof fetch;
  onFailure?: (result: X402VerificationResult) => Response;
}

export interface RequireX402PaymentSuccess {
  payment: {
    optionId: string;
    verifier: string;
    amount: string;
    currency: string;
    network: string;
  };
  headers: Record<string, string>;
  result: X402VerificationResult;
}

export type RequireX402PaymentOutcome = Response | RequireX402PaymentSuccess;

const PAYMENT_CONTEXT_SYMBOL = Symbol.for("opentool.x402.context");

export class X402PaymentRequiredError extends Error {
  readonly response: Response;
  readonly verification: X402VerificationResult | undefined;

  constructor(response: Response, verification?: X402VerificationResult) {
    super("X402 Payment required");
    this.name = "X402PaymentRequiredError";
    this.response = response;
    this.verification = verification;
  }
}

export type X402PaymentContext = RequireX402PaymentSuccess;

function setPaymentContext(request: Request, context: X402PaymentContext): void {
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

export function getX402PaymentContext(
  request: Request
): X402PaymentContext | undefined {
  return (request as any)[PAYMENT_CONTEXT_SYMBOL];
}

export function defineX402Payment(config: DefineX402PaymentConfig): X402Payment {
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

  const definition: X402PaymentDefinition = {
    amount: value,
    currency: {
      code: currencyCode,
      symbol: currencySpec.symbol,
      decimals: currencySpec.decimals,
    },
    asset: {
      symbol: currencySpec.symbol,
      network,
      address: assetAddress,
      decimals: currencySpec.decimals,
    },
    payTo: config.payTo,
    scheme: config.scheme ?? "exact",
    network,
    facilitator,
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

  const baseMetadata: Record<string, unknown> = {
    amountUSDC: currencyCode === "USDC" ? Number(value) : undefined,
    facilitator: "x402rs",
    network,
  };

  const metadata = config.metadata
    ? { ...baseMetadata, ...config.metadata }
    : baseMetadata;

  return {
    definition,
    metadata,
  };
}

export async function requireX402Payment(
  request: Request,
  payment: X402Payment | X402PaymentDefinition,
  options: RequireX402PaymentOptions = {}
): Promise<RequireX402PaymentOutcome> {
  const definition = isX402Payment(payment) ? payment.definition : payment;

  const attempt = extractX402Attempt(request);
  if (!attempt) {
    const response = createX402PaymentRequired(definition);
    throw new X402PaymentRequiredError(response);
  }

  const verifyOptions: Parameters<typeof verifyX402Payment>[2] = {};
  if (options.settle !== undefined) {
    verifyOptions.settle = options.settle;
  }
  if (options.fetchImpl !== undefined) {
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
    payment: verification.metadata as {
      optionId: string;
      verifier: string;
      amount: string;
      currency: string;
      network: string;
    },
    headers: verification.responseHeaders ?? {},
    result: verification,
  };
}

export function withX402Payment(
  handler: (request: Request) => Promise<Response> | Response,
  payment: X402Payment | X402PaymentDefinition,
  options: RequireX402PaymentOptions = {}
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const verification = await requireX402Payment(request, payment, options);
    if (verification instanceof Response) {
      return verification;
    }

    setPaymentContext(request, verification);

    const response = await Promise.resolve(handler(request));
    return applyPaymentHeaders(response, verification.headers);
  };
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

function isX402Payment(value: unknown): value is X402Payment {
  return (
    !!value &&
    typeof value === "object" &&
    "definition" in value &&
    (value as X402Payment).definition !== undefined
  );
}

function resolveFacilitator(
  value: string | X402FacilitatorConfig | undefined
): X402FacilitatorConfig {
  if (!value) {
    return DEFAULT_FACILITATOR;
  }
  if (typeof value === "string") {
    return { ...DEFAULT_FACILITATOR, url: value };
  }
  return value;
}

function normalizeCurrency(currency?: string): string {
  return (currency ?? "USDC").toUpperCase();
}

function toDecimalString(value: string | number): string {
  return typeof value === "number" ? value.toString() : value;
}

export { PAYMENT_HEADERS };
export type { X402PaymentDefinition, X402VerificationResult, X402FacilitatorConfig, CurrencySpec };
export { SUPPORTED_CURRENCIES, DEFAULT_FACILITATOR };
export {
  X402Client,
  payX402,
  X402BrowserClient,
  payX402WithWallet,
  type X402ClientConfig,
  type X402PayRequest,
  type X402PayResult,
  type X402BrowserClientConfig,
  type EIP3009Authorization,
} from "./client";

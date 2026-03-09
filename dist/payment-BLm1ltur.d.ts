interface X402VerificationResult {
    success: boolean;
    metadata?: {
        optionId: string;
        verifier: string;
        [key: string]: unknown;
    };
    failure?: {
        reason: string;
        code: string;
    };
    responseHeaders?: Record<string, string>;
}
interface X402FacilitatorConfig {
    url: string;
    verifyPath?: string;
    settlePath?: string;
    apiKeyHeader?: string;
}
interface CurrencySpec {
    decimals: number;
    symbol: string;
    network: string;
    assetAddress: string;
}
declare const SUPPORTED_CURRENCIES: Record<string, CurrencySpec>;
declare const DEFAULT_FACILITATOR: X402FacilitatorConfig;

interface X402PaymentDefinition {
    amount: string;
    currency: {
        code: string;
        symbol: string;
        decimals: number;
    };
    asset: {
        symbol: string;
        network: string;
        address: string;
        decimals: number;
    };
    payTo: string;
    resource?: string;
    description?: string;
    scheme: string;
    network: string;
    facilitator: X402FacilitatorConfig;
    metadata?: Record<string, unknown>;
}
declare const PAYMENT_HEADERS: readonly ["X-PAYMENT", "X-PAYMENT-RESPONSE"];

interface DefineX402PaymentConfig {
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
interface X402Payment {
    definition: X402PaymentDefinition;
    metadata?: Record<string, unknown>;
}
interface RequireX402PaymentOptions {
    settle?: boolean;
    fetchImpl?: typeof fetch;
    onFailure?: (result: X402VerificationResult) => Response;
}
interface RequireX402PaymentSuccess {
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
type RequireX402PaymentOutcome = Response | RequireX402PaymentSuccess;
declare class X402PaymentRequiredError extends Error {
    readonly response: Response;
    readonly verification: X402VerificationResult | undefined;
    constructor(response: Response, verification?: X402VerificationResult);
}
type X402PaymentContext = RequireX402PaymentSuccess;
declare function getX402PaymentContext(request: Request): X402PaymentContext | undefined;
declare function defineX402Payment(config: DefineX402PaymentConfig): X402Payment;
declare function requireX402Payment(request: Request, payment: X402Payment | X402PaymentDefinition, options?: RequireX402PaymentOptions): Promise<RequireX402PaymentOutcome>;
declare function withX402Payment(handler: (request: Request) => Promise<Response> | Response, payment: X402Payment | X402PaymentDefinition, options?: RequireX402PaymentOptions): (request: Request) => Promise<Response>;

export { type CurrencySpec as C, DEFAULT_FACILITATOR as D, PAYMENT_HEADERS as P, type RequireX402PaymentOptions as R, SUPPORTED_CURRENCIES as S, type X402FacilitatorConfig as X, type DefineX402PaymentConfig as a, type RequireX402PaymentOutcome as b, type RequireX402PaymentSuccess as c, type X402Payment as d, type X402PaymentContext as e, type X402PaymentDefinition as f, X402PaymentRequiredError as g, type X402VerificationResult as h, defineX402Payment as i, getX402PaymentContext as j, requireX402Payment as r, withX402Payment as w };

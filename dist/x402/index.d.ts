import { Address, WalletClient } from 'viem';

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

interface X402ClientConfig {
    privateKey: `0x${string}`;
    rpcUrl?: string;
}
interface X402PayRequest {
    url: string;
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
}
interface X402PayResult {
    success: boolean;
    response?: Response;
    error?: string;
    paymentDetails?: {
        amount: string;
        currency: string;
        network: string;
        signature: string;
    };
}
declare class X402Client {
    private account;
    private walletClient;
    constructor(config: X402ClientConfig);
    pay(request: X402PayRequest): Promise<X402PayResult>;
    private signTransferAuthorization;
    getAddress(): Address;
}
declare function payX402(config: {
    privateKey: `0x${string}`;
    url: string;
    body?: unknown;
    rpcUrl?: string;
}): Promise<X402PayResult>;
interface EIP3009Authorization {
    from: Address;
    to: Address;
    value: bigint;
    validAfter: bigint;
    validBefore: bigint;
    nonce: `0x${string}`;
}
interface X402BrowserClientConfig {
    walletClient: WalletClient;
    chainId: number;
}
declare class X402BrowserClient {
    private walletClient;
    private chainId;
    constructor(config: X402BrowserClientConfig);
    pay(request: X402PayRequest): Promise<X402PayResult>;
    private signTransferAuthorization;
}
declare function payX402WithWallet(walletClient: WalletClient, chainId: number, request: X402PayRequest): Promise<X402PayResult>;

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

export { type CurrencySpec, DEFAULT_FACILITATOR, type DefineX402PaymentConfig, type EIP3009Authorization, PAYMENT_HEADERS, type RequireX402PaymentOptions, type RequireX402PaymentOutcome, type RequireX402PaymentSuccess, SUPPORTED_CURRENCIES, X402BrowserClient, type X402BrowserClientConfig, X402Client, type X402ClientConfig, type X402FacilitatorConfig, type X402PayRequest, type X402PayResult, type X402Payment, type X402PaymentContext, type X402PaymentDefinition, X402PaymentRequiredError, type X402VerificationResult, defineX402Payment, getX402PaymentContext, payX402, payX402WithWallet, requireX402Payment, withX402Payment };

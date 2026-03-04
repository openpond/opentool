export { C as CurrencySpec, D as DEFAULT_FACILITATOR, a as DefineX402PaymentConfig, P as PAYMENT_HEADERS, R as RequireX402PaymentOptions, b as RequireX402PaymentOutcome, c as RequireX402PaymentSuccess, S as SUPPORTED_CURRENCIES, d as X402FacilitatorConfig, X as X402Payment, e as X402PaymentContext, f as X402PaymentDefinition, g as X402PaymentRequiredError, h as X402VerificationResult, i as defineX402Payment, j as getX402PaymentContext, r as requireX402Payment, w as withX402Payment } from '../payment-orkZA9se.js';
import { Address, WalletClient } from 'viem';

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

export { type EIP3009Authorization, X402BrowserClient, type X402BrowserClientConfig, X402Client, type X402ClientConfig, type X402PayRequest, type X402PayResult, payX402, payX402WithWallet };

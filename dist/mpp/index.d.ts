import { Receipt } from 'mppx';
import { j as WalletFullContext, c as HexAddress } from '../types-D8s9zx-U.js';
import 'viem';
import 'viem/accounts';

declare const MPP_TEMPO_MAINNET_CHAIN_ID = 4217;
declare const MPP_TEMPO_USDCE_ADDRESS: "0x20C000000000000000000000b9537d11c60E8b50";
declare const MPP_TEMPO_PATHUSD_ADDRESS: "0x20c0000000000000000000000000000000000000";
declare const MPP_DEFAULT_TEMPO_CURRENCY: "0x20C000000000000000000000b9537d11c60E8b50";
type MppTempoChargeMode = "push" | "pull";
type MppAcceptPaymentPolicy = "always" | "same-origin" | "never" | {
    origins: readonly string[];
};
interface MppTempoOptions {
    /** Automatically swap through the Tempo DEX when the wallet lacks the challenged currency. */
    autoSwap?: boolean | {
        tokenIn?: HexAddress[];
        slippage?: number;
    };
    /** Initial channel deposit for automatic Tempo session handling. */
    deposit?: string;
    /** Maximum channel deposit for automatic Tempo session handling. */
    maxDeposit?: string;
    /** Preferred one-time charge mode. Defaults are chosen by mppx per account type. */
    mode?: MppTempoChargeMode;
}
interface MppClientOptions {
    wallet: WalletFullContext;
    fetch?: typeof globalThis.fetch;
    /**
     * mppx polyfills global fetch by default. OpenTool keeps this opt-in so callers
     * can scope paid requests to a single lambda run or tool call.
     */
    polyfill?: boolean;
    acceptPaymentPolicy?: MppAcceptPaymentPolicy;
    tempo?: MppTempoOptions;
}
type MppFetch = (input: RequestInfo | URL, init?: RequestInit & {
    context?: unknown;
}) => Promise<Response>;
interface MppClient {
    fetch: MppFetch;
    rawFetch: typeof globalThis.fetch;
    createCredential(response: Response, context?: unknown): Promise<string>;
}
interface MppFetchRequest {
    input: RequestInfo | URL;
    init?: RequestInit;
    context?: unknown;
}
interface MppFetchResult {
    response: Response;
    receipt: Receipt.Receipt | null;
}
interface MppCredentialResult {
    authorization: string;
}
declare function createMppClient(options: MppClientOptions): MppClient;
declare function createMppFetch(options: MppClientOptions): MppFetch;
declare function createMppCredential(response: Response, options: MppClientOptions, context?: unknown): Promise<MppCredentialResult>;
declare function fetchWithMpp(request: MppFetchRequest, options: MppClientOptions): Promise<MppFetchResult>;
declare function readMppReceipt(response: Response): Receipt.Receipt | null;

export { MPP_DEFAULT_TEMPO_CURRENCY, MPP_TEMPO_MAINNET_CHAIN_ID, MPP_TEMPO_PATHUSD_ADDRESS, MPP_TEMPO_USDCE_ADDRESS, type MppAcceptPaymentPolicy, type MppClient, type MppClientOptions, type MppCredentialResult, type MppFetch, type MppFetchRequest, type MppFetchResult, type MppTempoChargeMode, type MppTempoOptions, createMppClient, createMppCredential, createMppFetch, fetchWithMpp, readMppReceipt };

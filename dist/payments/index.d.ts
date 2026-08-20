import { MppClientOptions, MppTempoOptions } from '../mpp/index.js';
import { e as ChatMessage } from '../types-Dc90GEv1.js';
import { j as WalletFullContext, k as WalletOptions } from '../types-D8s9zx-U.js';
import 'mppx';
import 'viem';
import 'viem/accounts';

type PaymentMethod = "tempo" | "mpp";
type PaymentIntent = "charge" | "session";
interface PaymentPolicy {
    allowedMethods?: PaymentMethod[];
    allowedIntents?: PaymentIntent[];
    maxAmountUsd?: string;
    maxAmountUsdPerStream?: string;
    sessionDepositMaxUsd?: string;
    sessionDurationMaxMinutes?: number;
    sessionIdleCloseMinutes?: number;
    allowedProviders?: string[];
    allowedModels?: string[];
}
type PaidFetchInit = RequestInit & {
    payment?: PaymentPolicy;
    wallet?: WalletFullContext;
    walletOptions?: WalletOptions;
    mpp?: Omit<MppClientOptions, "wallet">;
    tempo?: MppTempoOptions;
    context?: unknown;
};
declare function paidFetch(input: RequestInfo | URL, init?: PaidFetchInit): Promise<Response>;
declare function streamPaidFetch(input: RequestInfo | URL, init?: PaidFetchInit): Promise<Response>;
interface StreamPaidOpenAIOptions {
    endpoint?: string;
    model: string;
    messages?: ChatMessage[];
    input?: unknown;
    maxTokens?: number;
    temperature?: number;
    headers?: Record<string, string>;
    payment?: PaymentPolicy;
    wallet?: WalletFullContext;
    walletOptions?: WalletOptions;
    mpp?: Omit<MppClientOptions, "wallet">;
    tempo?: MppTempoOptions;
    signal?: AbortSignal;
    body?: Record<string, unknown>;
}
declare function streamPaidOpenAI(options: StreamPaidOpenAIOptions): Promise<Response>;

export { type PaidFetchInit, type PaymentIntent, type PaymentMethod, type PaymentPolicy, type StreamPaidOpenAIOptions, paidFetch, streamPaidFetch, streamPaidOpenAI };

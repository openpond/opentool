type StoreStatus = "submitted" | "pending" | "confirmed" | "failed" | "cancelled" | "filled" | "partial_fill" | "settled" | "info";
type StoreAction = "stake" | "swap" | "bridge" | "order" | "lend" | "repay" | "withdraw" | "custom" | string;
type ChainScope = {
    chainId: number;
    network?: never;
} | {
    network: string;
    chainId?: never;
} | {
    chainId?: never;
    network?: never;
};
type StoreEventInput = ChainScope & {
    source: string;
    ref: string;
    status: StoreStatus;
    walletAddress?: `0x${string}`;
    action?: StoreAction;
    notional?: string;
    metadata?: Record<string, unknown>;
};
interface StoreOptions {
    baseUrl?: string;
    apiKey?: string;
    fetchFn?: typeof fetch;
}
interface StoreResponse {
    id: string;
    status?: StoreStatus | null;
}
type StoreRetrieveParams = {
    source?: string;
    walletAddress?: `0x${string}`;
    symbol?: string;
    status?: StoreStatus[];
    since?: number;
    until?: number;
    limit?: number;
    cursor?: string;
    history?: boolean;
};
type StoreRetrieveResult = {
    items: Array<StoreEventInput & {
        timestamp?: number;
        updatedBy?: string | null;
        signerKeyId?: string | null;
    }>;
    cursor?: string | null;
};
declare class StoreError extends Error {
    readonly status?: number | undefined;
    readonly causeData?: unknown | undefined;
    constructor(message: string, status?: number | undefined, causeData?: unknown | undefined);
}
/**
 * Store a generic activity event (onchain tx, Hyperliquid order, etc.) in OpenPond.
 */
declare function store(input: StoreEventInput, options?: StoreOptions): Promise<StoreResponse>;
/**
 * Retrieve stored activity events for an app.
 */
declare function retrieve(params?: StoreRetrieveParams, options?: StoreOptions): Promise<StoreRetrieveResult>;

export { type StoreAction, StoreError, type StoreEventInput, type StoreOptions, type StoreResponse, type StoreRetrieveParams, type StoreRetrieveResult, retrieve, store };

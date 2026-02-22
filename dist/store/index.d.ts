type StoreStatus = "submitted" | "pending" | "confirmed" | "failed" | "cancelled" | "filled" | "partial_fill" | "settled" | "info";
declare const STORE_EVENT_LEVELS: readonly ["decision", "execution", "lifecycle"];
declare const CANONICAL_STORE_ACTIONS: readonly ["stake", "unstake", "swap", "bridge", "order", "trade", "lend", "borrow", "repay", "withdraw", "provide_liquidity", "remove_liquidity", "claim", "custom"];
type StoreAction = (typeof CANONICAL_STORE_ACTIONS)[number] | string;
type StoreEventLevel = (typeof STORE_EVENT_LEVELS)[number];
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
    eventLevel?: StoreEventLevel;
    notional?: string;
    metadata?: Record<string, unknown>;
    market?: Record<string, unknown>;
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
type MyToolsResponse = {
    tools: Array<{
        id: string;
        name: string;
        displayName: string;
        description?: string;
        serverUrl: string;
        source: "internal" | "public";
        appId?: string;
        deploymentId?: string;
        metadata?: unknown;
    }>;
};
type ToolExecuteRequest = {
    appId: string;
    deploymentId: string;
    toolName: string;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
};
type ToolExecuteResponse = {
    ok: boolean;
    status: number;
    data: unknown;
};
type AgentDigestRequest = {
    content: string;
    runAt?: string;
    metadata?: Record<string, unknown>;
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
declare function getMyTools(options?: StoreOptions): Promise<MyToolsResponse>;
declare function getMyPerformance(options?: StoreOptions): Promise<unknown>;
declare function postAgentDigest(input: AgentDigestRequest, options?: StoreOptions): Promise<unknown>;
declare function executeTool(input: ToolExecuteRequest, options?: StoreOptions): Promise<ToolExecuteResponse>;

export { type AgentDigestRequest, type MyToolsResponse, type StoreAction, StoreError, type StoreEventInput, type StoreEventLevel, type StoreOptions, type StoreResponse, type StoreRetrieveParams, type StoreRetrieveResult, type ToolExecuteRequest, type ToolExecuteResponse, executeTool, getMyPerformance, getMyTools, postAgentDigest, retrieve, store };

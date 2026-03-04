import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { I as InternalToolDefinition, T as ToolResponse } from './validate-DbhJ_r0Z.js';
export { B as BuildConfig, d as BuildMetadata, C as ConnectedApp, e as CronSpec, f as GetHandler, H as HTTP_METHODS, h as HttpHandlerDefinition, i as HttpMethod, j as McpConfig, M as Metadata, N as NormalizedSchedule, P as PaymentConfig, k as PostHandler, S as ScheduleType, m as ServerConfig, n as TemplatePreviewProfile, o as Tool, p as ToolAsset, q as ToolCategory, r as ToolContent, s as ToolMetadataOverrides, t as ToolModule, u as ToolModuleGET, w as ToolModulePOST, x as ToolProfile, g as generateMetadata, b as generateMetadataCommand, l as loadAndValidateTools, v as validateCommand } from './validate-DbhJ_r0Z.js';
export { C as CurrencySpec, D as DEFAULT_FACILITATOR, a as DefineX402PaymentConfig, P as PAYMENT_HEADERS, R as RequireX402PaymentOptions, b as RequireX402PaymentOutcome, c as RequireX402PaymentSuccess, S as SUPPORTED_CURRENCIES, d as X402FacilitatorConfig, X as X402Payment, e as X402PaymentContext, f as X402PaymentDefinition, g as X402PaymentRequiredError, h as X402VerificationResult, i as defineX402Payment, j as getX402PaymentContext, r as requireX402Payment, w as withX402Payment } from './payment-orkZA9se.js';
export { EIP3009Authorization, X402BrowserClient, X402BrowserClientConfig, X402Client, X402ClientConfig, X402PayRequest, X402PayResult, payX402, payX402WithWallet } from './x402/index.js';
export { DEFAULT_CHAIN, DEFAULT_TOKENS, chains, getRpcUrl, registry, tokens, wallet, walletToolkit } from './wallet/index.js';
export { DEFAULT_HYPERLIQUID_MARKET_SLIPPAGE_BPS, HyperliquidAbstraction, HyperliquidAccountMode, HyperliquidApiError, HyperliquidApproveBuilderFeeOptions, HyperliquidApproveBuilderFeeResponse, HyperliquidBar, HyperliquidBarResolution, HyperliquidBuilderApprovalError, HyperliquidBuilderApprovalRecordInput, HyperliquidBuilderFee, HyperliquidChain, HyperliquidClearinghouseState, HyperliquidDepositResult, HyperliquidEnvironment, HyperliquidExchangeClient, HyperliquidExchangeResponse, HyperliquidGrouping, HyperliquidGuardError, HyperliquidInfoClient, HyperliquidMarketIdentityInput, HyperliquidMarketType, HyperliquidOrderIntent, HyperliquidOrderOptions, HyperliquidOrderResponse, HyperliquidOrderStatus, HyperliquidPerpMarketInfo, HyperliquidProfileAsset, HyperliquidProfileAssetInput, HyperliquidProfileChain, HyperliquidSpotMarketInfo, HyperliquidStoreNetwork, HyperliquidTermsError, HyperliquidTermsRecordInput, HyperliquidTickSize, HyperliquidTimeInForce, HyperliquidTriggerOptions, HyperliquidTriggerType, HyperliquidWithdrawResult, MarketIdentity, NonceSource, __hyperliquidInternals, __hyperliquidMarketDataInternals, approveHyperliquidBuilderFee, batchModifyHyperliquidOrders, buildHyperliquidMarketIdentity, buildHyperliquidProfileAssets, buildHyperliquidSpotUsdPriceMap, cancelAllHyperliquidOrders, cancelHyperliquidOrders, cancelHyperliquidOrdersByCloid, cancelHyperliquidTwapOrder, computeHyperliquidMarketIocLimitPrice, createHyperliquidSubAccount, createMonotonicNonceFactory, depositToHyperliquidBridge, extractHyperliquidDex, extractHyperliquidOrderIds, fetchHyperliquidAllMids, fetchHyperliquidAssetCtxs, fetchHyperliquidBars, fetchHyperliquidClearinghouseState, fetchHyperliquidFrontendOpenOrders, fetchHyperliquidHistoricalOrders, fetchHyperliquidMeta, fetchHyperliquidMetaAndAssetCtxs, fetchHyperliquidOpenOrders, fetchHyperliquidOrderStatus, fetchHyperliquidPerpMarketInfo, fetchHyperliquidPreTransferCheck, fetchHyperliquidSizeDecimals, fetchHyperliquidSpotAccountValue, fetchHyperliquidSpotAssetCtxs, fetchHyperliquidSpotClearinghouseState, fetchHyperliquidSpotMarketInfo, fetchHyperliquidSpotMeta, fetchHyperliquidSpotMetaAndAssetCtxs, fetchHyperliquidSpotTickSize, fetchHyperliquidSpotUsdPriceMap, fetchHyperliquidTickSize, fetchHyperliquidUserFills, fetchHyperliquidUserFillsByTime, fetchHyperliquidUserRateLimit, formatHyperliquidMarketablePrice, formatHyperliquidOrderSize, formatHyperliquidPrice, formatHyperliquidSize, getHyperliquidMaxBuilderFee, isHyperliquidSpotSymbol, modifyHyperliquidOrder, normalizeHyperliquidBaseSymbol, normalizeHyperliquidMetaSymbol, normalizeSpotTokenName, parseSpotPairSymbol, placeHyperliquidOrder, placeHyperliquidTwapOrder, readHyperliquidAccountValue, readHyperliquidNumber, readHyperliquidPerpPosition, readHyperliquidPerpPositionSize, readHyperliquidSpotAccountValue, readHyperliquidSpotBalance, readHyperliquidSpotBalanceSize, recordHyperliquidBuilderApproval, recordHyperliquidTermsAcceptance, reserveHyperliquidRequestWeight, resolveHyperliquidAbstractionFromMode, resolveHyperliquidChain, resolveHyperliquidChainConfig, resolveHyperliquidErrorDetail, resolveHyperliquidOrderRef, resolveHyperliquidOrderSymbol, resolveHyperliquidPair, resolveHyperliquidProfileChain, resolveHyperliquidRpcEnvVar, resolveHyperliquidStoreNetwork, resolveHyperliquidSymbol, resolveSpotMidCandidates, resolveSpotTokenCandidates, roundHyperliquidPriceToTick, scheduleHyperliquidCancel, sendHyperliquidSpot, setHyperliquidAccountAbstractionMode, setHyperliquidDexAbstraction, setHyperliquidPortfolioMargin, transferHyperliquidSubAccount, updateHyperliquidIsolatedMargin, updateHyperliquidLeverage, withdrawFromHyperliquid } from './adapters/hyperliquid/index.js';
import { c as WalletFullContext } from './types-3w880w_t.js';
export { C as ChainMetadata, g as ChainReference, a as ChainTokenMap, H as Hex, h as HexAddress, R as RpcProviderOptions, i as RpcUrlResolver, T as TokenMetadata, j as TurnkeyOptions, k as TurnkeySignWith, l as WalletBaseContext, m as WalletContext, n as WalletOptions, o as WalletOptionsBase, b as WalletPrivateKeyOptions, p as WalletProviderType, f as WalletReadonlyContext, e as WalletReadonlyOptions, W as WalletRegistry, q as WalletSendTransactionParams, r as WalletSignerContext, s as WalletTransferParams, d as WalletTurnkeyOptions } from './types-3w880w_t.js';
export { AIAbortError, AIClientConfig, AIError, AIFetchError, AIRequestMetadata, AIResponseError, ChatCompletionChoice, ChatCompletionLogProbs, ChatCompletionResponse, ChatCompletionUsage, ChatMessage, ChatMessageContentPart, ChatMessageContentPartImageUrl, ChatMessageContentPartText, ChatMessageRole, DEFAULT_BASE_URL, DEFAULT_MODEL, DEFAULT_TIMEOUT_MS, FunctionToolDefinition, GenerateTextOptions, GenerateTextResult, GenerationParameters, JsonSchema, ResolvedAIClientConfig, ResponseErrorDetails, StreamTextOptions, StreamTextResult, StreamingEventHandlers, ToolChoice, ToolDefinition, ToolExecutionPolicy, WEBSEARCH_TOOL_DEFINITION, WEBSEARCH_TOOL_NAME, WebSearchOptions, createAIClient, ensureTextContent, flattenMessageContent, generateText, getModelConfig, isStreamingSupported, isToolCallingSupported, listModels, normalizeModelName, resolveConfig, resolveToolset, streamText } from './ai/index.js';
export { AgentDigestRequest, MyToolsResponse, StoreAction, StoreError, StoreEventInput, StoreEventLevel, StoreMode, StoreOptions, StoreResponse, StoreRetrieveParams, StoreRetrieveResult, StoreSimulationConfig, ToolExecuteRequest, ToolExecuteResponse, executeTool, getMyPerformance, getMyTools, postAgentDigest, retrieve, store } from './store/index.js';
import { z, ZodSchema } from 'zod';
import 'viem';
import 'viem/accounts';

/**
 * Create local development server for MCP tooling.
 */
declare function createDevServer(tools: InternalToolDefinition[]): Server;
/**
 * Create stdio server for use with AWS Lambda MCP Adapter
 */
declare function createStdioServer(tools?: InternalToolDefinition[]): Promise<void>;
declare function resolveRuntimePath(value: string): string;

type PolymarketEnvironment = "mainnet" | "testnet";
type PolymarketSide = "BUY" | "SELL";
type PolymarketOrderType = "GTC" | "FOK" | "FAK" | "GTD";
type PolymarketSignatureType = 0 | 1 | 2;
interface PolymarketApiCredentials {
    apiKey: string;
    secret: string;
    passphrase: string;
}
interface PolymarketMarket {
    id: string;
    slug?: string | null;
    question?: string | null;
    description?: string | null;
    eventId?: string | null;
    eventSlug?: string | null;
    conditionId?: string | null;
    marketMakerAddress?: string | null;
    category?: string | null;
    tags?: string[];
    active?: boolean;
    closed?: boolean;
    resolved?: boolean;
    startDate?: string | null;
    endDate?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    closedTime?: string | null;
    volume?: string | null;
    liquidity?: string | null;
    openInterest?: string | null;
    outcomes?: string[];
    outcomePrices?: number[];
    clobTokenIds?: string[];
    icon?: string | null;
    image?: string | null;
}
interface PolymarketOrderbookLevel {
    price: number;
    size: number;
}
interface PolymarketOrderbook {
    market: string;
    bids: PolymarketOrderbookLevel[];
    asks: PolymarketOrderbookLevel[];
    timestamp?: string | null;
}
interface PolymarketPriceHistoryPoint {
    t: number;
    p: number;
}
interface PolymarketSignedOrderPayload {
    salt: string;
    maker: `0x${string}`;
    signer: `0x${string}`;
    taker: `0x${string}`;
    tokenId: string;
    makerAmount: string;
    takerAmount: string;
    expiration: string;
    nonce: string;
    feeRateBps: string;
    side: 0 | 1;
    signatureType: PolymarketSignatureType;
    signature: `0x${string}`;
}
declare class PolymarketApiError extends Error {
    readonly response: unknown;
    constructor(message: string, response: unknown);
}
declare class PolymarketAuthError extends Error {
    constructor(message: string);
}
declare const POLYMARKET_ENDPOINTS: {
    readonly gamma: {
        readonly mainnet: "https://gamma-api.polymarket.com";
        readonly testnet: "https://gamma-api.polymarket.com";
    };
    readonly clob: {
        readonly mainnet: "https://clob.polymarket.com";
        readonly testnet: "https://clob.polymarket.com";
    };
    readonly data: {
        readonly mainnet: "https://data-api.polymarket.com";
        readonly testnet: "https://data-api.polymarket.com";
    };
};
declare const POLYMARKET_CHAIN_ID: Record<PolymarketEnvironment, number>;
declare const POLYMARKET_EXCHANGE_ADDRESSES: Record<PolymarketEnvironment, {
    ctf: `0x${string}`;
    negRisk: `0x${string}`;
}>;
declare const POLYMARKET_CLOB_DOMAIN: {
    name: string;
    version: string;
};
declare const POLYMARKET_CLOB_AUTH_DOMAIN: {
    name: string;
    version: string;
};
declare function resolvePolymarketBaseUrl(service: keyof typeof POLYMARKET_ENDPOINTS, environment: PolymarketEnvironment): string;
declare function normalizeStringArrayish(value: unknown): string[];
declare function normalizeNumberArrayish(value: unknown): number[];
declare function buildHmacSignature(args: {
    secret: string;
    timestamp: number | string;
    method: string;
    path: string;
    body?: string | Record<string, unknown> | null;
}): string;
declare function buildL2Headers(args: {
    credentials: PolymarketApiCredentials;
    address: `0x${string}`;
    timestamp?: number;
    method: string;
    path: string;
    body?: Record<string, unknown> | string | null;
}): Record<string, string>;
declare function buildL1Headers(args: {
    wallet: WalletFullContext;
    timestamp?: number;
    nonce?: number;
    environment?: PolymarketEnvironment;
    message?: string;
}): Promise<Record<string, string>>;
declare function resolveExchangeAddress(args: {
    environment: PolymarketEnvironment;
    negRisk?: boolean;
    exchangeAddress?: `0x${string}`;
}): `0x${string}`;
declare function buildPolymarketOrderAmounts(args: {
    side: PolymarketSide;
    price: string | number | bigint;
    size: string | number | bigint;
    tickSize?: string | number | bigint;
}): {
    makerAmount: bigint;
    takerAmount: bigint;
};
declare function buildSignedOrderPayload(args: {
    wallet: WalletFullContext;
    environment?: PolymarketEnvironment;
    tokenId: string;
    side: PolymarketSide;
    price: string | number | bigint;
    size: string | number | bigint;
    expiration?: number;
    nonce?: number;
    feeRateBps?: number;
    tickSize?: string | number | bigint;
    maker?: `0x${string}`;
    signer?: `0x${string}`;
    taker?: `0x${string}`;
    signatureType?: PolymarketSignatureType;
    negRisk?: boolean;
    exchangeAddress?: `0x${string}`;
}): Promise<PolymarketSignedOrderPayload>;

interface PolymarketApiKeyResponse {
    apiKey: string;
    secret: string;
    passphrase: string;
}
interface PolymarketOrderIntent {
    tokenId: string;
    side: PolymarketSide;
    price: string | number | bigint;
    size: string | number | bigint;
    expiration?: number;
    nonce?: number;
    feeRateBps?: number;
    tickSize?: string | number | bigint;
    maker?: `0x${string}`;
    signer?: `0x${string}`;
    taker?: `0x${string}`;
    signatureType?: PolymarketSignatureType;
    negRisk?: boolean;
    exchangeAddress?: `0x${string}`;
}
interface PolymarketPlaceOrderResponse {
    orderId?: string;
    status?: string;
    message?: string;
    [key: string]: unknown;
}
declare function createPolymarketApiKey(args: {
    wallet: WalletFullContext;
    environment?: PolymarketEnvironment;
    timestamp?: number;
    nonce?: number;
    message?: string;
}): Promise<PolymarketApiKeyResponse>;
declare function derivePolymarketApiKey(args: {
    wallet: WalletFullContext;
    environment?: PolymarketEnvironment;
    timestamp?: number;
    nonce?: number;
    message?: string;
}): Promise<PolymarketApiKeyResponse>;
declare function placePolymarketOrder(args: {
    wallet: WalletFullContext;
    credentials?: PolymarketApiCredentials;
    order: PolymarketOrderIntent;
    orderType?: PolymarketOrderType;
    environment?: PolymarketEnvironment;
}): Promise<PolymarketPlaceOrderResponse>;
declare function cancelPolymarketOrder(args: {
    orderId: string;
    wallet?: WalletFullContext;
    walletAddress?: `0x${string}`;
    credentials?: PolymarketApiCredentials;
    environment?: PolymarketEnvironment;
}): Promise<Record<string, unknown>>;
declare function cancelPolymarketOrders(args: {
    orderIds: string[];
    wallet?: WalletFullContext;
    walletAddress?: `0x${string}`;
    credentials?: PolymarketApiCredentials;
    environment?: PolymarketEnvironment;
}): Promise<Record<string, unknown>>;
declare function cancelAllPolymarketOrders(args: {
    wallet?: WalletFullContext;
    walletAddress?: `0x${string}`;
    credentials?: PolymarketApiCredentials;
    environment?: PolymarketEnvironment;
}): Promise<Record<string, unknown>>;
declare function cancelMarketPolymarketOrders(args: {
    tokenId: string;
    wallet?: WalletFullContext;
    walletAddress?: `0x${string}`;
    credentials?: PolymarketApiCredentials;
    environment?: PolymarketEnvironment;
}): Promise<Record<string, unknown>>;
declare class PolymarketExchangeClient {
    private readonly wallet;
    private readonly credentials;
    private readonly environment;
    private cachedCredentials;
    constructor(args: {
        wallet: WalletFullContext;
        credentials?: PolymarketApiCredentials;
        environment?: PolymarketEnvironment;
    });
    private getCredentials;
    placeOrder(order: PolymarketOrderIntent, orderType?: PolymarketOrderType): Promise<PolymarketPlaceOrderResponse>;
    cancelOrder(orderId: string): Promise<Record<string, unknown>>;
    cancelOrders(orderIds: string[]): Promise<Record<string, unknown>>;
    cancelAll(): Promise<Record<string, unknown>>;
    cancelMarket(tokenId: string): Promise<Record<string, unknown>>;
}

type FetchParams = {
    environment?: PolymarketEnvironment;
    limit?: number;
    offset?: number;
    order?: string;
    ascending?: boolean;
    tagId?: string;
    relatedTags?: boolean;
    excludeTagId?: string;
    category?: string;
    slug?: string;
    active?: boolean;
    closed?: boolean;
};
declare class PolymarketInfoClient {
    private readonly environment;
    constructor(environment?: PolymarketEnvironment);
    markets(params?: FetchParams): Promise<PolymarketMarket[]>;
    market(params: {
        id?: string;
        slug?: string;
        conditionId?: string;
    }): Promise<PolymarketMarket | null>;
    orderbook(tokenId: string): Promise<PolymarketOrderbook>;
    price(tokenId: string, side: "BUY" | "SELL"): Promise<number | null>;
    midpoint(tokenId: string): Promise<number | null>;
    priceHistory(params: {
        tokenId: string;
        startTs?: number;
        endTs?: number;
        interval?: string;
        fidelity?: number;
    }): Promise<PolymarketPriceHistoryPoint[]>;
}
declare function fetchPolymarketMarkets(params?: FetchParams): Promise<PolymarketMarket[]>;
declare function fetchPolymarketMarket(params: {
    id?: string;
    slug?: string;
    conditionId?: string;
    environment?: PolymarketEnvironment;
}): Promise<PolymarketMarket | null>;
declare function fetchPolymarketOrderbook(params: {
    tokenId: string;
    environment?: PolymarketEnvironment;
}): Promise<PolymarketOrderbook>;
declare function fetchPolymarketPrice(params: {
    tokenId: string;
    side: "BUY" | "SELL";
    environment?: PolymarketEnvironment;
}): Promise<number | null>;
declare function fetchPolymarketMidpoint(params: {
    tokenId: string;
    environment?: PolymarketEnvironment;
}): Promise<number | null>;
declare function fetchPolymarketPriceHistory(params: {
    tokenId: string;
    startTs?: number;
    endTs?: number;
    interval?: string;
    fidelity?: number;
    environment?: PolymarketEnvironment;
}): Promise<PolymarketPriceHistoryPoint[]>;

declare const backtestDecisionRequestSchema: z.ZodObject<{
    mode: z.ZodLiteral<"backtest_decisions">;
    source: z.ZodOptional<z.ZodString>;
    symbol: z.ZodOptional<z.ZodString>;
    lookbackDays: z.ZodOptional<z.ZodNumber>;
    timeframeStart: z.ZodOptional<z.ZodString>;
    timeframeEnd: z.ZodOptional<z.ZodString>;
    from: z.ZodOptional<z.ZodNumber>;
    to: z.ZodOptional<z.ZodNumber>;
    initialEquityUsd: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
type BacktestDecisionRequest = z.infer<typeof backtestDecisionRequestSchema>;
type BacktestResolution = "1" | "5" | "15" | "30" | "60" | "240" | "1D" | "1W";
declare function parseTimeToSeconds(value: unknown): number | null;
declare function resolutionToSeconds(resolution: BacktestResolution): number;
declare function estimateCountBack(params: {
    fallback: number;
    lookbackDays?: number;
    resolution: BacktestResolution;
    fromSeconds?: number;
    toSeconds?: number;
    minCountBack?: number;
    bufferBars?: number;
}): number;

interface CreateMcpAdapterOptions {
    name: string;
    schema?: ZodSchema;
    httpHandlers: Record<string, ((request: Request) => Promise<Response> | Response) | undefined>;
    defaultMethod?: string;
}
/**
 * Create an adapter that bridges MCP `call_tool` invocations to Web Standard handlers.
 */
declare function createMcpAdapter(options: CreateMcpAdapterOptions): (rawArguments: unknown) => Promise<ToolResponse>;
declare function responseToToolResponse(response: Response): Promise<ToolResponse>;

export { type BacktestDecisionRequest, type BacktestResolution, InternalToolDefinition, POLYMARKET_CHAIN_ID, POLYMARKET_CLOB_AUTH_DOMAIN, POLYMARKET_CLOB_DOMAIN, POLYMARKET_ENDPOINTS, POLYMARKET_EXCHANGE_ADDRESSES, type PolymarketApiCredentials, PolymarketApiError, type PolymarketApiKeyResponse, PolymarketAuthError, type PolymarketEnvironment, PolymarketExchangeClient, PolymarketInfoClient, type PolymarketMarket, type PolymarketOrderIntent, type PolymarketOrderType, type PolymarketOrderbook, type PolymarketPlaceOrderResponse, type PolymarketPriceHistoryPoint, type PolymarketSide, type PolymarketSignatureType, type PolymarketSignedOrderPayload, ToolResponse, WalletFullContext, backtestDecisionRequestSchema, buildHmacSignature, buildL1Headers, buildL2Headers, buildPolymarketOrderAmounts, buildSignedOrderPayload, cancelAllPolymarketOrders, cancelMarketPolymarketOrders, cancelPolymarketOrder, cancelPolymarketOrders, createDevServer, createMcpAdapter, createPolymarketApiKey, createStdioServer, derivePolymarketApiKey, estimateCountBack, fetchPolymarketMarket, fetchPolymarketMarkets, fetchPolymarketMidpoint, fetchPolymarketOrderbook, fetchPolymarketPrice, fetchPolymarketPriceHistory, normalizeNumberArrayish, normalizeStringArrayish, parseTimeToSeconds, placePolymarketOrder, resolutionToSeconds, resolveExchangeAddress, resolvePolymarketBaseUrl, resolveRuntimePath, responseToToolResponse };

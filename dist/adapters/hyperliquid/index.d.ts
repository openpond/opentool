import { W as WalletFullContext } from '../../types-DKohXZes.js';
import { StoreOptions, StoreResponse } from '../../store/index.js';
import { H as HyperliquidEnvironment, N as NonceSource, a as HyperliquidOrderIntent, b as HyperliquidGrouping, a3 as toApiDecimal, a4 as createL1ActionHash, a5 as splitSignature } from '../../exchange-XC9MHmxJ.js';
export { D as DEFAULT_HYPERLIQUID_MARKET_SLIPPAGE_BPS, c as HyperliquidAbstraction, d as HyperliquidAccountMode, e as HyperliquidApiError, f as HyperliquidBuilderApprovalError, g as HyperliquidBuilderFee, h as HyperliquidExchangeClient, i as HyperliquidExchangeResponse, j as HyperliquidGuardError, k as HyperliquidInfoClient, l as HyperliquidMarketIdentityInput, m as HyperliquidTermsError, n as HyperliquidTimeInForce, o as HyperliquidTriggerOptions, p as HyperliquidTriggerType, M as MarketIdentity, q as batchModifyHyperliquidOrders, r as buildHyperliquidMarketIdentity, s as cancelAllHyperliquidOrders, t as cancelHyperliquidOrders, u as cancelHyperliquidOrdersByCloid, v as cancelHyperliquidTwapOrder, w as computeHyperliquidMarketIocLimitPrice, x as createHyperliquidSubAccount, y as createMonotonicNonceFactory, z as fetchHyperliquidAssetCtxs, A as fetchHyperliquidFrontendOpenOrders, B as fetchHyperliquidHistoricalOrders, C as fetchHyperliquidMeta, F as fetchHyperliquidMetaAndAssetCtxs, G as fetchHyperliquidOpenOrders, I as fetchHyperliquidOrderStatus, J as fetchHyperliquidPreTransferCheck, K as fetchHyperliquidSpotAssetCtxs, L as fetchHyperliquidSpotClearinghouseState, O as fetchHyperliquidSpotMeta, P as fetchHyperliquidSpotMetaAndAssetCtxs, Q as fetchHyperliquidUserFills, R as fetchHyperliquidUserFillsByTime, S as fetchHyperliquidUserRateLimit, T as modifyHyperliquidOrder, U as placeHyperliquidTwapOrder, V as reserveHyperliquidRequestWeight, W as resolveHyperliquidAbstractionFromMode, X as scheduleHyperliquidCancel, Y as sendHyperliquidSpot, Z as setHyperliquidAccountAbstractionMode, _ as setHyperliquidDexAbstraction, $ as setHyperliquidPortfolioMargin, a0 as transferHyperliquidSubAccount, a1 as updateHyperliquidIsolatedMargin, a2 as updateHyperliquidLeverage } from '../../exchange-XC9MHmxJ.js';
import 'viem';
import 'viem/accounts';

type HyperliquidChain = "arbitrum" | "arbitrum-sepolia";
type HyperliquidStoreNetwork = "hyperliquid" | "hyperliquid-testnet";
declare function resolveHyperliquidChain(environment: HyperliquidEnvironment): HyperliquidChain;
declare function resolveHyperliquidRpcEnvVar(environment: HyperliquidEnvironment): "ARBITRUM_RPC_URL" | "ARBITRUM_SEPOLIA_RPC_URL";
declare function resolveHyperliquidChainConfig(environment: HyperliquidEnvironment, env?: Record<string, string | undefined>): {
    chain: HyperliquidChain;
    rpcUrl?: string;
};
declare function resolveHyperliquidStoreNetwork(environment: HyperliquidEnvironment): HyperliquidStoreNetwork;

declare function extractHyperliquidDex(symbol: string): string | null;
declare function normalizeSpotTokenName(value?: string | null): string;
declare function normalizeHyperliquidBaseSymbol(value?: string | null): string | null;
declare function normalizeHyperliquidMetaSymbol(symbol: string): string;
declare function resolveHyperliquidPair(value?: string | null): string | null;
declare function resolveHyperliquidLeverageMode(symbol: string): "cross" | "isolated";
type HyperliquidProfileChain = "hyperliquid" | "hyperliquid-testnet";
type HyperliquidProfileAssetInput = {
    assetSymbols: string[];
    pair?: string | null;
    leverage?: number | null;
    walletAddress?: string | null;
};
type HyperliquidProfileAsset = {
    venue: "hyperliquid";
    chain: HyperliquidProfileChain;
    assetSymbols: string[];
    pair?: string;
    leverage?: number;
    walletAddress?: string;
};
declare function resolveHyperliquidProfileChain(environment: HyperliquidEnvironment): HyperliquidProfileChain;
declare function buildHyperliquidProfileAssets(params: {
    environment: HyperliquidEnvironment;
    assets: HyperliquidProfileAssetInput[];
}): HyperliquidProfileAsset[];
declare function parseSpotPairSymbol(symbol: string): {
    base: string;
    quote: string;
} | null;
declare function isHyperliquidSpotSymbol(symbol: string): boolean;
declare function resolveSpotMidCandidates(baseSymbol: string): string[];
declare function resolveSpotTokenCandidates(value: string): string[];
declare function resolveHyperliquidOrderSymbol(value?: string | null): string | null;
declare function resolveHyperliquidSymbol(asset: string, override?: string): string;
declare function resolveHyperliquidPerpSymbol(asset: string): string;
declare function resolveHyperliquidSpotSymbol(asset: string, defaultQuote?: string): {
    symbol: string;
    base: string;
    quote: string;
};

type HyperliquidExecutionMode = "long-only" | "long-short";
type HyperliquidTradeSignal = "buy" | "sell" | "hold" | "unknown";
type HyperliquidTradePlan = {
    side: "buy" | "sell";
    size: number;
    reduceOnly: boolean;
    targetSize: number;
};
interface HyperliquidTargetSizeConfig {
    allocationMode: "percent_equity" | "fixed";
    percentOfEquity: number;
    maxPercentOfEquity: number;
    amountUsd?: number;
}
interface HyperliquidTargetSizeExecution {
    size?: number;
}
type HyperliquidDcaSymbolInput = {
    symbol: string;
    weight?: number;
} | string;
type HyperliquidDcaSymbolEntry = {
    symbol: string;
    weight: number;
};
type HyperliquidDcaNormalizedEntry = {
    symbol: string;
    weight: number;
    normalizedWeight: number;
};
declare function resolveHyperliquidBudgetUsd(params: {
    config: HyperliquidTargetSizeConfig;
    accountValue: number | null;
}): number;
declare function resolveHyperliquidDcaSymbolEntries(inputs: HyperliquidDcaSymbolInput[] | undefined, fallbackSymbol: string): HyperliquidDcaSymbolEntry[];
declare function normalizeHyperliquidDcaEntries(params: {
    entries: Array<{
        symbol: string;
        weight?: number;
    }> | undefined;
    fallbackSymbol: string;
}): HyperliquidDcaNormalizedEntry[];
declare function resolveHyperliquidMaxPerRunUsd(targetNotionalUsd: number, hedgeRatio: number): number;
declare function clampHyperliquidAbs(value: number, limit: number): number;
declare function resolveHyperliquidTargetSize(params: {
    config: HyperliquidTargetSizeConfig;
    execution: HyperliquidTargetSizeExecution;
    accountValue: number | null;
    currentPrice: number;
}): {
    targetSize: number;
    budgetUsd: number;
};
declare function planHyperliquidTrade(params: {
    signal: HyperliquidTradeSignal;
    mode: HyperliquidExecutionMode;
    currentSize: number;
    targetSize: number;
}): HyperliquidTradePlan | null;

type HyperliquidTickSize = {
    tickSizeInt: bigint;
    tickDecimals: number;
};
type HyperliquidMarketType = "perp" | "spot";
type HyperliquidOrderResponseLike = {
    response?: {
        data?: {
            statuses?: Array<Record<string, unknown>>;
        };
    };
};
declare function formatHyperliquidPrice(price: string | number, szDecimals: number, marketType?: HyperliquidMarketType): string;
declare function formatHyperliquidSize(size: string | number, szDecimals: number): string;
declare function formatHyperliquidOrderSize(value: number, szDecimals: number): string;
declare function roundHyperliquidPriceToTick(price: number, tick: HyperliquidTickSize, side: "buy" | "sell"): string;
declare function formatHyperliquidMarketablePrice(params: {
    mid: number;
    side: "buy" | "sell";
    slippageBps: number;
    tick?: HyperliquidTickSize | null;
}): string;
declare function extractHyperliquidOrderIds(responses: HyperliquidOrderResponseLike[]): {
    cloids: string[];
    oids: string[];
};
declare function resolveHyperliquidOrderRef(params: {
    response?: HyperliquidOrderResponseLike | null;
    fallbackCloid?: string | null;
    fallbackOid?: string | null;
    prefix?: string;
    index?: number;
}): string;
declare function resolveHyperliquidErrorDetail(error: unknown): unknown | null;

declare function readHyperliquidNumber(value: unknown): number | null;
declare function readHyperliquidAccountValue(payload: unknown): number | null;
declare function readHyperliquidPerpPositionSize(payload: unknown, symbol: string, options?: {
    prefixMatch?: boolean;
}): number;
declare function readHyperliquidPerpPosition(payload: unknown, symbol: string, options?: {
    prefixMatch?: boolean;
}): {
    size: number;
    positionValue: number;
    unrealizedPnl: number | null;
};
declare function readHyperliquidSpotBalanceSize(payload: unknown, symbol: string): number;
declare function readHyperliquidSpotBalance(payload: unknown, base: string): {
    total: number;
    entryNtl: number | null;
};
declare function readHyperliquidSpotAccountValue(params: {
    balances: unknown;
    pricesUsd: Map<string, number>;
}): number | null;

type SpotUniverseItem = {
    name?: string;
    index?: number;
    tokens?: number[];
};
type SpotToken = {
    name?: string;
    index?: number;
    szDecimals?: number;
};
type SpotAssetContext = {
    markPx?: string | number;
    midPx?: string | number;
    oraclePx?: string | number;
};
type SpotMetaResponse = {
    universe?: SpotUniverseItem[];
    tokens?: SpotToken[];
};
type HyperliquidBarResolution = "1" | "5" | "15" | "30" | "60" | "240" | "1D" | "1W";
type HyperliquidBar = {
    time: number;
    open?: number;
    high?: number;
    low?: number;
    close: number;
    volume?: number;
    [key: string]: unknown;
};
type HyperliquidIndicatorBar = {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
};
type HyperliquidPerpMarketInfo = {
    symbol: string;
    price: number;
    fundingRate: number | null;
    szDecimals: number;
};
type HyperliquidSpotMarketInfo = {
    symbol: string;
    base: string;
    quote: string;
    assetId: number;
    marketIndex: number;
    price: number;
    szDecimals: number;
};
declare function maxDecimals(values: string[]): number;
declare function toScaledInt(value: string, decimals: number): bigint;
declare function formatScaledInt(value: bigint, decimals: number): string;
declare function fetchHyperliquidAllMids(environment: HyperliquidEnvironment): Promise<Record<string, string | number>>;
declare function fetchHyperliquidBars(params: {
    symbol: string;
    resolution: HyperliquidBarResolution;
    countBack: number;
    fromSeconds?: number;
    toSeconds?: number;
    gatewayBase?: string | null;
}): Promise<HyperliquidBar[]>;
declare function normalizeHyperliquidIndicatorBars(bars: HyperliquidBar[]): HyperliquidIndicatorBar[];
declare function fetchHyperliquidTickSize(params: {
    environment: HyperliquidEnvironment;
    symbol: string;
}): Promise<HyperliquidTickSize>;
declare function fetchHyperliquidSpotTickSize(params: {
    environment: HyperliquidEnvironment;
    marketIndex: number;
}): Promise<HyperliquidTickSize>;
declare function fetchHyperliquidPerpMarketInfo(params: {
    environment: HyperliquidEnvironment;
    symbol: string;
}): Promise<HyperliquidPerpMarketInfo>;
declare function fetchHyperliquidSpotMarketInfo(params: {
    environment: HyperliquidEnvironment;
    base: string;
    quote: string;
    mids?: Record<string, string | number> | null;
}): Promise<HyperliquidSpotMarketInfo>;
declare function fetchHyperliquidSizeDecimals(params: {
    environment: HyperliquidEnvironment;
    symbol: string;
}): Promise<number>;
declare function buildHyperliquidSpotUsdPriceMap(params: {
    meta: SpotMetaResponse;
    ctxs: SpotAssetContext[];
    mids?: Record<string, string | number> | null;
}): Map<string, number>;
declare function fetchHyperliquidSpotUsdPriceMap(environment: HyperliquidEnvironment): Promise<Map<string, number>>;
declare function fetchHyperliquidSpotAccountValue(params: {
    environment: HyperliquidEnvironment;
    balances: unknown;
}): Promise<number | null>;
declare const __hyperliquidMarketDataInternals: {
    maxDecimals: typeof maxDecimals;
    toScaledInt: typeof toScaledInt;
    formatScaledInt: typeof formatScaledInt;
};

type HyperliquidScheduleUnit = "minutes" | "hours";
type HyperliquidCadence = "daily" | "hourly" | "weekly" | "twice-weekly" | "monthly";
type HyperliquidResolution = "1" | "5" | "15" | "30" | "60" | "240" | "1D" | "1W";
declare const DEFAULT_HYPERLIQUID_CADENCE_CRON: Record<HyperliquidCadence, string>;
declare function parseHyperliquidJson(raw: string | null): unknown | null;
declare function clampHyperliquidInt(value: unknown, min: number, max: number, fallback: number): number;
declare function clampHyperliquidFloat(value: unknown, min: number, max: number, fallback: number): number;
declare function resolveHyperliquidScheduleEvery(input: unknown, options?: {
    min?: number;
    max?: number;
    fallback?: number;
}): number;
declare function resolveHyperliquidScheduleUnit(input: unknown, fallback?: HyperliquidScheduleUnit): HyperliquidScheduleUnit;
declare function resolveHyperliquidIntervalCron(every: number, unit: HyperliquidScheduleUnit): string;
declare function resolveHyperliquidHourlyInterval(input: unknown, fallback?: number): number;
declare function resolveHyperliquidCadenceCron(cadence: HyperliquidCadence, hourlyInterval: unknown, cadenceToCron?: Record<HyperliquidCadence, string>): string;
declare function resolveHyperliquidCadenceFromResolution(resolution: HyperliquidResolution): {
    cadence: HyperliquidCadence;
    hourlyInterval?: number;
};

interface HyperliquidOrderOptions {
    wallet: WalletFullContext;
    orders: HyperliquidOrderIntent[];
    grouping?: HyperliquidGrouping;
    environment?: HyperliquidEnvironment;
    vaultAddress?: `0x${string}`;
    expiresAfter?: number;
    nonce?: number;
    nonceSource?: NonceSource;
}
type HyperliquidOrderStatus = {
    resting: {
        oid: number;
        cloid?: `0x${string}`;
    };
} | {
    filled: {
        totalSz: string;
        avgPx: string;
        oid: number;
        cloid?: `0x${string}`;
    };
} | {
    error: string;
} | "waitingForFill" | "waitingForTrigger";
interface HyperliquidOrderResponse {
    status: "ok";
    response: {
        type: "order";
        data: {
            statuses: HyperliquidOrderStatus[];
        };
    };
}
interface HyperliquidDepositResult {
    txHash: `0x${string}`;
    amount: number;
    amountUnits: string;
    environment: HyperliquidEnvironment;
    bridgeAddress: `0x${string}`;
}
interface HyperliquidWithdrawResult {
    amount: number;
    destination: `0x${string}`;
    environment: HyperliquidEnvironment;
    nonce: number;
    status: string;
}
interface HyperliquidClearinghouseState {
    ok: boolean;
    data: Record<string, unknown> | null;
}
interface HyperliquidApproveBuilderFeeOptions {
    environment: HyperliquidEnvironment;
    wallet: WalletFullContext;
    nonce?: number;
    nonceSource?: NonceSource;
    /** Override default signature chain id. */
    signatureChainId?: string;
}
interface HyperliquidApproveBuilderFeeResponse {
    status: string;
    response?: unknown;
    error?: string;
}
interface HyperliquidTermsRecordInput {
    environment: HyperliquidEnvironment;
    walletAddress: `0x${string}`;
    storeOptions?: StoreOptions;
}
interface HyperliquidBuilderApprovalRecordInput {
    environment: HyperliquidEnvironment;
    walletAddress: `0x${string}`;
    storeOptions?: StoreOptions;
}
/**
 * Sign and submit one or more orders to the Hyperliquid exchange endpoint.
 */
declare function placeHyperliquidOrder(options: HyperliquidOrderOptions): Promise<HyperliquidOrderResponse>;
declare function depositToHyperliquidBridge(options: {
    environment: HyperliquidEnvironment;
    amount: string;
    wallet: WalletFullContext;
}): Promise<HyperliquidDepositResult>;
declare function withdrawFromHyperliquid(options: {
    environment: HyperliquidEnvironment;
    amount: string;
    destination: `0x${string}`;
    wallet: WalletFullContext;
    nonce?: number;
    nonceSource?: NonceSource;
}): Promise<HyperliquidWithdrawResult>;
declare function fetchHyperliquidClearinghouseState(params: {
    environment: HyperliquidEnvironment;
    walletAddress: `0x${string}`;
}): Promise<HyperliquidClearinghouseState>;
/**
 * Approve a max builder fee for a specific builder address (user-signed action).
 */
declare function approveHyperliquidBuilderFee(options: HyperliquidApproveBuilderFeeOptions): Promise<HyperliquidApproveBuilderFeeResponse>;
/**
 * Query max builder fee for a user/builder pair.
 */
declare function getHyperliquidMaxBuilderFee(params: {
    environment: HyperliquidEnvironment;
    user: `0x${string}`;
}): Promise<unknown>;
declare function recordHyperliquidTermsAcceptance(input: HyperliquidTermsRecordInput): Promise<StoreResponse>;
declare function recordHyperliquidBuilderApproval(input: HyperliquidBuilderApprovalRecordInput): Promise<StoreResponse>;

declare const __hyperliquidInternals: {
    toApiDecimal: typeof toApiDecimal;
    createL1ActionHash: typeof createL1ActionHash;
    splitSignature: typeof splitSignature;
};

export { DEFAULT_HYPERLIQUID_CADENCE_CRON, type HyperliquidApproveBuilderFeeOptions, type HyperliquidApproveBuilderFeeResponse, type HyperliquidBar, type HyperliquidBarResolution, type HyperliquidBuilderApprovalRecordInput, type HyperliquidCadence, type HyperliquidChain, type HyperliquidClearinghouseState, type HyperliquidDcaNormalizedEntry, type HyperliquidDcaSymbolEntry, type HyperliquidDcaSymbolInput, type HyperliquidDepositResult, HyperliquidEnvironment, type HyperliquidExecutionMode, HyperliquidGrouping, type HyperliquidIndicatorBar, type HyperliquidMarketType, HyperliquidOrderIntent, type HyperliquidOrderOptions, type HyperliquidOrderResponse, type HyperliquidOrderStatus, type HyperliquidPerpMarketInfo, type HyperliquidProfileAsset, type HyperliquidProfileAssetInput, type HyperliquidProfileChain, type HyperliquidResolution, type HyperliquidScheduleUnit, type HyperliquidSpotMarketInfo, type HyperliquidStoreNetwork, type HyperliquidTargetSizeConfig, type HyperliquidTargetSizeExecution, type HyperliquidTermsRecordInput, type HyperliquidTickSize, type HyperliquidTradePlan, type HyperliquidTradeSignal, type HyperliquidWithdrawResult, __hyperliquidInternals, __hyperliquidMarketDataInternals, approveHyperliquidBuilderFee, buildHyperliquidProfileAssets, buildHyperliquidSpotUsdPriceMap, clampHyperliquidAbs, clampHyperliquidFloat, clampHyperliquidInt, depositToHyperliquidBridge, extractHyperliquidDex, extractHyperliquidOrderIds, fetchHyperliquidAllMids, fetchHyperliquidBars, fetchHyperliquidClearinghouseState, fetchHyperliquidPerpMarketInfo, fetchHyperliquidSizeDecimals, fetchHyperliquidSpotAccountValue, fetchHyperliquidSpotMarketInfo, fetchHyperliquidSpotTickSize, fetchHyperliquidSpotUsdPriceMap, fetchHyperliquidTickSize, formatHyperliquidMarketablePrice, formatHyperliquidOrderSize, formatHyperliquidPrice, formatHyperliquidSize, getHyperliquidMaxBuilderFee, isHyperliquidSpotSymbol, normalizeHyperliquidBaseSymbol, normalizeHyperliquidDcaEntries, normalizeHyperliquidIndicatorBars, normalizeHyperliquidMetaSymbol, normalizeSpotTokenName, parseHyperliquidJson, parseSpotPairSymbol, placeHyperliquidOrder, planHyperliquidTrade, readHyperliquidAccountValue, readHyperliquidNumber, readHyperliquidPerpPosition, readHyperliquidPerpPositionSize, readHyperliquidSpotAccountValue, readHyperliquidSpotBalance, readHyperliquidSpotBalanceSize, recordHyperliquidBuilderApproval, recordHyperliquidTermsAcceptance, resolveHyperliquidBudgetUsd, resolveHyperliquidCadenceCron, resolveHyperliquidCadenceFromResolution, resolveHyperliquidChain, resolveHyperliquidChainConfig, resolveHyperliquidDcaSymbolEntries, resolveHyperliquidErrorDetail, resolveHyperliquidHourlyInterval, resolveHyperliquidIntervalCron, resolveHyperliquidLeverageMode, resolveHyperliquidMaxPerRunUsd, resolveHyperliquidOrderRef, resolveHyperliquidOrderSymbol, resolveHyperliquidPair, resolveHyperliquidPerpSymbol, resolveHyperliquidProfileChain, resolveHyperliquidRpcEnvVar, resolveHyperliquidScheduleEvery, resolveHyperliquidScheduleUnit, resolveHyperliquidSpotSymbol, resolveHyperliquidStoreNetwork, resolveHyperliquidSymbol, resolveHyperliquidTargetSize, resolveSpotMidCandidates, resolveSpotTokenCandidates, roundHyperliquidPriceToTick, withdrawFromHyperliquid };

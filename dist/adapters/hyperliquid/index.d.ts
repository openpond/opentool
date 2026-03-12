import { h as WalletFullContext } from '../../types-BaTmu0gS.js';
import { StoreOptions, StoreResponse } from '../../store/index.js';
import { i as HyperliquidEnvironment, a$ as NonceSource, r as HyperliquidOrderIntent, l as HyperliquidGrouping, b0 as toApiDecimal, b1 as createL1ActionHash, b2 as splitSignature } from '../../browser-DA4UUBo1.js';
export { D as DEFAULT_HYPERLIQUID_MARKET_SLIPPAGE_BPS, a as DEFAULT_HYPERLIQUID_TPSL_MARKET_SLIPPAGE_BPS, H as HyperliquidAbstraction, b as HyperliquidAccountMode, c as HyperliquidApiError, d as HyperliquidApproximateLiquidationParams, e as HyperliquidBar, f as HyperliquidBarResolution, g as HyperliquidBuilderApprovalError, h as HyperliquidBuilderFee, j as HyperliquidExchangeClient, k as HyperliquidExchangeResponse, m as HyperliquidGuardError, n as HyperliquidIndicatorBar, o as HyperliquidInfoClient, p as HyperliquidMarketIdentityInput, q as HyperliquidMarketType, s as HyperliquidParsedSymbol, t as HyperliquidParsedSymbolKind, u as HyperliquidPerpMarketInfo, v as HyperliquidPlaceOrderWithTpSlOptions, w as HyperliquidPlacePositionTpSlOptions, x as HyperliquidProfileAsset, y as HyperliquidProfileAssetInput, z as HyperliquidProfileChain, A as HyperliquidResolvedMarketDescriptor, B as HyperliquidSpotMarketInfo, C as HyperliquidTermsError, E as HyperliquidTickSize, F as HyperliquidTimeInForce, G as HyperliquidTpSlExecutionType, I as HyperliquidTpSlLegInput, J as HyperliquidTriggerOptions, K as HyperliquidTriggerType, M as MarketIdentity, _ as __hyperliquidMarketDataInternals, L as batchModifyHyperliquidOrders, N as buildHyperliquidMarketIdentity, O as buildHyperliquidProfileAssets, P as buildHyperliquidSpotUsdPriceMap, Q as cancelAllHyperliquidOrders, R as cancelHyperliquidOrders, S as cancelHyperliquidOrdersByCloid, T as cancelHyperliquidTwapOrder, U as computeHyperliquidMarketIocLimitPrice, V as createHyperliquidSubAccount, W as createMonotonicNonceFactory, X as estimateHyperliquidLiquidationPrice, Y as extractHyperliquidDex, Z as extractHyperliquidOrderIds, $ as fetchHyperliquidAllMids, a0 as fetchHyperliquidAssetCtxs, a1 as fetchHyperliquidBars, a2 as fetchHyperliquidDexMeta, a3 as fetchHyperliquidFrontendOpenOrders, a4 as fetchHyperliquidHistoricalOrders, a5 as fetchHyperliquidMeta, a6 as fetchHyperliquidMetaAndAssetCtxs, a7 as fetchHyperliquidOpenOrders, a8 as fetchHyperliquidOrderStatus, a9 as fetchHyperliquidPerpMarketInfo, aa as fetchHyperliquidPreTransferCheck, ab as fetchHyperliquidResolvedMarketDescriptor, ac as fetchHyperliquidSizeDecimals, ad as fetchHyperliquidSpotAccountValue, ae as fetchHyperliquidSpotAssetCtxs, af as fetchHyperliquidSpotClearinghouseState, ag as fetchHyperliquidSpotMarketInfo, ah as fetchHyperliquidSpotMeta, ai as fetchHyperliquidSpotMetaAndAssetCtxs, aj as fetchHyperliquidSpotTickSize, ak as fetchHyperliquidSpotUsdPriceMap, al as fetchHyperliquidTickSize, am as fetchHyperliquidUserFills, an as fetchHyperliquidUserFillsByTime, ao as fetchHyperliquidUserRateLimit, ap as formatHyperliquidMarketablePrice, aq as formatHyperliquidOrderSize, ar as formatHyperliquidPrice, as as formatHyperliquidSize, at as isHyperliquidSpotSymbol, au as modifyHyperliquidOrder, av as normalizeHyperliquidBaseSymbol, aw as normalizeHyperliquidIndicatorBars, ax as normalizeHyperliquidMetaSymbol, ay as normalizeSpotTokenName, az as parseHyperliquidSymbol, aA as parseSpotPairSymbol, aB as placeHyperliquidOrderWithTpSl, aC as placeHyperliquidPositionTpSl, aD as placeHyperliquidTwapOrder, aE as reserveHyperliquidRequestWeight, aF as resolveHyperliquidAbstractionFromMode, aG as resolveHyperliquidErrorDetail, aH as resolveHyperliquidLeverageMode, aI as resolveHyperliquidMarketDataCoin, aJ as resolveHyperliquidOrderRef, aK as resolveHyperliquidOrderSymbol, aL as resolveHyperliquidPair, aM as resolveHyperliquidPerpSymbol, aN as resolveHyperliquidProfileChain, aO as resolveHyperliquidSpotSymbol, aP as resolveHyperliquidSymbol, aQ as resolveSpotMidCandidates, aR as resolveSpotTokenCandidates, aS as roundHyperliquidPriceToTick, aT as scheduleHyperliquidCancel, aU as sendHyperliquidSpot, aV as setHyperliquidAccountAbstractionMode, aW as setHyperliquidPortfolioMargin, aX as supportsHyperliquidBuilderFee, aY as transferHyperliquidSubAccount, aZ as updateHyperliquidIsolatedMargin, a_ as updateHyperliquidLeverage } from '../../browser-DA4UUBo1.js';
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

export { DEFAULT_HYPERLIQUID_CADENCE_CRON, type HyperliquidApproveBuilderFeeOptions, type HyperliquidApproveBuilderFeeResponse, type HyperliquidBuilderApprovalRecordInput, type HyperliquidCadence, type HyperliquidChain, type HyperliquidClearinghouseState, type HyperliquidDcaNormalizedEntry, type HyperliquidDcaSymbolEntry, type HyperliquidDcaSymbolInput, type HyperliquidDepositResult, HyperliquidEnvironment, type HyperliquidExecutionMode, HyperliquidGrouping, HyperliquidOrderIntent, type HyperliquidOrderOptions, type HyperliquidOrderResponse, type HyperliquidOrderStatus, type HyperliquidResolution, type HyperliquidScheduleUnit, type HyperliquidStoreNetwork, type HyperliquidTargetSizeConfig, type HyperliquidTargetSizeExecution, type HyperliquidTermsRecordInput, type HyperliquidTradePlan, type HyperliquidTradeSignal, type HyperliquidWithdrawResult, __hyperliquidInternals, approveHyperliquidBuilderFee, clampHyperliquidAbs, clampHyperliquidFloat, clampHyperliquidInt, depositToHyperliquidBridge, fetchHyperliquidClearinghouseState, getHyperliquidMaxBuilderFee, normalizeHyperliquidDcaEntries, parseHyperliquidJson, placeHyperliquidOrder, planHyperliquidTrade, readHyperliquidAccountValue, readHyperliquidNumber, readHyperliquidPerpPosition, readHyperliquidPerpPositionSize, readHyperliquidSpotAccountValue, readHyperliquidSpotBalance, readHyperliquidSpotBalanceSize, recordHyperliquidBuilderApproval, recordHyperliquidTermsAcceptance, resolveHyperliquidBudgetUsd, resolveHyperliquidCadenceCron, resolveHyperliquidCadenceFromResolution, resolveHyperliquidChain, resolveHyperliquidChainConfig, resolveHyperliquidDcaSymbolEntries, resolveHyperliquidHourlyInterval, resolveHyperliquidIntervalCron, resolveHyperliquidMaxPerRunUsd, resolveHyperliquidRpcEnvVar, resolveHyperliquidScheduleEvery, resolveHyperliquidScheduleUnit, resolveHyperliquidStoreNetwork, resolveHyperliquidTargetSize, withdrawFromHyperliquid };

import { h as WalletFullContext } from '../../types-BaTmu0gS.js';
import { StoreOptions, StoreResponse } from '../../store/index.js';
import { k as HyperliquidEnvironment, b7 as NonceSource, v as HyperliquidOrderIntent, n as HyperliquidGrouping, b8 as toApiDecimal, b9 as createL1ActionHash, ba as splitSignature } from '../../browser-rRS6grWS.js';
export { D as DEFAULT_HYPERLIQUID_MARKET_SLIPPAGE_BPS, a as DEFAULT_HYPERLIQUID_TPSL_MARKET_SLIPPAGE_BPS, H as HYPERLIQUID_HIP3_DEXES, b as HyperliquidAbstraction, c as HyperliquidAccountMode, d as HyperliquidActiveAsset, e as HyperliquidApiError, f as HyperliquidApproximateLiquidationParams, g as HyperliquidBar, h as HyperliquidBarResolution, i as HyperliquidBuilderApprovalError, j as HyperliquidBuilderFee, l as HyperliquidExchangeClient, m as HyperliquidExchangeResponse, o as HyperliquidGuardError, p as HyperliquidHip3Dex, q as HyperliquidIndicatorBar, r as HyperliquidInfoClient, s as HyperliquidMarketIdentityInput, t as HyperliquidMarketType, u as HyperliquidOpenOrderLike, w as HyperliquidParsedSymbol, x as HyperliquidParsedSymbolKind, y as HyperliquidPerpMarketInfo, z as HyperliquidPlaceOrderWithTpSlOptions, A as HyperliquidPlacePositionTpSlOptions, B as HyperliquidProfileAsset, C as HyperliquidProfileAssetInput, E as HyperliquidProfileChain, F as HyperliquidResolvedMarketDescriptor, G as HyperliquidSpotMarketInfo, I as HyperliquidTermsError, J as HyperliquidTickSize, K as HyperliquidTimeInForce, L as HyperliquidTpSlExecutionType, M as HyperliquidTpSlLegInput, N as HyperliquidTriggerOptions, O as HyperliquidTriggerType, P as MarketIdentity, _ as __hyperliquidMarketDataInternals, Q as batchModifyHyperliquidOrders, R as buildHyperliquidMarketIdentity, S as buildHyperliquidProfileAssets, T as buildHyperliquidSpotUsdPriceMap, U as cancelAllHyperliquidOrders, V as cancelHyperliquidOrders, W as cancelHyperliquidOrdersByCloid, X as cancelHyperliquidTwapOrder, Y as computeHyperliquidMarketIocLimitPrice, Z as createHyperliquidSubAccount, $ as createMonotonicNonceFactory, a0 as estimateHyperliquidLiquidationPrice, a1 as extractHyperliquidDex, a2 as extractHyperliquidOrderIds, a3 as fetchHyperliquidActiveAsset, a4 as fetchHyperliquidAllMids, a5 as fetchHyperliquidAssetCtxs, a6 as fetchHyperliquidBars, a7 as fetchHyperliquidDexMeta, a8 as fetchHyperliquidFrontendOpenOrders, a9 as fetchHyperliquidFrontendOpenOrdersAcrossDexes, aa as fetchHyperliquidHistoricalOrders, ab as fetchHyperliquidMeta, ac as fetchHyperliquidMetaAndAssetCtxs, ad as fetchHyperliquidOpenOrders, ae as fetchHyperliquidOpenOrdersAcrossDexes, af as fetchHyperliquidOrderStatus, ag as fetchHyperliquidPerpMarketInfo, ah as fetchHyperliquidPreTransferCheck, ai as fetchHyperliquidResolvedMarketDescriptor, aj as fetchHyperliquidSizeDecimals, ak as fetchHyperliquidSpotAccountValue, al as fetchHyperliquidSpotAssetCtxs, am as fetchHyperliquidSpotClearinghouseState, an as fetchHyperliquidSpotMarketInfo, ao as fetchHyperliquidSpotMeta, ap as fetchHyperliquidSpotMetaAndAssetCtxs, aq as fetchHyperliquidSpotTickSize, ar as fetchHyperliquidSpotUsdPriceMap, as as fetchHyperliquidTickSize, at as fetchHyperliquidUserFills, au as fetchHyperliquidUserFillsByTime, av as fetchHyperliquidUserRateLimit, aw as formatHyperliquidMarketablePrice, ax as formatHyperliquidOrderSize, ay as formatHyperliquidPrice, az as formatHyperliquidSize, aA as getKnownHyperliquidDexes, aB as isHyperliquidSpotSymbol, aC as modifyHyperliquidOrder, aD as normalizeHyperliquidBaseSymbol, aE as normalizeHyperliquidIndicatorBars, aF as normalizeHyperliquidMetaSymbol, aG as normalizeSpotTokenName, aH as parseHyperliquidSymbol, aI as parseSpotPairSymbol, aJ as placeHyperliquidOrderWithTpSl, aK as placeHyperliquidPositionTpSl, aL as placeHyperliquidTwapOrder, aM as reserveHyperliquidRequestWeight, aN as resolveHyperliquidAbstractionFromMode, aO as resolveHyperliquidErrorDetail, aP as resolveHyperliquidLeverageMode, aQ as resolveHyperliquidMarketDataCoin, aR as resolveHyperliquidOrderRef, aS as resolveHyperliquidOrderSymbol, aT as resolveHyperliquidPair, aU as resolveHyperliquidPerpSymbol, aV as resolveHyperliquidProfileChain, aW as resolveHyperliquidSpotSymbol, aX as resolveHyperliquidSymbol, aY as resolveSpotMidCandidates, aZ as resolveSpotTokenCandidates, a_ as roundHyperliquidPriceToTick, a$ as scheduleHyperliquidCancel, b0 as sendHyperliquidSpot, b1 as setHyperliquidAccountAbstractionMode, b2 as setHyperliquidPortfolioMargin, b3 as supportsHyperliquidBuilderFee, b4 as transferHyperliquidSubAccount, b5 as updateHyperliquidIsolatedMargin, b6 as updateHyperliquidLeverage } from '../../browser-rRS6grWS.js';
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

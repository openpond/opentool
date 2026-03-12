import { h as WalletFullContext } from '../../types-BaTmu0gS.js';
import { StoreOptions, StoreResponse } from '../../store/index.js';
import { k as HyperliquidEnvironment, bb as NonceSource, x as HyperliquidOrderIntent, n as HyperliquidGrouping, bc as toApiDecimal, bd as createL1ActionHash, be as splitSignature } from '../../browser-CnpOj35m.js';
export { D as DEFAULT_HYPERLIQUID_MARKET_SLIPPAGE_BPS, a as DEFAULT_HYPERLIQUID_TPSL_MARKET_SLIPPAGE_BPS, H as HYPERLIQUID_HIP3_DEXES, b as HyperliquidAbstraction, c as HyperliquidAccountMode, d as HyperliquidActiveAsset, e as HyperliquidApiError, f as HyperliquidApproximateLiquidationParams, g as HyperliquidBar, h as HyperliquidBarResolution, i as HyperliquidBuilderApprovalError, j as HyperliquidBuilderFee, l as HyperliquidExchangeClient, m as HyperliquidExchangeResponse, o as HyperliquidGuardError, p as HyperliquidHip3Dex, q as HyperliquidIndicatorBar, r as HyperliquidInfoClient, s as HyperliquidMarketDescriptor, t as HyperliquidMarketDescriptorInput, u as HyperliquidMarketIdentityInput, v as HyperliquidMarketType, w as HyperliquidOpenOrderLike, y as HyperliquidParsedSymbol, z as HyperliquidParsedSymbolKind, A as HyperliquidPerpMarketInfo, B as HyperliquidPlaceOrderWithTpSlOptions, C as HyperliquidPlacePositionTpSlOptions, E as HyperliquidProfileAsset, F as HyperliquidProfileAssetInput, G as HyperliquidProfileChain, I as HyperliquidResolvedMarketDescriptor, J as HyperliquidSpotMarketInfo, K as HyperliquidTermsError, L as HyperliquidTickSize, M as HyperliquidTimeInForce, N as HyperliquidTpSlExecutionType, O as HyperliquidTpSlLegInput, P as HyperliquidTriggerOptions, Q as HyperliquidTriggerType, R as MarketIdentity, _ as __hyperliquidMarketDataInternals, S as batchModifyHyperliquidOrders, T as buildHyperliquidMarketDescriptor, U as buildHyperliquidMarketIdentity, V as buildHyperliquidProfileAssets, W as buildHyperliquidSpotUsdPriceMap, X as cancelAllHyperliquidOrders, Y as cancelHyperliquidOrders, Z as cancelHyperliquidOrdersByCloid, $ as cancelHyperliquidTwapOrder, a0 as computeHyperliquidMarketIocLimitPrice, a1 as createHyperliquidSubAccount, a2 as createMonotonicNonceFactory, a3 as estimateHyperliquidLiquidationPrice, a4 as extractHyperliquidDex, a5 as extractHyperliquidOrderIds, a6 as fetchHyperliquidActiveAsset, a7 as fetchHyperliquidAllMids, a8 as fetchHyperliquidAssetCtxs, a9 as fetchHyperliquidBars, aa as fetchHyperliquidDexMeta, ab as fetchHyperliquidDexMetaAndAssetCtxs, ac as fetchHyperliquidFrontendOpenOrders, ad as fetchHyperliquidFrontendOpenOrdersAcrossDexes, ae as fetchHyperliquidHistoricalOrders, af as fetchHyperliquidMeta, ag as fetchHyperliquidMetaAndAssetCtxs, ah as fetchHyperliquidOpenOrders, ai as fetchHyperliquidOpenOrdersAcrossDexes, aj as fetchHyperliquidOrderStatus, ak as fetchHyperliquidPerpMarketInfo, al as fetchHyperliquidPreTransferCheck, am as fetchHyperliquidResolvedMarketDescriptor, an as fetchHyperliquidSizeDecimals, ao as fetchHyperliquidSpotAccountValue, ap as fetchHyperliquidSpotAssetCtxs, aq as fetchHyperliquidSpotClearinghouseState, ar as fetchHyperliquidSpotMarketInfo, as as fetchHyperliquidSpotMeta, at as fetchHyperliquidSpotMetaAndAssetCtxs, au as fetchHyperliquidSpotTickSize, av as fetchHyperliquidSpotUsdPriceMap, aw as fetchHyperliquidTickSize, ax as fetchHyperliquidUserFills, ay as fetchHyperliquidUserFillsByTime, az as fetchHyperliquidUserRateLimit, aA as formatHyperliquidMarketablePrice, aB as formatHyperliquidOrderSize, aC as formatHyperliquidPrice, aD as formatHyperliquidSize, aE as getKnownHyperliquidDexes, aF as isHyperliquidSpotSymbol, aG as modifyHyperliquidOrder, aH as normalizeHyperliquidBaseSymbol, aI as normalizeHyperliquidIndicatorBars, aJ as normalizeHyperliquidMetaSymbol, aK as normalizeSpotTokenName, aL as parseHyperliquidSymbol, aM as parseSpotPairSymbol, aN as placeHyperliquidOrderWithTpSl, aO as placeHyperliquidPositionTpSl, aP as placeHyperliquidTwapOrder, aQ as reserveHyperliquidRequestWeight, aR as resolveHyperliquidAbstractionFromMode, aS as resolveHyperliquidErrorDetail, aT as resolveHyperliquidLeverageMode, aU as resolveHyperliquidMarketDataCoin, aV as resolveHyperliquidOrderRef, aW as resolveHyperliquidOrderSymbol, aX as resolveHyperliquidPair, aY as resolveHyperliquidPerpSymbol, aZ as resolveHyperliquidProfileChain, a_ as resolveHyperliquidSpotSymbol, a$ as resolveHyperliquidSymbol, b0 as resolveSpotMidCandidates, b1 as resolveSpotTokenCandidates, b2 as roundHyperliquidPriceToTick, b3 as scheduleHyperliquidCancel, b4 as sendHyperliquidSpot, b5 as setHyperliquidAccountAbstractionMode, b6 as setHyperliquidPortfolioMargin, b7 as supportsHyperliquidBuilderFee, b8 as transferHyperliquidSubAccount, b9 as updateHyperliquidIsolatedMargin, ba as updateHyperliquidLeverage } from '../../browser-CnpOj35m.js';
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

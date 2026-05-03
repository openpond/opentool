import { h as WalletFullContext } from '../../types-BaTmu0gS.js';
import { StoreOptions, StoreResponse } from '../../store/index.js';
import { k as HyperliquidEnvironment, be as NonceSource, x as HyperliquidOrderIntent, n as HyperliquidGrouping, bf as toApiDecimal, bg as createL1ActionHash, bh as splitSignature } from '../../browser-DBFUeBxP.js';
export { D as DEFAULT_HYPERLIQUID_MARKET_SLIPPAGE_BPS, a as DEFAULT_HYPERLIQUID_TPSL_MARKET_SLIPPAGE_BPS, H as HYPERLIQUID_HIP3_DEXES, b as HyperliquidAbstraction, c as HyperliquidAccountMode, d as HyperliquidActiveAsset, e as HyperliquidApiError, f as HyperliquidApproximateLiquidationParams, g as HyperliquidBar, h as HyperliquidBarResolution, i as HyperliquidBuilderApprovalError, j as HyperliquidBuilderFee, l as HyperliquidExchangeClient, m as HyperliquidExchangeResponse, o as HyperliquidGuardError, p as HyperliquidHip3Dex, q as HyperliquidIndicatorBar, r as HyperliquidInfoClient, s as HyperliquidMarketDescriptor, t as HyperliquidMarketDescriptorInput, u as HyperliquidMarketIdentityInput, v as HyperliquidMarketType, w as HyperliquidOpenOrderLike, y as HyperliquidOutcomeSymbol, z as HyperliquidParsedSymbol, A as HyperliquidParsedSymbolKind, B as HyperliquidPerpMarketInfo, C as HyperliquidPlaceOrderWithTpSlOptions, E as HyperliquidPlacePositionTpSlOptions, F as HyperliquidProfileAsset, G as HyperliquidProfileAssetInput, I as HyperliquidProfileChain, J as HyperliquidResolvedMarketDescriptor, K as HyperliquidSpotMarketInfo, L as HyperliquidTermsError, M as HyperliquidTickSize, N as HyperliquidTimeInForce, O as HyperliquidTpSlExecutionType, P as HyperliquidTpSlLegInput, Q as HyperliquidTriggerOptions, R as HyperliquidTriggerType, S as MarketIdentity, _ as __hyperliquidMarketDataInternals, T as batchModifyHyperliquidOrders, U as buildHyperliquidMarketDescriptor, V as buildHyperliquidMarketIdentity, W as buildHyperliquidProfileAssets, X as buildHyperliquidSpotUsdPriceMap, Y as cancelAllHyperliquidOrders, Z as cancelHyperliquidOrders, $ as cancelHyperliquidOrdersByCloid, a0 as cancelHyperliquidTwapOrder, a1 as computeHyperliquidMarketIocLimitPrice, a2 as createHyperliquidSubAccount, a3 as createMonotonicNonceFactory, a4 as estimateHyperliquidLiquidationPrice, a5 as extractHyperliquidDex, a6 as extractHyperliquidOrderIds, a7 as fetchHyperliquidActiveAsset, a8 as fetchHyperliquidAllMids, a9 as fetchHyperliquidAssetCtxs, aa as fetchHyperliquidBars, ab as fetchHyperliquidDexMeta, ac as fetchHyperliquidDexMetaAndAssetCtxs, ad as fetchHyperliquidFrontendOpenOrders, ae as fetchHyperliquidFrontendOpenOrdersAcrossDexes, af as fetchHyperliquidHistoricalOrders, ag as fetchHyperliquidMeta, ah as fetchHyperliquidMetaAndAssetCtxs, ai as fetchHyperliquidOpenOrders, aj as fetchHyperliquidOpenOrdersAcrossDexes, ak as fetchHyperliquidOrderStatus, al as fetchHyperliquidPerpMarketInfo, am as fetchHyperliquidPreTransferCheck, an as fetchHyperliquidResolvedInfoCoin, ao as fetchHyperliquidResolvedMarketDescriptor, ap as fetchHyperliquidSizeDecimals, aq as fetchHyperliquidSpotAccountValue, ar as fetchHyperliquidSpotAssetCtxs, as as fetchHyperliquidSpotClearinghouseState, at as fetchHyperliquidSpotMarketInfo, au as fetchHyperliquidSpotMeta, av as fetchHyperliquidSpotMetaAndAssetCtxs, aw as fetchHyperliquidSpotTickSize, ax as fetchHyperliquidSpotUsdPriceMap, ay as fetchHyperliquidTickSize, az as fetchHyperliquidUserFills, aA as fetchHyperliquidUserFillsByTime, aB as fetchHyperliquidUserRateLimit, aC as formatHyperliquidMarketablePrice, aD as formatHyperliquidOrderSize, aE as formatHyperliquidPrice, aF as formatHyperliquidSize, aG as getKnownHyperliquidDexes, aH as isHyperliquidSpotSymbol, aI as modifyHyperliquidOrder, aJ as normalizeHyperliquidBaseSymbol, aK as normalizeHyperliquidIndicatorBars, aL as normalizeHyperliquidMetaSymbol, aM as normalizeSpotTokenName, aN as parseHyperliquidOutcomeSymbol, aO as parseHyperliquidSymbol, aP as parseSpotPairSymbol, aQ as placeHyperliquidOrderWithTpSl, aR as placeHyperliquidPositionTpSl, aS as placeHyperliquidTwapOrder, aT as reserveHyperliquidRequestWeight, aU as resolveHyperliquidAbstractionFromMode, aV as resolveHyperliquidErrorDetail, aW as resolveHyperliquidLeverageMode, aX as resolveHyperliquidMarketDataCoin, aY as resolveHyperliquidOrderRef, aZ as resolveHyperliquidOrderSymbol, a_ as resolveHyperliquidPair, a$ as resolveHyperliquidPerpSymbol, b0 as resolveHyperliquidProfileChain, b1 as resolveHyperliquidSpotSymbol, b2 as resolveHyperliquidSymbol, b3 as resolveSpotMidCandidates, b4 as resolveSpotTokenCandidates, b5 as roundHyperliquidPriceToTick, b6 as scheduleHyperliquidCancel, b7 as sendHyperliquidSpot, b8 as setHyperliquidAccountAbstractionMode, b9 as setHyperliquidPortfolioMargin, ba as supportsHyperliquidBuilderFee, bb as transferHyperliquidSubAccount, bc as updateHyperliquidIsolatedMargin, bd as updateHyperliquidLeverage } from '../../browser-DBFUeBxP.js';
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
type HyperliquidTargetSizeConfig = {
    allocationMode: "fixed";
    amountUsd?: number;
} | {
    allocationMode: "percent_equity";
    percentOfEquity: number;
    maxPercentOfEquity: number;
    amountUsd?: number;
};
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

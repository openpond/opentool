import { j as WalletFullContext } from './types-D8s9zx-U.js';

type HyperliquidEnvironment = "mainnet" | "testnet";
type MarketIdentity = {
    market_type: "perp" | "spot" | "dex" | "prediction";
    venue: "hyperliquid";
    environment: HyperliquidEnvironment;
    base?: string | null;
    quote?: string | null;
    dex?: string | null;
    chain_id?: number | null;
    pool_address?: string | null;
    token0_address?: string | null;
    token1_address?: string | null;
    protocol_market_id?: string | null;
    position_id?: string | null;
    fee_tier?: number | null;
    raw_symbol?: string | null;
    canonical_symbol: string;
};
type HyperliquidMarketIdentityInput = {
    environment: HyperliquidEnvironment;
    symbol: string;
    rawSymbol?: string | null;
    isSpot?: boolean;
    base?: string | null;
    quote?: string | null;
};
type HyperliquidOutcomeMarketIdentityInput = {
    environment: HyperliquidEnvironment;
    marketDataCoin?: string | null;
    outcomeTokenName?: string | null;
    rawSymbol?: string | null;
    outcomeId?: string | number | null;
    outcomeSide?: string | number | null;
    sideName?: string | null;
    underlying?: string | null;
    seriesKey?: string | null;
    roundKey?: string | null;
    protocolMarketId?: string | null;
    positionId?: string | null;
};
declare function buildHyperliquidMarketIdentity(input: HyperliquidMarketIdentityInput): MarketIdentity | null;
declare function buildHyperliquidOutcomeMarketIdentity(input: HyperliquidOutcomeMarketIdentityInput): MarketIdentity | null;
type HyperliquidTimeInForce = "Gtc" | "Ioc" | "Alo" | "FrontendMarket" | "LiquidationMarket";
type HyperliquidGrouping = "na" | "normalTpsl" | "positionTpsl";
type HyperliquidTriggerType = "tp" | "sl";
type HyperliquidAbstraction = "unifiedAccount" | "portfolioMargin" | "disabled";
type HyperliquidAccountMode = "standard" | "unified" | "portfolio";
declare function resolveHyperliquidAbstractionFromMode(mode: HyperliquidAccountMode): HyperliquidAbstraction;
declare const DEFAULT_HYPERLIQUID_MARKET_SLIPPAGE_BPS = 30;
declare function computeHyperliquidMarketIocLimitPrice(params: {
    markPrice: number;
    side: "buy" | "sell";
    slippageBps?: number;
    decimals?: number;
}): string;
interface HyperliquidTriggerOptions {
    triggerPx: string | number | bigint;
    isMarket?: boolean;
    tpsl: HyperliquidTriggerType;
}
interface HyperliquidBuilderFee {
    address: `0x${string}`;
    /**
     * Fee in tenths of basis points (10 = 1bp = 0.01%). Max defaults to 0.1% (100).
     */
    fee: number;
}
interface HyperliquidOrderIntent {
    symbol: string;
    side: "buy" | "sell";
    price: string | number | bigint;
    size: string | number | bigint;
    tif?: HyperliquidTimeInForce;
    reduceOnly?: boolean;
    clientId?: `0x${string}`;
    trigger?: HyperliquidTriggerOptions;
}
type ExchangeOrderAction = {
    type: "order";
    orders: Array<{
        a: number;
        b: boolean;
        p: string;
        s: string;
        r: boolean;
        t: {
            limit: {
                tif: HyperliquidTimeInForce;
            };
        } | {
            trigger: {
                isMarket: boolean;
                triggerPx: string;
                tpsl: HyperliquidTriggerType;
            };
        };
        c?: `0x${string}`;
    }>;
    grouping: HyperliquidGrouping;
    builder?: {
        b: `0x${string}`;
        f: number;
    };
};
type ExchangeSignature = {
    r: `0x${string}`;
    s: `0x${string}`;
    v: 27 | 28;
};
type HyperliquidExchangeResponse<T = unknown> = {
    status: string;
    response?: {
        type: string;
        data?: T;
    };
    error?: string;
};
type NonceSource = () => number;
declare class HyperliquidApiError extends Error {
    readonly response: unknown;
    constructor(message: string, response: unknown);
}
declare class HyperliquidGuardError extends Error {
    constructor(message: string);
}
declare class HyperliquidTermsError extends HyperliquidGuardError {
    constructor(message?: string);
}
declare class HyperliquidBuilderApprovalError extends HyperliquidGuardError {
    constructor(message?: string);
}
declare function createMonotonicNonceFactory(start?: number): NonceSource;
declare function toApiDecimal(value: string | number | bigint): string;
declare function splitSignature(signature: `0x${string}`): ExchangeSignature;
declare function createL1ActionHash(args: {
    action: ExchangeOrderAction | Record<string, unknown>;
    nonce: number;
    vaultAddress?: `0x${string}` | undefined;
    expiresAfter?: number | undefined;
}): `0x${string}`;

declare const HYPERLIQUID_HIP3_DEXES: readonly ["xyz", "flx", "vntl", "hyna", "km", "cash"];
type HyperliquidHip3Dex = (typeof HYPERLIQUID_HIP3_DEXES)[number];
type HyperliquidOpenOrderLike = {
    oid?: number;
    cloid?: string | null;
    dex?: string | null;
    [key: string]: unknown;
};
type HyperliquidActiveAsset = {
    coin: string;
    leverage: number | null;
    leverageType: string | null;
    raw: unknown;
};
declare class HyperliquidInfoClient {
    private readonly environment;
    constructor(environment?: HyperliquidEnvironment);
    meta(): Promise<any>;
    metaAndAssetCtxs(): Promise<any>;
    spotMeta(): Promise<any>;
    spotMetaAndAssetCtxs(): Promise<any>;
    assetCtxs(): Promise<any>;
    spotAssetCtxs(): Promise<any>;
    outcomeMeta(): Promise<any>;
    openOrders(user: `0x${string}`): Promise<HyperliquidOpenOrderLike[]>;
    frontendOpenOrders(user: `0x${string}`): Promise<HyperliquidOpenOrderLike[]>;
    orderStatus(user: `0x${string}`, oid: number | string): Promise<any>;
    historicalOrders(user: `0x${string}`): Promise<any>;
    userFills(user: `0x${string}`): Promise<any>;
    userFillsByTime(user: `0x${string}`, startTime: number, endTime: number): Promise<any>;
    userRateLimit(user: `0x${string}`): Promise<any>;
    preTransferCheck(user: `0x${string}`, source: `0x${string}`): Promise<any>;
    spotClearinghouseState(user: `0x${string}`): Promise<any>;
    activeAsset(user: `0x${string}`, symbol: string): Promise<HyperliquidActiveAsset>;
}
declare function fetchHyperliquidMeta(environment?: HyperliquidEnvironment): Promise<any>;
declare function fetchHyperliquidDexMeta(environment: HyperliquidEnvironment | undefined, dex: string): Promise<any>;
declare function fetchHyperliquidMetaAndAssetCtxs(environment?: HyperliquidEnvironment): Promise<any>;
declare function fetchHyperliquidDexMetaAndAssetCtxs(environment: HyperliquidEnvironment | undefined, dex: string): Promise<any>;
declare function fetchHyperliquidSpotMeta(environment?: HyperliquidEnvironment): Promise<any>;
declare function fetchHyperliquidSpotMetaAndAssetCtxs(environment?: HyperliquidEnvironment): Promise<any>;
declare function fetchHyperliquidAssetCtxs(environment?: HyperliquidEnvironment): Promise<any>;
declare function fetchHyperliquidSpotAssetCtxs(environment?: HyperliquidEnvironment): Promise<any>;
declare function fetchHyperliquidOutcomeMeta(environment?: HyperliquidEnvironment): Promise<any>;
declare function fetchHyperliquidOpenOrders<T extends HyperliquidOpenOrderLike = HyperliquidOpenOrderLike>(params: {
    environment?: HyperliquidEnvironment;
    user: `0x${string}`;
    dex?: string | null;
}): Promise<T[]>;
declare function fetchHyperliquidFrontendOpenOrders<T extends HyperliquidOpenOrderLike = HyperliquidOpenOrderLike>(params: {
    environment?: HyperliquidEnvironment;
    user: `0x${string}`;
    dex?: string | null;
}): Promise<T[]>;
declare function fetchHyperliquidOrderStatus(params: {
    environment?: HyperliquidEnvironment;
    user: `0x${string}`;
    oid: number | string;
}): Promise<any>;
declare function fetchHyperliquidHistoricalOrders(params: {
    environment?: HyperliquidEnvironment;
    user: `0x${string}`;
    dex?: string | null;
}): Promise<any>;
declare function fetchHyperliquidUserFills(params: {
    environment?: HyperliquidEnvironment;
    user: `0x${string}`;
}): Promise<any>;
declare function fetchHyperliquidUserFillsByTime(params: {
    environment?: HyperliquidEnvironment;
    user: `0x${string}`;
    startTime: number;
    endTime: number;
}): Promise<any>;
declare function fetchHyperliquidUserRateLimit(params: {
    environment?: HyperliquidEnvironment;
    user: `0x${string}`;
}): Promise<any>;
declare function fetchHyperliquidPreTransferCheck(params: {
    environment?: HyperliquidEnvironment;
    user: `0x${string}`;
    source: `0x${string}`;
}): Promise<any>;
declare function fetchHyperliquidSpotClearinghouseState(params: {
    environment?: HyperliquidEnvironment;
    user: `0x${string}`;
}): Promise<any>;
declare function getKnownHyperliquidDexes(environment?: HyperliquidEnvironment): string[];
declare function fetchHyperliquidOpenOrdersAcrossDexes<T extends HyperliquidOpenOrderLike>(params: {
    environment?: HyperliquidEnvironment;
    user: `0x${string}`;
    dexes?: string[];
    includePrimary?: boolean;
}): Promise<T[]>;
declare function fetchHyperliquidFrontendOpenOrdersAcrossDexes<T extends HyperliquidOpenOrderLike>(params: {
    environment?: HyperliquidEnvironment;
    user: `0x${string}`;
    dexes?: string[];
    includePrimary?: boolean;
}): Promise<T[]>;
declare function fetchHyperliquidActiveAsset(params: {
    environment?: HyperliquidEnvironment;
    user: `0x${string}`;
    symbol: string;
}): Promise<HyperliquidActiveAsset>;

type CommonActionOptions = {
    environment?: HyperliquidEnvironment;
    vaultAddress?: `0x${string}` | undefined;
    expiresAfter?: number | undefined;
    nonce?: number | undefined;
    nonceSource?: NonceSource | undefined;
    /**
     * Optional per-wallet nonce provider (preferred if available).
     */
    walletNonceProvider?: NonceSource | undefined;
};
type CancelInput = {
    symbol: string;
    oid: number | string;
};
type CancelByCloidInput = {
    symbol: string;
    cloid: `0x${string}`;
};
type ModifyOrderInput = {
    oid: number | `0x${string}`;
    order: HyperliquidOrderIntent;
};
type TwapOrderInput = {
    symbol: string;
    side: "buy" | "sell";
    size: string | number | bigint;
    reduceOnly?: boolean;
    minutes: number;
    randomize?: boolean;
};
type TwapCancelInput = {
    symbol: string;
    twapId: number;
};
type UpdateLeverageInput = {
    symbol: string;
    leverageMode: "cross" | "isolated";
    leverage: number;
    verifyApplied?: boolean;
    verifyAttempts?: number;
    verifyDelayMs?: number;
    verifyUser?: `0x${string}`;
};
type UpdateIsolatedMarginInput = {
    symbol: string;
    isBuy: boolean;
    ntli: number;
};
declare class HyperliquidExchangeClient {
    private readonly nonceSource;
    private readonly environment;
    private readonly vaultAddress;
    private readonly expiresAfter;
    private readonly wallet;
    constructor(args: {
        wallet: WalletFullContext;
        environment?: HyperliquidEnvironment;
        vaultAddress?: `0x${string}`;
        expiresAfter?: number;
        nonceSource?: NonceSource;
        walletNonceProvider?: NonceSource;
    });
    cancel(cancels: CancelInput[]): Promise<HyperliquidExchangeResponse<unknown>>;
    cancelByCloid(cancels: CancelByCloidInput[]): Promise<HyperliquidExchangeResponse<unknown>>;
    cancelAll(): Promise<HyperliquidExchangeResponse<unknown>>;
    scheduleCancel(time: number | null): Promise<HyperliquidExchangeResponse<unknown>>;
    modify(modification: ModifyOrderInput): Promise<HyperliquidExchangeResponse<unknown>>;
    batchModify(modifications: ModifyOrderInput[]): Promise<HyperliquidExchangeResponse<unknown>>;
    twapOrder(twap: TwapOrderInput): Promise<HyperliquidExchangeResponse<unknown>>;
    twapCancel(cancel: TwapCancelInput): Promise<HyperliquidExchangeResponse<unknown>>;
    updateLeverage(input: UpdateLeverageInput): Promise<HyperliquidExchangeResponse<unknown>>;
    updateIsolatedMargin(input: UpdateIsolatedMarginInput): Promise<HyperliquidExchangeResponse<unknown>>;
    reserveRequestWeight(weight: number): Promise<HyperliquidExchangeResponse<unknown>>;
    spotSend(params: {
        destination: `0x${string}`;
        token: string;
        amount: string | number | bigint;
    }): Promise<HyperliquidExchangeResponse<unknown>>;
    setAccountAbstractionMode(params: {
        mode: HyperliquidAccountMode;
        user?: `0x${string}`;
    }): Promise<HyperliquidExchangeResponse<unknown>>;
    setPortfolioMargin(params: {
        enabled: boolean;
        user?: `0x${string}`;
    }): Promise<HyperliquidExchangeResponse<unknown>>;
}
declare function setHyperliquidPortfolioMargin(options: {
    wallet: WalletFullContext;
    enabled: boolean;
    user?: `0x${string}`;
} & CommonActionOptions): Promise<HyperliquidExchangeResponse<unknown>>;
declare function setHyperliquidAccountAbstractionMode(options: {
    wallet: WalletFullContext;
    mode: HyperliquidAccountMode;
    user?: `0x${string}`;
} & CommonActionOptions): Promise<HyperliquidExchangeResponse<unknown>>;
declare function cancelHyperliquidOrders(options: {
    wallet: WalletFullContext;
    cancels: CancelInput[];
} & CommonActionOptions): Promise<HyperliquidExchangeResponse<unknown>>;
declare function cancelHyperliquidOrdersByCloid(options: {
    wallet: WalletFullContext;
    cancels: CancelByCloidInput[];
} & CommonActionOptions): Promise<HyperliquidExchangeResponse<unknown>>;
declare function cancelAllHyperliquidOrders(options: {
    wallet: WalletFullContext;
} & CommonActionOptions): Promise<HyperliquidExchangeResponse<unknown>>;
declare function scheduleHyperliquidCancel(options: {
    wallet: WalletFullContext;
    time?: number | null;
} & CommonActionOptions): Promise<HyperliquidExchangeResponse<unknown>>;
declare function modifyHyperliquidOrder(options: {
    wallet: WalletFullContext;
    modification: ModifyOrderInput;
    grouping?: HyperliquidGrouping;
} & CommonActionOptions): Promise<HyperliquidExchangeResponse<unknown>>;
declare function batchModifyHyperliquidOrders(options: {
    wallet: WalletFullContext;
    modifications: ModifyOrderInput[];
} & CommonActionOptions): Promise<HyperliquidExchangeResponse<unknown>>;
declare function placeHyperliquidTwapOrder(options: {
    wallet: WalletFullContext;
    twap: TwapOrderInput;
} & CommonActionOptions): Promise<HyperliquidExchangeResponse<unknown>>;
declare function cancelHyperliquidTwapOrder(options: {
    wallet: WalletFullContext;
    cancel: TwapCancelInput;
} & CommonActionOptions): Promise<HyperliquidExchangeResponse<unknown>>;
declare function updateHyperliquidLeverage(options: {
    wallet: WalletFullContext;
    input: UpdateLeverageInput;
} & CommonActionOptions): Promise<HyperliquidExchangeResponse<unknown>>;
declare function updateHyperliquidIsolatedMargin(options: {
    wallet: WalletFullContext;
    input: UpdateIsolatedMarginInput;
} & CommonActionOptions): Promise<HyperliquidExchangeResponse<unknown>>;
declare function reserveHyperliquidRequestWeight(options: {
    wallet: WalletFullContext;
    weight: number;
} & CommonActionOptions): Promise<HyperliquidExchangeResponse<unknown>>;
declare function createHyperliquidSubAccount(options: {
    wallet: WalletFullContext;
    name: string;
} & CommonActionOptions): Promise<HyperliquidExchangeResponse<unknown>>;
declare function transferHyperliquidSubAccount(options: {
    wallet: WalletFullContext;
    subAccountUser: `0x${string}`;
    isDeposit: boolean;
    usd: string | number | bigint;
} & CommonActionOptions): Promise<HyperliquidExchangeResponse<unknown>>;
declare function sendHyperliquidSpot(options: {
    wallet: WalletFullContext;
    destination: `0x${string}`;
    token: string;
    amount: string | number | bigint;
    environment?: HyperliquidEnvironment;
    nonce?: number;
    nonceSource?: NonceSource | undefined;
}): Promise<HyperliquidExchangeResponse<unknown>>;

type HyperliquidParsedSymbolKind = "perp" | "spot" | "spotIndex" | "outcome";
type HyperliquidOutcomeSymbol = {
    outcomeId: number;
    side: number;
    encoding: number;
    orderSymbol: string;
    marketDataCoin: string;
    tokenName: string;
    sideName: string;
    displaySymbol: string;
    routeTicker: string;
    assetId: number;
};
type HyperliquidParsedSymbol = {
    raw: string;
    kind: HyperliquidParsedSymbolKind;
    normalized: string;
    routeTicker: string;
    displaySymbol: string;
    base: string | null;
    quote: string | null;
    pair: string | null;
    dex: string | null;
    leverageMode: "cross" | "isolated";
};
type HyperliquidMarketDescriptor = {
    rawSymbol: string;
    kind: HyperliquidParsedSymbolKind;
    routeTicker: string;
    displaySymbol: string;
    normalized: string;
    orderSymbol: string;
    marketDataCoin: string;
    base: string | null;
    quote: string | null;
    pair: string | null;
    canonicalPair: string | null;
    dex: string | null;
    leverageMode: "cross" | "isolated";
    spotIndex: number | null;
    assetId: number | null;
};
type HyperliquidMarketDescriptorInput = {
    symbol: string;
    quote?: string | null;
    pair?: string | null;
    displaySymbol?: string | null;
    orderSymbol?: string | null;
    marketDataCoin?: string | null;
    spotIndex?: number | null;
    assetId?: number | null;
};
declare function extractHyperliquidDex(symbol: string): string | null;
declare function parseHyperliquidSymbol(value?: string | null): HyperliquidParsedSymbol | null;
declare function parseHyperliquidOutcomeSymbol(value?: string | null): HyperliquidOutcomeSymbol | null;
declare function normalizeSpotTokenName(value?: string | null): string;
declare function normalizeHyperliquidBaseSymbol(value?: string | null): string | null;
declare function normalizeHyperliquidMetaSymbol(symbol: string): string;
declare function resolveHyperliquidPair(value?: string | null): string | null;
declare function buildHyperliquidMarketDescriptor(input: HyperliquidMarketDescriptorInput): HyperliquidMarketDescriptor | null;
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
declare function resolveHyperliquidMarketDataCoin(value?: string | null): string | null;
declare function supportsHyperliquidBuilderFee(params: {
    symbol: string;
    side: "buy" | "sell";
}): boolean;
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
declare function roundHyperliquidPriceToTick(price: string | number, tick: HyperliquidTickSize, side: "buy" | "sell"): string;
declare function formatHyperliquidMarketablePrice(params: {
    mid: number;
    side: "buy" | "sell";
    slippageBps: number;
    tick?: HyperliquidTickSize | null;
    szDecimals?: number | null;
    marketType?: HyperliquidMarketType;
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
type HyperliquidResolvedMarketDescriptor = HyperliquidMarketDescriptor;
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
declare function fetchHyperliquidResolvedMarketDescriptor(params: {
    environment: HyperliquidEnvironment;
    symbol: string;
    mids?: Record<string, string | number> | null;
}): Promise<HyperliquidResolvedMarketDescriptor>;
declare function fetchHyperliquidResolvedInfoCoin(params: {
    environment: HyperliquidEnvironment;
    symbol: string;
    mids?: Record<string, string | number> | null;
}): Promise<string>;
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
    signatureChainId?: string;
}
interface HyperliquidApproveBuilderFeeResponse {
    status: string;
    response?: unknown;
    error?: string;
}
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
declare function approveHyperliquidBuilderFee(options: HyperliquidApproveBuilderFeeOptions): Promise<HyperliquidApproveBuilderFeeResponse>;
declare function getHyperliquidMaxBuilderFee(params: {
    environment: HyperliquidEnvironment;
    user: `0x${string}`;
}): Promise<unknown>;
declare function createHyperliquidActionHash(params: {
    action: Record<string, unknown> | ExchangeOrderAction;
    nonce: number;
    isTestnet: boolean;
    vaultAddress?: `0x${string}`;
    expiresAfter?: number;
}): `0x${string}`;

declare const DEFAULT_HYPERLIQUID_TPSL_MARKET_SLIPPAGE_BPS = 1000;
type HyperliquidTpSlExecutionType = "market" | "limit";
interface HyperliquidTpSlLegInput {
    triggerPx: string | number | bigint;
    execution?: HyperliquidTpSlExecutionType;
    price?: string | number | bigint;
    clientId?: `0x${string}`;
}
interface HyperliquidPlaceOrderWithTpSlOptions {
    wallet: WalletFullContext;
    parent: HyperliquidOrderIntent;
    referencePrice: string | number;
    takeProfit?: HyperliquidTpSlLegInput | null;
    stopLoss?: HyperliquidTpSlLegInput | null;
    environment?: HyperliquidEnvironment;
    grouping?: Extract<HyperliquidGrouping, "normalTpsl">;
    vaultAddress?: `0x${string}`;
    expiresAfter?: number;
    nonce?: number;
    nonceSource?: NonceSource;
    triggerMarketSlippageBps?: number;
}
interface HyperliquidPlacePositionTpSlOptions {
    wallet: WalletFullContext;
    symbol: string;
    positionSide: "long" | "short";
    size: string | number | bigint;
    referencePrice: string | number;
    takeProfit?: HyperliquidTpSlLegInput | null;
    stopLoss?: HyperliquidTpSlLegInput | null;
    environment?: HyperliquidEnvironment;
    grouping?: Extract<HyperliquidGrouping, "positionTpsl">;
    vaultAddress?: `0x${string}`;
    expiresAfter?: number;
    nonce?: number;
    nonceSource?: NonceSource;
    triggerMarketSlippageBps?: number;
}
declare function placeHyperliquidOrderWithTpSl(options: HyperliquidPlaceOrderWithTpSlOptions): Promise<HyperliquidOrderResponse>;
declare function placeHyperliquidPositionTpSl(options: HyperliquidPlacePositionTpSlOptions): Promise<HyperliquidOrderResponse>;

type HyperliquidApproximateLiquidationParams = {
    entryPrice: number;
    side: "buy" | "sell";
    notionalUsd: number;
    leverage: number;
    maxLeverage: number;
    marginMode: "cross" | "isolated";
    availableCollateralUsd?: number | null;
};
declare function estimateHyperliquidLiquidationPrice(params: HyperliquidApproximateLiquidationParams): number | null;

export { cancelAllHyperliquidOrders as $, type HyperliquidParsedSymbol as A, type HyperliquidParsedSymbolKind as B, type HyperliquidPerpMarketInfo as C, DEFAULT_HYPERLIQUID_MARKET_SLIPPAGE_BPS as D, type HyperliquidPlaceOrderWithTpSlOptions as E, type HyperliquidPlacePositionTpSlOptions as F, type HyperliquidProfileAsset as G, HYPERLIQUID_HIP3_DEXES as H, type HyperliquidProfileAssetInput as I, type HyperliquidProfileChain as J, type HyperliquidResolvedMarketDescriptor as K, type HyperliquidSpotMarketInfo as L, HyperliquidTermsError as M, type HyperliquidTickSize as N, type HyperliquidTimeInForce as O, type HyperliquidTpSlExecutionType as P, type HyperliquidTpSlLegInput as Q, type HyperliquidTriggerOptions as R, type HyperliquidTriggerType as S, type MarketIdentity as T, batchModifyHyperliquidOrders as U, buildHyperliquidMarketDescriptor as V, buildHyperliquidMarketIdentity as W, buildHyperliquidOutcomeMarketIdentity as X, buildHyperliquidProfileAssets as Y, buildHyperliquidSpotUsdPriceMap as Z, __hyperliquidMarketDataInternals as _, DEFAULT_HYPERLIQUID_TPSL_MARKET_SLIPPAGE_BPS as a, resolveHyperliquidOrderRef as a$, cancelHyperliquidOrders as a0, cancelHyperliquidOrdersByCloid as a1, cancelHyperliquidTwapOrder as a2, computeHyperliquidMarketIocLimitPrice as a3, createHyperliquidSubAccount as a4, createMonotonicNonceFactory as a5, estimateHyperliquidLiquidationPrice as a6, extractHyperliquidDex as a7, extractHyperliquidOrderIds as a8, fetchHyperliquidActiveAsset as a9, fetchHyperliquidSpotUsdPriceMap as aA, fetchHyperliquidTickSize as aB, fetchHyperliquidUserFills as aC, fetchHyperliquidUserFillsByTime as aD, fetchHyperliquidUserRateLimit as aE, formatHyperliquidMarketablePrice as aF, formatHyperliquidOrderSize as aG, formatHyperliquidPrice as aH, formatHyperliquidSize as aI, getKnownHyperliquidDexes as aJ, isHyperliquidSpotSymbol as aK, modifyHyperliquidOrder as aL, normalizeHyperliquidBaseSymbol as aM, normalizeHyperliquidIndicatorBars as aN, normalizeHyperliquidMetaSymbol as aO, normalizeSpotTokenName as aP, parseHyperliquidOutcomeSymbol as aQ, parseHyperliquidSymbol as aR, parseSpotPairSymbol as aS, placeHyperliquidOrderWithTpSl as aT, placeHyperliquidPositionTpSl as aU, placeHyperliquidTwapOrder as aV, reserveHyperliquidRequestWeight as aW, resolveHyperliquidAbstractionFromMode as aX, resolveHyperliquidErrorDetail as aY, resolveHyperliquidLeverageMode as aZ, resolveHyperliquidMarketDataCoin as a_, fetchHyperliquidAllMids as aa, fetchHyperliquidAssetCtxs as ab, fetchHyperliquidBars as ac, fetchHyperliquidDexMeta as ad, fetchHyperliquidDexMetaAndAssetCtxs as ae, fetchHyperliquidFrontendOpenOrders as af, fetchHyperliquidFrontendOpenOrdersAcrossDexes as ag, fetchHyperliquidHistoricalOrders as ah, fetchHyperliquidMeta as ai, fetchHyperliquidMetaAndAssetCtxs as aj, fetchHyperliquidOpenOrders as ak, fetchHyperliquidOpenOrdersAcrossDexes as al, fetchHyperliquidOrderStatus as am, fetchHyperliquidOutcomeMeta as an, fetchHyperliquidPerpMarketInfo as ao, fetchHyperliquidPreTransferCheck as ap, fetchHyperliquidResolvedInfoCoin as aq, fetchHyperliquidResolvedMarketDescriptor as ar, fetchHyperliquidSizeDecimals as as, fetchHyperliquidSpotAccountValue as at, fetchHyperliquidSpotAssetCtxs as au, fetchHyperliquidSpotClearinghouseState as av, fetchHyperliquidSpotMarketInfo as aw, fetchHyperliquidSpotMeta as ax, fetchHyperliquidSpotMetaAndAssetCtxs as ay, fetchHyperliquidSpotTickSize as az, type HyperliquidAbstraction as b, resolveHyperliquidOrderSymbol as b0, resolveHyperliquidPair as b1, resolveHyperliquidPerpSymbol as b2, resolveHyperliquidProfileChain as b3, resolveHyperliquidSpotSymbol as b4, resolveHyperliquidSymbol as b5, resolveSpotMidCandidates as b6, resolveSpotTokenCandidates as b7, roundHyperliquidPriceToTick as b8, scheduleHyperliquidCancel as b9, sendHyperliquidSpot as ba, setHyperliquidAccountAbstractionMode as bb, setHyperliquidPortfolioMargin as bc, supportsHyperliquidBuilderFee as bd, transferHyperliquidSubAccount as be, updateHyperliquidIsolatedMargin as bf, updateHyperliquidLeverage as bg, type NonceSource as bh, toApiDecimal as bi, createL1ActionHash as bj, splitSignature as bk, type HyperliquidApproveBuilderFeeOptions as bl, type HyperliquidApproveBuilderFeeResponse as bm, type HyperliquidClearinghouseState as bn, type HyperliquidDepositResult as bo, type HyperliquidOrderOptions as bp, type HyperliquidOrderResponse as bq, type HyperliquidOrderStatus as br, type HyperliquidWithdrawResult as bs, approveHyperliquidBuilderFee as bt, createHyperliquidActionHash as bu, depositToHyperliquidBridge as bv, fetchHyperliquidClearinghouseState as bw, getHyperliquidMaxBuilderFee as bx, placeHyperliquidOrder as by, withdrawFromHyperliquid as bz, type HyperliquidAccountMode as c, type HyperliquidActiveAsset as d, HyperliquidApiError as e, type HyperliquidApproximateLiquidationParams as f, type HyperliquidBar as g, type HyperliquidBarResolution as h, HyperliquidBuilderApprovalError as i, type HyperliquidBuilderFee as j, type HyperliquidEnvironment as k, HyperliquidExchangeClient as l, type HyperliquidExchangeResponse as m, type HyperliquidGrouping as n, HyperliquidGuardError as o, type HyperliquidHip3Dex as p, type HyperliquidIndicatorBar as q, HyperliquidInfoClient as r, type HyperliquidMarketDescriptor as s, type HyperliquidMarketDescriptorInput as t, type HyperliquidMarketIdentityInput as u, type HyperliquidMarketType as v, type HyperliquidOpenOrderLike as w, type HyperliquidOrderIntent as x, type HyperliquidOutcomeMarketIdentityInput as y, type HyperliquidOutcomeSymbol as z };

import { h as WalletFullContext } from './types-BaTmu0gS.js';

type HyperliquidEnvironment = "mainnet" | "testnet";
type MarketIdentity = {
    market_type: "perp" | "spot" | "dex";
    venue: "hyperliquid";
    environment: HyperliquidEnvironment;
    base: string;
    quote?: string | null;
    dex?: string | null;
    chain_id?: number | null;
    pool_address?: string | null;
    token0_address?: string | null;
    token1_address?: string | null;
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
declare function buildHyperliquidMarketIdentity(input: HyperliquidMarketIdentityInput): MarketIdentity | null;
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

declare class HyperliquidInfoClient {
    private readonly environment;
    constructor(environment?: HyperliquidEnvironment);
    meta(): Promise<any>;
    metaAndAssetCtxs(): Promise<any>;
    spotMeta(): Promise<any>;
    spotMetaAndAssetCtxs(): Promise<any>;
    assetCtxs(): Promise<any>;
    spotAssetCtxs(): Promise<any>;
    openOrders(user: `0x${string}`): Promise<any>;
    frontendOpenOrders(user: `0x${string}`): Promise<any>;
    orderStatus(user: `0x${string}`, oid: number | string): Promise<any>;
    historicalOrders(user: `0x${string}`): Promise<any>;
    userFills(user: `0x${string}`): Promise<any>;
    userFillsByTime(user: `0x${string}`, startTime: number, endTime: number): Promise<any>;
    userRateLimit(user: `0x${string}`): Promise<any>;
    preTransferCheck(user: `0x${string}`, source: `0x${string}`): Promise<any>;
    spotClearinghouseState(user: `0x${string}`): Promise<any>;
}
declare function fetchHyperliquidMeta(environment?: HyperliquidEnvironment): Promise<any>;
declare function fetchHyperliquidMetaAndAssetCtxs(environment?: HyperliquidEnvironment): Promise<any>;
declare function fetchHyperliquidSpotMeta(environment?: HyperliquidEnvironment): Promise<any>;
declare function fetchHyperliquidSpotMetaAndAssetCtxs(environment?: HyperliquidEnvironment): Promise<any>;
declare function fetchHyperliquidAssetCtxs(environment?: HyperliquidEnvironment): Promise<any>;
declare function fetchHyperliquidSpotAssetCtxs(environment?: HyperliquidEnvironment): Promise<any>;
declare function fetchHyperliquidOpenOrders(params: {
    environment?: HyperliquidEnvironment;
    user: `0x${string}`;
}): Promise<any>;
declare function fetchHyperliquidFrontendOpenOrders(params: {
    environment?: HyperliquidEnvironment;
    user: `0x${string}`;
}): Promise<any>;
declare function fetchHyperliquidOrderStatus(params: {
    environment?: HyperliquidEnvironment;
    user: `0x${string}`;
    oid: number | string;
}): Promise<any>;
declare function fetchHyperliquidHistoricalOrders(params: {
    environment?: HyperliquidEnvironment;
    user: `0x${string}`;
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
    setDexAbstraction(params: {
        enabled: boolean;
        user?: `0x${string}`;
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
declare function setHyperliquidDexAbstraction(options: {
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

type HyperliquidParsedSymbolKind = "perp" | "spot" | "spotIndex";
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
declare function extractHyperliquidDex(symbol: string): string | null;
declare function parseHyperliquidSymbol(value?: string | null): HyperliquidParsedSymbol | null;
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
declare function resolveHyperliquidMarketDataCoin(value?: string | null): string | null;
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

export { fetchHyperliquidAssetCtxs as $, type HyperliquidSpotMarketInfo as A, HyperliquidTermsError as B, type HyperliquidTickSize as C, DEFAULT_HYPERLIQUID_MARKET_SLIPPAGE_BPS as D, type HyperliquidTimeInForce as E, type HyperliquidTpSlExecutionType as F, type HyperliquidTpSlLegInput as G, type HyperliquidAbstraction as H, type HyperliquidTriggerOptions as I, type HyperliquidTriggerType as J, batchModifyHyperliquidOrders as K, buildHyperliquidMarketIdentity as L, type MarketIdentity as M, buildHyperliquidProfileAssets as N, buildHyperliquidSpotUsdPriceMap as O, cancelAllHyperliquidOrders as P, cancelHyperliquidOrders as Q, cancelHyperliquidOrdersByCloid as R, cancelHyperliquidTwapOrder as S, computeHyperliquidMarketIocLimitPrice as T, createHyperliquidSubAccount as U, createMonotonicNonceFactory as V, estimateHyperliquidLiquidationPrice as W, extractHyperliquidDex as X, extractHyperliquidOrderIds as Y, fetchHyperliquidAllMids as Z, __hyperliquidMarketDataInternals as _, DEFAULT_HYPERLIQUID_TPSL_MARKET_SLIPPAGE_BPS as a, splitSignature as a$, fetchHyperliquidBars as a0, fetchHyperliquidFrontendOpenOrders as a1, fetchHyperliquidHistoricalOrders as a2, fetchHyperliquidMeta as a3, fetchHyperliquidMetaAndAssetCtxs as a4, fetchHyperliquidOpenOrders as a5, fetchHyperliquidOrderStatus as a6, fetchHyperliquidPerpMarketInfo as a7, fetchHyperliquidPreTransferCheck as a8, fetchHyperliquidSizeDecimals as a9, placeHyperliquidTwapOrder as aA, reserveHyperliquidRequestWeight as aB, resolveHyperliquidAbstractionFromMode as aC, resolveHyperliquidErrorDetail as aD, resolveHyperliquidLeverageMode as aE, resolveHyperliquidMarketDataCoin as aF, resolveHyperliquidOrderRef as aG, resolveHyperliquidOrderSymbol as aH, resolveHyperliquidPair as aI, resolveHyperliquidPerpSymbol as aJ, resolveHyperliquidProfileChain as aK, resolveHyperliquidSpotSymbol as aL, resolveHyperliquidSymbol as aM, resolveSpotMidCandidates as aN, resolveSpotTokenCandidates as aO, roundHyperliquidPriceToTick as aP, scheduleHyperliquidCancel as aQ, sendHyperliquidSpot as aR, setHyperliquidAccountAbstractionMode as aS, setHyperliquidDexAbstraction as aT, setHyperliquidPortfolioMargin as aU, transferHyperliquidSubAccount as aV, updateHyperliquidIsolatedMargin as aW, updateHyperliquidLeverage as aX, type NonceSource as aY, toApiDecimal as aZ, createL1ActionHash as a_, fetchHyperliquidSpotAccountValue as aa, fetchHyperliquidSpotAssetCtxs as ab, fetchHyperliquidSpotClearinghouseState as ac, fetchHyperliquidSpotMarketInfo as ad, fetchHyperliquidSpotMeta as ae, fetchHyperliquidSpotMetaAndAssetCtxs as af, fetchHyperliquidSpotTickSize as ag, fetchHyperliquidSpotUsdPriceMap as ah, fetchHyperliquidTickSize as ai, fetchHyperliquidUserFills as aj, fetchHyperliquidUserFillsByTime as ak, fetchHyperliquidUserRateLimit as al, formatHyperliquidMarketablePrice as am, formatHyperliquidOrderSize as an, formatHyperliquidPrice as ao, formatHyperliquidSize as ap, isHyperliquidSpotSymbol as aq, modifyHyperliquidOrder as ar, normalizeHyperliquidBaseSymbol as as, normalizeHyperliquidIndicatorBars as at, normalizeHyperliquidMetaSymbol as au, normalizeSpotTokenName as av, parseHyperliquidSymbol as aw, parseSpotPairSymbol as ax, placeHyperliquidOrderWithTpSl as ay, placeHyperliquidPositionTpSl as az, type HyperliquidAccountMode as b, type HyperliquidApproveBuilderFeeOptions as b0, type HyperliquidApproveBuilderFeeResponse as b1, type HyperliquidClearinghouseState as b2, type HyperliquidDepositResult as b3, type HyperliquidOrderOptions as b4, type HyperliquidOrderResponse as b5, type HyperliquidOrderStatus as b6, type HyperliquidWithdrawResult as b7, approveHyperliquidBuilderFee as b8, createHyperliquidActionHash as b9, depositToHyperliquidBridge as ba, fetchHyperliquidClearinghouseState as bb, getHyperliquidMaxBuilderFee as bc, placeHyperliquidOrder as bd, withdrawFromHyperliquid as be, HyperliquidApiError as c, type HyperliquidApproximateLiquidationParams as d, type HyperliquidBar as e, type HyperliquidBarResolution as f, HyperliquidBuilderApprovalError as g, type HyperliquidBuilderFee as h, type HyperliquidEnvironment as i, HyperliquidExchangeClient as j, type HyperliquidExchangeResponse as k, type HyperliquidGrouping as l, HyperliquidGuardError as m, type HyperliquidIndicatorBar as n, HyperliquidInfoClient as o, type HyperliquidMarketIdentityInput as p, type HyperliquidMarketType as q, type HyperliquidOrderIntent as r, type HyperliquidParsedSymbol as s, type HyperliquidParsedSymbolKind as t, type HyperliquidPerpMarketInfo as u, type HyperliquidPlaceOrderWithTpSlOptions as v, type HyperliquidPlacePositionTpSlOptions as w, type HyperliquidProfileAsset as x, type HyperliquidProfileAssetInput as y, type HyperliquidProfileChain as z };

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

export { resolveHyperliquidAbstractionFromMode as $, cancelHyperliquidTwapOrder as A, computeHyperliquidMarketIocLimitPrice as B, createHyperliquidSubAccount as C, DEFAULT_HYPERLIQUID_MARKET_SLIPPAGE_BPS as D, createMonotonicNonceFactory as E, fetchHyperliquidAssetCtxs as F, fetchHyperliquidFrontendOpenOrders as G, type HyperliquidAbstraction as H, fetchHyperliquidHistoricalOrders as I, fetchHyperliquidMeta as J, fetchHyperliquidMetaAndAssetCtxs as K, fetchHyperliquidOpenOrders as L, type MarketIdentity as M, fetchHyperliquidOrderStatus as N, fetchHyperliquidPreTransferCheck as O, fetchHyperliquidSpotAssetCtxs as P, fetchHyperliquidSpotClearinghouseState as Q, fetchHyperliquidSpotMeta as R, fetchHyperliquidSpotMetaAndAssetCtxs as S, fetchHyperliquidUserFills as T, fetchHyperliquidUserFillsByTime as U, fetchHyperliquidUserRateLimit as V, modifyHyperliquidOrder as W, placeHyperliquidOrderWithTpSl as X, placeHyperliquidPositionTpSl as Y, placeHyperliquidTwapOrder as Z, reserveHyperliquidRequestWeight as _, DEFAULT_HYPERLIQUID_TPSL_MARKET_SLIPPAGE_BPS as a, scheduleHyperliquidCancel as a0, sendHyperliquidSpot as a1, setHyperliquidAccountAbstractionMode as a2, setHyperliquidDexAbstraction as a3, setHyperliquidPortfolioMargin as a4, transferHyperliquidSubAccount as a5, updateHyperliquidIsolatedMargin as a6, updateHyperliquidLeverage as a7, type NonceSource as a8, toApiDecimal as a9, createL1ActionHash as aa, splitSignature as ab, type HyperliquidApproveBuilderFeeOptions as ac, type HyperliquidApproveBuilderFeeResponse as ad, type HyperliquidClearinghouseState as ae, type HyperliquidDepositResult as af, type HyperliquidOrderOptions as ag, type HyperliquidOrderResponse as ah, type HyperliquidOrderStatus as ai, type HyperliquidWithdrawResult as aj, approveHyperliquidBuilderFee as ak, createHyperliquidActionHash as al, depositToHyperliquidBridge as am, fetchHyperliquidClearinghouseState as an, getHyperliquidMaxBuilderFee as ao, placeHyperliquidOrder as ap, withdrawFromHyperliquid as aq, type HyperliquidAccountMode as b, HyperliquidApiError as c, HyperliquidBuilderApprovalError as d, type HyperliquidBuilderFee as e, type HyperliquidEnvironment as f, HyperliquidExchangeClient as g, type HyperliquidExchangeResponse as h, type HyperliquidGrouping as i, HyperliquidGuardError as j, HyperliquidInfoClient as k, type HyperliquidMarketIdentityInput as l, type HyperliquidOrderIntent as m, type HyperliquidPlaceOrderWithTpSlOptions as n, type HyperliquidPlacePositionTpSlOptions as o, HyperliquidTermsError as p, type HyperliquidTimeInForce as q, type HyperliquidTpSlExecutionType as r, type HyperliquidTpSlLegInput as s, type HyperliquidTriggerOptions as t, type HyperliquidTriggerType as u, batchModifyHyperliquidOrders as v, buildHyperliquidMarketIdentity as w, cancelAllHyperliquidOrders as x, cancelHyperliquidOrders as y, cancelHyperliquidOrdersByCloid as z };

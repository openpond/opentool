import { c as WalletFullContext } from '../../types-BVLpaY4O.js';
import { StoreOptions, StoreResponse } from '../../store/index.js';
import 'viem';
import 'viem/accounts';

type HyperliquidEnvironment = "mainnet" | "testnet";
type HyperliquidTimeInForce = "Gtc" | "Ioc" | "Alo" | "FrontendMarket" | "LiquidationMarket";
type HyperliquidGrouping = "na" | "normalTpsl" | "positionTpsl";
type HyperliquidTriggerType = "tp" | "sl";
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
    status: "ok";
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
    time: number | null;
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
    nonceSource?: NonceSource;
}): Promise<HyperliquidExchangeResponse<unknown>>;

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

interface HyperliquidOrderOptions {
    wallet: WalletFullContext;
    orders: HyperliquidOrderIntent[];
    grouping?: HyperliquidGrouping;
    environment?: HyperliquidEnvironment;
    vaultAddress?: `0x${string}`;
    expiresAfter?: number;
    nonce?: number;
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
};
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

export { HyperliquidApiError, type HyperliquidApproveBuilderFeeOptions, type HyperliquidApproveBuilderFeeResponse, HyperliquidBuilderApprovalError, type HyperliquidBuilderApprovalRecordInput, type HyperliquidBuilderFee, type HyperliquidClearinghouseState, type HyperliquidDepositResult, type HyperliquidEnvironment, HyperliquidExchangeClient, type HyperliquidExchangeResponse, type HyperliquidGrouping, HyperliquidGuardError, HyperliquidInfoClient, type HyperliquidOrderIntent, type HyperliquidOrderOptions, type HyperliquidOrderResponse, type HyperliquidOrderStatus, HyperliquidTermsError, type HyperliquidTermsRecordInput, type HyperliquidTriggerOptions, type HyperliquidTriggerType, type HyperliquidWithdrawResult, type NonceSource, __hyperliquidInternals, approveHyperliquidBuilderFee, batchModifyHyperliquidOrders, cancelAllHyperliquidOrders, cancelHyperliquidOrders, cancelHyperliquidOrdersByCloid, cancelHyperliquidTwapOrder, createHyperliquidSubAccount, createMonotonicNonceFactory, depositToHyperliquidBridge, fetchHyperliquidAssetCtxs, fetchHyperliquidClearinghouseState, fetchHyperliquidFrontendOpenOrders, fetchHyperliquidHistoricalOrders, fetchHyperliquidMeta, fetchHyperliquidMetaAndAssetCtxs, fetchHyperliquidOpenOrders, fetchHyperliquidOrderStatus, fetchHyperliquidPreTransferCheck, fetchHyperliquidSpotAssetCtxs, fetchHyperliquidSpotClearinghouseState, fetchHyperliquidSpotMeta, fetchHyperliquidSpotMetaAndAssetCtxs, fetchHyperliquidUserFills, fetchHyperliquidUserFillsByTime, fetchHyperliquidUserRateLimit, getHyperliquidMaxBuilderFee, modifyHyperliquidOrder, placeHyperliquidOrder, placeHyperliquidTwapOrder, recordHyperliquidBuilderApproval, recordHyperliquidTermsAcceptance, reserveHyperliquidRequestWeight, scheduleHyperliquidCancel, sendHyperliquidSpot, setHyperliquidPortfolioMargin, transferHyperliquidSubAccount, updateHyperliquidIsolatedMargin, updateHyperliquidLeverage, withdrawFromHyperliquid };

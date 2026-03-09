import { H as HyperliquidEnvironment, N as NonceSource, a as HyperliquidOrderIntent, b as HyperliquidGrouping, E as ExchangeOrderAction } from '../../exchange-XC9MHmxJ.js';
export { D as DEFAULT_HYPERLIQUID_MARKET_SLIPPAGE_BPS, c as HyperliquidAbstraction, d as HyperliquidAccountMode, e as HyperliquidApiError, f as HyperliquidBuilderApprovalError, g as HyperliquidBuilderFee, h as HyperliquidExchangeClient, i as HyperliquidExchangeResponse, j as HyperliquidGuardError, k as HyperliquidInfoClient, l as HyperliquidMarketIdentityInput, m as HyperliquidTermsError, n as HyperliquidTimeInForce, o as HyperliquidTriggerOptions, p as HyperliquidTriggerType, M as MarketIdentity, q as batchModifyHyperliquidOrders, r as buildHyperliquidMarketIdentity, s as cancelAllHyperliquidOrders, t as cancelHyperliquidOrders, u as cancelHyperliquidOrdersByCloid, v as cancelHyperliquidTwapOrder, w as computeHyperliquidMarketIocLimitPrice, x as createHyperliquidSubAccount, y as createMonotonicNonceFactory, z as fetchHyperliquidAssetCtxs, A as fetchHyperliquidFrontendOpenOrders, B as fetchHyperliquidHistoricalOrders, C as fetchHyperliquidMeta, F as fetchHyperliquidMetaAndAssetCtxs, G as fetchHyperliquidOpenOrders, I as fetchHyperliquidOrderStatus, J as fetchHyperliquidPreTransferCheck, K as fetchHyperliquidSpotAssetCtxs, L as fetchHyperliquidSpotClearinghouseState, O as fetchHyperliquidSpotMeta, P as fetchHyperliquidSpotMetaAndAssetCtxs, Q as fetchHyperliquidUserFills, R as fetchHyperliquidUserFillsByTime, S as fetchHyperliquidUserRateLimit, T as modifyHyperliquidOrder, U as placeHyperliquidTwapOrder, V as reserveHyperliquidRequestWeight, W as resolveHyperliquidAbstractionFromMode, X as scheduleHyperliquidCancel, Y as sendHyperliquidSpot, Z as setHyperliquidAccountAbstractionMode, _ as setHyperliquidDexAbstraction, $ as setHyperliquidPortfolioMargin, a0 as transferHyperliquidSubAccount, a1 as updateHyperliquidIsolatedMargin, a2 as updateHyperliquidLeverage } from '../../exchange-XC9MHmxJ.js';
import { W as WalletFullContext } from '../../types-DKohXZes.js';
import 'viem';
import 'viem/accounts';

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

export { type HyperliquidApproveBuilderFeeOptions, type HyperliquidApproveBuilderFeeResponse, type HyperliquidClearinghouseState, type HyperliquidDepositResult, HyperliquidEnvironment, HyperliquidGrouping, HyperliquidOrderIntent, type HyperliquidOrderOptions, type HyperliquidOrderResponse, type HyperliquidOrderStatus, type HyperliquidWithdrawResult, approveHyperliquidBuilderFee, createHyperliquidActionHash, depositToHyperliquidBridge, fetchHyperliquidClearinghouseState, getHyperliquidMaxBuilderFee, placeHyperliquidOrder, withdrawFromHyperliquid };

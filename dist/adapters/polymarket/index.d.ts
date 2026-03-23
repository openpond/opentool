import { h as WalletFullContext } from '../../types-BaTmu0gS.js';
import 'viem';
import 'viem/accounts';

type PolymarketEnvironment = "mainnet" | "testnet";
type PolymarketSide = "BUY" | "SELL";
type PolymarketOrderType = "GTC" | "FOK" | "FAK" | "GTD";
type PolymarketSignatureType = 0 | 1 | 2;
interface PolymarketApiCredentials {
    apiKey: string;
    secret: string;
    passphrase: string;
}
interface PolymarketMarket {
    id: string;
    slug?: string | null;
    question?: string | null;
    description?: string | null;
    eventId?: string | null;
    eventSlug?: string | null;
    conditionId?: string | null;
    marketMakerAddress?: string | null;
    category?: string | null;
    tags?: string[];
    active?: boolean;
    closed?: boolean;
    resolved?: boolean;
    startDate?: string | null;
    endDate?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    closedTime?: string | null;
    volume?: string | null;
    liquidity?: string | null;
    openInterest?: string | null;
    outcomes?: string[];
    outcomePrices?: number[];
    clobTokenIds?: string[];
    icon?: string | null;
    image?: string | null;
}
interface PolymarketOrderbookLevel {
    price: number;
    size: number;
}
interface PolymarketOrderbook {
    market: string;
    bids: PolymarketOrderbookLevel[];
    asks: PolymarketOrderbookLevel[];
    timestamp?: string | null;
}
interface PolymarketPriceHistoryPoint {
    t: number;
    p: number;
}
interface PolymarketSignedOrderPayload {
    salt: string;
    maker: `0x${string}`;
    signer: `0x${string}`;
    taker: `0x${string}`;
    tokenId: string;
    makerAmount: string;
    takerAmount: string;
    expiration: string;
    nonce: string;
    feeRateBps: string;
    side: 0 | 1;
    signatureType: PolymarketSignatureType;
    signature: `0x${string}`;
}
declare class PolymarketApiError extends Error {
    readonly response: unknown;
    constructor(message: string, response: unknown);
}
declare class PolymarketAuthError extends Error {
    constructor(message: string);
}
declare const POLYMARKET_ENDPOINTS: {
    readonly gamma: {
        readonly mainnet: "https://gamma-api.polymarket.com";
        readonly testnet: "https://gamma-api.polymarket.com";
    };
    readonly clob: {
        readonly mainnet: "https://clob.polymarket.com";
        readonly testnet: "https://clob.polymarket.com";
    };
    readonly data: {
        readonly mainnet: "https://data-api.polymarket.com";
        readonly testnet: "https://data-api.polymarket.com";
    };
};
declare const POLYMARKET_CHAIN_ID: Record<PolymarketEnvironment, number>;
declare const POLYMARKET_EXCHANGE_ADDRESSES: Record<PolymarketEnvironment, {
    ctf: `0x${string}`;
    negRisk: `0x${string}`;
}>;
declare const POLYMARKET_CLOB_DOMAIN: {
    name: string;
    version: string;
};
declare const POLYMARKET_CLOB_AUTH_DOMAIN: {
    name: string;
    version: string;
};
declare function resolvePolymarketBaseUrl(service: keyof typeof POLYMARKET_ENDPOINTS, environment: PolymarketEnvironment): string;
declare function normalizeStringArrayish(value: unknown): string[];
declare function normalizeNumberArrayish(value: unknown): number[];
declare function buildHmacSignature(args: {
    secret: string;
    timestamp: number | string;
    method: string;
    path: string;
    body?: string | Record<string, unknown> | null;
}): string;
declare function buildL2Headers(args: {
    credentials: PolymarketApiCredentials;
    address: `0x${string}`;
    timestamp?: number;
    method: string;
    path: string;
    body?: Record<string, unknown> | string | null;
}): Record<string, string>;
declare function buildL1Headers(args: {
    wallet: WalletFullContext;
    timestamp?: number;
    nonce?: number;
    environment?: PolymarketEnvironment;
    message?: string;
}): Promise<Record<string, string>>;
declare function resolveExchangeAddress(args: {
    environment: PolymarketEnvironment;
    negRisk?: boolean;
    exchangeAddress?: `0x${string}`;
}): `0x${string}`;
declare function buildPolymarketOrderAmounts(args: {
    side: PolymarketSide;
    price: string | number | bigint;
    size: string | number | bigint;
    tickSize?: string | number | bigint;
}): {
    makerAmount: bigint;
    takerAmount: bigint;
};
declare function buildSignedOrderPayload(args: {
    wallet: WalletFullContext;
    environment?: PolymarketEnvironment;
    tokenId: string;
    side: PolymarketSide;
    price: string | number | bigint;
    size: string | number | bigint;
    expiration?: number;
    nonce?: number;
    feeRateBps?: number;
    tickSize?: string | number | bigint;
    maker?: `0x${string}`;
    signer?: `0x${string}`;
    taker?: `0x${string}`;
    signatureType?: PolymarketSignatureType;
    negRisk?: boolean;
    exchangeAddress?: `0x${string}`;
}): Promise<PolymarketSignedOrderPayload>;

interface PolymarketApiKeyResponse {
    apiKey: string;
    secret: string;
    passphrase: string;
}
interface PolymarketOrderIntent {
    tokenId: string;
    side: PolymarketSide;
    price: string | number | bigint;
    size: string | number | bigint;
    expiration?: number;
    nonce?: number;
    feeRateBps?: number;
    tickSize?: string | number | bigint;
    maker?: `0x${string}`;
    signer?: `0x${string}`;
    taker?: `0x${string}`;
    signatureType?: PolymarketSignatureType;
    negRisk?: boolean;
    exchangeAddress?: `0x${string}`;
}
interface PolymarketPlaceOrderResponse {
    orderId?: string;
    status?: string;
    message?: string;
    [key: string]: unknown;
}
interface PolymarketApiKeyRequestArgs {
    wallet: WalletFullContext;
    environment?: PolymarketEnvironment;
    timestamp?: number;
    nonce?: number;
    message?: string;
}
declare function createPolymarketApiKey(args: PolymarketApiKeyRequestArgs): Promise<PolymarketApiKeyResponse>;
declare function derivePolymarketApiKey(args: PolymarketApiKeyRequestArgs): Promise<PolymarketApiKeyResponse>;
declare function createOrDerivePolymarketApiKey(args: PolymarketApiKeyRequestArgs): Promise<PolymarketApiKeyResponse>;
declare function placePolymarketOrder(args: {
    wallet: WalletFullContext;
    credentials?: PolymarketApiCredentials;
    order: PolymarketOrderIntent;
    orderType?: PolymarketOrderType;
    environment?: PolymarketEnvironment;
}): Promise<PolymarketPlaceOrderResponse>;
declare function cancelPolymarketOrder(args: {
    orderId: string;
    wallet?: WalletFullContext;
    walletAddress?: `0x${string}`;
    credentials?: PolymarketApiCredentials;
    environment?: PolymarketEnvironment;
}): Promise<Record<string, unknown>>;
declare function cancelPolymarketOrders(args: {
    orderIds: string[];
    wallet?: WalletFullContext;
    walletAddress?: `0x${string}`;
    credentials?: PolymarketApiCredentials;
    environment?: PolymarketEnvironment;
}): Promise<Record<string, unknown>>;
declare function cancelAllPolymarketOrders(args: {
    wallet?: WalletFullContext;
    walletAddress?: `0x${string}`;
    credentials?: PolymarketApiCredentials;
    environment?: PolymarketEnvironment;
}): Promise<Record<string, unknown>>;
declare function cancelMarketPolymarketOrders(args: {
    tokenId: string;
    wallet?: WalletFullContext;
    walletAddress?: `0x${string}`;
    credentials?: PolymarketApiCredentials;
    environment?: PolymarketEnvironment;
}): Promise<Record<string, unknown>>;
declare class PolymarketExchangeClient {
    private readonly wallet;
    private readonly credentials;
    private readonly environment;
    private cachedCredentials;
    constructor(args: {
        wallet: WalletFullContext;
        credentials?: PolymarketApiCredentials;
        environment?: PolymarketEnvironment;
    });
    private getCredentials;
    placeOrder(order: PolymarketOrderIntent, orderType?: PolymarketOrderType): Promise<PolymarketPlaceOrderResponse>;
    cancelOrder(orderId: string): Promise<Record<string, unknown>>;
    cancelOrders(orderIds: string[]): Promise<Record<string, unknown>>;
    cancelAll(): Promise<Record<string, unknown>>;
    cancelMarket(tokenId: string): Promise<Record<string, unknown>>;
}

type CsvStringInput = string | string[];
type CsvNumberInput = number | number[];
type FetchParams = {
    environment?: PolymarketEnvironment;
    limit?: number;
    offset?: number;
    order?: string;
    ascending?: boolean;
    tagId?: string;
    relatedTags?: boolean;
    excludeTagId?: string;
    category?: string;
    slug?: string;
    active?: boolean;
    closed?: boolean;
};
interface PolymarketUserPosition {
    proxyWallet?: string | null;
    asset?: string | null;
    conditionId?: string | null;
    size?: number | null;
    avgPrice?: number | null;
    initialValue?: number | null;
    currentValue?: number | null;
    cashPnl?: number | null;
    percentPnl?: number | null;
    totalBought?: number | null;
    realizedPnl?: number | null;
    percentRealizedPnl?: number | null;
    curPrice?: number | null;
    redeemable?: boolean;
    mergeable?: boolean;
    title?: string | null;
    slug?: string | null;
    icon?: string | null;
    eventSlug?: string | null;
    outcome?: string | null;
    outcomeIndex?: number | null;
    oppositeOutcome?: string | null;
    oppositeAsset?: string | null;
    endDate?: string | null;
    negativeRisk?: boolean;
}
interface PolymarketClosedPosition {
    proxyWallet?: string | null;
    asset?: string | null;
    conditionId?: string | null;
    avgPrice?: number | null;
    totalBought?: number | null;
    realizedPnl?: number | null;
    curPrice?: number | null;
    timestamp?: number | null;
    title?: string | null;
    slug?: string | null;
    icon?: string | null;
    eventSlug?: string | null;
    outcome?: string | null;
    outcomeIndex?: number | null;
    oppositeOutcome?: string | null;
    oppositeAsset?: string | null;
    endDate?: string | null;
}
type PolymarketActivityType = "TRADE" | "SPLIT" | "MERGE" | "REDEEM" | "REWARD" | "CONVERSION" | "MAKER_REBATE";
interface PolymarketUserActivity {
    proxyWallet?: string | null;
    timestamp?: number | null;
    conditionId?: string | null;
    type?: PolymarketActivityType | null;
    size?: number | null;
    usdcSize?: number | null;
    transactionHash?: string | null;
    price?: number | null;
    asset?: string | null;
    side?: "BUY" | "SELL" | null;
    outcomeIndex?: number | null;
    title?: string | null;
    slug?: string | null;
    icon?: string | null;
    eventSlug?: string | null;
    outcome?: string | null;
    name?: string | null;
    pseudonym?: string | null;
    bio?: string | null;
    profileImage?: string | null;
    profileImageOptimized?: string | null;
}
interface PolymarketPositionValue {
    user?: string | null;
    value?: number | null;
}
interface PolymarketPublicProfileUser {
    id?: string | null;
    creator?: boolean;
    mod?: boolean;
}
interface PolymarketPublicProfile {
    createdAt?: string | null;
    proxyWallet?: string | null;
    profileImage?: string | null;
    displayUsernamePublic?: boolean | null;
    bio?: string | null;
    pseudonym?: string | null;
    name?: string | null;
    users?: PolymarketPublicProfileUser[] | null;
    xUsername?: string | null;
    verifiedBadge?: boolean | null;
}
interface PolymarketUserQueryBase {
    user: string;
    environment?: PolymarketEnvironment;
    market?: CsvStringInput;
    eventId?: CsvNumberInput;
}
interface PolymarketUserPositionParams extends PolymarketUserQueryBase {
    sizeThreshold?: number;
    redeemable?: boolean;
    mergeable?: boolean;
    limit?: number;
    offset?: number;
    sortBy?: "CURRENT" | "INITIAL" | "TOKENS" | "CASHPNL" | "PERCENTPNL" | "TITLE" | "RESOLVING" | "PRICE" | "AVGPRICE";
    sortDirection?: "ASC" | "DESC";
    title?: string;
}
interface PolymarketClosedPositionParams extends PolymarketUserQueryBase {
    limit?: number;
    offset?: number;
    sortBy?: "REALIZEDPNL" | "TITLE" | "PRICE" | "AVGPRICE" | "TIMESTAMP";
    sortDirection?: "ASC" | "DESC";
    title?: string;
}
interface PolymarketUserActivityParams extends PolymarketUserQueryBase {
    limit?: number;
    offset?: number;
    type?: PolymarketActivityType | PolymarketActivityType[];
    start?: number;
    end?: number;
    sortBy?: "TIMESTAMP" | "TOKENS" | "CASH";
    sortDirection?: "ASC" | "DESC";
    side?: "BUY" | "SELL";
}
interface PolymarketPositionValueParams {
    user: string;
    environment?: PolymarketEnvironment;
    market?: CsvStringInput;
}
declare class PolymarketInfoClient {
    private readonly environment;
    constructor(environment?: PolymarketEnvironment);
    markets(params?: FetchParams): Promise<PolymarketMarket[]>;
    market(params: {
        id?: string;
        slug?: string;
        conditionId?: string;
    }): Promise<PolymarketMarket | null>;
    orderbook(tokenId: string): Promise<PolymarketOrderbook>;
    price(tokenId: string, side: "BUY" | "SELL"): Promise<number | null>;
    midpoint(tokenId: string): Promise<number | null>;
    priceHistory(params: {
        tokenId: string;
        startTs?: number;
        endTs?: number;
        interval?: string;
        fidelity?: number;
    }): Promise<PolymarketPriceHistoryPoint[]>;
    positions(params: Omit<PolymarketUserPositionParams, "environment">): Promise<PolymarketUserPosition[]>;
    closedPositions(params: Omit<PolymarketClosedPositionParams, "environment">): Promise<PolymarketClosedPosition[]>;
    activity(params: Omit<PolymarketUserActivityParams, "environment">): Promise<PolymarketUserActivity[]>;
    positionValue(params: Omit<PolymarketPositionValueParams, "environment">): Promise<PolymarketPositionValue[]>;
    publicProfile(address: string): Promise<PolymarketPublicProfile | null>;
}
declare function fetchPolymarketMarkets(params?: FetchParams): Promise<PolymarketMarket[]>;
declare function fetchPolymarketMarket(params: {
    id?: string;
    slug?: string;
    conditionId?: string;
    environment?: PolymarketEnvironment;
}): Promise<PolymarketMarket | null>;
declare function fetchPolymarketOrderbook(params: {
    tokenId: string;
    environment?: PolymarketEnvironment;
}): Promise<PolymarketOrderbook>;
declare function fetchPolymarketPrice(params: {
    tokenId: string;
    side: "BUY" | "SELL";
    environment?: PolymarketEnvironment;
}): Promise<number | null>;
declare function fetchPolymarketMidpoint(params: {
    tokenId: string;
    environment?: PolymarketEnvironment;
}): Promise<number | null>;
declare function fetchPolymarketPriceHistory(params: {
    tokenId: string;
    startTs?: number;
    endTs?: number;
    interval?: string;
    fidelity?: number;
    environment?: PolymarketEnvironment;
}): Promise<PolymarketPriceHistoryPoint[]>;
declare function fetchPolymarketPositions(params: PolymarketUserPositionParams): Promise<PolymarketUserPosition[]>;
declare function fetchPolymarketClosedPositions(params: PolymarketClosedPositionParams): Promise<PolymarketClosedPosition[]>;
declare function fetchPolymarketActivity(params: PolymarketUserActivityParams): Promise<PolymarketUserActivity[]>;
declare function fetchPolymarketPositionValue(params: PolymarketPositionValueParams): Promise<PolymarketPositionValue[]>;
declare function fetchPolymarketPublicProfile(params: {
    address: string;
    environment?: PolymarketEnvironment;
}): Promise<PolymarketPublicProfile | null>;

export { POLYMARKET_CHAIN_ID, POLYMARKET_CLOB_AUTH_DOMAIN, POLYMARKET_CLOB_DOMAIN, POLYMARKET_ENDPOINTS, POLYMARKET_EXCHANGE_ADDRESSES, type PolymarketActivityType, type PolymarketApiCredentials, PolymarketApiError, type PolymarketApiKeyResponse, PolymarketAuthError, type PolymarketClosedPosition, type PolymarketClosedPositionParams, type PolymarketEnvironment, PolymarketExchangeClient, PolymarketInfoClient, type PolymarketMarket, type PolymarketOrderIntent, type PolymarketOrderType, type PolymarketOrderbook, type PolymarketPlaceOrderResponse, type PolymarketPositionValue, type PolymarketPositionValueParams, type PolymarketPriceHistoryPoint, type PolymarketPublicProfile, type PolymarketPublicProfileUser, type PolymarketSide, type PolymarketSignatureType, type PolymarketSignedOrderPayload, type PolymarketUserActivity, type PolymarketUserActivityParams, type PolymarketUserPosition, type PolymarketUserPositionParams, buildHmacSignature, buildL1Headers, buildL2Headers, buildPolymarketOrderAmounts, buildSignedOrderPayload, cancelAllPolymarketOrders, cancelMarketPolymarketOrders, cancelPolymarketOrder, cancelPolymarketOrders, createOrDerivePolymarketApiKey, createPolymarketApiKey, derivePolymarketApiKey, fetchPolymarketActivity, fetchPolymarketClosedPositions, fetchPolymarketMarket, fetchPolymarketMarkets, fetchPolymarketMidpoint, fetchPolymarketOrderbook, fetchPolymarketPositionValue, fetchPolymarketPositions, fetchPolymarketPrice, fetchPolymarketPriceHistory, fetchPolymarketPublicProfile, normalizeNumberArrayish, normalizeStringArrayish, placePolymarketOrder, resolveExchangeAddress, resolvePolymarketBaseUrl };

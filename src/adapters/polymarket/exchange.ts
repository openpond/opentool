import type { WalletFullContext } from "../../wallet/types";
import {
  PolymarketApiCredentials,
  PolymarketApiError,
  PolymarketAuthError,
  PolymarketEnvironment,
  PolymarketOrderType,
  PolymarketSide,
  PolymarketSignatureType,
  buildL1Headers,
  buildL2Headers,
  buildSignedOrderPayload,
  resolvePolymarketBaseUrl,
} from "./base";

export interface PolymarketApiKeyResponse {
  apiKey: string;
  secret: string;
  passphrase: string;
}

export interface PolymarketOrderIntent {
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

export interface PolymarketPlaceOrderResponse {
  orderId?: string;
  status?: string;
  message?: string;
  [key: string]: unknown;
}

async function resolveAuthContext(args: {
  wallet?: WalletFullContext;
  walletAddress?: `0x${string}`;
  credentials?: PolymarketApiCredentials;
  environment?: PolymarketEnvironment;
}): Promise<{ credentials: PolymarketApiCredentials; address: `0x${string}` }> {
  if (args.wallet) {
    const credentials =
      args.credentials ??
      (await createPolymarketApiKey({
        wallet: args.wallet,
        ...(args.environment ? { environment: args.environment } : {}),
      }));
    return {
      credentials,
      address: args.wallet.address as `0x${string}`,
    };
  }

  if (args.walletAddress && args.credentials) {
    return { credentials: args.credentials, address: args.walletAddress };
  }

  throw new PolymarketAuthError(
    "Polymarket auth requires a wallet (preferred) or credentials + walletAddress."
  );
}

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text().catch(() => "");
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new PolymarketApiError(
      `Polymarket request failed (${response.status}).`,
      data ?? { status: response.status }
    );
  }
  return data;
}

function resolvePath(url: string): string {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}`;
}

export async function createPolymarketApiKey(args: {
  wallet: WalletFullContext;
  environment?: PolymarketEnvironment;
  timestamp?: number;
  nonce?: number;
  message?: string;
}): Promise<PolymarketApiKeyResponse> {
  const environment = args.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = `${baseUrl}/auth/api-key`;
  const headers = await buildL1Headers({
    wallet: args.wallet,
    environment,
    ...(args.timestamp !== undefined ? { timestamp: args.timestamp } : {}),
    ...(args.nonce !== undefined ? { nonce: args.nonce } : {}),
    ...(args.message !== undefined ? { message: args.message } : {}),
  });
  const data = (await requestJson(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify({}),
  })) as Partial<PolymarketApiKeyResponse>;

  if (!data?.apiKey || !data?.secret || !data?.passphrase) {
    throw new PolymarketAuthError("Failed to create Polymarket API key.");
  }

  return {
    apiKey: data.apiKey,
    secret: data.secret,
    passphrase: data.passphrase,
  };
}

export async function derivePolymarketApiKey(args: {
  wallet: WalletFullContext;
  environment?: PolymarketEnvironment;
  timestamp?: number;
  nonce?: number;
  message?: string;
}): Promise<PolymarketApiKeyResponse> {
  const environment = args.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = `${baseUrl}/auth/derive-api-key`;
  const headers = await buildL1Headers({
    wallet: args.wallet,
    environment,
    ...(args.timestamp !== undefined ? { timestamp: args.timestamp } : {}),
    ...(args.nonce !== undefined ? { nonce: args.nonce } : {}),
    ...(args.message !== undefined ? { message: args.message } : {}),
  });
  const data = (await requestJson(url, {
    method: "GET",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  })) as Partial<PolymarketApiKeyResponse>;

  if (!data?.apiKey || !data?.secret || !data?.passphrase) {
    throw new PolymarketAuthError("Failed to derive Polymarket API key.");
  }

  return {
    apiKey: data.apiKey,
    secret: data.secret,
    passphrase: data.passphrase,
  };
}

export async function placePolymarketOrder(args: {
  wallet: WalletFullContext;
  credentials?: PolymarketApiCredentials;
  order: PolymarketOrderIntent;
  orderType?: PolymarketOrderType;
  environment?: PolymarketEnvironment;
}): Promise<PolymarketPlaceOrderResponse> {
  const environment = args.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = `${baseUrl}/order`;

  const signedOrder = await buildSignedOrderPayload({
    wallet: args.wallet,
    environment,
    ...args.order,
  });

  const auth = await resolveAuthContext({
    wallet: args.wallet,
    ...(args.credentials ? { credentials: args.credentials } : {}),
    environment,
  });

  const body = {
    order: signedOrder,
    owner: auth.credentials.apiKey,
    orderType: args.orderType ?? "GTC",
  };

  const headers = buildL2Headers({
    credentials: auth.credentials,
    address: auth.address,
    method: "POST",
    path: resolvePath(url),
    body,
  });

  return (await requestJson(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  })) as PolymarketPlaceOrderResponse;
}

export async function cancelPolymarketOrder(args: {
  orderId: string;
  wallet?: WalletFullContext;
  walletAddress?: `0x${string}`;
  credentials?: PolymarketApiCredentials;
  environment?: PolymarketEnvironment;
}): Promise<Record<string, unknown>> {
  const environment = args.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = `${baseUrl}/order`;
  const body = { orderID: args.orderId };

  const auth = await resolveAuthContext({
    ...(args.wallet ? { wallet: args.wallet } : {}),
    ...(args.walletAddress ? { walletAddress: args.walletAddress } : {}),
    ...(args.credentials ? { credentials: args.credentials } : {}),
    environment,
  });

  const headers = buildL2Headers({
    credentials: auth.credentials,
    address: auth.address,
    method: "DELETE",
    path: resolvePath(url),
    body,
  });

  return (await requestJson(url, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  })) as Record<string, unknown>;
}

export async function cancelPolymarketOrders(args: {
  orderIds: string[];
  wallet?: WalletFullContext;
  walletAddress?: `0x${string}`;
  credentials?: PolymarketApiCredentials;
  environment?: PolymarketEnvironment;
}): Promise<Record<string, unknown>> {
  const environment = args.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = `${baseUrl}/orders`;
  const body = { orderIDs: args.orderIds };

  const auth = await resolveAuthContext({
    ...(args.wallet ? { wallet: args.wallet } : {}),
    ...(args.walletAddress ? { walletAddress: args.walletAddress } : {}),
    ...(args.credentials ? { credentials: args.credentials } : {}),
    environment,
  });

  const headers = buildL2Headers({
    credentials: auth.credentials,
    address: auth.address,
    method: "DELETE",
    path: resolvePath(url),
    body,
  });

  return (await requestJson(url, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  })) as Record<string, unknown>;
}

export async function cancelAllPolymarketOrders(args: {
  wallet?: WalletFullContext;
  walletAddress?: `0x${string}`;
  credentials?: PolymarketApiCredentials;
  environment?: PolymarketEnvironment;
}): Promise<Record<string, unknown>> {
  const environment = args.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = `${baseUrl}/cancel-all`;
  const auth = await resolveAuthContext({
    ...(args.wallet ? { wallet: args.wallet } : {}),
    ...(args.walletAddress ? { walletAddress: args.walletAddress } : {}),
    ...(args.credentials ? { credentials: args.credentials } : {}),
    environment,
  });
  const headers = buildL2Headers({
    credentials: auth.credentials,
    address: auth.address,
    method: "DELETE",
    path: resolvePath(url),
  });

  return (await requestJson(url, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  })) as Record<string, unknown>;
}

export async function cancelMarketPolymarketOrders(args: {
  tokenId: string;
  wallet?: WalletFullContext;
  walletAddress?: `0x${string}`;
  credentials?: PolymarketApiCredentials;
  environment?: PolymarketEnvironment;
}): Promise<Record<string, unknown>> {
  const environment = args.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = `${baseUrl}/cancel-market-orders`;
  const body = { market: args.tokenId };
  const auth = await resolveAuthContext({
    ...(args.wallet ? { wallet: args.wallet } : {}),
    ...(args.walletAddress ? { walletAddress: args.walletAddress } : {}),
    ...(args.credentials ? { credentials: args.credentials } : {}),
    environment,
  });
  const headers = buildL2Headers({
    credentials: auth.credentials,
    address: auth.address,
    method: "DELETE",
    path: resolvePath(url),
    body,
  });

  return (await requestJson(url, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  })) as Record<string, unknown>;
}

export class PolymarketExchangeClient {
  private readonly wallet: WalletFullContext;
  private readonly credentials: PolymarketApiCredentials | undefined;
  private readonly environment: PolymarketEnvironment;
  private cachedCredentials: PolymarketApiCredentials | undefined;

  constructor(args: {
    wallet: WalletFullContext;
    credentials?: PolymarketApiCredentials;
    environment?: PolymarketEnvironment;
  }) {
    this.wallet = args.wallet;
    this.credentials = args.credentials;
    this.environment = args.environment ?? "mainnet";
  }

  private async getCredentials() {
    if (this.cachedCredentials) return this.cachedCredentials;
    const resolved = await resolveAuthContext({
      wallet: this.wallet,
      ...(this.credentials ? { credentials: this.credentials } : {}),
      environment: this.environment,
    });
    this.cachedCredentials = resolved.credentials;
    return resolved.credentials;
  }

  async placeOrder(order: PolymarketOrderIntent, orderType?: PolymarketOrderType) {
    const credentials = await this.getCredentials();
    return placePolymarketOrder({
      wallet: this.wallet,
      credentials,
      environment: this.environment,
      order,
      ...(orderType !== undefined ? { orderType } : {}),
    });
  }

  async cancelOrder(orderId: string) {
    const credentials = await this.getCredentials();
    return cancelPolymarketOrder({
      orderId,
      wallet: this.wallet,
      credentials,
      environment: this.environment,
    });
  }

  async cancelOrders(orderIds: string[]) {
    const credentials = await this.getCredentials();
    return cancelPolymarketOrders({
      orderIds,
      wallet: this.wallet,
      credentials,
      environment: this.environment,
    });
  }

  async cancelAll() {
    const credentials = await this.getCredentials();
    return cancelAllPolymarketOrders({
      wallet: this.wallet,
      credentials,
      environment: this.environment,
    });
  }

  async cancelMarket(tokenId: string) {
    const credentials = await this.getCredentials();
    return cancelMarketPolymarketOrders({
      tokenId,
      wallet: this.wallet,
      credentials,
      environment: this.environment,
    });
  }
}

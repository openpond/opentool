import {
  API_BASES,
  HyperliquidApiError,
  HyperliquidEnvironment,
  normalizeAddress,
} from "./base";
import { resolveHyperliquidOrderSymbol } from "./symbols";

type InfoPayload =
  | { type: "meta" }
  | { type: "meta"; dex: string }
  | { type: "metaAndAssetCtxs" }
  | { type: "metaAndAssetCtxs"; dex: string }
  | { type: "spotMeta" }
  | { type: "spotMetaAndAssetCtxs" }
  | { type: "assetCtxs" }
  | { type: "spotAssetCtxs" }
  | { type: "outcomeMeta" }
  | { type: "openOrders"; user: `0x${string}`; dex?: string }
  | { type: "frontendOpenOrders"; user: `0x${string}`; dex?: string }
  | { type: "orderStatus"; user: `0x${string}`; oid: number | string }
  | { type: "historicalOrders"; user: `0x${string}`; dex?: string }
  | { type: "userHistoricalOrders"; user: `0x${string}` }
  | { type: "userFills"; user: `0x${string}` }
  | {
      type: "userFillsByTime";
      user: `0x${string}`;
      startTime: number;
      endTime: number;
    }
  | { type: "userRateLimit"; user: `0x${string}` }
  | { type: "preTransferCheck"; user: `0x${string}`; source: `0x${string}` }
  | { type: "spotClearinghouseState"; user: `0x${string}` }
  | { type: "activeAssetData"; user: `0x${string}`; coin: string };

export const HYPERLIQUID_HIP3_DEXES = [
  "xyz",
  "flx",
  "vntl",
  "hyna",
  "km",
  "cash",
] as const;

export type HyperliquidHip3Dex = (typeof HYPERLIQUID_HIP3_DEXES)[number];

export type HyperliquidOpenOrderLike = {
  oid?: number;
  cloid?: string | null;
  dex?: string | null;
  [key: string]: unknown;
};

export type HyperliquidActiveAsset = {
  coin: string;
  leverage: number | null;
  leverageType: string | null;
  raw: unknown;
};

async function postInfo(environment: HyperliquidEnvironment, payload: InfoPayload) {
  const baseUrl = API_BASES[environment];
  const response = await fetch(`${baseUrl}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new HyperliquidApiError(
      "Hyperliquid info request failed.",
      data ?? { status: response.status },
    );
  }
  return data;
}

function mergeHyperliquidOpenOrders<T extends HyperliquidOpenOrderLike>(batches: T[][]): T[] {
  const merged = new Map<string, T>();
  for (const batch of batches) {
    for (const order of batch) {
      const oid =
        typeof order.oid === "number" || typeof order.oid === "string"
          ? String(order.oid)
          : "no-oid";
      const cloid = typeof order.cloid === "string" && order.cloid.trim().length > 0
        ? order.cloid
        : "no-cloid";
      merged.set(`${oid}:${cloid}`, order);
    }
  }
  return [...merged.values()];
}

function applyHyperliquidOpenOrderDexContext<T extends HyperliquidOpenOrderLike>(
  orders: T[],
  dex?: string | null,
): T[] {
  const resolvedDex = typeof dex === "string" && dex.trim().length > 0 ? dex.trim().toLowerCase() : null;
  return orders.map((order) => {
    const existingDex =
      typeof order.dex === "string" && order.dex.trim().length > 0
        ? order.dex.trim().toLowerCase()
        : null;
    return {
      ...order,
      dex: existingDex ?? resolvedDex,
    };
  });
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export class HyperliquidInfoClient {
  private readonly environment: HyperliquidEnvironment;

  constructor(environment: HyperliquidEnvironment = "mainnet") {
    this.environment = environment;
  }

  meta() {
    return fetchHyperliquidMeta(this.environment);
  }

  metaAndAssetCtxs() {
    return fetchHyperliquidMetaAndAssetCtxs(this.environment);
  }

  spotMeta() {
    return fetchHyperliquidSpotMeta(this.environment);
  }

  spotMetaAndAssetCtxs() {
    return fetchHyperliquidSpotMetaAndAssetCtxs(this.environment);
  }

  assetCtxs() {
    return fetchHyperliquidAssetCtxs(this.environment);
  }

  spotAssetCtxs() {
    return fetchHyperliquidSpotAssetCtxs(this.environment);
  }

  outcomeMeta() {
    return fetchHyperliquidOutcomeMeta(this.environment);
  }

  openOrders(user: `0x${string}`) {
    return fetchHyperliquidOpenOrders({ user, environment: this.environment });
  }

  frontendOpenOrders(user: `0x${string}`) {
    return fetchHyperliquidFrontendOpenOrders({
      user,
      environment: this.environment,
    });
  }

  orderStatus(user: `0x${string}`, oid: number | string) {
    return fetchHyperliquidOrderStatus({
      user,
      oid,
      environment: this.environment,
    });
  }

  historicalOrders(user: `0x${string}`) {
    return fetchHyperliquidHistoricalOrders({
      user,
      environment: this.environment,
    });
  }

  userFills(user: `0x${string}`) {
    return fetchHyperliquidUserFills({ user, environment: this.environment });
  }

  userFillsByTime(user: `0x${string}`, startTime: number, endTime: number) {
    return fetchHyperliquidUserFillsByTime({
      user,
      startTime,
      endTime,
      environment: this.environment,
    });
  }

  userRateLimit(user: `0x${string}`) {
    return fetchHyperliquidUserRateLimit({
      user,
      environment: this.environment,
    });
  }

  preTransferCheck(user: `0x${string}`, source: `0x${string}`) {
    return fetchHyperliquidPreTransferCheck({
      user,
      source,
      environment: this.environment,
    });
  }

  spotClearinghouseState(user: `0x${string}`) {
    return fetchHyperliquidSpotClearinghouseState({
      user,
      environment: this.environment,
    });
  }

  activeAsset(user: `0x${string}`, symbol: string) {
    return fetchHyperliquidActiveAsset({
      user,
      symbol,
      environment: this.environment,
    });
  }
}

export async function fetchHyperliquidMeta(environment: HyperliquidEnvironment = "mainnet") {
  return postInfo(environment, { type: "meta" });
}

export async function fetchHyperliquidDexMeta(
  environment: HyperliquidEnvironment = "mainnet",
  dex: string,
) {
  return postInfo(environment, { type: "meta", dex });
}

export async function fetchHyperliquidMetaAndAssetCtxs(
  environment: HyperliquidEnvironment = "mainnet",
) {
  return postInfo(environment, { type: "metaAndAssetCtxs" });
}

export async function fetchHyperliquidDexMetaAndAssetCtxs(
  environment: HyperliquidEnvironment = "mainnet",
  dex: string,
) {
  return postInfo(environment, { type: "metaAndAssetCtxs", dex });
}

export async function fetchHyperliquidSpotMeta(environment: HyperliquidEnvironment = "mainnet") {
  return postInfo(environment, { type: "spotMeta" });
}

export async function fetchHyperliquidSpotMetaAndAssetCtxs(
  environment: HyperliquidEnvironment = "mainnet",
) {
  return postInfo(environment, { type: "spotMetaAndAssetCtxs" });
}

export async function fetchHyperliquidAssetCtxs(environment: HyperliquidEnvironment = "mainnet") {
  return postInfo(environment, { type: "assetCtxs" });
}

export async function fetchHyperliquidSpotAssetCtxs(
  environment: HyperliquidEnvironment = "mainnet",
) {
  return postInfo(environment, { type: "spotAssetCtxs" });
}

export async function fetchHyperliquidOutcomeMeta(environment: HyperliquidEnvironment = "mainnet") {
  return postInfo(environment, { type: "outcomeMeta" });
}

export async function fetchHyperliquidOpenOrders<T extends HyperliquidOpenOrderLike = HyperliquidOpenOrderLike>(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
  dex?: string | null;
}): Promise<T[]> {
  const env = params.environment ?? "mainnet";
  const orders = await postInfo(env, {
    type: "openOrders",
    user: normalizeAddress(params.user),
    ...(params.dex ? { dex: params.dex.trim().toLowerCase() } : {}),
  });
  return applyHyperliquidOpenOrderDexContext(orders as T[], params.dex);
}

export async function fetchHyperliquidFrontendOpenOrders<
  T extends HyperliquidOpenOrderLike = HyperliquidOpenOrderLike,
>(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
  dex?: string | null;
}): Promise<T[]> {
  const env = params.environment ?? "mainnet";
  const orders = await postInfo(env, {
    type: "frontendOpenOrders",
    user: normalizeAddress(params.user),
    ...(params.dex ? { dex: params.dex.trim().toLowerCase() } : {}),
  });
  return applyHyperliquidOpenOrderDexContext(orders as T[], params.dex);
}

export async function fetchHyperliquidOrderStatus(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
  oid: number | string;
}) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "orderStatus",
    user: normalizeAddress(params.user),
    oid: params.oid,
  });
}

export async function fetchHyperliquidHistoricalOrders(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
  dex?: string | null;
}) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "historicalOrders",
    user: normalizeAddress(params.user),
    ...(params.dex ? { dex: params.dex.trim().toLowerCase() } : {}),
  });
}

export async function fetchHyperliquidUserFills(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
}) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "userFills",
    user: normalizeAddress(params.user),
  });
}

export async function fetchHyperliquidUserFillsByTime(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
  startTime: number;
  endTime: number;
}) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "userFillsByTime",
    user: normalizeAddress(params.user),
    startTime: params.startTime,
    endTime: params.endTime,
  });
}

export async function fetchHyperliquidUserRateLimit(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
}) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "userRateLimit",
    user: normalizeAddress(params.user),
  });
}

export async function fetchHyperliquidPreTransferCheck(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
  source: `0x${string}`;
}) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "preTransferCheck",
    user: normalizeAddress(params.user),
    source: normalizeAddress(params.source),
  });
}

export async function fetchHyperliquidSpotClearinghouseState(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
}) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "spotClearinghouseState",
    user: normalizeAddress(params.user),
  });
}

export function getKnownHyperliquidDexes(environment: HyperliquidEnvironment = "mainnet"): string[] {
  return environment === "mainnet" ? [...HYPERLIQUID_HIP3_DEXES] : [];
}

export async function fetchHyperliquidOpenOrdersAcrossDexes<T extends HyperliquidOpenOrderLike>(
  params: {
    environment?: HyperliquidEnvironment;
    user: `0x${string}`;
    dexes?: string[];
    includePrimary?: boolean;
  },
): Promise<T[]> {
  const environment = params.environment ?? "mainnet";
  const requests = [
    ...(params.includePrimary === false
      ? []
      : [fetchHyperliquidOpenOrders<T>({ environment, user: params.user })]),
    ...getKnownHyperliquidDexes(environment)
      .filter((dex) => !(params.dexes && !params.dexes.includes(dex)))
      .map((dex) =>
        fetchHyperliquidOpenOrders<T>({
          environment,
          user: params.user,
          dex,
        }),
      ),
  ];
  const batches = await Promise.all(requests);
  return mergeHyperliquidOpenOrders(batches);
}

export async function fetchHyperliquidFrontendOpenOrdersAcrossDexes<
  T extends HyperliquidOpenOrderLike,
>(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
  dexes?: string[];
  includePrimary?: boolean;
}): Promise<T[]> {
  const environment = params.environment ?? "mainnet";
  const requests = [
    ...(params.includePrimary === false
      ? []
      : [fetchHyperliquidFrontendOpenOrders<T>({ environment, user: params.user })]),
    ...getKnownHyperliquidDexes(environment)
      .filter((dex) => !(params.dexes && !params.dexes.includes(dex)))
      .map((dex) =>
        fetchHyperliquidFrontendOpenOrders<T>({
          environment,
          user: params.user,
          dex,
        }),
      ),
  ];
  const batches = await Promise.all(requests);
  return mergeHyperliquidOpenOrders(batches);
}

export async function fetchHyperliquidActiveAsset(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
  symbol: string;
}): Promise<HyperliquidActiveAsset> {
  const environment = params.environment ?? "mainnet";
  const coin = resolveHyperliquidOrderSymbol(params.symbol);
  if (!coin) {
    throw new Error(`Unable to resolve Hyperliquid active asset symbol: ${params.symbol}`);
  }
  const raw = await postInfo(environment, {
    type: "activeAssetData",
    user: normalizeAddress(params.user),
    coin,
  });
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : null;
  const leverageRecord =
    record?.leverage && typeof record.leverage === "object" && !Array.isArray(record.leverage)
      ? (record.leverage as Record<string, unknown>)
      : null;
  return {
    coin,
    leverage:
      leverageRecord && "value" in leverageRecord
        ? readNumber(leverageRecord.value)
        : readNumber(record?.leverage),
    leverageType:
      leverageRecord && typeof leverageRecord.type === "string" ? leverageRecord.type : null,
    raw,
  };
}

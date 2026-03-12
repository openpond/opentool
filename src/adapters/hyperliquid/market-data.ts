import { API_BASES, type HyperliquidEnvironment } from "./base";
import {
  fetchHyperliquidDexMetaAndAssetCtxs,
  fetchHyperliquidMeta,
  fetchHyperliquidMetaAndAssetCtxs,
  fetchHyperliquidSpotMeta,
  fetchHyperliquidSpotMetaAndAssetCtxs,
} from "./info";
import type { HyperliquidTickSize } from "./order-utils";
import {
  buildHyperliquidMarketDescriptor,
  type HyperliquidMarketDescriptor,
  isHyperliquidSpotSymbol,
  normalizeHyperliquidMetaSymbol,
  normalizeSpotTokenName,
  parseHyperliquidSymbol,
  parseSpotPairSymbol,
  resolveHyperliquidOrderSymbol,
  resolveSpotMidCandidates,
  resolveSpotTokenCandidates,
} from "./symbols";
import { readHyperliquidNumber, readHyperliquidSpotAccountValue } from "./state-readers";

type PerpUniverseItem = {
  name?: string;
  szDecimals?: number;
};

type PerpAssetContext = {
  markPx?: string | number;
  midPx?: string | number;
  oraclePx?: string | number;
  funding?: string | number;
};

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

export type HyperliquidBarResolution = "1" | "5" | "15" | "30" | "60" | "240" | "1D" | "1W";

export type HyperliquidBar = {
  time: number;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  volume?: number;
  [key: string]: unknown;
};

export type HyperliquidIndicatorBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type HyperliquidPerpMarketInfo = {
  symbol: string;
  price: number;
  fundingRate: number | null;
  szDecimals: number;
};

export type HyperliquidSpotMarketInfo = {
  symbol: string;
  base: string;
  quote: string;
  assetId: number;
  marketIndex: number;
  price: number;
  szDecimals: number;
};

export type HyperliquidResolvedMarketDescriptor = HyperliquidMarketDescriptor;

const META_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_OPENPOND_GATEWAY_URL = "https://gateway.openpond.dev";
const allMidsCache = new Map<
  string,
  { fetchedAt: number; mids: Record<string, string | number> }
>();

function resolveGatewayBase(override?: string | null): string | null {
  const value =
    override ??
    process.env.OPENPOND_GATEWAY_URL ??
    DEFAULT_OPENPOND_GATEWAY_URL;
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/\/$/, "");
}

function normalizeGatewaySymbol(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  const idx = trimmed.indexOf(":");
  if (idx > 0) {
    const dex = trimmed.slice(0, idx).toLowerCase();
    const rest = trimmed.slice(idx + 1);
    return `${dex}:${rest.toUpperCase()}`;
  }
  return trimmed.toUpperCase();
}

function gcd(a: bigint, b: bigint): bigint {
  let left = a < 0n ? -a : a;
  let right = b < 0n ? -b : b;
  while (right !== 0n) {
    const next = left % right;
    left = right;
    right = next;
  }
  return left;
}

function pow10(decimals: number): bigint {
  let result = 1n;
  for (let i = 0; i < decimals; i += 1) {
    result *= 10n;
  }
  return result;
}

function maxDecimals(values: string[]): number {
  let max = 0;
  for (const value of values) {
    const dot = value.indexOf(".");
    if (dot === -1) continue;
    const decimals = value.length - dot - 1;
    if (decimals > max) max = decimals;
  }
  return max;
}

function toScaledInt(value: string, decimals: number): bigint {
  const trimmed = value.trim();
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [intPart, fracPart = ""] = unsigned.split(".");
  const padded = fracPart.padEnd(decimals, "0").slice(0, decimals);
  const combined = `${intPart || "0"}${padded}`;
  const asInt = BigInt(combined || "0");
  return negative ? -asInt : asInt;
}

function formatScaledInt(value: bigint, decimals: number): string {
  const negative = value < 0n;
  const absValue = negative ? -value : value;
  const scale = pow10(decimals);
  const integer = absValue / scale;
  const fraction = absValue % scale;
  if (decimals === 0) {
    return `${negative ? "-" : ""}${integer.toString()}`;
  }
  const fractionStr = fraction.toString().padStart(decimals, "0");
  return `${negative ? "-" : ""}${integer.toString()}.${fractionStr}`.replace(/\.?0+$/, "");
}

function resolveSpotSizeDecimals(meta: SpotMetaResponse, symbol: string): number {
  const universe = meta.universe ?? [];
  const tokens = meta.tokens ?? [];
  if (!universe.length || !tokens.length) {
    throw new Error(`Spot metadata unavailable for ${symbol}.`);
  }

  const tokenMap = new Map<number, { name: string; szDecimals: number }>();
  for (const token of tokens) {
    const index = token?.index;
    const szDecimals = typeof token?.szDecimals === "number" ? token.szDecimals : null;
    if (typeof index !== "number" || szDecimals == null) continue;
    tokenMap.set(index, {
      name: normalizeSpotTokenName(token?.name),
      szDecimals,
    });
  }

  if (symbol.startsWith("@")) {
    const targetIndex = Number.parseInt(symbol.slice(1), 10);
    if (!Number.isFinite(targetIndex)) {
      throw new Error(`Invalid spot pair id: ${symbol}`);
    }
    for (let idx = 0; idx < universe.length; idx += 1) {
      const market = universe[idx];
      const marketIndex = typeof market?.index === "number" ? market.index : idx;
      if (marketIndex !== targetIndex) continue;
      const [baseIndex] = Array.isArray(market?.tokens) ? market.tokens : [];
      const baseToken = tokenMap.get(baseIndex ?? -1);
      if (!baseToken) break;
      return baseToken.szDecimals;
    }
    throw new Error(`Unknown spot pair id: ${symbol}`);
  }

  const pair = parseSpotPairSymbol(symbol);
  if (!pair) {
    throw new Error(`Invalid spot symbol: ${symbol}`);
  }
  const normalizedBase = normalizeSpotTokenName(pair.base).toUpperCase();
  const normalizedQuote = normalizeSpotTokenName(pair.quote).toUpperCase();

  for (const market of universe) {
    const [baseIndex, quoteIndex] = Array.isArray(market?.tokens) ? market.tokens : [];
    const baseToken = tokenMap.get(baseIndex ?? -1);
    const quoteToken = tokenMap.get(quoteIndex ?? -1);
    if (!baseToken || !quoteToken) continue;
    if (
      baseToken.name.toUpperCase() === normalizedBase &&
      quoteToken.name.toUpperCase() === normalizedQuote
    ) {
      return baseToken.szDecimals;
    }
  }

  throw new Error(`No size decimals found for ${symbol}.`);
}

export async function fetchHyperliquidAllMids(
  environment: HyperliquidEnvironment,
): Promise<Record<string, string | number>> {
  const cacheKey = environment;
  const cached = allMidsCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < META_CACHE_TTL_MS) {
    return cached.mids;
  }

  const baseUrl = API_BASES[environment];
  const res = await fetch(`${baseUrl}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "allMids" }),
  });
  const json = (await res.json().catch(() => null)) as Record<string, string | number> | null;
  if (!res.ok || !json || typeof json !== "object") {
    throw new Error(`Failed to load Hyperliquid mid prices (${res.status}).`);
  }

  allMidsCache.set(cacheKey, { fetchedAt: Date.now(), mids: json });
  return json;
}

export async function fetchHyperliquidBars(params: {
  symbol: string;
  resolution: HyperliquidBarResolution;
  countBack: number;
  fromSeconds?: number;
  toSeconds?: number;
  gatewayBase?: string | null;
}): Promise<HyperliquidBar[]> {
  const gatewayBase = resolveGatewayBase(params.gatewayBase);
  if (!gatewayBase) {
    throw new Error("OPENPOND_GATEWAY_URL is required.");
  }

  const normalizedCountBack = Math.max(1, Math.trunc(params.countBack));
  if (!Number.isFinite(normalizedCountBack) || normalizedCountBack <= 0) {
    throw new Error("countBack must be a positive integer.");
  }

  const url = new URL(`${gatewayBase}/v1/hyperliquid/bars`);
  url.searchParams.set("symbol", normalizeGatewaySymbol(params.symbol));
  url.searchParams.set("resolution", params.resolution);
  url.searchParams.set("countBack", normalizedCountBack.toString());
  if (typeof params.fromSeconds === "number" && Number.isFinite(params.fromSeconds)) {
    url.searchParams.set("from", Math.max(0, Math.trunc(params.fromSeconds)).toString());
  }
  if (typeof params.toSeconds === "number" && Number.isFinite(params.toSeconds)) {
    url.searchParams.set("to", Math.max(0, Math.trunc(params.toSeconds)).toString());
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Gateway error (${response.status})`);
  }

  const data = (await response.json().catch(() => null)) as { bars?: unknown[] } | null;
  const bars = Array.isArray(data?.bars) ? data.bars : [];
  return bars.filter((bar): bar is HyperliquidBar => {
    if (!bar || typeof bar !== "object") return false;
    const record = bar as { close?: unknown; time?: unknown };
    return (
      typeof record.close === "number" &&
      Number.isFinite(record.close) &&
      typeof record.time === "number" &&
      Number.isFinite(record.time)
    );
  });
}

export function normalizeHyperliquidIndicatorBars(
  bars: HyperliquidBar[],
): HyperliquidIndicatorBar[] {
  return bars
    .filter(
      (bar): bar is HyperliquidBar & { time: number; close: number } =>
        bar &&
        typeof bar === "object" &&
        typeof bar.time === "number" &&
        Number.isFinite(bar.time) &&
        typeof bar.close === "number" &&
        Number.isFinite(bar.close),
    )
    .map((bar) => {
      const close = bar.close;
      const open = typeof bar.open === "number" && Number.isFinite(bar.open) ? bar.open : close;
      const high = typeof bar.high === "number" && Number.isFinite(bar.high) ? bar.high : close;
      const low = typeof bar.low === "number" && Number.isFinite(bar.low) ? bar.low : close;
      const volume =
        typeof bar.volume === "number" && Number.isFinite(bar.volume) ? bar.volume : 0;
      return {
        time: bar.time,
        open,
        high,
        low,
        close,
        volume,
      };
    });
}

export async function fetchHyperliquidTickSize(params: {
  environment: HyperliquidEnvironment;
  symbol: string;
}): Promise<HyperliquidTickSize> {
  return fetchHyperliquidTickSizeForCoin(params.environment, params.symbol);
}

export async function fetchHyperliquidSpotTickSize(params: {
  environment: HyperliquidEnvironment;
  marketIndex: number;
}): Promise<HyperliquidTickSize> {
  if (!Number.isFinite(params.marketIndex)) {
    throw new Error("Hyperliquid spot market index is invalid.");
  }
  return fetchHyperliquidTickSizeForCoin(params.environment, `@${params.marketIndex}`);
}

async function fetchHyperliquidTickSizeForCoin(
  environment: HyperliquidEnvironment,
  coin: string,
): Promise<HyperliquidTickSize> {
  const base = API_BASES[environment];
  const res = await fetch(`${base}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "l2Book", coin }),
  });
  if (!res.ok) {
    throw new Error(`Hyperliquid l2Book failed for ${coin}`);
  }

  const data = (await res.json().catch(() => null)) as {
    levels?: Array<Array<{ px?: string | number }>>;
  } | null;
  const levels = Array.isArray(data?.levels) ? (data?.levels ?? []) : [];
  const prices = levels
    .flatMap((side) => (Array.isArray(side) ? side.map((entry) => String(entry?.px ?? "")) : []))
    .filter((px) => px.length > 0);

  if (prices.length < 2) {
    throw new Error(`Hyperliquid l2Book missing price levels for ${coin}`);
  }

  const decimals = maxDecimals(prices);
  const scaled = prices.map((px) => toScaledInt(px, decimals));
  const unique = Array.from(new Set(scaled.map((v) => v.toString())))
    .map((v) => BigInt(v))
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  let tick = 0n;
  for (let i = 1; i < unique.length; i += 1) {
    const diff = unique[i] - unique[i - 1];
    if (diff <= 0n) continue;
    tick = tick === 0n ? diff : gcd(tick, diff);
  }

  if (tick === 0n) {
    tick = 1n;
  }

  return { tickSizeInt: tick, tickDecimals: decimals };
}

export async function fetchHyperliquidPerpMarketInfo(params: {
  environment: HyperliquidEnvironment;
  symbol: string;
}): Promise<HyperliquidPerpMarketInfo> {
  const data = (await fetchHyperliquidMetaAndAssetCtxs(params.environment)) as [
    { universe?: PerpUniverseItem[] },
    PerpAssetContext[],
  ];

  const universe = data?.[0]?.universe ?? [];
  const contexts = data?.[1] ?? [];
  const target = normalizeHyperliquidMetaSymbol(params.symbol).toUpperCase();

  const idx = universe.findIndex(
    (entry) => normalizeHyperliquidMetaSymbol(entry?.name ?? "").toUpperCase() === target,
  );
  if (idx < 0) {
    throw new Error(`Unknown Hyperliquid perp asset: ${params.symbol}`);
  }

  const ctx = contexts[idx] ?? null;
  const price = readHyperliquidNumber(ctx?.markPx ?? ctx?.midPx ?? ctx?.oraclePx);
  if (!price || price <= 0) {
    throw new Error(`No perp price available for ${params.symbol}`);
  }

  const fundingRate = readHyperliquidNumber(ctx?.funding);
  const szDecimals = readHyperliquidNumber(universe[idx]?.szDecimals);
  if (szDecimals == null) {
    throw new Error(`No size decimals available for ${params.symbol}`);
  }

  return {
    symbol: params.symbol,
    price,
    fundingRate,
    szDecimals,
  };
}

export async function fetchHyperliquidSpotMarketInfo(params: {
  environment: HyperliquidEnvironment;
  base: string;
  quote: string;
  mids?: Record<string, string | number> | null;
}): Promise<HyperliquidSpotMarketInfo> {
  const mids =
    params.mids === undefined
      ? await fetchHyperliquidAllMids(params.environment).catch(() => null)
      : params.mids;

  const data = (await fetchHyperliquidSpotMetaAndAssetCtxs(params.environment)) as [
    { universe?: SpotUniverseItem[]; tokens?: SpotToken[] },
    SpotAssetContext[],
  ];

  const universe = data?.[0]?.universe ?? [];
  const tokens = data?.[0]?.tokens ?? [];
  const contexts = data?.[1] ?? [];

  const tokenMap = new Map<number, { name: string; szDecimals: number }>();
  for (const token of tokens) {
    const index = token?.index;
    const szDecimals = readHyperliquidNumber(token?.szDecimals);
    if (typeof index !== "number" || szDecimals == null) continue;
    tokenMap.set(index, {
      name: normalizeSpotTokenName(token?.name),
      szDecimals,
    });
  }

  const baseCandidates = resolveSpotTokenCandidates(params.base);
  const quoteCandidates = resolveSpotTokenCandidates(params.quote);
  const normalizedBase = normalizeSpotTokenName(params.base).toUpperCase();
  const normalizedQuote = normalizeSpotTokenName(params.quote).toUpperCase();

  for (let idx = 0; idx < universe.length; idx += 1) {
    const market = universe[idx];
    const [baseIndex, quoteIndex] = Array.isArray(market?.tokens) ? market.tokens : [];
    const baseToken = tokenMap.get(baseIndex ?? -1);
    const quoteToken = tokenMap.get(quoteIndex ?? -1);
    if (!baseToken || !quoteToken) continue;

    const marketBaseCandidates = resolveSpotTokenCandidates(baseToken.name);
    const marketQuoteCandidates = resolveSpotTokenCandidates(quoteToken.name);
    if (
      baseCandidates.some((candidate) => marketBaseCandidates.includes(candidate)) &&
      quoteCandidates.some((candidate) => marketQuoteCandidates.includes(candidate))
    ) {
      const contextIndex = typeof market?.index === "number" ? market.index : idx;
      const ctx =
        (contextIndex >= 0 && contextIndex < contexts.length ? contexts[contextIndex] : null) ??
        contexts[idx] ??
        null;

      let price: number | null = null;
      if (mids) {
        for (const candidate of resolveSpotMidCandidates(baseToken.name)) {
          const mid = readHyperliquidNumber(mids[candidate]);
          if (mid != null && mid > 0) {
            price = mid;
            break;
          }
        }
      }
      if (!price || price <= 0) {
        price = readHyperliquidNumber(ctx?.markPx ?? ctx?.midPx ?? ctx?.oraclePx);
      }
      if (!price || price <= 0) {
        throw new Error(`No spot price available for ${normalizedBase}/${normalizedQuote}`);
      }

      const marketIndex = typeof market?.index === "number" ? market.index : idx;
      return {
        symbol: `${baseToken.name.toUpperCase()}/${quoteToken.name.toUpperCase()}`,
        base: baseToken.name.toUpperCase(),
        quote: quoteToken.name.toUpperCase(),
        assetId: 10000 + marketIndex,
        marketIndex,
        price,
        szDecimals: baseToken.szDecimals,
      };
    }
  }

  throw new Error(`Unknown Hyperliquid spot market: ${normalizedBase}/${normalizedQuote}`);
}

async function fetchHyperliquidSpotMarketInfoByIndex(params: {
  environment: HyperliquidEnvironment;
  marketIndex: number;
  mids?: Record<string, string | number> | null;
}): Promise<HyperliquidSpotMarketInfo> {
  const mids =
    params.mids === undefined
      ? await fetchHyperliquidAllMids(params.environment).catch(() => null)
      : params.mids;

  const data = (await fetchHyperliquidSpotMetaAndAssetCtxs(params.environment)) as [
    { universe?: SpotUniverseItem[]; tokens?: SpotToken[] },
    SpotAssetContext[],
  ];

  const universe = data?.[0]?.universe ?? [];
  const tokens = data?.[0]?.tokens ?? [];
  const contexts = data?.[1] ?? [];

  const tokenMap = new Map<number, { name: string; szDecimals: number }>();
  for (const token of tokens) {
    const index = token?.index;
    const szDecimals = readHyperliquidNumber(token?.szDecimals);
    if (typeof index !== "number" || szDecimals == null) continue;
    tokenMap.set(index, {
      name: normalizeSpotTokenName(token?.name),
      szDecimals,
    });
  }

  for (let idx = 0; idx < universe.length; idx += 1) {
    const market = universe[idx];
    const marketIndex = typeof market?.index === "number" ? market.index : idx;
    if (marketIndex !== params.marketIndex) continue;

    const [baseIndex, quoteIndex] = Array.isArray(market?.tokens) ? market.tokens : [];
    const baseToken = tokenMap.get(baseIndex ?? -1);
    const quoteToken = tokenMap.get(quoteIndex ?? -1);
    if (!baseToken || !quoteToken) {
      break;
    }

    const ctx =
      (marketIndex >= 0 && marketIndex < contexts.length ? contexts[marketIndex] : null) ??
      contexts[idx] ??
      null;

    let price: number | null = null;
    if (mids) {
      for (const candidate of resolveSpotMidCandidates(baseToken.name)) {
        const mid = readHyperliquidNumber(mids[candidate]);
        if (mid != null && mid > 0) {
          price = mid;
          break;
        }
      }
    }
    if (!price || price <= 0) {
      price = readHyperliquidNumber(ctx?.markPx ?? ctx?.midPx ?? ctx?.oraclePx);
    }
    if (!price || price <= 0) {
      throw new Error(`No spot price available for @${params.marketIndex}`);
    }

    return {
      symbol: `${baseToken.name.toUpperCase()}/${quoteToken.name.toUpperCase()}`,
      base: baseToken.name.toUpperCase(),
      quote: quoteToken.name.toUpperCase(),
      assetId: 10000 + marketIndex,
      marketIndex,
      price,
      szDecimals: baseToken.szDecimals,
    };
  }

  throw new Error(`Unknown Hyperliquid spot market index: @${params.marketIndex}`);
}

export async function fetchHyperliquidResolvedMarketDescriptor(params: {
  environment: HyperliquidEnvironment;
  symbol: string;
  mids?: Record<string, string | number> | null;
}): Promise<HyperliquidResolvedMarketDescriptor> {
  const parsed = parseHyperliquidSymbol(params.symbol);
  if (!parsed) {
    throw new Error(`Unable to parse Hyperliquid symbol: ${params.symbol}`);
  }

  if (parsed.kind === "spot" || parsed.kind === "spotIndex") {
    const spotInfo =
      parsed.kind === "spotIndex"
        ? await fetchHyperliquidSpotMarketInfoByIndex({
            environment: params.environment,
            marketIndex: Number.parseInt(parsed.normalized.slice(1), 10),
            ...(params.mids !== undefined ? { mids: params.mids } : {}),
          })
        : await fetchHyperliquidSpotMarketInfo({
            environment: params.environment,
            base: parsed.base ?? "",
            quote: parsed.quote ?? "USDC",
            ...(params.mids !== undefined ? { mids: params.mids } : {}),
          });
    const orderSymbol = resolveHyperliquidOrderSymbol(spotInfo.symbol);
    if (!orderSymbol) {
      throw new Error(`Unable to resolve Hyperliquid spot order symbol: ${params.symbol}`);
    }
    const descriptor = buildHyperliquidMarketDescriptor({
      symbol: params.symbol,
      pair: spotInfo.symbol,
      quote: spotInfo.quote,
      displaySymbol: `${spotInfo.base}-${spotInfo.quote}`,
      orderSymbol,
      marketDataCoin: `@${spotInfo.marketIndex}`,
      spotIndex: spotInfo.marketIndex,
      assetId: spotInfo.assetId,
    });
    if (!descriptor) {
      throw new Error(`Unable to build Hyperliquid spot market descriptor: ${params.symbol}`);
    }
    return descriptor;
  }

  const quote =
    parsed.dex
      ? await (async () => {
          const dex = parsed.dex;
          if (!dex) return null;
          const [dexMetaAndCtxs, spotMetaRaw] = await Promise.all([
            fetchHyperliquidDexMetaAndAssetCtxs(params.environment, dex),
            fetchHyperliquidSpotMeta(params.environment),
          ]);
          const metaHeader =
            Array.isArray(dexMetaAndCtxs) && dexMetaAndCtxs.length > 0
              ? (dexMetaAndCtxs[0] as { collateralToken?: unknown } | null)
              : null;
          const collateralToken =
            typeof metaHeader?.collateralToken === "number" ? metaHeader.collateralToken : null;
          if (collateralToken == null) return null;
          const spotMeta = spotMetaRaw as SpotMetaResponse;
          const token = (spotMeta.tokens ?? []).find((entry) => entry?.index === collateralToken) ?? null;
          return normalizeSpotTokenName(token?.name).toUpperCase() || null;
        })()
      : "USDC";

  const descriptor = buildHyperliquidMarketDescriptor({
    symbol: params.symbol,
    ...(quote ? { quote } : {}),
  });
  if (!descriptor) {
    throw new Error(`Unable to build Hyperliquid market descriptor: ${params.symbol}`);
  }
  return descriptor;
}

export async function fetchHyperliquidSizeDecimals(params: {
  environment: HyperliquidEnvironment;
  symbol: string;
}): Promise<number> {
  const { symbol, environment } = params;
  if (isHyperliquidSpotSymbol(symbol)) {
    const meta = (await fetchHyperliquidSpotMeta(environment)) as SpotMetaResponse;
    return resolveSpotSizeDecimals(meta, symbol);
  }

  const meta = (await fetchHyperliquidMeta(environment)) as {
    universe?: Array<{ name?: string; szDecimals?: number }>;
  };
  const universe = Array.isArray(meta?.universe) ? meta.universe : [];
  const normalized = normalizeHyperliquidMetaSymbol(symbol).toUpperCase();
  const match = universe.find(
    (entry) => normalizeHyperliquidMetaSymbol(entry?.name ?? "").toUpperCase() === normalized,
  );
  if (!match || typeof match.szDecimals !== "number") {
    throw new Error(`No size decimals found for ${symbol}.`);
  }
  return match.szDecimals;
}

export function buildHyperliquidSpotUsdPriceMap(params: {
  meta: SpotMetaResponse;
  ctxs: SpotAssetContext[];
  mids?: Record<string, string | number> | null;
}): Map<string, number> {
  const universe = params.meta.universe ?? [];
  const tokens = params.meta.tokens ?? [];

  const tokenMap = new Map<number, string>();
  for (const token of tokens) {
    const index = token?.index;
    if (typeof index !== "number") continue;
    tokenMap.set(index, normalizeSpotTokenName(token?.name).toUpperCase());
  }

  const prices = new Map<string, number>();
  prices.set("USDC", 1);

  for (let idx = 0; idx < universe.length; idx += 1) {
    const market = universe[idx];
    const [baseIndex, quoteIndex] = Array.isArray(market?.tokens) ? market.tokens : [];
    const base = tokenMap.get(baseIndex ?? -1);
    const quote = tokenMap.get(quoteIndex ?? -1);
    if (!base || !quote) continue;
    if (quote !== "USDC") continue;

    const contextIndex = typeof market?.index === "number" ? market.index : idx;
    const ctx =
      (contextIndex >= 0 && contextIndex < params.ctxs.length ? params.ctxs[contextIndex] : null) ??
      params.ctxs[idx] ??
      null;

    let price: number | null = null;
    if (params.mids) {
      for (const candidate of resolveSpotMidCandidates(base)) {
        const mid = readHyperliquidNumber(params.mids[candidate]);
        if (mid != null && mid > 0) {
          price = mid;
          break;
        }
      }
    }

    if (!price || price <= 0) {
      price = readHyperliquidNumber(ctx?.markPx ?? ctx?.midPx ?? ctx?.oraclePx);
    }
    if (!price || price <= 0) continue;

    prices.set(base, price);
  }

  return prices;
}

export async function fetchHyperliquidSpotUsdPriceMap(
  environment: HyperliquidEnvironment,
): Promise<Map<string, number>> {
  const [spotMetaAndCtxs, mids] = await Promise.all([
    fetchHyperliquidSpotMetaAndAssetCtxs(environment),
    fetchHyperliquidAllMids(environment).catch(() => null),
  ]);

  const [metaRaw, ctxsRaw] = spotMetaAndCtxs as [SpotMetaResponse, SpotAssetContext[]];
  const meta = {
    universe: Array.isArray(metaRaw?.universe) ? metaRaw.universe : [],
    tokens: Array.isArray(metaRaw?.tokens) ? metaRaw.tokens : [],
  } satisfies SpotMetaResponse;

  const ctxs = Array.isArray(ctxsRaw) ? ctxsRaw : [];
  return buildHyperliquidSpotUsdPriceMap({ meta, ctxs, mids });
}

export async function fetchHyperliquidSpotAccountValue(params: {
  environment: HyperliquidEnvironment;
  balances: unknown;
}): Promise<number | null> {
  const pricesUsd = await fetchHyperliquidSpotUsdPriceMap(params.environment);
  return readHyperliquidSpotAccountValue({
    balances: params.balances,
    pricesUsd,
  });
}

export const __hyperliquidMarketDataInternals = {
  maxDecimals,
  toScaledInt,
  formatScaledInt,
};

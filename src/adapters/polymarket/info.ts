import {
  PolymarketApiError,
  PolymarketEnvironment,
  PolymarketMarket,
  PolymarketOrderbook,
  PolymarketOrderbookLevel,
  PolymarketPriceHistoryPoint,
  normalizeNumberArrayish,
  normalizeStringArrayish,
  normalizeTags,
  parseOptionalDate,
  resolvePolymarketBaseUrl,
} from "./base";

type GammaEvent = Record<string, unknown>;
type GammaMarket = Record<string, unknown>;

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

const DEFAULT_EVENT_LIMIT = 50;

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

function getString(value: unknown): string | null {
  if (value == null) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}

function normalizeOrderbookLevels(raw: unknown): PolymarketOrderbookLevel[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (Array.isArray(entry)) {
        const [price, size] = entry;
        const p = Number(price);
        const s = Number(size);
        if (!Number.isFinite(p) || !Number.isFinite(s)) return null;
        return { price: p, size: s };
      }
      if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        const p = Number(record.price ?? record.p);
        const s = Number(record.size ?? record.s ?? record.quantity);
        if (!Number.isFinite(p) || !Number.isFinite(s)) return null;
        return { price: p, size: s };
      }
      return null;
    })
    .filter((entry): entry is PolymarketOrderbookLevel => Boolean(entry));
}

function normalizeGammaMarket(market: GammaMarket, event?: GammaEvent): PolymarketMarket {
  const eventTags = normalizeTags(event?.tags);
  const marketTags = normalizeTags(market.tags);
  const mergedTags = Array.from(new Set([...marketTags, ...eventTags]));

  const category =
    getString(market.category) ??
    getString(event?.category) ??
    getString(event?.title) ??
    null;

  const normalized: PolymarketMarket = {
    id: getString(market.id) ?? "",
    slug: getString(market.slug),
    question: getString(market.question),
    description: getString(market.description),
    eventId: getString(market.eventId ?? event?.id),
    eventSlug: getString(event?.slug),
    conditionId: getString(market.conditionId),
    marketMakerAddress: getString(market.marketMakerAddress),
    category,
    startDate:
      parseOptionalDate(market.startDate) ??
      parseOptionalDate(event?.startDate) ??
      parseOptionalDate(event?.eventStartTime),
    endDate:
      parseOptionalDate(market.endDate) ??
      parseOptionalDate(event?.endDate) ??
      parseOptionalDate(event?.eventEndTime),
    createdAt:
      parseOptionalDate(market.createdAt) ??
      parseOptionalDate(event?.createdAt) ??
      parseOptionalDate(event?.creationDate),
    updatedAt:
      parseOptionalDate(market.updatedAt) ??
      parseOptionalDate(event?.updatedAt),
    closedTime:
      parseOptionalDate(market.closedTime) ?? parseOptionalDate(event?.closedTime),
    volume: getString(market.volume),
    liquidity: getString(market.liquidity),
    openInterest: getString(market.openInterest),
    outcomes: normalizeStringArrayish(market.outcomes),
    outcomePrices: normalizeNumberArrayish(market.outcomePrices),
    clobTokenIds: normalizeStringArrayish(market.clobTokenIds),
    icon: getString(market.icon),
    image: getString(market.image),
  };

  if (mergedTags.length) {
    normalized.tags = mergedTags;
  }
  if (typeof market.active === "boolean") {
    normalized.active = market.active;
  }
  if (typeof market.closed === "boolean") {
    normalized.closed = market.closed;
  }
  if (typeof market.resolved === "boolean") {
    normalized.resolved = market.resolved;
  }

  return normalized;
}

export class PolymarketInfoClient {
  private readonly environment: PolymarketEnvironment;

  constructor(environment: PolymarketEnvironment = "mainnet") {
    this.environment = environment;
  }

  markets(params: FetchParams = {}) {
    return fetchPolymarketMarkets({ ...params, environment: this.environment });
  }

  market(params: { id?: string; slug?: string; conditionId?: string }) {
    return fetchPolymarketMarket({ ...params, environment: this.environment });
  }

  orderbook(tokenId: string) {
    return fetchPolymarketOrderbook({ tokenId, environment: this.environment });
  }

  price(tokenId: string, side: "BUY" | "SELL") {
    return fetchPolymarketPrice({ tokenId, side, environment: this.environment });
  }

  midpoint(tokenId: string) {
    return fetchPolymarketMidpoint({ tokenId, environment: this.environment });
  }

  priceHistory(params: {
    tokenId: string;
    startTs?: number;
    endTs?: number;
    interval?: string;
    fidelity?: number;
  }) {
    return fetchPolymarketPriceHistory({ ...params, environment: this.environment });
  }
}

export async function fetchPolymarketMarkets(params: FetchParams = {}): Promise<PolymarketMarket[]> {
  if (params.active !== undefined && params.active !== true) {
    throw new Error("Polymarket market list requires active=true.");
  }
  if (params.closed !== undefined && params.closed !== false) {
    throw new Error("Polymarket market list requires closed=false.");
  }

  const environment = params.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("gamma", environment);
  const url = new URL("/events", baseUrl);
  const limit = params.limit ?? DEFAULT_EVENT_LIMIT;
  const offset = params.offset ?? 0;

  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("active", "true");
  url.searchParams.set("closed", "false");
  url.searchParams.set("order", params.order ?? "id");
  url.searchParams.set("ascending", params.ascending ? "true" : "false");

  if (params.tagId) url.searchParams.set("tag_id", params.tagId);
  if (params.relatedTags) url.searchParams.set("related_tags", "true");
  if (params.excludeTagId) url.searchParams.set("exclude_tag_id", params.excludeTagId);
  if (params.slug) url.searchParams.set("slug", params.slug);

  const data = (await requestJson(url.toString())) as GammaEvent[];
  const markets = data.flatMap((event) =>
    Array.isArray(event?.markets)
      ? (event.markets as GammaMarket[]).map((market) =>
          normalizeGammaMarket(market, event)
        )
      : []
  );

  const filtered = params.category
    ? markets.filter((market) =>
        (market.category ?? "")
          .toLowerCase()
          .includes(params.category!.toLowerCase())
      )
    : markets;

  return typeof params.limit === "number" ? filtered.slice(0, params.limit) : filtered;
}

export async function fetchPolymarketMarket(params: {
  id?: string;
  slug?: string;
  conditionId?: string;
  environment?: PolymarketEnvironment;
}): Promise<PolymarketMarket | null> {
  const environment = params.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("gamma", environment);

  if (params.slug) {
    const url = new URL(`/markets/slug/${params.slug}`, baseUrl);
    const data = (await requestJson(url.toString())) as GammaMarket | null;
    if (!data) return null;
    return normalizeGammaMarket(data);
  }

  if (params.id) {
    const url = new URL(`/markets/${params.id}`, baseUrl);
    const data = (await requestJson(url.toString())) as GammaMarket | null;
    if (!data) return null;
    return normalizeGammaMarket(data);
  }

  if (params.conditionId) {
    const url = new URL(`/markets`, baseUrl);
    url.searchParams.set("condition_id", params.conditionId);
    const data = (await requestJson(url.toString())) as GammaMarket[] | GammaMarket | null;
    if (!data) return null;
    const market = Array.isArray(data) ? data[0] : data;
    return market ? normalizeGammaMarket(market) : null;
  }

  throw new Error("id, slug, or conditionId is required.");
}

export async function fetchPolymarketOrderbook(params: {
  tokenId: string;
  environment?: PolymarketEnvironment;
}): Promise<PolymarketOrderbook> {
  const environment = params.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = new URL("/book", baseUrl);
  url.searchParams.set("token_id", params.tokenId);
  const data = (await requestJson(url.toString())) as Record<string, unknown>;

  return {
    market: params.tokenId,
    bids: normalizeOrderbookLevels(data.bids),
    asks: normalizeOrderbookLevels(data.asks),
    timestamp: getString(data.timestamp),
  };
}

export async function fetchPolymarketPrice(params: {
  tokenId: string;
  side: "BUY" | "SELL";
  environment?: PolymarketEnvironment;
}): Promise<number | null> {
  const environment = params.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = new URL("/price", baseUrl);
  url.searchParams.set("token_id", params.tokenId);
  url.searchParams.set("side", params.side);
  const data = (await requestJson(url.toString())) as Record<string, unknown>;
  const price = Number(data.price ?? data?.p);
  return Number.isFinite(price) ? price : null;
}

export async function fetchPolymarketMidpoint(params: {
  tokenId: string;
  environment?: PolymarketEnvironment;
}): Promise<number | null> {
  const baseArgs = {
    tokenId: params.tokenId,
    ...(params.environment ? { environment: params.environment } : {}),
  };
  const buy = await fetchPolymarketPrice({ ...baseArgs, side: "BUY" });
  const sell = await fetchPolymarketPrice({ ...baseArgs, side: "SELL" });
  if (buy == null || sell == null) return null;
  return (buy + sell) / 2;
}

export async function fetchPolymarketPriceHistory(params: {
  tokenId: string;
  startTs?: number;
  endTs?: number;
  interval?: string;
  fidelity?: number;
  environment?: PolymarketEnvironment;
}): Promise<PolymarketPriceHistoryPoint[]> {
  const environment = params.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = new URL("/prices-history", baseUrl);
  url.searchParams.set("market", params.tokenId);
  if (params.startTs) url.searchParams.set("startTs", params.startTs.toString());
  if (params.endTs) url.searchParams.set("endTs", params.endTs.toString());
  if (params.interval) url.searchParams.set("interval", params.interval);
  if (params.fidelity) url.searchParams.set("fidelity", params.fidelity.toString());

  const data = (await requestJson(url.toString())) as
    | { history?: Array<{ t: number; p: number }> }
    | Array<{ t: number; p: number }>;

  const points = Array.isArray(data) ? data : data?.history ?? [];
  return points
    .map((point) => ({
      t: Number(point.t),
      p: Number(point.p),
    }))
    .filter((point) => Number.isFinite(point.t) && Number.isFinite(point.p));
}

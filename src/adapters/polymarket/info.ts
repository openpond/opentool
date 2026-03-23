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

export interface PolymarketUserPosition {
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

export interface PolymarketClosedPosition {
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

export type PolymarketActivityType =
  | "TRADE"
  | "SPLIT"
  | "MERGE"
  | "REDEEM"
  | "REWARD"
  | "CONVERSION"
  | "MAKER_REBATE";

export interface PolymarketUserActivity {
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

export interface PolymarketPositionValue {
  user?: string | null;
  value?: number | null;
}

export interface PolymarketPublicProfileUser {
  id?: string | null;
  creator?: boolean;
  mod?: boolean;
}

export interface PolymarketPublicProfile {
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

export interface PolymarketUserPositionParams extends PolymarketUserQueryBase {
  sizeThreshold?: number;
  redeemable?: boolean;
  mergeable?: boolean;
  limit?: number;
  offset?: number;
  sortBy?:
    | "CURRENT"
    | "INITIAL"
    | "TOKENS"
    | "CASHPNL"
    | "PERCENTPNL"
    | "TITLE"
    | "RESOLVING"
    | "PRICE"
    | "AVGPRICE";
  sortDirection?: "ASC" | "DESC";
  title?: string;
}

export interface PolymarketClosedPositionParams extends PolymarketUserQueryBase {
  limit?: number;
  offset?: number;
  sortBy?: "REALIZEDPNL" | "TITLE" | "PRICE" | "AVGPRICE" | "TIMESTAMP";
  sortDirection?: "ASC" | "DESC";
  title?: string;
}

export interface PolymarketUserActivityParams extends PolymarketUserQueryBase {
  limit?: number;
  offset?: number;
  type?: PolymarketActivityType | PolymarketActivityType[];
  start?: number;
  end?: number;
  sortBy?: "TIMESTAMP" | "TOKENS" | "CASH";
  sortDirection?: "ASC" | "DESC";
  side?: "BUY" | "SELL";
}

export interface PolymarketPositionValueParams {
  user: string;
  environment?: PolymarketEnvironment;
  market?: CsvStringInput;
}

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
      data ?? { status: response.status },
    );
  }
  return data;
}

function getString(value: unknown): string | null {
  if (value == null) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}

function getNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getInteger(value: unknown): number | null {
  const numeric = getNumber(value);
  return numeric == null ? null : Math.trunc(numeric);
}

function getBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
}

function normalizeCsvStringInput(value: CsvStringInput | undefined): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => String(entry).split(","))
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return [];
}

function normalizeCsvNumberInput(value: CsvNumberInput | undefined): number[] {
  if (Array.isArray(value)) {
    return value.filter((entry) => Number.isFinite(entry));
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return [value];
  }
  return [];
}

function appendCsvParam(url: URL, key: string, values: string[]) {
  if (values.length > 0) {
    url.searchParams.set(key, values.join(","));
  }
}

function appendNumberParam(url: URL, key: string, value: number | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    url.searchParams.set(key, String(value));
  }
}

function appendBooleanParam(url: URL, key: string, value: boolean | undefined) {
  if (typeof value === "boolean") {
    url.searchParams.set(key, value ? "true" : "false");
  }
}

function assertMutuallyExclusiveMarketScope(market: string[], eventIds: number[]) {
  if (market.length > 0 && eventIds.length > 0) {
    throw new Error("market and eventId are mutually exclusive.");
  }
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
    getString(market.category) ?? getString(event?.category) ?? getString(event?.title) ?? null;

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
    updatedAt: parseOptionalDate(market.updatedAt) ?? parseOptionalDate(event?.updatedAt),
    closedTime: parseOptionalDate(market.closedTime) ?? parseOptionalDate(event?.closedTime),
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

function normalizeUserPosition(raw: unknown): PolymarketUserPosition {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const normalized: PolymarketUserPosition = {
    proxyWallet: getString(record.proxyWallet),
    asset: getString(record.asset),
    conditionId: getString(record.conditionId),
    size: getNumber(record.size),
    avgPrice: getNumber(record.avgPrice),
    initialValue: getNumber(record.initialValue),
    currentValue: getNumber(record.currentValue),
    cashPnl: getNumber(record.cashPnl),
    percentPnl: getNumber(record.percentPnl),
    totalBought: getNumber(record.totalBought),
    realizedPnl: getNumber(record.realizedPnl),
    percentRealizedPnl: getNumber(record.percentRealizedPnl),
    curPrice: getNumber(record.curPrice),
    title: getString(record.title),
    slug: getString(record.slug),
    icon: getString(record.icon),
    eventSlug: getString(record.eventSlug),
    outcome: getString(record.outcome),
    outcomeIndex: getInteger(record.outcomeIndex),
    oppositeOutcome: getString(record.oppositeOutcome),
    oppositeAsset: getString(record.oppositeAsset),
    endDate: parseOptionalDate(record.endDate),
  };
  const redeemable = getBoolean(record.redeemable);
  if (redeemable != null) normalized.redeemable = redeemable;
  const mergeable = getBoolean(record.mergeable);
  if (mergeable != null) normalized.mergeable = mergeable;
  const negativeRisk = getBoolean(record.negativeRisk);
  if (negativeRisk != null) normalized.negativeRisk = negativeRisk;
  return normalized;
}

function normalizeClosedPosition(raw: unknown): PolymarketClosedPosition {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    proxyWallet: getString(record.proxyWallet),
    asset: getString(record.asset),
    conditionId: getString(record.conditionId),
    avgPrice: getNumber(record.avgPrice),
    totalBought: getNumber(record.totalBought),
    realizedPnl: getNumber(record.realizedPnl),
    curPrice: getNumber(record.curPrice),
    timestamp: getInteger(record.timestamp),
    title: getString(record.title),
    slug: getString(record.slug),
    icon: getString(record.icon),
    eventSlug: getString(record.eventSlug),
    outcome: getString(record.outcome),
    outcomeIndex: getInteger(record.outcomeIndex),
    oppositeOutcome: getString(record.oppositeOutcome),
    oppositeAsset: getString(record.oppositeAsset),
    endDate: parseOptionalDate(record.endDate),
  };
}

function normalizeUserActivity(raw: unknown): PolymarketUserActivity {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    proxyWallet: getString(record.proxyWallet),
    timestamp: getInteger(record.timestamp),
    conditionId: getString(record.conditionId),
    type: getString(record.type) as PolymarketActivityType | null,
    size: getNumber(record.size),
    usdcSize: getNumber(record.usdcSize),
    transactionHash: getString(record.transactionHash),
    price: getNumber(record.price),
    asset: getString(record.asset),
    side: getString(record.side) as "BUY" | "SELL" | null,
    outcomeIndex: getInteger(record.outcomeIndex),
    title: getString(record.title),
    slug: getString(record.slug),
    icon: getString(record.icon),
    eventSlug: getString(record.eventSlug),
    outcome: getString(record.outcome),
    name: getString(record.name),
    pseudonym: getString(record.pseudonym),
    bio: getString(record.bio),
    profileImage: getString(record.profileImage),
    profileImageOptimized: getString(record.profileImageOptimized),
  };
}

function normalizePositionValue(raw: unknown): PolymarketPositionValue {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    user: getString(record.user),
    value: getNumber(record.value),
  };
}

function normalizeProfileUsers(raw: unknown): PolymarketPublicProfileUser[] | null {
  if (!Array.isArray(raw)) return null;
  return raw.map((entry) => {
    const record = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
    const normalized: PolymarketPublicProfileUser = {
      id: getString(record.id),
    };
    const creator = getBoolean(record.creator);
    if (creator != null) normalized.creator = creator;
    const mod = getBoolean(record.mod);
    if (mod != null) normalized.mod = mod;
    return normalized;
  });
}

function normalizePublicProfile(raw: unknown): PolymarketPublicProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const normalized: PolymarketPublicProfile = {
    createdAt: parseOptionalDate(record.createdAt),
    proxyWallet: getString(record.proxyWallet),
    profileImage: getString(record.profileImage),
    bio: getString(record.bio),
    pseudonym: getString(record.pseudonym),
    name: getString(record.name),
    users: normalizeProfileUsers(record.users),
    xUsername: getString(record.xUsername),
  };
  const displayUsernamePublic = getBoolean(record.displayUsernamePublic);
  if (displayUsernamePublic != null) {
    normalized.displayUsernamePublic = displayUsernamePublic;
  }
  const verifiedBadge = getBoolean(record.verifiedBadge);
  if (verifiedBadge != null) {
    normalized.verifiedBadge = verifiedBadge;
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

  positions(params: Omit<PolymarketUserPositionParams, "environment">) {
    return fetchPolymarketPositions({ ...params, environment: this.environment });
  }

  closedPositions(params: Omit<PolymarketClosedPositionParams, "environment">) {
    return fetchPolymarketClosedPositions({ ...params, environment: this.environment });
  }

  activity(params: Omit<PolymarketUserActivityParams, "environment">) {
    return fetchPolymarketActivity({ ...params, environment: this.environment });
  }

  positionValue(params: Omit<PolymarketPositionValueParams, "environment">) {
    return fetchPolymarketPositionValue({ ...params, environment: this.environment });
  }

  publicProfile(address: string) {
    return fetchPolymarketPublicProfile({ address, environment: this.environment });
  }
}

export async function fetchPolymarketMarkets(
  params: FetchParams = {},
): Promise<PolymarketMarket[]> {
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
      ? (event.markets as GammaMarket[]).map((market) => normalizeGammaMarket(market, event))
      : [],
  );

  const filtered = params.category
    ? markets.filter((market) =>
        (market.category ?? "").toLowerCase().includes(params.category!.toLowerCase()),
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

  const points = Array.isArray(data) ? data : (data?.history ?? []);
  return points
    .map((point) => ({
      t: Number(point.t),
      p: Number(point.p),
    }))
    .filter((point) => Number.isFinite(point.t) && Number.isFinite(point.p));
}

export async function fetchPolymarketPositions(
  params: PolymarketUserPositionParams,
): Promise<PolymarketUserPosition[]> {
  const environment = params.environment ?? "mainnet";
  const market = normalizeCsvStringInput(params.market);
  const eventIds = normalizeCsvNumberInput(params.eventId);
  assertMutuallyExclusiveMarketScope(market, eventIds);

  const baseUrl = resolvePolymarketBaseUrl("data", environment);
  const url = new URL("/positions", baseUrl);
  url.searchParams.set("user", params.user);
  appendCsvParam(url, "market", market);
  appendCsvParam(
    url,
    "eventId",
    eventIds.map((entry) => String(entry)),
  );
  appendNumberParam(url, "sizeThreshold", params.sizeThreshold);
  appendBooleanParam(url, "redeemable", params.redeemable);
  appendBooleanParam(url, "mergeable", params.mergeable);
  appendNumberParam(url, "limit", params.limit);
  appendNumberParam(url, "offset", params.offset);
  if (params.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params.sortDirection) url.searchParams.set("sortDirection", params.sortDirection);
  if (params.title) url.searchParams.set("title", params.title);

  const data = (await requestJson(url.toString())) as unknown[];
  return Array.isArray(data) ? data.map((entry) => normalizeUserPosition(entry)) : [];
}

export async function fetchPolymarketClosedPositions(
  params: PolymarketClosedPositionParams,
): Promise<PolymarketClosedPosition[]> {
  const environment = params.environment ?? "mainnet";
  const market = normalizeCsvStringInput(params.market);
  const eventIds = normalizeCsvNumberInput(params.eventId);
  assertMutuallyExclusiveMarketScope(market, eventIds);

  const baseUrl = resolvePolymarketBaseUrl("data", environment);
  const url = new URL("/closed-positions", baseUrl);
  url.searchParams.set("user", params.user);
  appendCsvParam(url, "market", market);
  appendCsvParam(
    url,
    "eventId",
    eventIds.map((entry) => String(entry)),
  );
  appendNumberParam(url, "limit", params.limit);
  appendNumberParam(url, "offset", params.offset);
  if (params.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params.sortDirection) url.searchParams.set("sortDirection", params.sortDirection);
  if (params.title) url.searchParams.set("title", params.title);

  const data = (await requestJson(url.toString())) as unknown[];
  return Array.isArray(data) ? data.map((entry) => normalizeClosedPosition(entry)) : [];
}

export async function fetchPolymarketActivity(
  params: PolymarketUserActivityParams,
): Promise<PolymarketUserActivity[]> {
  const environment = params.environment ?? "mainnet";
  const market = normalizeCsvStringInput(params.market);
  const eventIds = normalizeCsvNumberInput(params.eventId);
  assertMutuallyExclusiveMarketScope(market, eventIds);

  const types = Array.isArray(params.type) ? params.type : params.type ? [params.type] : [];
  const baseUrl = resolvePolymarketBaseUrl("data", environment);
  const url = new URL("/activity", baseUrl);
  url.searchParams.set("user", params.user);
  appendCsvParam(url, "market", market);
  appendCsvParam(
    url,
    "eventId",
    eventIds.map((entry) => String(entry)),
  );
  appendCsvParam(url, "type", types);
  appendNumberParam(url, "start", params.start);
  appendNumberParam(url, "end", params.end);
  appendNumberParam(url, "limit", params.limit);
  appendNumberParam(url, "offset", params.offset);
  if (params.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params.sortDirection) url.searchParams.set("sortDirection", params.sortDirection);
  if (params.side) url.searchParams.set("side", params.side);

  const data = (await requestJson(url.toString())) as unknown[];
  return Array.isArray(data) ? data.map((entry) => normalizeUserActivity(entry)) : [];
}

export async function fetchPolymarketPositionValue(
  params: PolymarketPositionValueParams,
): Promise<PolymarketPositionValue[]> {
  const environment = params.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("data", environment);
  const url = new URL("/value", baseUrl);
  url.searchParams.set("user", params.user);
  appendCsvParam(url, "market", normalizeCsvStringInput(params.market));

  const data = (await requestJson(url.toString())) as unknown[];
  return Array.isArray(data) ? data.map((entry) => normalizePositionValue(entry)) : [];
}

export async function fetchPolymarketPublicProfile(params: {
  address: string;
  environment?: PolymarketEnvironment;
}): Promise<PolymarketPublicProfile | null> {
  const environment = params.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("gamma", environment);
  const url = new URL("/public-profile", baseUrl);
  url.searchParams.set("address", params.address);
  const data = await requestJson(url.toString());
  return normalizePublicProfile(data);
}

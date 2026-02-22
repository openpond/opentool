import { encode as encodeMsgpack } from "@msgpack/msgpack";
import { keccak_256 } from "@noble/hashes/sha3";
import { bytesToHex, concatBytes, hexToBytes } from "@noble/hashes/utils";
import type { WalletFullContext } from "../../wallet/types";

const CACHE_TTL_MS = 5 * 60 * 1000;

export const API_BASES = {
  mainnet: "https://api.hyperliquid.xyz",
  testnet: "https://api.hyperliquid-testnet.xyz",
} as const satisfies Record<HyperliquidEnvironment, string>;

export const HL_ENDPOINT = {
  mainnet: "https://api.hyperliquid.xyz",
  testnet: "https://api.hyperliquid-testnet.xyz",
} as const satisfies Record<HyperliquidEnvironment, string>;

export const HL_CHAIN_LABEL = {
  mainnet: "Mainnet",
  testnet: "Testnet",
} as const satisfies Record<HyperliquidEnvironment, string>;

export const HL_BRIDGE_ADDRESSES: Record<
  HyperliquidEnvironment,
  `0x${string}`
> = {
  mainnet: "0x2df1c51e09aecf9cacb7bc98cb1742757f163df7",
  testnet: "0x08cfc1b6b2dcf36a1480b99353a354aa8ac56f89",
};

export const HL_USDC_ADDRESSES: Record<HyperliquidEnvironment, `0x${string}`> =
  {
    mainnet: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    testnet: "0x1baAbB04529D43a73232B713C0FE471f7c7334d5",
  };

export const HL_SIGNATURE_CHAIN_ID = {
  mainnet: "0xa4b1",
  testnet: "0x66eee",
} as const satisfies Record<HyperliquidEnvironment, string>;

export const EXCHANGE_TYPED_DATA_DOMAIN = {
  name: "Exchange",
  version: "1",
  chainId: 1337,
  verifyingContract: "0x0000000000000000000000000000000000000000" as const,
};

export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;
export const MIN_DEPOSIT_USDC = 5;
export const BUILDER_CODE: HyperliquidBuilderFee = {
  address: "0x4b2aec4F91612849d6e20C9c1881FabB1A48cd12",
  fee: 100,
};

const metaCache = new Map<
  string,
  { fetchedAt: number; universe: MetaResponse["universe"] }
>();
const spotMetaCache = new Map<
  string,
  { fetchedAt: number; universe: SpotUniverseItem[]; tokens: SpotToken[] }
>();
const perpDexsCache = new Map<
  string,
  { fetchedAt: number; dexs: PerpDexsResponse }
>();

export type HyperliquidEnvironment = "mainnet" | "testnet";

export type MarketIdentity = {
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

export type HyperliquidMarketIdentityInput = {
  environment: HyperliquidEnvironment;
  symbol: string;
  rawSymbol?: string | null;
  isSpot?: boolean;
  base?: string | null;
  quote?: string | null;
};

const UNKNOWN_SYMBOL = "UNKNOWN";

const extractDexPrefix = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.includes(":")) return null;
  if (trimmed.startsWith("@")) return null;
  const [prefix] = trimmed.split(":");
  const dex = prefix?.trim().toLowerCase() ?? "";
  return dex || null;
};

const normalizeHyperliquidBase = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutDex = trimmed.includes(":")
    ? trimmed.split(":").slice(1).join(":")
    : trimmed;
  const base = withoutDex.split("-")[0] ?? withoutDex;
  const normalized = (base.split("/")[0] ?? base).trim().toUpperCase();
  if (!normalized || normalized === UNKNOWN_SYMBOL) return null;
  return normalized;
};

const normalizeSpotTokenName = (value?: string | null): string => {
  const raw = (value ?? "").trim().toUpperCase();
  if (!raw) return "";
  if (raw.endsWith("0") && raw.length > 1) {
    return raw.slice(0, -1);
  }
  return raw;
};

const parseHyperliquidPair = (
  value?: string | null
): { base: string; quote: string } | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutDex = trimmed.includes(":")
    ? trimmed.split(":").slice(1).join(":")
    : trimmed;
  const separator = withoutDex.includes("/")
    ? "/"
    : withoutDex.includes("-")
      ? "-"
      : null;
  if (!separator) return null;
  const [baseRaw, ...rest] = withoutDex.split(separator);
  const quoteRaw = rest.join(separator);
  if (!baseRaw || !quoteRaw) return null;
  const base = baseRaw.trim().toUpperCase();
  const quote = quoteRaw.trim().toUpperCase();
  if (!base || !quote) return null;
  return { base, quote };
};

export function buildHyperliquidMarketIdentity(
  input: HyperliquidMarketIdentityInput
): MarketIdentity | null {
  const rawSymbol = input.rawSymbol ?? input.symbol;
  const dex = extractDexPrefix(rawSymbol);
  const pair = parseHyperliquidPair(rawSymbol) ?? parseHyperliquidPair(input.symbol);
  const isSpot =
    input.isSpot ??
    (Boolean(pair) || rawSymbol.startsWith("@") || input.symbol.includes("/"));

  const base =
    (input.base ? input.base.trim().toUpperCase() : null) ??
    pair?.base ??
    normalizeHyperliquidBase(input.symbol) ??
    normalizeHyperliquidBase(rawSymbol);

  if (!base) return null;

  if (isSpot) {
    const quote =
      (input.quote ? input.quote.trim().toUpperCase() : null) ?? pair?.quote ?? null;
    if (!quote) return null;
    return {
      market_type: "spot",
      venue: "hyperliquid",
      environment: input.environment,
      base,
      quote,
      dex,
      raw_symbol: rawSymbol ?? null,
      canonical_symbol: `spot:hyperliquid:${base}-${quote}`,
    };
  }

  return {
    market_type: "perp",
    venue: "hyperliquid",
    environment: input.environment,
    base,
    dex,
    raw_symbol: rawSymbol ?? null,
    canonical_symbol: `perp:hyperliquid:${base}`,
  };
}
export type HyperliquidTimeInForce =
  | "Gtc"
  | "Ioc"
  | "Alo"
  | "FrontendMarket"
  | "LiquidationMarket";
export type HyperliquidGrouping = "na" | "normalTpsl" | "positionTpsl";
export type HyperliquidTriggerType = "tp" | "sl";

// Hyperliquid account abstraction modes (API naming).
export type HyperliquidAbstraction =
  | "unifiedAccount"
  | "portfolioMargin"
  | "disabled";

// Product-facing naming.
export type HyperliquidAccountMode = "standard" | "unified" | "portfolio";

export function resolveHyperliquidAbstractionFromMode(
  mode: HyperliquidAccountMode
): HyperliquidAbstraction {
  switch (mode) {
    case "standard":
      return "disabled";
    case "unified":
      return "unifiedAccount";
    case "portfolio":
      return "portfolioMargin";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export const DEFAULT_HYPERLIQUID_MARKET_SLIPPAGE_BPS = 30;

function formatRoundedDecimal(value: number, decimals: number): string {
  const precision = Math.max(0, Math.min(12, Math.floor(decimals)));
  const factor = 10 ** precision;
  const rounded = Math.round(value * factor) / factor;
  if (!Number.isFinite(rounded) || rounded <= 0) {
    throw new Error("Price must be positive.");
  }
  const fixed = rounded.toFixed(precision);
  return fixed.replace(/\.?0+$/, "");
}

export function computeHyperliquidMarketIocLimitPrice(params: {
  markPrice: number;
  side: "buy" | "sell";
  slippageBps?: number;
  decimals?: number;
}): string {
  const bps = params.slippageBps ?? DEFAULT_HYPERLIQUID_MARKET_SLIPPAGE_BPS;
  const decimals = params.decimals ?? 6;
  if (!Number.isFinite(params.markPrice) || params.markPrice <= 0) {
    throw new Error("markPrice must be a positive number.");
  }
  if (!Number.isFinite(bps) || bps < 0) {
    throw new Error("slippageBps must be a non-negative number.");
  }
  const slippage = bps / 10_000;
  const multiplier = params.side === "buy" ? 1 + slippage : 1 - slippage;
  const price = params.markPrice * multiplier;
  return formatRoundedDecimal(price, decimals);
}

export interface HyperliquidTriggerOptions {
  triggerPx: string | number | bigint;
  isMarket?: boolean;
  tpsl: HyperliquidTriggerType;
}

export interface HyperliquidBuilderFee {
  address: `0x${string}`;
  /**
   * Fee in tenths of basis points (10 = 1bp = 0.01%). Max defaults to 0.1% (100).
   */
  fee: number;
}

export interface HyperliquidOrderIntent {
  symbol: string;
  side: "buy" | "sell";
  price: string | number | bigint;
  size: string | number | bigint;
  tif?: HyperliquidTimeInForce;
  reduceOnly?: boolean;
  clientId?: `0x${string}`;
  trigger?: HyperliquidTriggerOptions;
}

type MetaResponse = {
  universe: Array<{
    name: string;
  }>;
};

type SpotUniverseItem = {
  tokens?: number[];
  name?: string;
  index?: number;
  baseToken?: number;
  quoteToken?: number;
  isCanonical?: boolean;
};

type SpotToken = {
  name?: string;
  index?: number;
  szDecimals?: number;
  isCanonical?: boolean;
};

type SpotMetaResponse = {
  universe?: SpotUniverseItem[];
  tokens?: SpotToken[];
};

type PerpDexsResponse = Array<{ name: string } | null>;

export type ExchangeOrderAction = {
  type: "order";
  orders: Array<{
    a: number;
    b: boolean;
    p: string;
    s: string;
    r: boolean;
    t:
      | { limit: { tif: HyperliquidTimeInForce } }
      | {
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

export type ExchangeSignature = {
  r: `0x${string}`;
  s: `0x${string}`;
  v: 27 | 28;
};

export type HyperliquidUserPortfolioMarginAction = {
  type: "userPortfolioMargin";
  enabled: boolean;
  hyperliquidChain: string;
  signatureChainId: string;
  user: `0x${string}`;
  nonce: number;
};

export type HyperliquidUserDexAbstractionAction = {
  type: "userDexAbstraction";
  enabled: boolean;
  hyperliquidChain: string;
  signatureChainId: string;
  user: `0x${string}`;
  nonce: number;
};

export type HyperliquidUserSetAbstractionAction = {
  type: "userSetAbstraction";
  abstraction: HyperliquidAbstraction;
  hyperliquidChain: string;
  signatureChainId: string;
  user: `0x${string}`;
  nonce: number;
};

export type HyperliquidExchangeResponse<T = unknown> = {
  status: string;
  response?: {
    type: string;
    data?: T;
  };
  error?: string;
};

export type NonceSource = () => number;

export class HyperliquidApiError extends Error {
  constructor(message: string, public readonly response: unknown) {
    super(message);
    this.name = "HyperliquidApiError";
  }
}

export class HyperliquidGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HyperliquidGuardError";
  }
}

export class HyperliquidTermsError extends HyperliquidGuardError {
  constructor(
    message = "Hyperliquid terms must be accepted before proceeding."
  ) {
    super(message);
    this.name = "HyperliquidTermsError";
  }
}

export class HyperliquidBuilderApprovalError extends HyperliquidGuardError {
  constructor(
    message = "Hyperliquid builder approval is required before using builder codes."
  ) {
    super(message);
    this.name = "HyperliquidBuilderApprovalError";
  }
}

export function createMonotonicNonceFactory(
  start: number = Date.now()
): NonceSource {
  let last = start;
  return () => {
    const now = Date.now();
    if (now > last) {
      last = now;
    } else {
      last += 1;
    }
    return last;
  };
}

export async function getUniverse(args: {
  baseUrl: string;
  environment: HyperliquidEnvironment;
  fetcher: typeof fetch;
  dex?: string;
}): Promise<MetaResponse["universe"]> {
  const dexKey = args.dex ? args.dex.trim().toLowerCase() : "";
  const cacheKey = `${args.environment}:${args.baseUrl}:${dexKey}`;
  const cached = metaCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.universe;
  }

  const response = await args.fetcher(`${args.baseUrl}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(
      dexKey ? { type: "meta", dex: dexKey } : { type: "meta" }
    ),
  });

  const json = (await response.json().catch(() => null)) as MetaResponse | null;
  if (!response.ok || !json?.universe) {
    throw new HyperliquidApiError(
      "Unable to load Hyperliquid metadata.",
      json ?? { status: response.status }
    );
  }

  metaCache.set(cacheKey, { fetchedAt: Date.now(), universe: json.universe });
  return json.universe;
}

async function getSpotMeta(args: {
  baseUrl: string;
  environment: HyperliquidEnvironment;
  fetcher: typeof fetch;
}): Promise<{ universe: SpotUniverseItem[]; tokens: SpotToken[] }> {
  const cacheKey = `${args.environment}:${args.baseUrl}`;
  const cached = spotMetaCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { universe: cached.universe, tokens: cached.tokens };
  }

  const response = await args.fetcher(`${args.baseUrl}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "spotMeta" }),
  });

  const json = (await response.json().catch(() => null)) as
    | SpotMetaResponse
    | null;
  if (!response.ok || !json?.universe) {
    throw new HyperliquidApiError(
      "Unable to load Hyperliquid spot metadata.",
      json ?? { status: response.status }
    );
  }

  const universe = json.universe ?? [];
  const tokens = json.tokens ?? [];
  spotMetaCache.set(cacheKey, { fetchedAt: Date.now(), universe, tokens });
  return { universe, tokens };
}

export function resolveAssetIndex(
  symbol: string,
  universe: MetaResponse["universe"]
): number {
  const [raw] = symbol.split("-");
  const target = raw.trim();
  const index = universe.findIndex(
    (entry) => entry.name.toUpperCase() === target.toUpperCase()
  );
  if (index === -1) {
    throw new Error(`Unknown Hyperliquid asset symbol: ${symbol}`);
  }
  return index;
}

async function getPerpDexs(args: {
  baseUrl: string;
  environment: HyperliquidEnvironment;
  fetcher: typeof fetch;
}): Promise<PerpDexsResponse> {
  const cacheKey = `${args.environment}:${args.baseUrl}`;
  const cached = perpDexsCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.dexs;
  }

  const response = await args.fetcher(`${args.baseUrl}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "perpDexs" }),
  });
  const json = (await response.json().catch(() => null)) as
    | PerpDexsResponse
    | null;
  if (!response.ok || !Array.isArray(json)) {
    throw new HyperliquidApiError(
      "Unable to load Hyperliquid perp dex metadata.",
      json ?? { status: response.status }
    );
  }

  perpDexsCache.set(cacheKey, { fetchedAt: Date.now(), dexs: json });
  return json;
}

async function resolveDexIndex(args: {
  baseUrl: string;
  environment: HyperliquidEnvironment;
  fetcher: typeof fetch;
  dex: string;
}): Promise<number> {
  const dexs = await getPerpDexs(args);
  const target = args.dex.trim().toLowerCase();
  const index = dexs.findIndex(
    (entry) => entry?.name?.toLowerCase() === target
  );
  if (index === -1) {
    throw new Error(`Unknown Hyperliquid perp dex: ${args.dex}`);
  }
  return index;
}

function buildSpotTokenIndexMap(tokens: SpotToken[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const token of tokens) {
    const name = normalizeSpotTokenName(token?.name);
    const index =
      typeof token?.index === "number" && Number.isFinite(token.index)
        ? token.index
        : null;
    if (!name || index == null) continue;
    if (!map.has(name) || token?.isCanonical) {
      map.set(name, index);
    }
  }
  return map;
}

function resolveSpotTokenIndex(
  tokenMap: Map<string, number>,
  value: string
): number | null {
  const normalized = normalizeSpotTokenName(value);
  if (!normalized) return null;
  const direct = tokenMap.get(normalized);
  if (direct != null) return direct;
  if (!normalized.startsWith("U")) {
    const prefixed = tokenMap.get(`U${normalized}`);
    if (prefixed != null) return prefixed;
  }
  return null;
}

function resolveSpotMarketIndex(args: {
  universe: SpotUniverseItem[];
  baseToken: number;
  quoteToken: number;
}): number | null {
  for (let i = 0; i < args.universe.length; i += 1) {
    const entry = args.universe[i];
    const tokens = Array.isArray(entry?.tokens) ? entry.tokens : null;
    const baseToken = tokens?.[0] ?? entry?.baseToken ?? null;
    const quoteToken = tokens?.[1] ?? entry?.quoteToken ?? null;
    if (baseToken === args.baseToken && quoteToken === args.quoteToken) {
      if (typeof entry?.index === "number" && Number.isFinite(entry.index)) {
        return entry.index;
      }
      return i;
    }
  }
  return null;
}

export async function resolveHyperliquidAssetIndex(args: {
  symbol: string;
  baseUrl: string;
  environment: HyperliquidEnvironment;
  fetcher: typeof fetch;
}): Promise<number> {
  const trimmed = args.symbol.trim();
  if (!trimmed) {
    throw new Error("Hyperliquid symbol must be a non-empty string.");
  }

  if (trimmed.startsWith("@")) {
    const rawIndex = trimmed.slice(1).trim();
    const index = Number(rawIndex);
    if (!Number.isFinite(index)) {
      throw new Error(`Hyperliquid spot market index is invalid: ${trimmed}`);
    }
    return 10000 + index;
  }

  const separator = trimmed.indexOf(":");
  if (separator > 0) {
    const dex = trimmed.slice(0, separator).trim();
    if (!dex) {
      throw new Error("Hyperliquid dex name is required.");
    }
    const dexIndex = await resolveDexIndex({
      baseUrl: args.baseUrl,
      environment: args.environment,
      fetcher: args.fetcher,
      dex,
    });
    const universe = await getUniverse({
      baseUrl: args.baseUrl,
      environment: args.environment,
      fetcher: args.fetcher,
      dex,
    });
    const assetIndex = universe.findIndex(
      (entry) => entry.name.toUpperCase() === trimmed.toUpperCase()
    );
    if (assetIndex === -1) {
      throw new Error(`Unknown Hyperliquid asset symbol: ${trimmed}`);
    }
    return 100000 + dexIndex * 10000 + assetIndex;
  }

  const pair = parseHyperliquidPair(trimmed);
  if (pair) {
    const { universe, tokens } = await getSpotMeta({
      baseUrl: args.baseUrl,
      environment: args.environment,
      fetcher: args.fetcher,
    });
    const tokenMap = buildSpotTokenIndexMap(tokens);
    const baseToken = resolveSpotTokenIndex(tokenMap, pair.base);
    const quoteToken = resolveSpotTokenIndex(tokenMap, pair.quote);
    if (baseToken == null || quoteToken == null) {
      throw new Error(`Unknown Hyperliquid spot symbol: ${trimmed}`);
    }
    const marketIndex = resolveSpotMarketIndex({
      universe,
      baseToken,
      quoteToken,
    });
    if (marketIndex == null) {
      throw new Error(`Unknown Hyperliquid spot symbol: ${trimmed}`);
    }
    return 10000 + marketIndex;
  }

  const universe = await getUniverse({
    baseUrl: args.baseUrl,
    environment: args.environment,
    fetcher: args.fetcher,
  });
  return resolveAssetIndex(trimmed, universe);
}

export function toApiDecimal(value: string | number | bigint): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (!Number.isFinite(value)) {
    throw new Error("Numeric values must be finite.");
  }

  const asString = value.toString();
  if (/e/i.test(asString)) {
    const [mantissa, exponentPart] = asString.split(/e/i);
    const exponent = Number(exponentPart);
    const [integerPart, fractionalPart = ""] = mantissa.split(".");
    if (exponent >= 0) {
      return (
        integerPart +
        fractionalPart.padEnd(exponent + fractionalPart.length, "0")
      );
    }
    const zeros = "0".repeat(Math.abs(exponent) - 1);
    return `0.${zeros}${integerPart}${fractionalPart}`.replace(/\.0+$/, "");
  }

  return asString;
}

const NORMALIZED_HEX_PATTERN = /^0x[0-9a-f]+$/;
const ADDRESS_HEX_LENGTH = 42;
const CLOID_HEX_LENGTH = 34;

export function normalizeHex(value: `0x${string}`): `0x${string}` {
  const lower = value.trim().toLowerCase() as `0x${string}`;
  if (!NORMALIZED_HEX_PATTERN.test(lower)) {
    throw new Error(`Invalid hex value: ${value}`);
  }
  return lower;
}

export function normalizeAddress(value: `0x${string}`): `0x${string}` {
  const normalized = normalizeHex(value);
  if (normalized.length !== ADDRESS_HEX_LENGTH) {
    throw new Error(`Invalid address length: ${normalized}`);
  }
  return normalized;
}

export function normalizeCloid(value: `0x${string}`): `0x${string}` {
  const normalized = normalizeHex(value);
  if (normalized.length !== CLOID_HEX_LENGTH) {
    throw new Error(`Invalid cloid length: ${normalized}`);
  }
  return normalized;
}

export async function signL1Action(args: {
  wallet: WalletFullContext;
  action: ExchangeOrderAction | Record<string, unknown>;
  nonce: number;
  vaultAddress?: `0x${string}` | undefined;
  expiresAfter?: number | undefined;
  isTestnet: boolean;
}): Promise<ExchangeSignature> {
  const { wallet, action, nonce, vaultAddress, expiresAfter, isTestnet } = args;

  const actionHash = createL1ActionHash({
    action,
    nonce,
    vaultAddress,
    expiresAfter,
  });
  const message = {
    source: isTestnet ? "b" : "a",
    connectionId: actionHash,
  } as const;

  const signatureHex = await wallet.walletClient.signTypedData({
    account: wallet.account,
    domain: EXCHANGE_TYPED_DATA_DOMAIN,
    types: {
      Agent: [
        { name: "source", type: "string" },
        { name: "connectionId", type: "bytes32" },
      ],
    },
    primaryType: "Agent",
    message,
  });

  return splitSignature(signatureHex);
}

export async function signSpotSend(args: {
  wallet: WalletFullContext;
  hyperliquidChain: string;
  signatureChainId: string;
  destination: `0x${string}`;
  token: string;
  amount: string;
  time: bigint;
}): Promise<ExchangeSignature> {
  const {
    wallet,
    hyperliquidChain,
    signatureChainId,
    destination,
    token,
    amount,
    time,
  } = args;
  const domain = {
    name: "HyperliquidSignTransaction",
    version: "1",
    chainId: Number.parseInt(signatureChainId, 16),
    verifyingContract: ZERO_ADDRESS,
  } as const;

  const message = {
    hyperliquidChain,
    destination,
    token,
    amount,
    time,
  };

  const types = {
    "HyperliquidTransaction:SpotSend": [
      { name: "hyperliquidChain", type: "string" },
      { name: "destination", type: "string" },
      { name: "token", type: "string" },
      { name: "amount", type: "string" },
      { name: "time", type: "uint64" },
    ],
  } as const;

  const signatureHex = await wallet.walletClient.signTypedData({
    account: wallet.account,
    domain,
    types,
    primaryType: "HyperliquidTransaction:SpotSend",
    message,
  });

  return splitSignature(signatureHex);
}

export async function signApproveBuilderFee(args: {
  wallet: WalletFullContext;
  maxFeeRate: string;
  nonce: bigint;
  signatureChainId: string;
  isTestnet: boolean;
}): Promise<ExchangeSignature> {
  const { wallet, maxFeeRate, nonce, signatureChainId, isTestnet } = args;

  const hyperliquidChain = isTestnet ? "Testnet" : "Mainnet";
  const domain = {
    name: "HyperliquidSignTransaction",
    version: "1",
    chainId: Number.parseInt(signatureChainId, 16),
    verifyingContract: ZERO_ADDRESS,
  } as const;

  const message = {
    hyperliquidChain,
    maxFeeRate,
    builder: BUILDER_CODE.address,
    nonce,
  };

  const types = {
    "HyperliquidTransaction:ApproveBuilderFee": [
      { name: "hyperliquidChain", type: "string" },
      { name: "maxFeeRate", type: "string" },
      { name: "builder", type: "address" },
      { name: "nonce", type: "uint64" },
    ],
  } as const;

  const signatureHex = await wallet.walletClient.signTypedData({
    account: wallet.account,
    domain,
    types,
    primaryType: "HyperliquidTransaction:ApproveBuilderFee",
    message,
  });

  return splitSignature(signatureHex);
}

export async function signUserPortfolioMargin(args: {
  wallet: WalletFullContext;
  action: HyperliquidUserPortfolioMarginAction;
}): Promise<ExchangeSignature> {
  const { wallet, action } = args;
  const domain = {
    name: "HyperliquidSignTransaction",
    version: "1",
    chainId: Number.parseInt(action.signatureChainId, 16),
    verifyingContract: ZERO_ADDRESS,
  } as const;

  const message = {
    enabled: action.enabled,
    hyperliquidChain: action.hyperliquidChain,
    user: action.user,
    nonce: BigInt(action.nonce),
  };

  const types = {
    "HyperliquidTransaction:UserPortfolioMargin": [
      { name: "enabled", type: "bool" },
      { name: "hyperliquidChain", type: "string" },
      { name: "user", type: "address" },
      { name: "nonce", type: "uint64" },
    ],
  } as const;

  const signatureHex = await wallet.walletClient.signTypedData({
    account: wallet.account,
    domain,
    types,
    primaryType: "HyperliquidTransaction:UserPortfolioMargin",
    message,
  });

  return splitSignature(signatureHex);
}

export async function signUserDexAbstraction(args: {
  wallet: WalletFullContext;
  action: HyperliquidUserDexAbstractionAction;
}): Promise<ExchangeSignature> {
  const { wallet, action } = args;
  const domain = {
    name: "HyperliquidSignTransaction",
    version: "1",
    chainId: Number.parseInt(action.signatureChainId, 16),
    verifyingContract: ZERO_ADDRESS,
  } as const;

  const message = {
    hyperliquidChain: action.hyperliquidChain,
    user: action.user,
    enabled: action.enabled,
    nonce: BigInt(action.nonce),
  };

  const types = {
    "HyperliquidTransaction:UserDexAbstraction": [
      { name: "hyperliquidChain", type: "string" },
      { name: "user", type: "address" },
      { name: "enabled", type: "bool" },
      { name: "nonce", type: "uint64" },
    ],
  } as const;

  const signatureHex = await wallet.walletClient.signTypedData({
    account: wallet.account,
    domain,
    types,
    primaryType: "HyperliquidTransaction:UserDexAbstraction",
    message,
  });

  return splitSignature(signatureHex);
}

export async function signUserSetAbstraction(args: {
  wallet: WalletFullContext;
  action: HyperliquidUserSetAbstractionAction;
}): Promise<ExchangeSignature> {
  const { wallet, action } = args;
  const domain = {
    name: "HyperliquidSignTransaction",
    version: "1",
    chainId: Number.parseInt(action.signatureChainId, 16),
    verifyingContract: ZERO_ADDRESS,
  } as const;

  const message = {
    hyperliquidChain: action.hyperliquidChain,
    user: action.user,
    abstraction: action.abstraction,
    nonce: BigInt(action.nonce),
  };

  const types = {
    "HyperliquidTransaction:UserSetAbstraction": [
      { name: "hyperliquidChain", type: "string" },
      { name: "user", type: "address" },
      { name: "abstraction", type: "string" },
      { name: "nonce", type: "uint64" },
    ],
  } as const;

  const signatureHex = await wallet.walletClient.signTypedData({
    account: wallet.account,
    domain,
    types,
    primaryType: "HyperliquidTransaction:UserSetAbstraction",
    message,
  });

  return splitSignature(signatureHex);
}

export function splitSignature(signature: `0x${string}`): ExchangeSignature {
  const cleaned = signature.slice(2);
  const rHex = `0x${cleaned.slice(0, 64)}` as `0x${string}`;
  const sHex = `0x${cleaned.slice(64, 128)}` as `0x${string}`;
  let v = parseInt(cleaned.slice(128, 130), 16);
  if (Number.isNaN(v)) {
    throw new Error("Invalid signature returned by wallet client.");
  }
  if (v < 27) {
    v += 27;
  }
  const normalizedV = (v === 27 || v === 28 ? v : v % 2 ? 27 : 28) as 27 | 28;
  return {
    r: normalizeHex(rHex),
    s: normalizeHex(sHex),
    v: normalizedV,
  };
}

export function createL1ActionHash(args: {
  action: ExchangeOrderAction | Record<string, unknown>;
  nonce: number;
  vaultAddress?: `0x${string}` | undefined;
  expiresAfter?: number | undefined;
}): `0x${string}` {
  const { action, nonce, vaultAddress, expiresAfter } = args;

  const actionBytes = encodeMsgpack(action, { ignoreUndefined: true });
  const nonceBytes = toUint64Bytes(nonce);

  const vaultMarker = vaultAddress ? new Uint8Array([1]) : new Uint8Array([0]);
  const vaultBytes = vaultAddress
    ? hexToBytes(vaultAddress.slice(2))
    : new Uint8Array();

  const hasExpiresAfter = typeof expiresAfter === "number";
  const expiresMarker = hasExpiresAfter
    ? new Uint8Array([0])
    : new Uint8Array();
  const expiresBytes =
    hasExpiresAfter && expiresAfter !== undefined
      ? toUint64Bytes(expiresAfter)
      : new Uint8Array();

  const bytes = concatBytes(
    actionBytes,
    nonceBytes,
    vaultMarker,
    vaultBytes,
    expiresMarker,
    expiresBytes
  );
  const hash = keccak_256(bytes);
  return `0x${bytesToHex(hash)}`;
}

export function toUint64Bytes(value: number): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(value));
  return bytes;
}

export function getBridgeAddress(env: HyperliquidEnvironment): `0x${string}` {
  const override = process.env.HYPERLIQUID_BRIDGE_ADDRESS;
  if (override?.trim()) {
    return normalizeAddress(override as `0x${string}`);
  }
  return HL_BRIDGE_ADDRESSES[env];
}

export function getUsdcAddress(env: HyperliquidEnvironment): `0x${string}` {
  const override = process.env.HYPERLIQUID_USDC_ADDRESS;
  if (override?.trim()) {
    return normalizeAddress(override as `0x${string}`);
  }
  return HL_USDC_ADDRESSES[env];
}

export function getSignatureChainId(env: HyperliquidEnvironment): string {
  const override = process.env.HYPERLIQUID_SIGNATURE_CHAIN_ID;
  const selected = override?.trim() || HL_SIGNATURE_CHAIN_ID[env];
  return normalizeHex(selected as `0x${string}`);
}

export function getBaseUrl(environment: HyperliquidEnvironment): string {
  return API_BASES[environment];
}

export function assertPositiveNumber(
  value: number,
  label: string
): asserts value is number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
}

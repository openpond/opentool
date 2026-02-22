import { parseUnits, encodeFunctionData, erc20Abi } from 'viem';
import { encode } from '@msgpack/msgpack';
import { keccak_256 } from '@noble/hashes/sha3';
import { hexToBytes, concatBytes, bytesToHex } from '@noble/hashes/utils';

// src/adapters/hyperliquid/index.ts

// src/store/index.ts
var STORE_EVENT_LEVELS = [
  "decision",
  "execution",
  "lifecycle"
];
var STORE_EVENT_LEVEL_SET = new Set(STORE_EVENT_LEVELS);
var MARKET_REQUIRED_ACTIONS = [
  "swap",
  "bridge",
  "order",
  "trade",
  "lend",
  "borrow",
  "repay",
  "stake",
  "unstake",
  "withdraw",
  "provide_liquidity",
  "remove_liquidity",
  "claim"
];
var MARKET_REQUIRED_ACTIONS_SET = new Set(MARKET_REQUIRED_ACTIONS);
var EXECUTION_ACTIONS_SET = new Set(MARKET_REQUIRED_ACTIONS);
var StoreError = class extends Error {
  constructor(message, status, causeData) {
    super(message);
    this.status = status;
    this.causeData = causeData;
    this.name = "StoreError";
  }
};
var normalizeAction = (action) => {
  const normalized = action?.trim().toLowerCase();
  return normalized ? normalized : null;
};
var coerceEventLevel = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized || !STORE_EVENT_LEVEL_SET.has(normalized)) return null;
  return normalized;
};
var requiresMarketIdentity = (input) => {
  const action = normalizeAction(input.action);
  if (!action) return false;
  return MARKET_REQUIRED_ACTIONS_SET.has(action);
};
var hasMarketIdentity = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value;
  const requiredKeys = ["market_type", "venue", "environment", "canonical_symbol"];
  return requiredKeys.every((key) => {
    const field = record[key];
    return typeof field === "string" && field.trim().length > 0;
  });
};
var resolveEventLevel = (input) => {
  const direct = coerceEventLevel(input.eventLevel);
  if (direct) return direct;
  const metadataLevel = coerceEventLevel(input.metadata?.eventLevel);
  if (metadataLevel) return metadataLevel;
  const action = normalizeAction(input.action);
  if (action && EXECUTION_ACTIONS_SET.has(action) && (input.metadata?.lifecycle === true || typeof input.metadata?.executionRef === "string" || typeof input.metadata?.parentExecutionRef === "string")) {
    return "lifecycle";
  }
  if (action && EXECUTION_ACTIONS_SET.has(action) || hasMarketIdentity(input.market)) {
    return "execution";
  }
  if (action) return "decision";
  return null;
};
var normalizeStoreInput = (input) => {
  const metadata = { ...input.metadata ?? {} };
  const eventLevel = resolveEventLevel({ ...input, metadata });
  if (eventLevel) {
    metadata.eventLevel = eventLevel;
  }
  const hasMetadata = Object.keys(metadata).length > 0;
  return {
    ...input,
    ...eventLevel ? { eventLevel } : {},
    ...hasMetadata ? { metadata } : {}
  };
};
function resolveConfig(options) {
  const baseUrl = options?.baseUrl ?? process.env.BASE_URL ?? "https://api.openpond.ai";
  const apiKey = options?.apiKey ?? process.env.OPENPOND_API_KEY;
  if (!baseUrl) {
    throw new StoreError("BASE_URL is required to store activity events");
  }
  if (!apiKey) {
    throw new StoreError(
      "OPENPOND_API_KEY is required to store activity events"
    );
  }
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const fetchFn = options?.fetchFn ?? globalThis.fetch;
  if (!fetchFn) {
    throw new StoreError("Fetch is not available in this environment");
  }
  return { baseUrl: normalizedBaseUrl, apiKey, fetchFn };
}
async function store(input, options) {
  const normalizedInput = normalizeStoreInput(input);
  const eventLevel = normalizedInput.eventLevel;
  const normalizedAction = normalizeAction(normalizedInput.action);
  if (eventLevel === "execution" || eventLevel === "lifecycle") {
    if (!normalizedAction || !EXECUTION_ACTIONS_SET.has(normalizedAction)) {
      throw new StoreError(
        `eventLevel "${eventLevel}" requires an execution action`
      );
    }
  }
  if (eventLevel === "execution" && !hasMarketIdentity(normalizedInput.market)) {
    throw new StoreError(
      `market is required for execution events. market must include market_type, venue, environment, canonical_symbol`
    );
  }
  const shouldApplyLegacyMarketRule = eventLevel == null || eventLevel === "execution";
  if (shouldApplyLegacyMarketRule && requiresMarketIdentity(normalizedInput) && !hasMarketIdentity(normalizedInput.market)) {
    throw new StoreError(
      `market is required for action "${normalizedInput.action}". market must include market_type, venue, environment, canonical_symbol`
    );
  }
  const { baseUrl, apiKey, fetchFn } = resolveConfig(options);
  const url = `${baseUrl}/apps/positions/tx`;
  let response;
  try {
    response = await fetchFn(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "openpond-api-key": apiKey
      },
      body: JSON.stringify(normalizedInput)
    });
  } catch (error) {
    throw new StoreError("Failed to reach store endpoint", void 0, error);
  }
  if (!response.ok) {
    let body;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => void 0);
    }
    throw new StoreError(
      `Store request failed with status ${response.status}`,
      response.status,
      body
    );
  }
  try {
    const data = await response.json();
    return {
      id: data.id ?? "",
      status: data.status ?? null
    };
  } catch {
    return { id: "", status: null };
  }
}
var CACHE_TTL_MS = 5 * 60 * 1e3;
var API_BASES = {
  mainnet: "https://api.hyperliquid.xyz",
  testnet: "https://api.hyperliquid-testnet.xyz"
};
var HL_ENDPOINT = {
  mainnet: "https://api.hyperliquid.xyz",
  testnet: "https://api.hyperliquid-testnet.xyz"
};
var HL_CHAIN_LABEL = {
  mainnet: "Mainnet",
  testnet: "Testnet"
};
var HL_BRIDGE_ADDRESSES = {
  mainnet: "0x2df1c51e09aecf9cacb7bc98cb1742757f163df7",
  testnet: "0x08cfc1b6b2dcf36a1480b99353a354aa8ac56f89"
};
var HL_USDC_ADDRESSES = {
  mainnet: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
  testnet: "0x1baAbB04529D43a73232B713C0FE471f7c7334d5"
};
var HL_SIGNATURE_CHAIN_ID = {
  mainnet: "0xa4b1",
  testnet: "0x66eee"
};
var EXCHANGE_TYPED_DATA_DOMAIN = {
  name: "Exchange",
  version: "1",
  chainId: 1337,
  verifyingContract: "0x0000000000000000000000000000000000000000"
};
var ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
var MIN_DEPOSIT_USDC = 5;
var BUILDER_CODE = {
  address: "0x4b2aec4F91612849d6e20C9c1881FabB1A48cd12",
  fee: 100
};
var metaCache = /* @__PURE__ */ new Map();
var spotMetaCache = /* @__PURE__ */ new Map();
var perpDexsCache = /* @__PURE__ */ new Map();
var UNKNOWN_SYMBOL = "UNKNOWN";
var extractDexPrefix = (value) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.includes(":")) return null;
  if (trimmed.startsWith("@")) return null;
  const [prefix] = trimmed.split(":");
  const dex = prefix?.trim().toLowerCase() ?? "";
  return dex || null;
};
var normalizeHyperliquidBase = (value) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutDex = trimmed.includes(":") ? trimmed.split(":").slice(1).join(":") : trimmed;
  const base = withoutDex.split("-")[0] ?? withoutDex;
  const normalized = (base.split("/")[0] ?? base).trim().toUpperCase();
  if (!normalized || normalized === UNKNOWN_SYMBOL) return null;
  return normalized;
};
var normalizeSpotTokenName = (value) => {
  const raw = (value ?? "").trim().toUpperCase();
  if (!raw) return "";
  if (raw.endsWith("0") && raw.length > 1) {
    return raw.slice(0, -1);
  }
  return raw;
};
var parseHyperliquidPair = (value) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutDex = trimmed.includes(":") ? trimmed.split(":").slice(1).join(":") : trimmed;
  const separator = withoutDex.includes("/") ? "/" : withoutDex.includes("-") ? "-" : null;
  if (!separator) return null;
  const [baseRaw, ...rest] = withoutDex.split(separator);
  const quoteRaw = rest.join(separator);
  if (!baseRaw || !quoteRaw) return null;
  const base = baseRaw.trim().toUpperCase();
  const quote = quoteRaw.trim().toUpperCase();
  if (!base || !quote) return null;
  return { base, quote };
};
function buildHyperliquidMarketIdentity(input) {
  const rawSymbol = input.rawSymbol ?? input.symbol;
  const dex = extractDexPrefix(rawSymbol);
  const pair = parseHyperliquidPair(rawSymbol) ?? parseHyperliquidPair(input.symbol);
  const isSpot = input.isSpot ?? (Boolean(pair) || rawSymbol.startsWith("@") || input.symbol.includes("/"));
  const base = (input.base ? input.base.trim().toUpperCase() : null) ?? pair?.base ?? normalizeHyperliquidBase(input.symbol) ?? normalizeHyperliquidBase(rawSymbol);
  if (!base) return null;
  if (isSpot) {
    const quote = (input.quote ? input.quote.trim().toUpperCase() : null) ?? pair?.quote ?? null;
    if (!quote) return null;
    return {
      market_type: "spot",
      venue: "hyperliquid",
      environment: input.environment,
      base,
      quote,
      dex,
      raw_symbol: rawSymbol ?? null,
      canonical_symbol: `spot:hyperliquid:${base}-${quote}`
    };
  }
  return {
    market_type: "perp",
    venue: "hyperliquid",
    environment: input.environment,
    base,
    dex,
    raw_symbol: rawSymbol ?? null,
    canonical_symbol: `perp:hyperliquid:${base}`
  };
}
function resolveHyperliquidAbstractionFromMode(mode) {
  switch (mode) {
    case "standard":
      return "disabled";
    case "unified":
      return "unifiedAccount";
    case "portfolio":
      return "portfolioMargin";
    default: {
      const _exhaustive = mode;
      return _exhaustive;
    }
  }
}
var DEFAULT_HYPERLIQUID_MARKET_SLIPPAGE_BPS = 30;
function formatRoundedDecimal(value, decimals) {
  const precision = Math.max(0, Math.min(12, Math.floor(decimals)));
  const factor = 10 ** precision;
  const rounded = Math.round(value * factor) / factor;
  if (!Number.isFinite(rounded) || rounded <= 0) {
    throw new Error("Price must be positive.");
  }
  const fixed = rounded.toFixed(precision);
  return fixed.replace(/\.?0+$/, "");
}
function computeHyperliquidMarketIocLimitPrice(params) {
  const bps = params.slippageBps ?? DEFAULT_HYPERLIQUID_MARKET_SLIPPAGE_BPS;
  const decimals = params.decimals ?? 6;
  if (!Number.isFinite(params.markPrice) || params.markPrice <= 0) {
    throw new Error("markPrice must be a positive number.");
  }
  if (!Number.isFinite(bps) || bps < 0) {
    throw new Error("slippageBps must be a non-negative number.");
  }
  const slippage = bps / 1e4;
  const multiplier = params.side === "buy" ? 1 + slippage : 1 - slippage;
  const price = params.markPrice * multiplier;
  return formatRoundedDecimal(price, decimals);
}
var HyperliquidApiError = class extends Error {
  constructor(message, response) {
    super(message);
    this.response = response;
    this.name = "HyperliquidApiError";
  }
};
var HyperliquidGuardError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "HyperliquidGuardError";
  }
};
var HyperliquidTermsError = class extends HyperliquidGuardError {
  constructor(message = "Hyperliquid terms must be accepted before proceeding.") {
    super(message);
    this.name = "HyperliquidTermsError";
  }
};
var HyperliquidBuilderApprovalError = class extends HyperliquidGuardError {
  constructor(message = "Hyperliquid builder approval is required before using builder codes.") {
    super(message);
    this.name = "HyperliquidBuilderApprovalError";
  }
};
function createMonotonicNonceFactory(start = Date.now()) {
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
async function getUniverse(args) {
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
    )
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.universe) {
    throw new HyperliquidApiError(
      "Unable to load Hyperliquid metadata.",
      json ?? { status: response.status }
    );
  }
  metaCache.set(cacheKey, { fetchedAt: Date.now(), universe: json.universe });
  return json.universe;
}
async function getSpotMeta(args) {
  const cacheKey = `${args.environment}:${args.baseUrl}`;
  const cached = spotMetaCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { universe: cached.universe, tokens: cached.tokens };
  }
  const response = await args.fetcher(`${args.baseUrl}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "spotMeta" })
  });
  const json = await response.json().catch(() => null);
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
function resolveAssetIndex(symbol, universe) {
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
async function getPerpDexs(args) {
  const cacheKey = `${args.environment}:${args.baseUrl}`;
  const cached = perpDexsCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.dexs;
  }
  const response = await args.fetcher(`${args.baseUrl}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "perpDexs" })
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(json)) {
    throw new HyperliquidApiError(
      "Unable to load Hyperliquid perp dex metadata.",
      json ?? { status: response.status }
    );
  }
  perpDexsCache.set(cacheKey, { fetchedAt: Date.now(), dexs: json });
  return json;
}
async function resolveDexIndex(args) {
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
function buildSpotTokenIndexMap(tokens) {
  const map = /* @__PURE__ */ new Map();
  for (const token of tokens) {
    const name = normalizeSpotTokenName(token?.name);
    const index = typeof token?.index === "number" && Number.isFinite(token.index) ? token.index : null;
    if (!name || index == null) continue;
    if (!map.has(name) || token?.isCanonical) {
      map.set(name, index);
    }
  }
  return map;
}
function resolveSpotTokenIndex(tokenMap, value) {
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
function resolveSpotMarketIndex(args) {
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
async function resolveHyperliquidAssetIndex(args) {
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
    return 1e4 + index;
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
      dex
    });
    const universe2 = await getUniverse({
      baseUrl: args.baseUrl,
      environment: args.environment,
      fetcher: args.fetcher,
      dex
    });
    const assetIndex = universe2.findIndex(
      (entry) => entry.name.toUpperCase() === trimmed.toUpperCase()
    );
    if (assetIndex === -1) {
      throw new Error(`Unknown Hyperliquid asset symbol: ${trimmed}`);
    }
    return 1e5 + dexIndex * 1e4 + assetIndex;
  }
  const pair = parseHyperliquidPair(trimmed);
  if (pair) {
    const { universe: universe2, tokens } = await getSpotMeta({
      baseUrl: args.baseUrl,
      environment: args.environment,
      fetcher: args.fetcher
    });
    const tokenMap = buildSpotTokenIndexMap(tokens);
    const baseToken = resolveSpotTokenIndex(tokenMap, pair.base);
    const quoteToken = resolveSpotTokenIndex(tokenMap, pair.quote);
    if (baseToken == null || quoteToken == null) {
      throw new Error(`Unknown Hyperliquid spot symbol: ${trimmed}`);
    }
    const marketIndex = resolveSpotMarketIndex({
      universe: universe2,
      baseToken,
      quoteToken
    });
    if (marketIndex == null) {
      throw new Error(`Unknown Hyperliquid spot symbol: ${trimmed}`);
    }
    return 1e4 + marketIndex;
  }
  const universe = await getUniverse({
    baseUrl: args.baseUrl,
    environment: args.environment,
    fetcher: args.fetcher
  });
  return resolveAssetIndex(trimmed, universe);
}
function toApiDecimal(value) {
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
      return integerPart + fractionalPart.padEnd(exponent + fractionalPart.length, "0");
    }
    const zeros = "0".repeat(Math.abs(exponent) - 1);
    return `0.${zeros}${integerPart}${fractionalPart}`.replace(/\.0+$/, "");
  }
  return asString;
}
var NORMALIZED_HEX_PATTERN = /^0x[0-9a-f]+$/;
var ADDRESS_HEX_LENGTH = 42;
var CLOID_HEX_LENGTH = 34;
function normalizeHex(value) {
  const lower = value.trim().toLowerCase();
  if (!NORMALIZED_HEX_PATTERN.test(lower)) {
    throw new Error(`Invalid hex value: ${value}`);
  }
  return lower;
}
function normalizeAddress(value) {
  const normalized = normalizeHex(value);
  if (normalized.length !== ADDRESS_HEX_LENGTH) {
    throw new Error(`Invalid address length: ${normalized}`);
  }
  return normalized;
}
function normalizeCloid(value) {
  const normalized = normalizeHex(value);
  if (normalized.length !== CLOID_HEX_LENGTH) {
    throw new Error(`Invalid cloid length: ${normalized}`);
  }
  return normalized;
}
async function signL1Action(args) {
  const { wallet, action, nonce, vaultAddress, expiresAfter, isTestnet } = args;
  const actionHash = createL1ActionHash({
    action,
    nonce,
    vaultAddress,
    expiresAfter
  });
  const message = {
    source: isTestnet ? "b" : "a",
    connectionId: actionHash
  };
  const signatureHex = await wallet.walletClient.signTypedData({
    account: wallet.account,
    domain: EXCHANGE_TYPED_DATA_DOMAIN,
    types: {
      Agent: [
        { name: "source", type: "string" },
        { name: "connectionId", type: "bytes32" }
      ]
    },
    primaryType: "Agent",
    message
  });
  return splitSignature(signatureHex);
}
async function signSpotSend(args) {
  const {
    wallet,
    hyperliquidChain,
    signatureChainId,
    destination,
    token,
    amount,
    time
  } = args;
  const domain = {
    name: "HyperliquidSignTransaction",
    version: "1",
    chainId: Number.parseInt(signatureChainId, 16),
    verifyingContract: ZERO_ADDRESS
  };
  const message = {
    hyperliquidChain,
    destination,
    token,
    amount,
    time
  };
  const types = {
    "HyperliquidTransaction:SpotSend": [
      { name: "hyperliquidChain", type: "string" },
      { name: "destination", type: "string" },
      { name: "token", type: "string" },
      { name: "amount", type: "string" },
      { name: "time", type: "uint64" }
    ]
  };
  const signatureHex = await wallet.walletClient.signTypedData({
    account: wallet.account,
    domain,
    types,
    primaryType: "HyperliquidTransaction:SpotSend",
    message
  });
  return splitSignature(signatureHex);
}
async function signApproveBuilderFee(args) {
  const { wallet, maxFeeRate, nonce, signatureChainId, isTestnet } = args;
  const hyperliquidChain = isTestnet ? "Testnet" : "Mainnet";
  const domain = {
    name: "HyperliquidSignTransaction",
    version: "1",
    chainId: Number.parseInt(signatureChainId, 16),
    verifyingContract: ZERO_ADDRESS
  };
  const message = {
    hyperliquidChain,
    maxFeeRate,
    builder: BUILDER_CODE.address,
    nonce
  };
  const types = {
    "HyperliquidTransaction:ApproveBuilderFee": [
      { name: "hyperliquidChain", type: "string" },
      { name: "maxFeeRate", type: "string" },
      { name: "builder", type: "address" },
      { name: "nonce", type: "uint64" }
    ]
  };
  const signatureHex = await wallet.walletClient.signTypedData({
    account: wallet.account,
    domain,
    types,
    primaryType: "HyperliquidTransaction:ApproveBuilderFee",
    message
  });
  return splitSignature(signatureHex);
}
async function signUserPortfolioMargin(args) {
  const { wallet, action } = args;
  const domain = {
    name: "HyperliquidSignTransaction",
    version: "1",
    chainId: Number.parseInt(action.signatureChainId, 16),
    verifyingContract: ZERO_ADDRESS
  };
  const message = {
    enabled: action.enabled,
    hyperliquidChain: action.hyperliquidChain,
    user: action.user,
    nonce: BigInt(action.nonce)
  };
  const types = {
    "HyperliquidTransaction:UserPortfolioMargin": [
      { name: "enabled", type: "bool" },
      { name: "hyperliquidChain", type: "string" },
      { name: "user", type: "address" },
      { name: "nonce", type: "uint64" }
    ]
  };
  const signatureHex = await wallet.walletClient.signTypedData({
    account: wallet.account,
    domain,
    types,
    primaryType: "HyperliquidTransaction:UserPortfolioMargin",
    message
  });
  return splitSignature(signatureHex);
}
async function signUserDexAbstraction(args) {
  const { wallet, action } = args;
  const domain = {
    name: "HyperliquidSignTransaction",
    version: "1",
    chainId: Number.parseInt(action.signatureChainId, 16),
    verifyingContract: ZERO_ADDRESS
  };
  const message = {
    hyperliquidChain: action.hyperliquidChain,
    user: action.user,
    enabled: action.enabled,
    nonce: BigInt(action.nonce)
  };
  const types = {
    "HyperliquidTransaction:UserDexAbstraction": [
      { name: "hyperliquidChain", type: "string" },
      { name: "user", type: "address" },
      { name: "enabled", type: "bool" },
      { name: "nonce", type: "uint64" }
    ]
  };
  const signatureHex = await wallet.walletClient.signTypedData({
    account: wallet.account,
    domain,
    types,
    primaryType: "HyperliquidTransaction:UserDexAbstraction",
    message
  });
  return splitSignature(signatureHex);
}
async function signUserSetAbstraction(args) {
  const { wallet, action } = args;
  const domain = {
    name: "HyperliquidSignTransaction",
    version: "1",
    chainId: Number.parseInt(action.signatureChainId, 16),
    verifyingContract: ZERO_ADDRESS
  };
  const message = {
    hyperliquidChain: action.hyperliquidChain,
    user: action.user,
    abstraction: action.abstraction,
    nonce: BigInt(action.nonce)
  };
  const types = {
    "HyperliquidTransaction:UserSetAbstraction": [
      { name: "hyperliquidChain", type: "string" },
      { name: "user", type: "address" },
      { name: "abstraction", type: "string" },
      { name: "nonce", type: "uint64" }
    ]
  };
  const signatureHex = await wallet.walletClient.signTypedData({
    account: wallet.account,
    domain,
    types,
    primaryType: "HyperliquidTransaction:UserSetAbstraction",
    message
  });
  return splitSignature(signatureHex);
}
function splitSignature(signature) {
  const cleaned = signature.slice(2);
  const rHex = `0x${cleaned.slice(0, 64)}`;
  const sHex = `0x${cleaned.slice(64, 128)}`;
  let v = parseInt(cleaned.slice(128, 130), 16);
  if (Number.isNaN(v)) {
    throw new Error("Invalid signature returned by wallet client.");
  }
  if (v < 27) {
    v += 27;
  }
  const normalizedV = v === 27 || v === 28 ? v : v % 2 ? 27 : 28;
  return {
    r: normalizeHex(rHex),
    s: normalizeHex(sHex),
    v: normalizedV
  };
}
function createL1ActionHash(args) {
  const { action, nonce, vaultAddress, expiresAfter } = args;
  const actionBytes = encode(action, { ignoreUndefined: true });
  const nonceBytes = toUint64Bytes(nonce);
  const vaultMarker = vaultAddress ? new Uint8Array([1]) : new Uint8Array([0]);
  const vaultBytes = vaultAddress ? hexToBytes(vaultAddress.slice(2)) : new Uint8Array();
  const hasExpiresAfter = typeof expiresAfter === "number";
  const expiresMarker = hasExpiresAfter ? new Uint8Array([0]) : new Uint8Array();
  const expiresBytes = hasExpiresAfter && expiresAfter !== void 0 ? toUint64Bytes(expiresAfter) : new Uint8Array();
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
function toUint64Bytes(value) {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(value));
  return bytes;
}
function getBridgeAddress(env) {
  const override = process.env.HYPERLIQUID_BRIDGE_ADDRESS;
  if (override?.trim()) {
    return normalizeAddress(override);
  }
  return HL_BRIDGE_ADDRESSES[env];
}
function getUsdcAddress(env) {
  const override = process.env.HYPERLIQUID_USDC_ADDRESS;
  if (override?.trim()) {
    return normalizeAddress(override);
  }
  return HL_USDC_ADDRESSES[env];
}
function getSignatureChainId(env) {
  const override = process.env.HYPERLIQUID_SIGNATURE_CHAIN_ID;
  const selected = override?.trim() || HL_SIGNATURE_CHAIN_ID[env];
  return normalizeHex(selected);
}
function assertPositiveNumber(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
}

// src/adapters/hyperliquid/info.ts
async function postInfo(environment, payload) {
  const baseUrl = API_BASES[environment];
  const response = await fetch(`${baseUrl}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new HyperliquidApiError(
      "Hyperliquid info request failed.",
      data ?? { status: response.status }
    );
  }
  return data;
}
var HyperliquidInfoClient = class {
  constructor(environment = "mainnet") {
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
  openOrders(user) {
    return fetchHyperliquidOpenOrders({ user, environment: this.environment });
  }
  frontendOpenOrders(user) {
    return fetchHyperliquidFrontendOpenOrders({
      user,
      environment: this.environment
    });
  }
  orderStatus(user, oid) {
    return fetchHyperliquidOrderStatus({
      user,
      oid,
      environment: this.environment
    });
  }
  historicalOrders(user) {
    return fetchHyperliquidHistoricalOrders({
      user,
      environment: this.environment
    });
  }
  userFills(user) {
    return fetchHyperliquidUserFills({ user, environment: this.environment });
  }
  userFillsByTime(user, startTime, endTime) {
    return fetchHyperliquidUserFillsByTime({
      user,
      startTime,
      endTime,
      environment: this.environment
    });
  }
  userRateLimit(user) {
    return fetchHyperliquidUserRateLimit({
      user,
      environment: this.environment
    });
  }
  preTransferCheck(user, source) {
    return fetchHyperliquidPreTransferCheck({
      user,
      source,
      environment: this.environment
    });
  }
  spotClearinghouseState(user) {
    return fetchHyperliquidSpotClearinghouseState({
      user,
      environment: this.environment
    });
  }
};
async function fetchHyperliquidMeta(environment = "mainnet") {
  return postInfo(environment, { type: "meta" });
}
async function fetchHyperliquidMetaAndAssetCtxs(environment = "mainnet") {
  return postInfo(environment, { type: "metaAndAssetCtxs" });
}
async function fetchHyperliquidSpotMeta(environment = "mainnet") {
  return postInfo(environment, { type: "spotMeta" });
}
async function fetchHyperliquidSpotMetaAndAssetCtxs(environment = "mainnet") {
  return postInfo(environment, { type: "spotMetaAndAssetCtxs" });
}
async function fetchHyperliquidAssetCtxs(environment = "mainnet") {
  return postInfo(environment, { type: "assetCtxs" });
}
async function fetchHyperliquidSpotAssetCtxs(environment = "mainnet") {
  return postInfo(environment, { type: "spotAssetCtxs" });
}
async function fetchHyperliquidOpenOrders(params) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, { type: "openOrders", user: normalizeAddress(params.user) });
}
async function fetchHyperliquidFrontendOpenOrders(params) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "frontendOpenOrders",
    user: normalizeAddress(params.user)
  });
}
async function fetchHyperliquidOrderStatus(params) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "orderStatus",
    user: normalizeAddress(params.user),
    oid: params.oid
  });
}
async function fetchHyperliquidHistoricalOrders(params) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "historicalOrders",
    user: normalizeAddress(params.user)
  });
}
async function fetchHyperliquidUserFills(params) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "userFills",
    user: normalizeAddress(params.user)
  });
}
async function fetchHyperliquidUserFillsByTime(params) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "userFillsByTime",
    user: normalizeAddress(params.user),
    startTime: params.startTime,
    endTime: params.endTime
  });
}
async function fetchHyperliquidUserRateLimit(params) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "userRateLimit",
    user: normalizeAddress(params.user)
  });
}
async function fetchHyperliquidPreTransferCheck(params) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "preTransferCheck",
    user: normalizeAddress(params.user),
    source: normalizeAddress(params.source)
  });
}
async function fetchHyperliquidSpotClearinghouseState(params) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "spotClearinghouseState",
    user: normalizeAddress(params.user)
  });
}

// src/adapters/hyperliquid/exchange.ts
var HyperliquidExchangeClient = class {
  constructor(args) {
    this.wallet = args.wallet;
    this.environment = args.environment ?? "mainnet";
    this.vaultAddress = args.vaultAddress;
    this.expiresAfter = args.expiresAfter;
    const resolvedNonceSource = args.walletNonceProvider ?? args.wallet.nonceSource ?? args.nonceSource;
    if (!resolvedNonceSource) {
      throw new Error(
        "Wallet nonce source is required for Hyperliquid exchange actions."
      );
    }
    this.nonceSource = resolvedNonceSource;
  }
  cancel(cancels) {
    return cancelHyperliquidOrders({
      wallet: this.wallet,
      cancels,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  cancelByCloid(cancels) {
    return cancelHyperliquidOrdersByCloid({
      wallet: this.wallet,
      cancels,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  cancelAll() {
    return cancelAllHyperliquidOrders({
      wallet: this.wallet,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  scheduleCancel(time) {
    return scheduleHyperliquidCancel({
      wallet: this.wallet,
      time,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  modify(modification) {
    return modifyHyperliquidOrder({
      wallet: this.wallet,
      modification,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  batchModify(modifications) {
    return batchModifyHyperliquidOrders({
      wallet: this.wallet,
      modifications,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  twapOrder(twap) {
    return placeHyperliquidTwapOrder({
      wallet: this.wallet,
      twap,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  twapCancel(cancel) {
    return cancelHyperliquidTwapOrder({
      wallet: this.wallet,
      cancel,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  updateLeverage(input) {
    return updateHyperliquidLeverage({
      wallet: this.wallet,
      input,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  updateIsolatedMargin(input) {
    return updateHyperliquidIsolatedMargin({
      wallet: this.wallet,
      input,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  reserveRequestWeight(weight) {
    return reserveHyperliquidRequestWeight({
      wallet: this.wallet,
      weight,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    });
  }
  spotSend(params) {
    return sendHyperliquidSpot({
      wallet: this.wallet,
      environment: this.environment,
      nonceSource: this.nonceSource,
      ...params
    });
  }
  setDexAbstraction(params) {
    const base = {
      wallet: this.wallet,
      enabled: params.enabled,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    };
    return setHyperliquidDexAbstraction(
      params.user ? { ...base, user: params.user } : base
    );
  }
  setAccountAbstractionMode(params) {
    const base = {
      wallet: this.wallet,
      mode: params.mode,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    };
    return setHyperliquidAccountAbstractionMode(
      params.user ? { ...base, user: params.user } : base
    );
  }
  setPortfolioMargin(params) {
    const base = {
      wallet: this.wallet,
      enabled: params.enabled,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource
    };
    return setHyperliquidPortfolioMargin(
      params.user ? { ...base, user: params.user } : base
    );
  }
};
async function setHyperliquidPortfolioMargin(options) {
  const env = options.environment ?? "mainnet";
  if (!options.wallet?.account || !options.wallet.walletClient) {
    throw new Error(
      "Wallet with signing capability is required for portfolio margin."
    );
  }
  const nonce = options.nonce ?? options.walletNonceProvider?.() ?? options.wallet.nonceSource?.() ?? options.nonceSource?.() ?? Date.now();
  const signatureChainId = getSignatureChainId(env);
  const hyperliquidChain = HL_CHAIN_LABEL[env];
  const user = normalizeAddress(
    options.user ?? options.wallet.address
  );
  const action = {
    type: "userPortfolioMargin",
    enabled: Boolean(options.enabled),
    hyperliquidChain,
    signatureChainId,
    user,
    nonce
  };
  const signature = await signUserPortfolioMargin({
    wallet: options.wallet,
    action
  });
  const body = {
    action,
    nonce,
    signature
  };
  if (options.vaultAddress) {
    body.vaultAddress = normalizeAddress(options.vaultAddress);
  }
  if (typeof options.expiresAfter === "number") {
    body.expiresAfter = options.expiresAfter;
  }
  return postExchange(env, body);
}
async function setHyperliquidDexAbstraction(options) {
  const env = options.environment ?? "mainnet";
  if (!options.wallet?.account || !options.wallet.walletClient) {
    throw new Error(
      "Wallet with signing capability is required for dex abstraction."
    );
  }
  const nonce = options.nonce ?? options.walletNonceProvider?.() ?? options.wallet.nonceSource?.() ?? options.nonceSource?.() ?? Date.now();
  const signatureChainId = getSignatureChainId(env);
  const hyperliquidChain = HL_CHAIN_LABEL[env];
  const user = normalizeAddress(
    options.user ?? options.wallet.address
  );
  const action = {
    type: "userDexAbstraction",
    enabled: Boolean(options.enabled),
    hyperliquidChain,
    signatureChainId,
    user,
    nonce
  };
  const signature = await signUserDexAbstraction({
    wallet: options.wallet,
    action
  });
  const body = {
    action,
    nonce,
    signature
  };
  if (options.vaultAddress) {
    body.vaultAddress = normalizeAddress(options.vaultAddress);
  }
  if (typeof options.expiresAfter === "number") {
    body.expiresAfter = options.expiresAfter;
  }
  return postExchange(env, body);
}
async function setHyperliquidAccountAbstractionMode(options) {
  const env = options.environment ?? "mainnet";
  if (!options.wallet?.account || !options.wallet.walletClient) {
    throw new Error(
      "Wallet with signing capability is required for account abstraction mode."
    );
  }
  const nonce = options.nonce ?? options.walletNonceProvider?.() ?? options.wallet.nonceSource?.() ?? options.nonceSource?.() ?? Date.now();
  const signatureChainId = getSignatureChainId(env);
  const hyperliquidChain = HL_CHAIN_LABEL[env];
  const user = normalizeAddress(
    options.user ?? options.wallet.address
  );
  const abstraction = resolveHyperliquidAbstractionFromMode(options.mode);
  const action = {
    type: "userSetAbstraction",
    abstraction,
    hyperliquidChain,
    signatureChainId,
    user,
    nonce
  };
  const signature = await signUserSetAbstraction({
    wallet: options.wallet,
    action
  });
  const body = {
    action,
    nonce,
    signature
  };
  if (options.vaultAddress) {
    body.vaultAddress = normalizeAddress(options.vaultAddress);
  }
  if (typeof options.expiresAfter === "number") {
    body.expiresAfter = options.expiresAfter;
  }
  return postExchange(env, body);
}
async function cancelHyperliquidOrders(options) {
  options.cancels.forEach((c) => assertSymbol(c.symbol));
  const action = {
    type: "cancel",
    cancels: await withAssetIndexes(options, options.cancels, (idx, entry) => ({
      a: idx,
      o: entry.oid
    }))
  };
  return submitExchangeAction(options, action);
}
async function cancelHyperliquidOrdersByCloid(options) {
  options.cancels.forEach((c) => assertSymbol(c.symbol));
  const action = {
    type: "cancelByCloid",
    cancels: await withAssetIndexes(
      options,
      options.cancels,
      (idx, entry) => ({
        asset: idx,
        cloid: normalizeCloid(entry.cloid)
      })
    )
  };
  return submitExchangeAction(options, action);
}
async function cancelAllHyperliquidOrders(options) {
  const action = { type: "cancelAll" };
  return submitExchangeAction(options, action);
}
async function scheduleHyperliquidCancel(options) {
  if (options.time != null) {
    assertPositiveNumber(options.time, "time");
  }
  const action = options.time == null ? { type: "scheduleCancel" } : { type: "scheduleCancel", time: options.time };
  return submitExchangeAction(options, action);
}
async function modifyHyperliquidOrder(options) {
  const { modification } = options;
  const order = await buildOrder(modification.order, options);
  const action = {
    type: "modify",
    oid: modification.oid,
    order
  };
  return submitExchangeAction(options, action);
}
async function batchModifyHyperliquidOrders(options) {
  options.modifications.forEach((m) => assertSymbol(m.order.symbol));
  const modifies = await Promise.all(
    options.modifications.map(async (mod) => ({
      oid: mod.oid,
      order: await buildOrder(mod.order, options)
    }))
  );
  const action = {
    type: "batchModify",
    modifies
  };
  return submitExchangeAction(options, action);
}
async function placeHyperliquidTwapOrder(options) {
  const { twap } = options;
  assertSymbol(twap.symbol);
  assertPositiveDecimal(twap.size, "size");
  assertPositiveNumber(twap.minutes, "minutes");
  const env = options.environment ?? "mainnet";
  const asset = await resolveHyperliquidAssetIndex({
    symbol: twap.symbol,
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch
  });
  const action = {
    type: "twapOrder",
    twap: {
      a: asset,
      b: twap.side === "buy",
      s: toApiDecimal(twap.size),
      r: Boolean(twap.reduceOnly),
      m: twap.minutes,
      t: Boolean(twap.randomize)
    }
  };
  return submitExchangeAction(options, action);
}
async function cancelHyperliquidTwapOrder(options) {
  assertSymbol(options.cancel.symbol);
  const env = options.environment ?? "mainnet";
  const asset = await resolveHyperliquidAssetIndex({
    symbol: options.cancel.symbol,
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch
  });
  const action = {
    type: "twapCancel",
    a: asset,
    t: options.cancel.twapId
  };
  return submitExchangeAction(options, action);
}
async function updateHyperliquidLeverage(options) {
  assertSymbol(options.input.symbol);
  assertPositiveNumber(options.input.leverage, "leverage");
  const env = options.environment ?? "mainnet";
  const asset = await resolveHyperliquidAssetIndex({
    symbol: options.input.symbol,
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch
  });
  const action = {
    type: "updateLeverage",
    asset,
    isCross: options.input.leverageMode === "cross",
    leverage: options.input.leverage
  };
  return submitExchangeAction(options, action);
}
async function updateHyperliquidIsolatedMargin(options) {
  assertSymbol(options.input.symbol);
  assertPositiveNumber(options.input.ntli, "ntli");
  const env = options.environment ?? "mainnet";
  const asset = await resolveHyperliquidAssetIndex({
    symbol: options.input.symbol,
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch
  });
  const action = {
    type: "updateIsolatedMargin",
    asset,
    isBuy: options.input.isBuy,
    ntli: options.input.ntli
  };
  return submitExchangeAction(options, action);
}
async function reserveHyperliquidRequestWeight(options) {
  assertPositiveNumber(options.weight, "weight");
  const action = {
    type: "reserveRequestWeight",
    weight: options.weight
  };
  return submitExchangeAction(options, action);
}
async function createHyperliquidSubAccount(options) {
  assertString(options.name, "name");
  const action = {
    type: "createSubAccount",
    name: options.name
  };
  return submitExchangeAction(options, action);
}
async function transferHyperliquidSubAccount(options) {
  assertString(options.subAccountUser, "subAccountUser");
  const usdScaled = normalizeUsdToInt(options.usd);
  const action = {
    type: "subAccountTransfer",
    subAccountUser: normalizeAddress(options.subAccountUser),
    isDeposit: Boolean(options.isDeposit),
    usd: usdScaled
  };
  return submitExchangeAction(options, action);
}
async function sendHyperliquidSpot(options) {
  const env = options.environment ?? "mainnet";
  if (!options.wallet.account || !options.wallet.walletClient) {
    throw new Error("Wallet with signing capability is required for spotSend.");
  }
  assertString(options.token, "token");
  assertPositiveDecimal(options.amount, "amount");
  const signatureChainId = getSignatureChainId(env);
  const hyperliquidChain = HL_CHAIN_LABEL[env];
  const nonce = options.nonce ?? options.nonceSource?.() ?? Date.now();
  const time = BigInt(nonce);
  const signature = await signSpotSend({
    wallet: options.wallet,
    hyperliquidChain,
    signatureChainId,
    destination: normalizeAddress(options.destination),
    token: options.token,
    amount: toApiDecimal(options.amount),
    time
  });
  const action = {
    type: "spotSend",
    hyperliquidChain,
    signatureChainId,
    destination: normalizeAddress(options.destination),
    token: options.token,
    amount: toApiDecimal(options.amount),
    time: nonce
  };
  return postExchange(env, { action, nonce, signature });
}
async function submitExchangeAction(options, action) {
  if (!options.wallet?.account || !options.wallet.walletClient) {
    throw new Error("Hyperliquid exchange actions require a signing wallet.");
  }
  const env = options.environment ?? "mainnet";
  const nonceSource = options.walletNonceProvider ?? options.wallet.nonceSource ?? options.nonceSource;
  if (!nonceSource && options.nonce === void 0) {
    throw new Error("Wallet nonce source is required for Hyperliquid exchange actions.");
  }
  const effectiveNonce = options.nonce ?? nonceSource?.();
  if (effectiveNonce === void 0) {
    throw new Error("Hyperliquid exchange actions require a nonce.");
  }
  const signature = await signL1Action({
    wallet: options.wallet,
    action,
    nonce: effectiveNonce,
    vaultAddress: options.vaultAddress ? normalizeAddress(options.vaultAddress) : void 0,
    expiresAfter: options.expiresAfter,
    isTestnet: env === "testnet"
  });
  const body = {
    action,
    nonce: effectiveNonce,
    signature
  };
  if (options.vaultAddress) {
    body.vaultAddress = normalizeAddress(options.vaultAddress);
  }
  if (typeof options.expiresAfter === "number") {
    body.expiresAfter = options.expiresAfter;
  }
  return postExchange(env, body);
}
async function withAssetIndexes(options, entries, mapper) {
  const env = options.environment ?? "mainnet";
  return Promise.all(
    entries.map(async (entry) => {
      const assetIndex = await resolveHyperliquidAssetIndex({
        symbol: entry.symbol,
        baseUrl: API_BASES[env],
        environment: env,
        fetcher: fetch
      });
      return mapper(assetIndex, entry);
    })
  );
}
async function buildOrder(intent, options) {
  assertSymbol(intent.symbol);
  assertPositiveDecimal(intent.price, "price");
  assertPositiveDecimal(intent.size, "size");
  const env = options.environment ?? "mainnet";
  const assetIndex = await resolveHyperliquidAssetIndex({
    symbol: intent.symbol,
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch
  });
  const limitOrTrigger = intent.trigger ? mapTrigger(intent.trigger) : {
    limit: {
      tif: intent.tif ?? "Ioc"
    }
  };
  return {
    a: assetIndex,
    b: intent.side === "buy",
    p: toApiDecimal(intent.price),
    s: toApiDecimal(intent.size),
    r: intent.reduceOnly ?? false,
    t: limitOrTrigger,
    ...intent.clientId ? {
      c: normalizeCloid(intent.clientId)
    } : {}
  };
}
function mapTrigger(trigger) {
  assertPositiveDecimal(trigger.triggerPx, "triggerPx");
  return {
    trigger: {
      isMarket: Boolean(trigger.isMarket),
      triggerPx: toApiDecimal(trigger.triggerPx),
      tpsl: trigger.tpsl
    }
  };
}
function assertSymbol(value) {
  assertString(value, "symbol");
}
function normalizeUsdToInt(value) {
  if (typeof value === "bigint") {
    if (value < 0n) {
      throw new Error("usd must be non-negative.");
    }
    return Number(value);
  }
  const parsed = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("usd must be a non-negative number.");
  }
  return Math.round(parsed * 1e6);
}
function assertString(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}
function assertPositiveDecimal(value, label) {
  if (typeof value === "number") {
    assertPositiveNumber(value, label);
    return;
  }
  if (typeof value === "bigint") {
    if (value <= 0n) {
      throw new Error(`${label} must be positive.`);
    }
    return;
  }
  assertString(value, label);
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(value.trim())) {
    throw new Error(`${label} must be a positive decimal string.`);
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`${label} must be positive.`);
  }
}
function collectExchangeErrorMessages(payload) {
  if (!payload || typeof payload !== "object") return [];
  const root = payload;
  const messages = [];
  const statuses = root.response?.data?.statuses;
  if (Array.isArray(statuses)) {
    statuses.forEach((status, index) => {
      if (status && typeof status === "object" && "error" in status && typeof status.error === "string") {
        const errorText = status.error;
        messages.push(`status[${index}]: ${errorText}`);
      }
    });
  }
  const singleStatus = root.response?.data?.status;
  if (singleStatus && typeof singleStatus === "object" && "error" in singleStatus && typeof singleStatus.error === "string") {
    messages.push(singleStatus.error);
  }
  return messages;
}
async function postExchange(env, body) {
  const response = await fetch(`${API_BASES[env]}/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text().catch(() => "");
  const json = (() => {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  })();
  if (!response.ok) {
    throw new HyperliquidApiError("Hyperliquid exchange action failed.", {
      status: response.status,
      statusText: response.statusText,
      body: json ?? (text ? text : null)
    });
  }
  if (!json) {
    throw new HyperliquidApiError("Hyperliquid exchange action failed.", {
      status: response.status,
      statusText: response.statusText,
      body: text ? text : null
    });
  }
  if (json.status !== "ok") {
    throw new HyperliquidApiError("Hyperliquid exchange returned error.", {
      status: response.status,
      statusText: response.statusText,
      body: json
    });
  }
  const nestedErrors = collectExchangeErrorMessages(json);
  if (nestedErrors.length > 0) {
    throw new HyperliquidApiError("Hyperliquid exchange returned action errors.", {
      status: response.status,
      statusText: response.statusText,
      body: json,
      errors: nestedErrors
    });
  }
  return json;
}

// src/adapters/hyperliquid/env.ts
function resolveHyperliquidChain(environment) {
  return environment === "mainnet" ? "arbitrum" : "arbitrum-sepolia";
}
function resolveHyperliquidRpcEnvVar(environment) {
  return environment === "mainnet" ? "ARBITRUM_RPC_URL" : "ARBITRUM_SEPOLIA_RPC_URL";
}
function resolveHyperliquidChainConfig(environment, env = process.env) {
  const rpcVar = resolveHyperliquidRpcEnvVar(environment);
  const rpcUrl = env[rpcVar];
  return {
    chain: resolveHyperliquidChain(environment),
    ...rpcUrl ? { rpcUrl } : {}
  };
}
function resolveHyperliquidStoreNetwork(environment) {
  return environment === "mainnet" ? "hyperliquid" : "hyperliquid-testnet";
}

// src/adapters/hyperliquid/symbols.ts
var UNKNOWN_SYMBOL2 = "UNKNOWN";
function extractHyperliquidDex(symbol) {
  const idx = symbol.indexOf(":");
  if (idx <= 0) return null;
  const dex = symbol.slice(0, idx).trim().toLowerCase();
  return dex || null;
}
function normalizeSpotTokenName2(value) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (raw.endsWith("0") && raw.length > 1) {
    return raw.slice(0, -1);
  }
  return raw;
}
function normalizeHyperliquidBaseSymbol(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutDex = trimmed.includes(":") ? trimmed.split(":").slice(1).join(":") : trimmed;
  const base = withoutDex.split("-")[0] ?? withoutDex;
  const baseNoPair = base.split("/")[0] ?? base;
  const normalized = baseNoPair.trim().toUpperCase();
  if (!normalized || normalized === UNKNOWN_SYMBOL2) return null;
  return normalized;
}
function normalizeHyperliquidMetaSymbol(symbol) {
  const trimmed = symbol.trim();
  const noDex = trimmed.includes(":") ? trimmed.split(":").slice(1).join(":") : trimmed;
  const noPair = noDex.split("-")[0] ?? noDex;
  return (noPair.split("/")[0] ?? noPair).trim();
}
function resolveHyperliquidPair(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutDex = trimmed.includes(":") ? trimmed.split(":").slice(1).join(":") : trimmed;
  if (withoutDex.includes("/")) {
    return withoutDex.toUpperCase();
  }
  if (withoutDex.includes("-")) {
    const [base, ...rest] = withoutDex.split("-");
    const quote = rest.join("-").trim();
    if (!base || !quote) return null;
    return `${base.toUpperCase()}/${quote.toUpperCase()}`;
  }
  return null;
}
function resolveHyperliquidProfileChain(environment) {
  return environment === "testnet" ? "hyperliquid-testnet" : "hyperliquid";
}
function buildHyperliquidProfileAssets(params) {
  const chain = resolveHyperliquidProfileChain(params.environment);
  return params.assets.map((asset) => {
    const symbols = asset.assetSymbols.map((symbol) => normalizeHyperliquidBaseSymbol(symbol)).filter((symbol) => Boolean(symbol));
    if (symbols.length === 0) return null;
    const explicitPair = typeof asset.pair === "string" ? resolveHyperliquidPair(asset.pair) : null;
    const derivedPair = symbols.length === 1 ? resolveHyperliquidPair(asset.assetSymbols[0] ?? symbols[0]) : null;
    const pair = explicitPair ?? derivedPair ?? void 0;
    const leverage = typeof asset.leverage === "number" && Number.isFinite(asset.leverage) && asset.leverage > 0 ? asset.leverage : void 0;
    const walletAddress = typeof asset.walletAddress === "string" && asset.walletAddress.trim().length > 0 ? asset.walletAddress.trim() : void 0;
    return {
      venue: "hyperliquid",
      chain,
      assetSymbols: symbols,
      ...pair ? { pair } : {},
      ...leverage ? { leverage } : {},
      ...walletAddress ? { walletAddress } : {}
    };
  }).filter((asset) => asset !== null);
}
function parseSpotPairSymbol(symbol) {
  const trimmed = symbol.trim();
  if (!trimmed.includes("/")) return null;
  const [rawBase, rawQuote] = trimmed.split("/");
  const base = rawBase?.trim().toUpperCase() ?? "";
  const quote = rawQuote?.trim().toUpperCase() ?? "";
  if (!base || !quote) return null;
  return { base, quote };
}
function isHyperliquidSpotSymbol(symbol) {
  return symbol.startsWith("@") || symbol.includes("/");
}
function resolveSpotMidCandidates(baseSymbol) {
  const base = baseSymbol.trim().toUpperCase();
  if (!base) return [];
  const candidates = [base];
  if (base.startsWith("U") && base.length > 1) {
    candidates.push(base.slice(1));
  }
  return Array.from(new Set(candidates));
}
function resolveSpotTokenCandidates(value) {
  const normalized = normalizeSpotTokenName2(value).toUpperCase();
  if (!normalized) return [];
  const candidates = [normalized];
  if (normalized.startsWith("U") && normalized.length > 1) {
    candidates.push(normalized.slice(1));
  }
  return Array.from(new Set(candidates));
}
function resolveHyperliquidOrderSymbol(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("@")) return trimmed;
  if (trimmed.includes(":")) {
    const [rawDex, ...restParts] = trimmed.split(":");
    const dex = rawDex.trim().toLowerCase();
    const rest = restParts.join(":");
    const base = rest.split("/")[0]?.split("-")[0] ?? rest;
    const normalizedBase = base.trim().toUpperCase();
    if (!dex || !normalizedBase || normalizedBase === UNKNOWN_SYMBOL2) {
      return null;
    }
    return `${dex}:${normalizedBase}`;
  }
  const pair = resolveHyperliquidPair(trimmed);
  if (pair) return pair;
  return normalizeHyperliquidBaseSymbol(trimmed);
}
function resolveHyperliquidSymbol(asset, override) {
  const raw = override && override.trim().length > 0 ? override.trim() : asset.trim();
  if (!raw) return raw;
  if (raw.startsWith("@")) return raw;
  if (raw.includes(":")) {
    const [dexRaw, ...restParts] = raw.split(":");
    const dex = dexRaw.trim().toLowerCase();
    const rest = restParts.join(":");
    const base2 = rest.split("/")[0]?.split("-")[0] ?? rest;
    const normalizedBase = base2.trim().toUpperCase();
    if (!dex) return normalizedBase;
    return `${dex}:${normalizedBase}`;
  }
  if (raw.includes("/")) {
    return raw.toUpperCase();
  }
  if (raw.includes("-")) {
    const [base2, ...rest] = raw.split("-");
    const quote = rest.join("-").trim();
    if (base2 && quote) {
      return `${base2.toUpperCase()}/${quote.toUpperCase()}`;
    }
  }
  const base = raw.split("-")[0] ?? raw;
  const baseNoPair = base.split("/")[0] ?? base;
  return baseNoPair.trim().toUpperCase();
}

// src/adapters/hyperliquid/order-utils.ts
var MAX_HYPERLIQUID_PRICE_DECIMALS = 8;
function countDecimals(value) {
  if (!Number.isFinite(value)) return 0;
  const s = value.toString();
  const [, dec = ""] = s.split(".");
  return dec.length;
}
function clampPriceDecimals(value) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Price must be positive.");
  }
  const fixed = value.toFixed(MAX_HYPERLIQUID_PRICE_DECIMALS);
  return fixed.replace(/\.?0+$/, "");
}
function assertNumberString(value) {
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)) {
    throw new TypeError("Invalid decimal number string.");
  }
}
function normalizeDecimalString(value) {
  return value.trim().replace(/^(-?)0+(?=\d)/, "$1").replace(/\.0*$|(\.\d+?)0+$/, "$1").replace(/^(-?)\./, "$10.").replace(/^-?$/, "0").replace(/^-0$/, "0");
}
var StringMath = {
  log10Floor(value) {
    const abs = value.startsWith("-") ? value.slice(1) : value;
    const num = Number(abs);
    if (!Number.isFinite(num) || num === 0) return -Infinity;
    const [intPart, fracPart = ""] = abs.split(".");
    if (Number(intPart) !== 0) {
      return intPart.replace(/^0+/, "").length - 1;
    }
    const leadingZeros = fracPart.match(/^0*/)?.[0]?.length ?? 0;
    return -(leadingZeros + 1);
  },
  multiplyByPow10(value, exp) {
    if (!Number.isInteger(exp)) {
      throw new RangeError("Exponent must be an integer.");
    }
    if (exp === 0) return normalizeDecimalString(value);
    const negative = value.startsWith("-");
    const abs = negative ? value.slice(1) : value;
    const [intRaw, fracRaw = ""] = abs.split(".");
    const intPart = intRaw || "0";
    let output;
    if (exp > 0) {
      if (exp >= fracRaw.length) {
        output = intPart + fracRaw + "0".repeat(exp - fracRaw.length);
      } else {
        output = `${intPart}${fracRaw.slice(0, exp)}.${fracRaw.slice(exp)}`;
      }
    } else {
      const absExp = -exp;
      if (absExp >= intPart.length) {
        output = `0.${"0".repeat(absExp - intPart.length)}${intPart}${fracRaw}`;
      } else {
        output = `${intPart.slice(0, -absExp)}.${intPart.slice(-absExp)}${fracRaw}`;
      }
    }
    return normalizeDecimalString((negative ? "-" : "") + output);
  },
  trunc(value) {
    const index = value.indexOf(".");
    return index === -1 ? value : value.slice(0, index) || "0";
  },
  toPrecisionTruncate(value, precision) {
    if (!Number.isInteger(precision) || precision < 1) {
      throw new RangeError("Precision must be a positive integer.");
    }
    if (/^-?0+(\.0*)?$/.test(value)) return "0";
    const negative = value.startsWith("-");
    const abs = negative ? value.slice(1) : value;
    const magnitude = StringMath.log10Floor(abs);
    const shiftAmount = precision - magnitude - 1;
    const shifted = StringMath.multiplyByPow10(abs, shiftAmount);
    const truncated = StringMath.trunc(shifted);
    const shiftedBack = StringMath.multiplyByPow10(truncated, -shiftAmount);
    return normalizeDecimalString(negative ? `-${shiftedBack}` : shiftedBack);
  },
  toFixedTruncate(value, decimals) {
    if (!Number.isInteger(decimals) || decimals < 0) {
      throw new RangeError("Decimals must be a non-negative integer.");
    }
    const matcher = new RegExp(`^-?(?:\\d+)?(?:\\.\\d{0,${decimals}})?`);
    const result = value.match(matcher)?.[0];
    if (!result) {
      throw new TypeError("Invalid number format.");
    }
    return normalizeDecimalString(result);
  }
};
function formatHyperliquidPrice(price, szDecimals, marketType = "perp") {
  const normalized = price.toString().trim();
  assertNumberString(normalized);
  if (/^-?\d+$/.test(normalized)) {
    return normalizeDecimalString(normalized);
  }
  const maxDecimals2 = Math.max((marketType === "perp" ? 6 : 8) - szDecimals, 0);
  const decimalsTrimmed = StringMath.toFixedTruncate(normalized, maxDecimals2);
  const sigFigTrimmed = StringMath.toPrecisionTruncate(decimalsTrimmed, 5);
  if (sigFigTrimmed === "0") {
    throw new RangeError("Price is too small and was truncated to 0.");
  }
  return sigFigTrimmed;
}
function formatHyperliquidSize(size, szDecimals) {
  const normalized = size.toString().trim();
  assertNumberString(normalized);
  const truncated = StringMath.toFixedTruncate(normalized, szDecimals);
  if (truncated === "0") {
    throw new RangeError("Size is too small and was truncated to 0.");
  }
  return truncated;
}
function formatHyperliquidOrderSize(value, szDecimals) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  try {
    return formatHyperliquidSize(value, szDecimals);
  } catch {
    return "0";
  }
}
function roundHyperliquidPriceToTick(price, tick, side) {
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Price must be positive.");
  }
  if (!Number.isFinite(tick.tickDecimals) || tick.tickDecimals < 0) {
    throw new Error("tick.tickDecimals must be a non-negative number.");
  }
  if (tick.tickSizeInt <= 0n) {
    throw new Error("tick.tickSizeInt must be positive.");
  }
  const scale = 10 ** tick.tickDecimals;
  const scaled = BigInt(Math.round(price * scale));
  const tickSize = tick.tickSizeInt;
  const rounded = side === "sell" ? scaled / tickSize * tickSize : (scaled + tickSize - 1n) / tickSize * tickSize;
  const integer = Number(rounded) / scale;
  return clampPriceDecimals(integer);
}
function formatHyperliquidMarketablePrice(params) {
  const { mid, side, slippageBps, tick } = params;
  const decimals = countDecimals(mid);
  const factor = 10 ** decimals;
  const adjusted = mid * (side === "buy" ? 1 + slippageBps / 1e4 : 1 - slippageBps / 1e4);
  if (tick) {
    return roundHyperliquidPriceToTick(adjusted, tick, side);
  }
  const scaled = adjusted * factor;
  const rounded = side === "buy" ? Math.ceil(scaled) / factor : Math.floor(scaled) / factor;
  return clampPriceDecimals(rounded);
}
function extractHyperliquidOrderIds(responses) {
  const cloids = /* @__PURE__ */ new Set();
  const oids = /* @__PURE__ */ new Set();
  const push = (val, target) => {
    if (val === null || val === void 0) return;
    const str = String(val);
    if (str.length) target.add(str);
  };
  for (const res of responses) {
    const statuses = res?.response?.data?.statuses;
    if (!Array.isArray(statuses)) continue;
    for (const status of statuses) {
      const resting = status.resting;
      const filled = status.filled;
      push(resting?.cloid, cloids);
      push(resting?.oid, oids);
      push(filled?.cloid, cloids);
      push(filled?.oid, oids);
    }
  }
  return {
    cloids: Array.from(cloids),
    oids: Array.from(oids)
  };
}
function resolveHyperliquidOrderRef(params) {
  const { response, fallbackCloid, fallbackOid, prefix = "hl-order", index = 0 } = params;
  const statuses = response?.response?.data?.statuses ?? [];
  if (Array.isArray(statuses)) {
    for (const status of statuses) {
      const filled = status && typeof status.filled === "object" ? status.filled : null;
      if (filled) {
        if (typeof filled.cloid === "string" && filled.cloid.trim().length > 0) {
          return filled.cloid;
        }
        if (typeof filled.oid === "number" || typeof filled.oid === "string" && filled.oid.trim().length > 0) {
          return String(filled.oid);
        }
      }
      const resting = status && typeof status.resting === "object" ? status.resting : null;
      if (resting) {
        if (typeof resting.cloid === "string" && resting.cloid.trim().length > 0) {
          return resting.cloid;
        }
        if (typeof resting.oid === "number" || typeof resting.oid === "string" && resting.oid.trim().length > 0) {
          return String(resting.oid);
        }
      }
    }
  }
  if (fallbackCloid && fallbackCloid.trim().length > 0) {
    return fallbackCloid;
  }
  if (fallbackOid && fallbackOid.trim().length > 0) {
    return fallbackOid;
  }
  return `${prefix}-${Date.now()}-${index}`;
}
function resolveHyperliquidErrorDetail(error) {
  if (error instanceof HyperliquidApiError) {
    return error.response ?? null;
  }
  if (error && typeof error === "object" && "response" in error) {
    return error.response ?? null;
  }
  return null;
}

// src/adapters/hyperliquid/state-readers.ts
function unwrapData(payload) {
  if (!payload || typeof payload !== "object") return null;
  if ("data" in payload) {
    const data = payload.data;
    if (data && typeof data === "object") {
      return data;
    }
  }
  return payload;
}
function readHyperliquidNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
function readHyperliquidAccountValue(payload) {
  const data = unwrapData(payload);
  if (!data) return null;
  const candidates = [
    data?.marginSummary?.accountValue,
    data?.crossMarginSummary?.accountValue,
    data?.accountValue,
    data?.equity,
    data?.totalAccountValue,
    data?.marginSummary?.totalAccountValue
  ];
  for (const value of candidates) {
    const parsed = readHyperliquidNumber(value);
    if (parsed !== null) return parsed;
  }
  return null;
}
function matchPerpCoin(params) {
  const coin = params.coin.toUpperCase();
  const target = params.target.toUpperCase();
  if (params.prefixMatch) return coin.startsWith(target);
  return coin === target;
}
function readHyperliquidPerpPositionSize(payload, symbol, options) {
  const data = unwrapData(payload);
  const rows = Array.isArray(data?.assetPositions) ? data.assetPositions : [];
  const base = symbol.split("-")[0]?.toUpperCase() ?? symbol.toUpperCase();
  const prefixMatch = options?.prefixMatch ?? false;
  for (const row of rows) {
    const position = row.position ?? row;
    const coin = typeof position?.coin === "string" ? position.coin : typeof row.coin === "string" ? row.coin : "";
    if (!matchPerpCoin({ coin, target: base, prefixMatch })) continue;
    const size = position.szi ?? row.szi;
    const parsed = readHyperliquidNumber(size);
    return parsed ?? 0;
  }
  return 0;
}
function readHyperliquidPerpPosition(payload, symbol, options) {
  const data = unwrapData(payload);
  const rows = Array.isArray(data?.assetPositions) ? data.assetPositions : [];
  const target = symbol.split("-")[0]?.toUpperCase() ?? symbol.toUpperCase();
  const prefixMatch = options?.prefixMatch ?? false;
  for (const row of rows) {
    const position = row?.position ?? row;
    const coin = typeof position?.coin === "string" ? position.coin : typeof row?.coin === "string" ? row.coin : "";
    if (!matchPerpCoin({ coin, target, prefixMatch })) continue;
    const size = readHyperliquidNumber(position?.szi ?? row.szi) ?? 0;
    const positionValue = Math.abs(
      readHyperliquidNumber(position?.positionValue ?? row.positionValue) ?? 0
    );
    const unrealizedPnl = readHyperliquidNumber(
      position?.unrealizedPnl ?? row.unrealizedPnl
    );
    return { size, positionValue, unrealizedPnl };
  }
  return { size: 0, positionValue: 0, unrealizedPnl: null };
}
function readHyperliquidSpotBalanceSize(payload, symbol) {
  const data = unwrapData(payload);
  const rows = Array.isArray(data?.balances) ? data.balances : [];
  const base = symbol.split("/")[0]?.split("-")[0]?.toUpperCase() ?? symbol.toUpperCase();
  for (const row of rows) {
    const coin = typeof row?.coin === "string" ? row.coin : typeof row?.asset === "string" ? row.asset : "";
    if (coin.toUpperCase() !== base) continue;
    const total = row.total ?? row.balance ?? row.szi;
    const parsed = readHyperliquidNumber(total);
    return parsed ?? 0;
  }
  return 0;
}
function readHyperliquidSpotBalance(payload, base) {
  const data = unwrapData(payload);
  const balances = Array.isArray(data?.balances) ? data.balances : [];
  const target = base.toUpperCase();
  for (const row of balances) {
    const coin = typeof row?.coin === "string" ? row.coin : "";
    if (coin.toUpperCase() !== target) continue;
    const total = readHyperliquidNumber(row?.total) ?? 0;
    const entryNtl = readHyperliquidNumber(row?.entryNtl);
    return { total, entryNtl };
  }
  return { total: 0, entryNtl: null };
}
function readHyperliquidSpotAccountValue(params) {
  const rows = Array.isArray(params.balances) ? params.balances : [];
  if (rows.length === 0) return null;
  let total = 0;
  let hasValue = false;
  for (const row of rows) {
    const coin = typeof row?.coin === "string" ? row.coin : typeof row?.asset === "string" ? row.asset : "";
    if (!coin) continue;
    const amount = readHyperliquidNumber(
      row.total ?? row.balance ?? row.szi
    );
    if (amount == null || amount === 0) continue;
    const price = params.pricesUsd.get(coin.toUpperCase());
    if (price == null || !Number.isFinite(price) || price <= 0) continue;
    total += amount * price;
    hasValue = true;
  }
  return hasValue ? total : null;
}

// src/adapters/hyperliquid/market-data.ts
var META_CACHE_TTL_MS = 5 * 60 * 1e3;
var allMidsCache = /* @__PURE__ */ new Map();
function gcd(a, b) {
  let left = a < 0n ? -a : a;
  let right = b < 0n ? -b : b;
  while (right !== 0n) {
    const next = left % right;
    left = right;
    right = next;
  }
  return left;
}
function pow10(decimals) {
  let result = 1n;
  for (let i = 0; i < decimals; i += 1) {
    result *= 10n;
  }
  return result;
}
function maxDecimals(values) {
  let max = 0;
  for (const value of values) {
    const dot = value.indexOf(".");
    if (dot === -1) continue;
    const decimals = value.length - dot - 1;
    if (decimals > max) max = decimals;
  }
  return max;
}
function toScaledInt(value, decimals) {
  const trimmed = value.trim();
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [intPart, fracPart = ""] = unsigned.split(".");
  const padded = fracPart.padEnd(decimals, "0").slice(0, decimals);
  const combined = `${intPart || "0"}${padded}`;
  const asInt = BigInt(combined || "0");
  return negative ? -asInt : asInt;
}
function formatScaledInt(value, decimals) {
  const negative = value < 0n;
  const absValue = negative ? -value : value;
  const scale = pow10(decimals);
  const integer = absValue / scale;
  const fraction = absValue % scale;
  if (decimals === 0) {
    return `${negative ? "-" : ""}${integer.toString()}`;
  }
  const fractionStr = fraction.toString().padStart(decimals, "0");
  return `${negative ? "-" : ""}${integer.toString()}.${fractionStr}`.replace(
    /\.?0+$/,
    ""
  );
}
function resolveSpotSizeDecimals(meta, symbol) {
  const universe = meta.universe ?? [];
  const tokens = meta.tokens ?? [];
  if (!universe.length || !tokens.length) {
    throw new Error(`Spot metadata unavailable for ${symbol}.`);
  }
  const tokenMap = /* @__PURE__ */ new Map();
  for (const token of tokens) {
    const index = token?.index;
    const szDecimals = typeof token?.szDecimals === "number" ? token.szDecimals : null;
    if (typeof index !== "number" || szDecimals == null) continue;
    tokenMap.set(index, {
      name: normalizeSpotTokenName2(token?.name),
      szDecimals
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
  const normalizedBase = normalizeSpotTokenName2(pair.base).toUpperCase();
  const normalizedQuote = normalizeSpotTokenName2(pair.quote).toUpperCase();
  for (const market of universe) {
    const [baseIndex, quoteIndex] = Array.isArray(market?.tokens) ? market.tokens : [];
    const baseToken = tokenMap.get(baseIndex ?? -1);
    const quoteToken = tokenMap.get(quoteIndex ?? -1);
    if (!baseToken || !quoteToken) continue;
    if (baseToken.name.toUpperCase() === normalizedBase && quoteToken.name.toUpperCase() === normalizedQuote) {
      return baseToken.szDecimals;
    }
  }
  throw new Error(`No size decimals found for ${symbol}.`);
}
async function fetchHyperliquidAllMids(environment) {
  const cacheKey = environment;
  const cached = allMidsCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < META_CACHE_TTL_MS) {
    return cached.mids;
  }
  const baseUrl = API_BASES[environment];
  const res = await fetch(`${baseUrl}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "allMids" })
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || typeof json !== "object") {
    throw new Error(`Failed to load Hyperliquid mid prices (${res.status}).`);
  }
  allMidsCache.set(cacheKey, { fetchedAt: Date.now(), mids: json });
  return json;
}
async function fetchHyperliquidTickSize(params) {
  return fetchHyperliquidTickSizeForCoin(params.environment, params.symbol);
}
async function fetchHyperliquidSpotTickSize(params) {
  if (!Number.isFinite(params.marketIndex)) {
    throw new Error("Hyperliquid spot market index is invalid.");
  }
  return fetchHyperliquidTickSizeForCoin(
    params.environment,
    `@${params.marketIndex}`
  );
}
async function fetchHyperliquidTickSizeForCoin(environment, coin) {
  const base = API_BASES[environment];
  const res = await fetch(`${base}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "l2Book", coin })
  });
  if (!res.ok) {
    throw new Error(`Hyperliquid l2Book failed for ${coin}`);
  }
  const data = await res.json().catch(() => null);
  const levels = Array.isArray(data?.levels) ? data?.levels ?? [] : [];
  const prices = levels.flatMap(
    (side) => Array.isArray(side) ? side.map((entry) => String(entry?.px ?? "")) : []
  ).filter((px) => px.length > 0);
  if (prices.length < 2) {
    throw new Error(`Hyperliquid l2Book missing price levels for ${coin}`);
  }
  const decimals = maxDecimals(prices);
  const scaled = prices.map((px) => toScaledInt(px, decimals));
  const unique = Array.from(new Set(scaled.map((v) => v.toString()))).map((v) => BigInt(v)).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
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
async function fetchHyperliquidPerpMarketInfo(params) {
  const data = await fetchHyperliquidMetaAndAssetCtxs(params.environment);
  const universe = data?.[0]?.universe ?? [];
  const contexts = data?.[1] ?? [];
  const target = normalizeHyperliquidMetaSymbol(params.symbol).toUpperCase();
  const idx = universe.findIndex(
    (entry) => normalizeHyperliquidMetaSymbol(entry?.name ?? "").toUpperCase() === target
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
    szDecimals
  };
}
async function fetchHyperliquidSpotMarketInfo(params) {
  const mids = params.mids === void 0 ? await fetchHyperliquidAllMids(params.environment).catch(() => null) : params.mids;
  const data = await fetchHyperliquidSpotMetaAndAssetCtxs(params.environment);
  const universe = data?.[0]?.universe ?? [];
  const tokens = data?.[0]?.tokens ?? [];
  const contexts = data?.[1] ?? [];
  const tokenMap = /* @__PURE__ */ new Map();
  for (const token of tokens) {
    const index = token?.index;
    const szDecimals = readHyperliquidNumber(token?.szDecimals);
    if (typeof index !== "number" || szDecimals == null) continue;
    tokenMap.set(index, {
      name: normalizeSpotTokenName2(token?.name),
      szDecimals
    });
  }
  const baseCandidates = resolveSpotTokenCandidates(params.base);
  const quoteCandidates = resolveSpotTokenCandidates(params.quote);
  const normalizedBase = normalizeSpotTokenName2(params.base).toUpperCase();
  const normalizedQuote = normalizeSpotTokenName2(params.quote).toUpperCase();
  for (let idx = 0; idx < universe.length; idx += 1) {
    const market = universe[idx];
    const [baseIndex, quoteIndex] = Array.isArray(market?.tokens) ? market.tokens : [];
    const baseToken = tokenMap.get(baseIndex ?? -1);
    const quoteToken = tokenMap.get(quoteIndex ?? -1);
    if (!baseToken || !quoteToken) continue;
    const marketBaseCandidates = resolveSpotTokenCandidates(baseToken.name);
    const marketQuoteCandidates = resolveSpotTokenCandidates(quoteToken.name);
    if (baseCandidates.some((candidate) => marketBaseCandidates.includes(candidate)) && quoteCandidates.some((candidate) => marketQuoteCandidates.includes(candidate))) {
      const contextIndex = typeof market?.index === "number" ? market.index : idx;
      const ctx = (contextIndex >= 0 && contextIndex < contexts.length ? contexts[contextIndex] : null) ?? contexts[idx] ?? null;
      let price = null;
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
        throw new Error(
          `No spot price available for ${normalizedBase}/${normalizedQuote}`
        );
      }
      const marketIndex = typeof market?.index === "number" ? market.index : idx;
      return {
        symbol: `${baseToken.name.toUpperCase()}/${quoteToken.name.toUpperCase()}`,
        base: baseToken.name.toUpperCase(),
        quote: quoteToken.name.toUpperCase(),
        assetId: 1e4 + marketIndex,
        marketIndex,
        price,
        szDecimals: baseToken.szDecimals
      };
    }
  }
  throw new Error(`Unknown Hyperliquid spot market: ${normalizedBase}/${normalizedQuote}`);
}
async function fetchHyperliquidSizeDecimals(params) {
  const { symbol, environment } = params;
  if (isHyperliquidSpotSymbol(symbol)) {
    const meta2 = await fetchHyperliquidSpotMeta(environment);
    return resolveSpotSizeDecimals(meta2, symbol);
  }
  const meta = await fetchHyperliquidMeta(environment);
  const universe = Array.isArray(meta?.universe) ? meta.universe : [];
  const normalized = normalizeHyperliquidMetaSymbol(symbol).toUpperCase();
  const match = universe.find(
    (entry) => normalizeHyperliquidMetaSymbol(entry?.name ?? "").toUpperCase() === normalized
  );
  if (!match || typeof match.szDecimals !== "number") {
    throw new Error(`No size decimals found for ${symbol}.`);
  }
  return match.szDecimals;
}
function buildHyperliquidSpotUsdPriceMap(params) {
  const universe = params.meta.universe ?? [];
  const tokens = params.meta.tokens ?? [];
  const tokenMap = /* @__PURE__ */ new Map();
  for (const token of tokens) {
    const index = token?.index;
    if (typeof index !== "number") continue;
    tokenMap.set(index, normalizeSpotTokenName2(token?.name).toUpperCase());
  }
  const prices = /* @__PURE__ */ new Map();
  prices.set("USDC", 1);
  for (let idx = 0; idx < universe.length; idx += 1) {
    const market = universe[idx];
    const [baseIndex, quoteIndex] = Array.isArray(market?.tokens) ? market.tokens : [];
    const base = tokenMap.get(baseIndex ?? -1);
    const quote = tokenMap.get(quoteIndex ?? -1);
    if (!base || !quote) continue;
    if (quote !== "USDC") continue;
    const contextIndex = typeof market?.index === "number" ? market.index : idx;
    const ctx = (contextIndex >= 0 && contextIndex < params.ctxs.length ? params.ctxs[contextIndex] : null) ?? params.ctxs[idx] ?? null;
    let price = null;
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
async function fetchHyperliquidSpotUsdPriceMap(environment) {
  const [spotMetaAndCtxs, mids] = await Promise.all([
    fetchHyperliquidSpotMetaAndAssetCtxs(environment),
    fetchHyperliquidAllMids(environment).catch(() => null)
  ]);
  const [metaRaw, ctxsRaw] = spotMetaAndCtxs;
  const meta = {
    universe: Array.isArray(metaRaw?.universe) ? metaRaw.universe : [],
    tokens: Array.isArray(metaRaw?.tokens) ? metaRaw.tokens : []
  };
  const ctxs = Array.isArray(ctxsRaw) ? ctxsRaw : [];
  return buildHyperliquidSpotUsdPriceMap({ meta, ctxs, mids });
}
async function fetchHyperliquidSpotAccountValue(params) {
  const pricesUsd = await fetchHyperliquidSpotUsdPriceMap(params.environment);
  return readHyperliquidSpotAccountValue({
    balances: params.balances,
    pricesUsd
  });
}
var __hyperliquidMarketDataInternals = {
  maxDecimals,
  toScaledInt,
  formatScaledInt
};

// src/adapters/hyperliquid/index.ts
function assertPositiveDecimalInput(value, label) {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${label} must be a positive number.`);
    }
    return;
  }
  if (typeof value === "bigint") {
    if (value <= 0n) {
      throw new Error(`${label} must be positive.`);
    }
    return;
  }
  const trimmed = value.trim();
  if (!trimmed.length) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
    throw new Error(`${label} must be a positive decimal string.`);
  }
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`${label} must be positive.`);
  }
}
function normalizePositiveDecimalString(raw, label) {
  const trimmed = raw.trim();
  if (!trimmed.length) {
    throw new Error(`${label} must be a non-empty decimal string.`);
  }
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
    throw new Error(`${label} must be a positive decimal string.`);
  }
  const normalized = trimmed.replace(/^0+(?=\d)/, "").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`${label} must be positive.`);
  }
  return normalized;
}
async function placeHyperliquidOrder(options) {
  const {
    wallet,
    orders,
    grouping = "na",
    environment,
    vaultAddress,
    expiresAfter,
    nonce
  } = options;
  const effectiveBuilder = BUILDER_CODE;
  if (!wallet?.account || !wallet.walletClient) {
    throw new Error(
      "Hyperliquid order signing requires a wallet with signing capabilities."
    );
  }
  if (!orders.length) {
    throw new Error("At least one order is required.");
  }
  const inferredEnvironment = environment ?? "mainnet";
  const resolvedBaseUrl = API_BASES[inferredEnvironment];
  const preparedOrders = await Promise.all(
    orders.map(async (intent) => {
      assertPositiveDecimalInput(intent.price, "price");
      assertPositiveDecimalInput(intent.size, "size");
      if (intent.trigger) {
        assertPositiveDecimalInput(intent.trigger.triggerPx, "triggerPx");
      }
      const assetIndex = await resolveHyperliquidAssetIndex({
        symbol: intent.symbol,
        baseUrl: resolvedBaseUrl,
        environment: inferredEnvironment,
        fetcher: fetch
      });
      const limitOrTrigger = intent.trigger ? {
        trigger: {
          isMarket: Boolean(intent.trigger.isMarket),
          triggerPx: toApiDecimal(intent.trigger.triggerPx),
          tpsl: intent.trigger.tpsl
        }
      } : {
        limit: {
          tif: intent.tif ?? "Ioc"
        }
      };
      const order = {
        a: assetIndex,
        b: intent.side === "buy",
        p: toApiDecimal(intent.price),
        s: toApiDecimal(intent.size),
        r: intent.reduceOnly ?? false,
        t: limitOrTrigger,
        ...intent.clientId ? {
          c: normalizeCloid(intent.clientId)
        } : {}
      };
      return order;
    })
  );
  const action = {
    type: "order",
    orders: preparedOrders,
    grouping
  };
  if (effectiveBuilder) {
    action.builder = {
      b: normalizeAddress(effectiveBuilder.address),
      f: effectiveBuilder.fee
    };
  }
  const effectiveNonce = nonce ?? Date.now();
  const signature = await signL1Action({
    wallet,
    action,
    nonce: effectiveNonce,
    ...vaultAddress ? { vaultAddress } : {},
    ...typeof expiresAfter === "number" ? { expiresAfter } : {},
    isTestnet: inferredEnvironment === "testnet"
  });
  const body = {
    action,
    nonce: effectiveNonce,
    signature
  };
  if (vaultAddress) {
    body.vaultAddress = normalizeAddress(vaultAddress);
  }
  if (typeof expiresAfter === "number") {
    body.expiresAfter = expiresAfter;
  }
  const response = await fetch(`${resolvedBaseUrl}/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const rawText = await response.text().catch(() => null);
  let parsed = null;
  if (rawText && rawText.length) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }
  }
  const json = parsed && typeof parsed === "object" && "status" in parsed ? parsed : null;
  if (!response.ok || !json) {
    const detail = parsed?.error ?? parsed?.message ?? (typeof parsed === "string" ? parsed : rawText);
    const suffix = detail ? ` Detail: ${detail}` : "";
    throw new HyperliquidApiError(
      `Failed to submit Hyperliquid order.${suffix}`,
      parsed ?? rawText ?? { status: response.status }
    );
  }
  if (json.status !== "ok") {
    const detail = parsed?.error ?? rawText;
    throw new HyperliquidApiError(
      detail ? `Hyperliquid API returned an error status: ${detail}` : "Hyperliquid API returned an error status.",
      json
    );
  }
  const statuses = json.response?.data?.statuses ?? [];
  const errorStatuses = statuses.filter(
    (entry) => Boolean(
      entry && typeof entry === "object" && "error" in entry && typeof entry.error === "string"
    )
  );
  if (errorStatuses.length) {
    const message = errorStatuses.map((entry) => entry.error).join(", ");
    throw new HyperliquidApiError(
      message || "Hyperliquid rejected the order.",
      json
    );
  }
  return json;
}
async function depositToHyperliquidBridge(options) {
  const { environment, amount, wallet } = options;
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error("Deposit amount must be a positive number.");
  }
  if (parsedAmount < MIN_DEPOSIT_USDC) {
    throw new Error(`Minimum deposit is ${MIN_DEPOSIT_USDC} USDC.`);
  }
  if (!wallet.account || !wallet.walletClient) {
    throw new Error("Wallet with signing capability is required for deposit.");
  }
  const bridgeAddress = getBridgeAddress(environment);
  const usdcAddress = getUsdcAddress(environment);
  const amountUnits = parseUnits(amount, 6);
  if (!wallet.walletClient || !wallet.publicClient) {
    throw new Error(
      "Wallet client and public client are required for deposit."
    );
  }
  const walletClient = wallet.walletClient;
  const publicClient = wallet.publicClient;
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [bridgeAddress, amountUnits]
  });
  const txHash = await walletClient.sendTransaction({
    account: wallet.account,
    to: usdcAddress,
    data
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return {
    txHash,
    amount: parsedAmount,
    amountUnits: amountUnits.toString(),
    environment,
    bridgeAddress
  };
}
async function withdrawFromHyperliquid(options) {
  const { environment, amount, destination, wallet } = options;
  const normalizedAmount = normalizePositiveDecimalString(
    amount,
    "Withdraw amount"
  );
  const parsedAmount = Number.parseFloat(normalizedAmount);
  if (!wallet.account || !wallet.walletClient || !wallet.publicClient) {
    throw new Error(
      "Wallet client and public client are required for withdraw."
    );
  }
  const signatureChainId = getSignatureChainId(environment);
  const hyperliquidChain = HL_CHAIN_LABEL[environment];
  const domain = {
    name: "HyperliquidSignTransaction",
    version: "1",
    chainId: Number.parseInt(signatureChainId, 16),
    verifyingContract: ZERO_ADDRESS
  };
  const time = BigInt(Date.now());
  const nonce = Number(time);
  const normalizedDestination = normalizeAddress(destination);
  const message = {
    hyperliquidChain,
    destination: normalizedDestination,
    amount: normalizedAmount,
    time
  };
  const types = {
    "HyperliquidTransaction:Withdraw": [
      { name: "hyperliquidChain", type: "string" },
      { name: "destination", type: "string" },
      { name: "amount", type: "string" },
      { name: "time", type: "uint64" }
    ]
  };
  const signatureHex = await wallet.walletClient.signTypedData({
    account: wallet.account,
    domain,
    types,
    primaryType: "HyperliquidTransaction:Withdraw",
    message
  });
  const signature = splitSignature(signatureHex);
  const payload = {
    action: {
      type: "withdraw3",
      signatureChainId,
      hyperliquidChain,
      destination: normalizedDestination,
      amount: normalizedAmount,
      time: nonce
    },
    nonce,
    signature
  };
  const endpoint = `${HL_ENDPOINT[environment]}/exchange`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || json?.status !== "ok") {
    throw new Error(
      `Hyperliquid withdraw failed: ${json?.response ?? json?.error ?? response.statusText}`
    );
  }
  return {
    amount: parsedAmount,
    destination: normalizedDestination,
    environment,
    nonce,
    status: json.status ?? "ok"
  };
}
async function fetchHyperliquidClearinghouseState(params) {
  const { environment, walletAddress } = params;
  const response = await fetch(`${HL_ENDPOINT[environment]}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "clearinghouseState", user: walletAddress })
  });
  const data = await response.json().catch(() => null);
  return {
    ok: response.ok,
    data
  };
}
async function approveHyperliquidBuilderFee(options) {
  const { environment, wallet, nonce, signatureChainId } = options;
  if (!wallet?.account || !wallet.walletClient) {
    throw new Error(
      "Hyperliquid builder approval requires a wallet with signing capabilities."
    );
  }
  const maxFeeRateValue = BUILDER_CODE.fee / 1e3;
  const formattedPercent = `${maxFeeRateValue}%`;
  const normalizedBuilder = normalizeAddress(BUILDER_CODE.address);
  const inferredEnvironment = environment ?? "mainnet";
  const resolvedBaseUrl = API_BASES[inferredEnvironment];
  const maxFeeRate = formattedPercent;
  const effectiveNonce = nonce ?? Date.now();
  const signatureNonce = BigInt(effectiveNonce);
  const signatureChainHex = signatureChainId ?? getSignatureChainId(inferredEnvironment);
  const approvalSignature = await signApproveBuilderFee({
    wallet,
    maxFeeRate,
    nonce: signatureNonce,
    signatureChainId: signatureChainHex,
    isTestnet: inferredEnvironment === "testnet"
  });
  const action = {
    type: "approveBuilderFee",
    maxFeeRate,
    builder: normalizedBuilder,
    hyperliquidChain: HL_CHAIN_LABEL[inferredEnvironment],
    signatureChainId: signatureChainHex,
    nonce: effectiveNonce
  };
  const payload = {
    action,
    nonce: effectiveNonce,
    signature: approvalSignature
  };
  const response = await fetch(`${resolvedBaseUrl}/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const rawText = await response.text().catch(() => null);
  let parsed = null;
  if (rawText && rawText.length) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }
  }
  const json = parsed && typeof parsed === "object" && "status" in parsed ? parsed : null;
  if (!response.ok || !json) {
    const detail = parsed?.error ?? parsed?.message ?? (typeof parsed === "string" ? parsed : rawText);
    const suffix = detail ? ` Detail: ${detail}` : "";
    throw new HyperliquidApiError(
      `Failed to submit builder approval.${suffix}`,
      parsed ?? rawText ?? { status: response.status }
    );
  }
  if (json.status !== "ok") {
    const detail = parsed?.error ?? rawText;
    throw new HyperliquidApiError(
      detail ? `Hyperliquid builder approval returned an error: ${detail}` : "Hyperliquid builder approval returned an error.",
      json
    );
  }
  return json;
}
async function getHyperliquidMaxBuilderFee(params) {
  const { environment, user } = params;
  const resolvedBaseUrl = API_BASES[environment];
  const response = await fetch(`${resolvedBaseUrl}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "maxBuilderFee",
      user: normalizeAddress(user),
      builder: BUILDER_CODE.address
    })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new HyperliquidApiError(
      "Failed to query max builder fee.",
      data ?? { status: response.status }
    );
  }
  return data;
}
async function recordHyperliquidTermsAcceptance(input) {
  const { environment, walletAddress, storeOptions } = input;
  return store(
    {
      source: "hyperliquid",
      ref: `${environment}-terms-${Date.now()}`,
      status: "info",
      walletAddress,
      action: "terms",
      metadata: {
        environment,
        note: "Hyperliquid does not expose a terms endpoint; this records local acknowledgement only."
      }
    },
    storeOptions
  );
}
async function recordHyperliquidBuilderApproval(input) {
  const { environment, walletAddress, storeOptions } = input;
  const maxFeeRate = `${BUILDER_CODE.fee / 1e3}%`;
  return store(
    {
      source: "hyperliquid",
      ref: `${environment}-builder-${Date.now()}`,
      status: "info",
      walletAddress,
      action: "builder-approval",
      metadata: {
        environment,
        builder: BUILDER_CODE.address,
        maxFeeRate
      }
    },
    storeOptions
  );
}
var __hyperliquidInternals = {
  toApiDecimal,
  createL1ActionHash,
  splitSignature
};

export { DEFAULT_HYPERLIQUID_MARKET_SLIPPAGE_BPS, HyperliquidApiError, HyperliquidBuilderApprovalError, HyperliquidExchangeClient, HyperliquidGuardError, HyperliquidInfoClient, HyperliquidTermsError, __hyperliquidInternals, __hyperliquidMarketDataInternals, approveHyperliquidBuilderFee, batchModifyHyperliquidOrders, buildHyperliquidMarketIdentity, buildHyperliquidProfileAssets, buildHyperliquidSpotUsdPriceMap, cancelAllHyperliquidOrders, cancelHyperliquidOrders, cancelHyperliquidOrdersByCloid, cancelHyperliquidTwapOrder, computeHyperliquidMarketIocLimitPrice, createHyperliquidSubAccount, createMonotonicNonceFactory, depositToHyperliquidBridge, extractHyperliquidDex, extractHyperliquidOrderIds, fetchHyperliquidAllMids, fetchHyperliquidAssetCtxs, fetchHyperliquidClearinghouseState, fetchHyperliquidFrontendOpenOrders, fetchHyperliquidHistoricalOrders, fetchHyperliquidMeta, fetchHyperliquidMetaAndAssetCtxs, fetchHyperliquidOpenOrders, fetchHyperliquidOrderStatus, fetchHyperliquidPerpMarketInfo, fetchHyperliquidPreTransferCheck, fetchHyperliquidSizeDecimals, fetchHyperliquidSpotAccountValue, fetchHyperliquidSpotAssetCtxs, fetchHyperliquidSpotClearinghouseState, fetchHyperliquidSpotMarketInfo, fetchHyperliquidSpotMeta, fetchHyperliquidSpotMetaAndAssetCtxs, fetchHyperliquidSpotTickSize, fetchHyperliquidSpotUsdPriceMap, fetchHyperliquidTickSize, fetchHyperliquidUserFills, fetchHyperliquidUserFillsByTime, fetchHyperliquidUserRateLimit, formatHyperliquidMarketablePrice, formatHyperliquidOrderSize, formatHyperliquidPrice, formatHyperliquidSize, getHyperliquidMaxBuilderFee, isHyperliquidSpotSymbol, modifyHyperliquidOrder, normalizeHyperliquidBaseSymbol, normalizeHyperliquidMetaSymbol, normalizeSpotTokenName2 as normalizeSpotTokenName, parseSpotPairSymbol, placeHyperliquidOrder, placeHyperliquidTwapOrder, readHyperliquidAccountValue, readHyperliquidNumber, readHyperliquidPerpPosition, readHyperliquidPerpPositionSize, readHyperliquidSpotAccountValue, readHyperliquidSpotBalance, readHyperliquidSpotBalanceSize, recordHyperliquidBuilderApproval, recordHyperliquidTermsAcceptance, reserveHyperliquidRequestWeight, resolveHyperliquidAbstractionFromMode, resolveHyperliquidChain, resolveHyperliquidChainConfig, resolveHyperliquidErrorDetail, resolveHyperliquidOrderRef, resolveHyperliquidOrderSymbol, resolveHyperliquidPair, resolveHyperliquidProfileChain, resolveHyperliquidRpcEnvVar, resolveHyperliquidStoreNetwork, resolveHyperliquidSymbol, resolveSpotMidCandidates, resolveSpotTokenCandidates, roundHyperliquidPriceToTick, scheduleHyperliquidCancel, sendHyperliquidSpot, setHyperliquidAccountAbstractionMode, setHyperliquidDexAbstraction, setHyperliquidPortfolioMargin, transferHyperliquidSubAccount, updateHyperliquidIsolatedMargin, updateHyperliquidLeverage, withdrawFromHyperliquid };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
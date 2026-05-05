import { encode } from '@msgpack/msgpack';
import { keccak_256 } from '@noble/hashes/sha3';
import { hexToBytes, concatBytes, bytesToHex } from '@noble/hashes/utils';
import { parseUnits, encodeFunctionData, erc20Abi } from 'viem';

// src/adapters/hyperliquid/base.ts
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
var OUTCOME_ORDER_ASSET_OFFSET = 1e8;
var OUTCOME_MARKET_DATA_PATTERN = /^#([0-9]+)$/;
var OUTCOME_TOKEN_PATTERN = /^\+([0-9]+)$/;
function parseHyperliquidOutcomeEncoding(value) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const encodedMatch = OUTCOME_MARKET_DATA_PATTERN.exec(trimmed) ?? OUTCOME_TOKEN_PATTERN.exec(trimmed);
  if (!encodedMatch) return null;
  const encoding = Number.parseInt(encodedMatch[1] ?? "", 10);
  const side = encoding % 10;
  return Number.isSafeInteger(encoding) && encoding >= 0 && side <= 1 ? encoding : null;
}
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
var normalizeText = (value) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};
var normalizeSymbolText = (value) => {
  const trimmed = value?.trim().toUpperCase();
  return trimmed ? trimmed : null;
};
var normalizeOutcomeMarketDataCoin = (value) => {
  const encoding = parseHyperliquidOutcomeEncoding(value);
  return encoding == null ? null : `#${encoding}`;
};
var normalizeOutcomeTokenName = (value) => {
  const encoding = parseHyperliquidOutcomeEncoding(value);
  return encoding == null ? null : `+${encoding}`;
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
function buildHyperliquidOutcomeMarketIdentity(input) {
  const rawSymbol = normalizeText(input.rawSymbol);
  const marketDataCoin = normalizeOutcomeMarketDataCoin(input.marketDataCoin) ?? normalizeOutcomeMarketDataCoin(rawSymbol) ?? normalizeOutcomeMarketDataCoin(input.outcomeTokenName);
  const outcomeTokenName = normalizeOutcomeTokenName(input.outcomeTokenName) ?? normalizeOutcomeTokenName(rawSymbol) ?? normalizeOutcomeTokenName(input.marketDataCoin);
  const outcomeId = typeof input.outcomeId === "number" && Number.isSafeInteger(input.outcomeId) ? input.outcomeId : typeof input.outcomeId === "string" && input.outcomeId.trim().length > 0 ? Number.parseInt(input.outcomeId, 10) : null;
  const outcomeSide = typeof input.outcomeSide === "number" && Number.isSafeInteger(input.outcomeSide) ? input.outcomeSide : typeof input.outcomeSide === "string" && input.outcomeSide.trim().length > 0 ? Number.parseInt(input.outcomeSide, 10) : null;
  const derivedEncoding = outcomeId != null && outcomeId >= 0 && outcomeSide != null && outcomeSide >= 0 && outcomeSide <= 1 ? outcomeId * 10 + outcomeSide : null;
  const derivedMarketDataCoin = marketDataCoin ?? (derivedEncoding != null ? `#${derivedEncoding}` : null);
  const positionId = normalizeText(input.positionId) ?? derivedMarketDataCoin ?? outcomeTokenName ?? null;
  const protocolMarketId = normalizeText(input.protocolMarketId) ?? normalizeText(input.roundKey) ?? normalizeText(input.seriesKey) ?? (outcomeId != null && outcomeId >= 0 ? `hip4-outcome-${outcomeId}` : null);
  if (!protocolMarketId || !positionId) return null;
  const sideName = normalizeSymbolText(input.sideName);
  const underlying = normalizeSymbolText(input.underlying);
  const base = underlying && sideName ? `${underlying}-${sideName}` : sideName ?? underlying ?? null;
  return {
    market_type: "prediction",
    venue: "hyperliquid",
    environment: input.environment,
    base,
    quote: "USDH",
    raw_symbol: rawSymbol ?? derivedMarketDataCoin ?? outcomeTokenName,
    protocol_market_id: protocolMarketId,
    position_id: positionId,
    canonical_symbol: `prediction:hyperliquid:${protocolMarketId}:${positionId}`
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
  const precision = Math.max(0, Math.min(12, Math.floor(decimals)));
  const factor = 10 ** precision;
  const scaled = price * factor;
  const directionalRounded = params.side === "buy" ? Math.ceil(scaled) / factor : Math.floor(scaled) / factor;
  return formatRoundedDecimal(directionalRounded, precision);
}
var HyperliquidApiError = class extends Error {
  constructor(message, response) {
    const responseRecord = response && typeof response === "object" ? response : null;
    const explicitErrors = Array.isArray(responseRecord?.errors) ? responseRecord.errors.filter(
      (entry) => typeof entry === "string" && entry.trim().length > 0
    ) : [];
    const bodyStatuses = responseRecord?.body && typeof responseRecord.body === "object" && responseRecord.body !== null && "response" in responseRecord.body ? (responseRecord.body.response?.data?.statuses ?? []).map((status) => typeof status?.error === "string" ? status.error : null).filter((entry) => Boolean(entry && entry.trim().length > 0)) : [];
    const singleStatusError = responseRecord?.body && typeof responseRecord.body === "object" && responseRecord.body !== null && "response" in responseRecord.body ? responseRecord.body.response?.data?.status?.error : null;
    const details = Array.from(
      new Set(
        [
          ...explicitErrors,
          ...bodyStatuses,
          typeof singleStatusError === "string" ? singleStatusError : null
        ].filter((entry) => Boolean(entry && entry.trim().length > 0))
      )
    );
    const enrichedMessage = details.length > 0 ? `${message} ${details.join(" | ")}` : message;
    super(enrichedMessage);
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
    body: JSON.stringify(dexKey ? { type: "meta", dex: dexKey } : { type: "meta" })
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
  const index = universe.findIndex((entry) => entry.name.toUpperCase() === target.toUpperCase());
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
  const index = dexs.findIndex((entry) => entry?.name?.toLowerCase() === target);
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
  const outcomeEncoding = parseHyperliquidOutcomeEncoding(trimmed);
  if (outcomeEncoding != null) {
    return OUTCOME_ORDER_ASSET_OFFSET + outcomeEncoding;
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
    const trimmed = value.trim();
    if (!trimmed.length) {
      throw new Error("Decimal strings must be non-empty.");
    }
    if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
      throw new Error("Decimal strings must be plain base-10 numbers.");
    }
    return trimmed.replace(/^(-?)0+(?=\d)/, "$1").replace(/\.0*$|(\.\d+?)0+$/, "$1").replace(/^(-?)\./, "$10.").replace(/^-?$/, "0").replace(/^-0$/, "0");
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
  const { wallet, hyperliquidChain, signatureChainId, destination, token, amount, time } = args;
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

// src/adapters/hyperliquid/symbols.ts
var UNKNOWN_SYMBOL2 = "UNKNOWN";
var OUTCOME_ORDER_ASSET_OFFSET2 = 1e8;
var OUTCOME_MARKET_DATA_PATTERN2 = /^#([0-9]+)$/;
var OUTCOME_TOKEN_PATTERN2 = /^\+([0-9]+)$/;
function extractHyperliquidDex(symbol) {
  const idx = symbol.indexOf(":");
  if (idx <= 0) return null;
  const dex = symbol.slice(0, idx).trim().toLowerCase();
  return dex || null;
}
function parseHyperliquidSymbol(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const outcome = parseHyperliquidOutcomeSymbol(trimmed);
  if (outcome) {
    return {
      raw: trimmed,
      kind: "outcome",
      normalized: outcome.marketDataCoin,
      routeTicker: outcome.routeTicker,
      displaySymbol: outcome.displaySymbol,
      base: outcome.sideName,
      quote: "USDH",
      pair: null,
      dex: null,
      leverageMode: "cross"
    };
  }
  if (trimmed.startsWith("@")) {
    return {
      raw: trimmed,
      kind: "spotIndex",
      normalized: trimmed,
      routeTicker: trimmed,
      displaySymbol: trimmed,
      base: null,
      quote: null,
      pair: null,
      dex: null,
      leverageMode: "cross"
    };
  }
  const dex = extractHyperliquidDex(trimmed);
  const pair = resolveHyperliquidPair(trimmed);
  const base = normalizeHyperliquidBaseSymbol(trimmed);
  if (dex) {
    if (!base) return null;
    return {
      raw: trimmed,
      kind: "perp",
      normalized: `${dex}:${base}`,
      routeTicker: `${dex}:${base}`,
      displaySymbol: `${dex.toUpperCase()}:${base}-USDC`,
      base,
      quote: null,
      pair: null,
      dex,
      leverageMode: "isolated"
    };
  }
  if (pair) {
    const [pairBase, pairQuote] = pair.split("/");
    return {
      raw: trimmed,
      kind: "spot",
      normalized: pair,
      routeTicker: pair.replace("/", "-"),
      displaySymbol: pair.replace("/", "-"),
      base: pairBase ?? null,
      quote: pairQuote ?? null,
      pair,
      dex: null,
      leverageMode: "cross"
    };
  }
  if (!base) return null;
  return {
    raw: trimmed,
    kind: "perp",
    normalized: base,
    routeTicker: base,
    displaySymbol: `${base}-USDC`,
    base,
    quote: null,
    pair: null,
    dex: null,
    leverageMode: "cross"
  };
}
function parseHyperliquidOutcomeSymbol(value) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const encodedMatch = OUTCOME_MARKET_DATA_PATTERN2.exec(trimmed) ?? OUTCOME_TOKEN_PATTERN2.exec(trimmed);
  if (!encodedMatch) return null;
  const encoding = Number.parseInt(encodedMatch[1] ?? "", 10);
  const outcomeId = Math.floor(encoding / 10);
  const side = encoding % 10;
  if (outcomeId == null || side == null || encoding == null || !Number.isSafeInteger(outcomeId) || !Number.isSafeInteger(side) || !Number.isSafeInteger(encoding) || outcomeId < 0 || side < 0 || side > 1 || encoding < 0) {
    return null;
  }
  const marketDataCoin = `#${encoding}`;
  const sideName = side === 0 ? "YES" : "NO";
  return {
    outcomeId,
    side,
    encoding,
    orderSymbol: marketDataCoin,
    marketDataCoin,
    tokenName: `+${encoding}`,
    sideName,
    displaySymbol: marketDataCoin,
    routeTicker: marketDataCoin,
    assetId: OUTCOME_ORDER_ASSET_OFFSET2 + encoding
  };
}
function normalizeHyperliquidQuoteSymbol(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return canonicalizeHyperliquidTokenCase(trimmed).toUpperCase();
}
function normalizeSpotTokenName2(value) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (raw.endsWith("0") && raw.length > 1) {
    return raw.slice(0, -1);
  }
  return raw;
}
function canonicalizeHyperliquidTokenCase(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed === trimmed.toLowerCase() ? trimmed.toUpperCase() : trimmed;
}
function normalizeHyperliquidBaseSymbol(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutDex = trimmed.includes(":") ? trimmed.split(":").slice(1).join(":") : trimmed;
  const base = withoutDex.split("-")[0] ?? withoutDex;
  const baseNoPair = base.split("/")[0] ?? base;
  const normalized = canonicalizeHyperliquidTokenCase(baseNoPair);
  if (!normalized || normalized === UNKNOWN_SYMBOL2) return null;
  return normalized;
}
function normalizeHyperliquidMetaSymbol(symbol) {
  const trimmed = symbol.trim();
  const noDex = trimmed.includes(":") ? trimmed.split(":").slice(1).join(":") : trimmed;
  const noPair = noDex.split("-")[0] ?? noDex;
  return (noPair.split("/")[0] ?? noPair).trim();
}
function resolveHyperliquidSpotInfoCoin(params) {
  const pair = resolveHyperliquidPair(params.pair);
  const spotIndex = typeof params.spotIndex === "number" && Number.isFinite(params.spotIndex) ? Math.max(0, Math.trunc(params.spotIndex)) : null;
  if (pair) {
    if (spotIndex === 0) {
      return pair;
    }
    if (spotIndex != null) {
      return `@${spotIndex}`;
    }
    return pair;
  }
  if (spotIndex != null && spotIndex > 0) {
    return `@${spotIndex}`;
  }
  const fallback = params.fallback?.trim();
  return fallback ? fallback : null;
}
function resolveHyperliquidPair(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutDex = trimmed.includes(":") ? trimmed.split(":").slice(1).join(":") : trimmed;
  if (withoutDex.includes("/")) {
    const [base, ...rest] = withoutDex.split("/");
    const quote = rest.join("/").trim();
    if (!base || !quote) return null;
    return `${canonicalizeHyperliquidTokenCase(base)}/${canonicalizeHyperliquidTokenCase(quote)}`;
  }
  if (withoutDex.includes("-")) {
    const [base, ...rest] = withoutDex.split("-");
    const quote = rest.join("-").trim();
    if (!base || !quote) return null;
    return `${canonicalizeHyperliquidTokenCase(base)}/${canonicalizeHyperliquidTokenCase(quote)}`;
  }
  return null;
}
function buildHyperliquidMarketDescriptor(input) {
  const rawSymbol = input.symbol?.trim();
  if (!rawSymbol) return null;
  const parsed = parseHyperliquidSymbol(rawSymbol);
  if (!parsed) return null;
  const explicitPair = resolveHyperliquidPair(input.pair);
  const explicitQuote = normalizeHyperliquidQuoteSymbol(input.quote);
  if (parsed.kind === "outcome") {
    const outcome = parseHyperliquidOutcomeSymbol(rawSymbol);
    if (!outcome) return null;
    const orderSymbol2 = input.orderSymbol?.trim() || outcome.orderSymbol;
    const marketDataCoin2 = input.marketDataCoin?.trim() || outcome.marketDataCoin;
    return {
      rawSymbol,
      kind: "outcome",
      routeTicker: outcome.routeTicker,
      displaySymbol: input.displaySymbol?.trim() || outcome.displaySymbol,
      normalized: outcome.marketDataCoin,
      orderSymbol: orderSymbol2,
      marketDataCoin: marketDataCoin2,
      base: outcome.sideName,
      quote: explicitQuote || "USDH",
      pair: null,
      canonicalPair: null,
      dex: null,
      leverageMode: "cross",
      spotIndex: null,
      assetId: input.assetId ?? outcome.assetId
    };
  }
  if (parsed.kind === "spot" || parsed.kind === "spotIndex") {
    const canonicalPair2 = explicitPair ?? parsed.pair;
    const pair = canonicalPair2;
    const [pairBase, pairQuote] = (canonicalPair2 ?? "").split("/").map((part) => canonicalizeHyperliquidTokenCase(part).toUpperCase());
    const base2 = pairBase || parsed.base;
    const quote2 = pairQuote || explicitQuote || parsed.quote;
    const normalized2 = pair ?? parsed.normalized;
    const routeTicker = pair && base2 && quote2 ? `${base2}-${quote2}` : parsed.routeTicker;
    const displaySymbol2 = input.displaySymbol?.trim() || (pair && base2 && quote2 ? `${base2}-${quote2}` : parsed.displaySymbol);
    const orderSymbol2 = input.orderSymbol?.trim() || resolveHyperliquidOrderSymbol(normalized2);
    const marketDataCoin2 = input.marketDataCoin?.trim() || resolveHyperliquidSpotInfoCoin({
      pair,
      spotIndex: input.spotIndex ?? null,
      fallback: resolveHyperliquidMarketDataCoin(normalized2)
    });
    if (!orderSymbol2 || !marketDataCoin2) return null;
    return {
      rawSymbol,
      kind: parsed.kind,
      routeTicker,
      displaySymbol: displaySymbol2,
      normalized: normalized2,
      orderSymbol: orderSymbol2,
      marketDataCoin: marketDataCoin2,
      base: base2 ?? null,
      quote: quote2 ?? null,
      pair,
      canonicalPair: pair,
      dex: null,
      leverageMode: "cross",
      spotIndex: input.spotIndex ?? null,
      assetId: input.assetId ?? null
    };
  }
  const base = parsed.base;
  const quote = explicitQuote;
  const canonicalPair = base && quote ? `${base}/${quote}` : null;
  const displaySymbol = input.displaySymbol?.trim() || (canonicalPair ? canonicalPair.replace("/", "-") : parsed.dex ? base ?? parsed.normalized : parsed.displaySymbol);
  const normalized = parsed.normalized;
  const orderSymbol = input.orderSymbol?.trim() || resolveHyperliquidOrderSymbol(normalized);
  const marketDataCoin = input.marketDataCoin?.trim() || resolveHyperliquidMarketDataCoin(normalized);
  if (!orderSymbol || !marketDataCoin) return null;
  return {
    rawSymbol,
    kind: parsed.kind,
    routeTicker: parsed.routeTicker,
    displaySymbol,
    normalized,
    orderSymbol,
    marketDataCoin,
    base,
    quote,
    pair: null,
    canonicalPair,
    dex: parsed.dex,
    leverageMode: parsed.leverageMode,
    spotIndex: input.spotIndex ?? null,
    assetId: input.assetId ?? null
  };
}
function resolveHyperliquidLeverageMode(symbol) {
  return symbol.includes(":") ? "isolated" : "cross";
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
  const trimmed = symbol.trim();
  if (!trimmed) return false;
  if (parseHyperliquidOutcomeSymbol(trimmed)) return false;
  if (trimmed.startsWith("@") || trimmed.includes("/")) return true;
  if (trimmed.includes(":")) return false;
  return resolveHyperliquidPair(trimmed) !== null;
}
function resolveHyperliquidMarketDataCoin(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const outcome = parseHyperliquidOutcomeSymbol(trimmed);
  if (outcome) return outcome.marketDataCoin;
  if (trimmed.startsWith("@")) return trimmed;
  const pair = resolveHyperliquidPair(trimmed);
  if (pair && !extractHyperliquidDex(trimmed)) {
    return pair;
  }
  return trimmed;
}
function supportsHyperliquidBuilderFee(params) {
  if (parseHyperliquidOutcomeSymbol(params.symbol)) {
    return false;
  }
  if (!isHyperliquidSpotSymbol(params.symbol)) {
    return true;
  }
  return params.side === "sell";
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
  const outcome = parseHyperliquidOutcomeSymbol(trimmed);
  if (outcome) return outcome.orderSymbol;
  if (trimmed.startsWith("@")) return trimmed;
  if (trimmed.includes(":")) {
    const [rawDex, ...restParts] = trimmed.split(":");
    const dex = rawDex.trim().toLowerCase();
    const rest = restParts.join(":");
    const normalizedBase = normalizeHyperliquidBaseSymbol(rest);
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
  const outcome = parseHyperliquidOutcomeSymbol(raw);
  if (outcome) return outcome.orderSymbol;
  if (raw.startsWith("@")) return raw;
  if (raw.includes(":")) {
    const [dexRaw, ...restParts] = raw.split(":");
    const dex = dexRaw.trim().toLowerCase();
    const rest = restParts.join(":");
    const normalizedBase = normalizeHyperliquidBaseSymbol(rest) ?? canonicalizeHyperliquidTokenCase(rest);
    if (!dex) return normalizedBase;
    return `${dex}:${normalizedBase}`;
  }
  if (raw.includes("/")) {
    return resolveHyperliquidPair(raw) ?? raw;
  }
  if (raw.includes("-")) {
    return resolveHyperliquidPair(raw) ?? raw;
  }
  return normalizeHyperliquidBaseSymbol(raw) ?? canonicalizeHyperliquidTokenCase(raw);
}
function resolveHyperliquidPerpSymbol(asset) {
  const raw = asset.trim();
  if (!raw) return raw;
  const dex = extractHyperliquidDex(raw);
  const base = normalizeHyperliquidBaseSymbol(raw) ?? raw.toUpperCase();
  return dex ? `${dex}:${base}` : base;
}
function resolveHyperliquidSpotSymbol(asset, defaultQuote = "USDC") {
  const quote = defaultQuote.trim().toUpperCase() || "USDC";
  const raw = asset.trim().toUpperCase();
  if (!raw) {
    return { symbol: raw, base: raw, quote };
  }
  const pair = resolveHyperliquidPair(raw);
  if (pair) {
    const [base2, pairQuote] = pair.split("/");
    return {
      symbol: pair,
      base: base2?.trim() ?? raw,
      quote: pairQuote?.trim() ?? quote
    };
  }
  const base = normalizeHyperliquidBaseSymbol(raw) ?? raw;
  return { symbol: `${base}/${quote}`, base, quote };
}

// src/adapters/hyperliquid/info.ts
var HYPERLIQUID_HIP3_DEXES = [
  "xyz",
  "flx",
  "vntl",
  "hyna",
  "km",
  "cash"
];
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
function mergeHyperliquidOpenOrders(batches) {
  const merged = /* @__PURE__ */ new Map();
  for (const batch of batches) {
    for (const order of batch) {
      const oid = typeof order.oid === "number" || typeof order.oid === "string" ? String(order.oid) : "no-oid";
      const cloid = typeof order.cloid === "string" && order.cloid.trim().length > 0 ? order.cloid : "no-cloid";
      merged.set(`${oid}:${cloid}`, order);
    }
  }
  return [...merged.values()];
}
function applyHyperliquidOpenOrderDexContext(orders, dex) {
  const resolvedDex = typeof dex === "string" && dex.trim().length > 0 ? dex.trim().toLowerCase() : null;
  return orders.map((order) => {
    const existingDex = typeof order.dex === "string" && order.dex.trim().length > 0 ? order.dex.trim().toLowerCase() : null;
    return {
      ...order,
      dex: existingDex ?? resolvedDex
    };
  });
}
function readNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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
  outcomeMeta() {
    return fetchHyperliquidOutcomeMeta(this.environment);
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
  activeAsset(user, symbol) {
    return fetchHyperliquidActiveAsset({
      user,
      symbol,
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
async function fetchHyperliquidDexMetaAndAssetCtxs(environment = "mainnet", dex) {
  return postInfo(environment, { type: "metaAndAssetCtxs", dex });
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
async function fetchHyperliquidOutcomeMeta(environment = "mainnet") {
  return postInfo(environment, { type: "outcomeMeta" });
}
async function fetchHyperliquidOpenOrders(params) {
  const env = params.environment ?? "mainnet";
  const orders = await postInfo(env, {
    type: "openOrders",
    user: normalizeAddress(params.user),
    ...params.dex ? { dex: params.dex.trim().toLowerCase() } : {}
  });
  return applyHyperliquidOpenOrderDexContext(orders, params.dex);
}
async function fetchHyperliquidFrontendOpenOrders(params) {
  const env = params.environment ?? "mainnet";
  const orders = await postInfo(env, {
    type: "frontendOpenOrders",
    user: normalizeAddress(params.user),
    ...params.dex ? { dex: params.dex.trim().toLowerCase() } : {}
  });
  return applyHyperliquidOpenOrderDexContext(orders, params.dex);
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
    user: normalizeAddress(params.user),
    ...params.dex ? { dex: params.dex.trim().toLowerCase() } : {}
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
function getKnownHyperliquidDexes(environment = "mainnet") {
  return environment === "mainnet" ? [...HYPERLIQUID_HIP3_DEXES] : [];
}
async function fetchHyperliquidOpenOrdersAcrossDexes(params) {
  const environment = params.environment ?? "mainnet";
  const requests = [
    ...params.includePrimary === false ? [] : [fetchHyperliquidOpenOrders({ environment, user: params.user })],
    ...getKnownHyperliquidDexes(environment).filter((dex) => !(params.dexes && !params.dexes.includes(dex))).map(
      (dex) => fetchHyperliquidOpenOrders({
        environment,
        user: params.user,
        dex
      })
    )
  ];
  const batches = await Promise.all(requests);
  return mergeHyperliquidOpenOrders(batches);
}
async function fetchHyperliquidFrontendOpenOrdersAcrossDexes(params) {
  const environment = params.environment ?? "mainnet";
  const requests = [
    ...params.includePrimary === false ? [] : [fetchHyperliquidFrontendOpenOrders({ environment, user: params.user })],
    ...getKnownHyperliquidDexes(environment).filter((dex) => !(params.dexes && !params.dexes.includes(dex))).map(
      (dex) => fetchHyperliquidFrontendOpenOrders({
        environment,
        user: params.user,
        dex
      })
    )
  ];
  const batches = await Promise.all(requests);
  return mergeHyperliquidOpenOrders(batches);
}
async function fetchHyperliquidActiveAsset(params) {
  const environment = params.environment ?? "mainnet";
  const coin = resolveHyperliquidOrderSymbol(params.symbol);
  if (!coin) {
    throw new Error(`Unable to resolve Hyperliquid active asset symbol: ${params.symbol}`);
  }
  const raw = await postInfo(environment, {
    type: "activeAssetData",
    user: normalizeAddress(params.user),
    coin
  });
  const record = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
  const leverageRecord = record?.leverage && typeof record.leverage === "object" && !Array.isArray(record.leverage) ? record.leverage : null;
  return {
    coin,
    leverage: leverageRecord && "value" in leverageRecord ? readNumber(leverageRecord.value) : readNumber(record?.leverage),
    leverageType: leverageRecord && typeof leverageRecord.type === "string" ? leverageRecord.type : null,
    raw
  };
}

// src/adapters/hyperliquid/exchange.ts
var DEFAULT_HYPERLIQUID_LEVERAGE_VERIFY_ATTEMPTS = 4;
var DEFAULT_HYPERLIQUID_LEVERAGE_VERIFY_DELAY_MS = 250;
function resolveRequiredExchangeNonce(options) {
  if (typeof options.nonce === "number") {
    return options.nonce;
  }
  const resolved = options.walletNonceProvider?.() ?? options.wallet.nonceSource?.() ?? options.nonceSource?.();
  if (resolved === void 0) {
    throw new Error(`${options.action} requires an explicit nonce or wallet nonce source.`);
  }
  return resolved;
}
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
function normalizeReportedLeverageMode(value) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "cross" || normalized === "isolated") {
    return normalized;
  }
  return null;
}
function resolveLeverageVerificationUser(options) {
  return normalizeAddress(
    options.input.verifyUser ?? options.vaultAddress ?? options.wallet.address
  );
}
async function verifyAppliedHyperliquidLeverage(params) {
  const attempts = typeof params.attempts === "number" && Number.isFinite(params.attempts) && params.attempts > 0 ? Math.max(1, Math.floor(params.attempts)) : DEFAULT_HYPERLIQUID_LEVERAGE_VERIFY_ATTEMPTS;
  const delayMs = typeof params.delayMs === "number" && Number.isFinite(params.delayMs) && params.delayMs >= 0 ? Math.max(0, Math.floor(params.delayMs)) : DEFAULT_HYPERLIQUID_LEVERAGE_VERIFY_DELAY_MS;
  let lastReportedLeverage = null;
  let lastReportedMode = null;
  for (let index = 0; index < attempts; index += 1) {
    const asset = await fetchHyperliquidActiveAsset({
      environment: params.environment,
      user: params.user,
      symbol: params.symbol
    });
    lastReportedLeverage = asset.leverage;
    lastReportedMode = normalizeReportedLeverageMode(asset.leverageType);
    const leverageMatches = asset.leverage === params.leverage;
    const modeMatches = lastReportedMode == null || lastReportedMode === params.leverageMode;
    if (leverageMatches && modeMatches) {
      return asset;
    }
    if (index < attempts - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }
  const reportedLabel = lastReportedLeverage != null ? `${lastReportedLeverage}x${lastReportedMode ? ` ${lastReportedMode}` : ""}` : "unknown leverage";
  throw new Error(
    `Hyperliquid still reports ${reportedLabel} for ${params.symbol} after requesting ${params.leverage}x ${params.leverageMode}.`
  );
}
var HyperliquidExchangeClient = class {
  constructor(args) {
    this.wallet = args.wallet;
    this.environment = args.environment ?? "mainnet";
    this.vaultAddress = args.vaultAddress;
    this.expiresAfter = args.expiresAfter;
    const resolvedNonceSource = args.walletNonceProvider ?? args.wallet.nonceSource ?? args.nonceSource;
    if (!resolvedNonceSource) {
      throw new Error("Wallet nonce source is required for Hyperliquid exchange actions.");
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
    return setHyperliquidPortfolioMargin(params.user ? { ...base, user: params.user } : base);
  }
};
async function setHyperliquidPortfolioMargin(options) {
  const env = options.environment ?? "mainnet";
  if (!options.wallet?.account || !options.wallet.walletClient) {
    throw new Error("Wallet with signing capability is required for portfolio margin.");
  }
  const nonce = resolveRequiredExchangeNonce({
    nonce: options.nonce,
    nonceSource: options.nonceSource,
    walletNonceProvider: options.walletNonceProvider,
    wallet: options.wallet,
    action: "Hyperliquid portfolio margin"
  });
  const signatureChainId = getSignatureChainId(env);
  const hyperliquidChain = HL_CHAIN_LABEL[env];
  const user = normalizeAddress(options.user ?? options.wallet.address);
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
async function setHyperliquidAccountAbstractionMode(options) {
  const env = options.environment ?? "mainnet";
  if (!options.wallet?.account || !options.wallet.walletClient) {
    throw new Error("Wallet with signing capability is required for account abstraction mode.");
  }
  const nonce = resolveRequiredExchangeNonce({
    nonce: options.nonce,
    nonceSource: options.nonceSource,
    walletNonceProvider: options.walletNonceProvider,
    wallet: options.wallet,
    action: "Hyperliquid account abstraction mode"
  });
  const signatureChainId = getSignatureChainId(env);
  const hyperliquidChain = HL_CHAIN_LABEL[env];
  const user = normalizeAddress(options.user ?? options.wallet.address);
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
    cancels: await withAssetIndexes(options, options.cancels, (idx, entry) => ({
      asset: idx,
      cloid: normalizeCloid(entry.cloid)
    }))
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
    fetcher: (...args) => fetch(...args)
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
    fetcher: (...args) => fetch(...args)
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
    fetcher: (...args) => fetch(...args)
  });
  const action = {
    type: "updateLeverage",
    asset,
    isCross: options.input.leverageMode === "cross",
    leverage: options.input.leverage
  };
  const response = await submitExchangeAction(options, action);
  if (options.input.verifyApplied === false) {
    return response;
  }
  await verifyAppliedHyperliquidLeverage({
    environment: env,
    user: resolveLeverageVerificationUser(options),
    symbol: options.input.symbol,
    leverage: options.input.leverage,
    leverageMode: options.input.leverageMode,
    ...typeof options.input.verifyAttempts === "number" ? { attempts: options.input.verifyAttempts } : {},
    ...typeof options.input.verifyDelayMs === "number" ? { delayMs: options.input.verifyDelayMs } : {}
  });
  return response;
}
async function updateHyperliquidIsolatedMargin(options) {
  assertSymbol(options.input.symbol);
  assertPositiveNumber(options.input.ntli, "ntli");
  const env = options.environment ?? "mainnet";
  const asset = await resolveHyperliquidAssetIndex({
    symbol: options.input.symbol,
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: (...args) => fetch(...args)
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
  const nonce = resolveRequiredExchangeNonce({
    nonce: options.nonce,
    nonceSource: options.nonceSource,
    wallet: options.wallet,
    action: "Hyperliquid spot send"
  });
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
        fetcher: (...args) => fetch(...args)
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
    fetcher: (...args) => fetch(...args)
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
function resolveRequiredNonce(params) {
  if (typeof params.nonce === "number") {
    return params.nonce;
  }
  const resolved = params.nonceSource?.() ?? params.wallet?.nonceSource?.();
  if (resolved === void 0) {
    throw new Error(`${params.action} requires an explicit nonce or wallet nonce source.`);
  }
  return resolved;
}
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
  if (!wallet?.account || !wallet.walletClient) {
    throw new Error("Hyperliquid order signing requires a wallet with signing capabilities.");
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
        fetcher: (...args) => fetch(...args)
      });
      const order = {
        a: assetIndex,
        b: intent.side === "buy",
        p: toApiDecimal(intent.price),
        s: toApiDecimal(intent.size),
        r: intent.reduceOnly ?? false,
        t: intent.trigger ? {
          trigger: {
            isMarket: Boolean(intent.trigger.isMarket),
            triggerPx: toApiDecimal(intent.trigger.triggerPx),
            tpsl: intent.trigger.tpsl
          }
        } : {
          limit: {
            tif: intent.tif ?? "Ioc"
          }
        },
        ...intent.clientId ? { c: normalizeCloid(intent.clientId) } : {}
      };
      return order;
    })
  );
  const action = {
    type: "order",
    orders: preparedOrders,
    grouping
  };
  if (orders.every((intent) => supportsHyperliquidBuilderFee(intent))) {
    action.builder = {
      b: normalizeAddress(BUILDER_CODE.address),
      f: BUILDER_CODE.fee
    };
  }
  const effectiveNonce = resolveRequiredNonce({
    nonce,
    nonceSource: options.nonceSource,
    wallet,
    action: "Hyperliquid order submission"
  });
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
    throw new HyperliquidApiError(message || "Hyperliquid rejected the order.", json);
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
  if (!wallet.account || !wallet.walletClient || !wallet.publicClient) {
    throw new Error("Wallet client and public client are required for deposit.");
  }
  const bridgeAddress = getBridgeAddress(environment);
  const usdcAddress = getUsdcAddress(environment);
  const amountUnits = parseUnits(amount, 6);
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [bridgeAddress, amountUnits]
  });
  const txHash = await wallet.walletClient.sendTransaction({
    account: wallet.account,
    to: usdcAddress,
    data
  });
  await wallet.publicClient.waitForTransactionReceipt({ hash: txHash });
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
  const normalizedAmount = normalizePositiveDecimalString(amount, "Withdraw amount");
  const parsedAmount = Number.parseFloat(normalizedAmount);
  if (!wallet.account || !wallet.walletClient || !wallet.publicClient) {
    throw new Error("Wallet client and public client are required for withdraw.");
  }
  const signatureChainId = getSignatureChainId(environment);
  const hyperliquidChain = HL_CHAIN_LABEL[environment];
  const nonce = resolveRequiredNonce({
    nonce: options.nonce,
    nonceSource: options.nonceSource,
    wallet,
    action: "Hyperliquid withdraw"
  });
  const time = BigInt(nonce);
  const normalizedDestination = normalizeAddress(destination);
  const signatureHex = await wallet.walletClient.signTypedData({
    account: wallet.account,
    domain: {
      name: "HyperliquidSignTransaction",
      version: "1",
      chainId: Number.parseInt(signatureChainId, 16),
      verifyingContract: ZERO_ADDRESS
    },
    types: {
      "HyperliquidTransaction:Withdraw": [
        { name: "hyperliquidChain", type: "string" },
        { name: "destination", type: "string" },
        { name: "amount", type: "string" },
        { name: "time", type: "uint64" }
      ]
    },
    primaryType: "HyperliquidTransaction:Withdraw",
    message: {
      hyperliquidChain,
      destination: normalizedDestination,
      amount: normalizedAmount,
      time
    }
  });
  const response = await fetch(`${HL_ENDPOINT[environment]}/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: {
        type: "withdraw3",
        signatureChainId,
        hyperliquidChain,
        destination: normalizedDestination,
        amount: normalizedAmount,
        time: nonce
      },
      nonce,
      signature: splitSignature(signatureHex)
    })
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
  const response = await fetch(`${HL_ENDPOINT[params.environment]}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "clearinghouseState", user: params.walletAddress })
  });
  const data = await response.json().catch(() => null);
  return { ok: response.ok, data };
}
async function approveHyperliquidBuilderFee(options) {
  const { environment, wallet, nonce, signatureChainId } = options;
  if (!wallet?.account || !wallet.walletClient) {
    throw new Error("Hyperliquid builder approval requires a wallet with signing capabilities.");
  }
  const inferredEnvironment = environment ?? "mainnet";
  const maxFeeRate = `${BUILDER_CODE.fee / 1e3}%`;
  const effectiveNonce = resolveRequiredNonce({
    nonce,
    nonceSource: options.nonceSource,
    wallet,
    action: "Hyperliquid builder approval"
  });
  const response = await fetch(`${API_BASES[inferredEnvironment]}/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: {
        type: "approveBuilderFee",
        maxFeeRate,
        builder: normalizeAddress(BUILDER_CODE.address),
        hyperliquidChain: HL_CHAIN_LABEL[inferredEnvironment],
        signatureChainId: signatureChainId ?? getSignatureChainId(inferredEnvironment),
        nonce: effectiveNonce
      },
      nonce: effectiveNonce,
      signature: await signApproveBuilderFee({
        wallet,
        maxFeeRate,
        nonce: BigInt(effectiveNonce),
        signatureChainId: signatureChainId ?? getSignatureChainId(inferredEnvironment),
        isTestnet: inferredEnvironment === "testnet"
      })
    })
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
  const response = await fetch(`${API_BASES[params.environment]}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "maxBuilderFee",
      user: normalizeAddress(params.user),
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
function createHyperliquidActionHash(params) {
  return createL1ActionHash(params);
}

// src/adapters/hyperliquid/state-readers.ts
function readHyperliquidNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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
  const coin = await fetchHyperliquidResolvedInfoCoin({
    environment: params.environment,
    symbol: params.symbol
  });
  return fetchHyperliquidTickSizeForCoin(params.environment, coin);
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
  const prices = levels.flatMap((side) => Array.isArray(side) ? side.map((entry) => String(entry?.px ?? "")) : []).filter((px) => px.length > 0);
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
        throw new Error(`No spot price available for ${normalizedBase}/${normalizedQuote}`);
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
async function fetchHyperliquidSpotMarketInfoByIndex(params) {
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
    const ctx = (marketIndex >= 0 && marketIndex < contexts.length ? contexts[marketIndex] : null) ?? contexts[idx] ?? null;
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
      throw new Error(`No spot price available for @${params.marketIndex}`);
    }
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
  throw new Error(`Unknown Hyperliquid spot market index: @${params.marketIndex}`);
}
async function fetchHyperliquidResolvedMarketDescriptor(params) {
  const parsed = parseHyperliquidSymbol(params.symbol);
  if (!parsed) {
    throw new Error(`Unable to parse Hyperliquid symbol: ${params.symbol}`);
  }
  if (parsed.kind === "outcome") {
    const descriptor2 = buildHyperliquidMarketDescriptor({
      symbol: params.symbol
    });
    if (!descriptor2) {
      throw new Error(`Unable to build Hyperliquid outcome market descriptor: ${params.symbol}`);
    }
    return descriptor2;
  }
  if (parsed.kind === "spot" || parsed.kind === "spotIndex") {
    const spotInfo = parsed.kind === "spotIndex" ? await fetchHyperliquidSpotMarketInfoByIndex({
      environment: params.environment,
      marketIndex: Number.parseInt(parsed.normalized.slice(1), 10),
      ...params.mids !== void 0 ? { mids: params.mids } : {}
    }) : await fetchHyperliquidSpotMarketInfo({
      environment: params.environment,
      base: parsed.base ?? "",
      quote: parsed.quote ?? "USDC",
      ...params.mids !== void 0 ? { mids: params.mids } : {}
    });
    const orderSymbol = resolveHyperliquidOrderSymbol(spotInfo.symbol);
    if (!orderSymbol) {
      throw new Error(`Unable to resolve Hyperliquid spot order symbol: ${params.symbol}`);
    }
    const descriptor2 = buildHyperliquidMarketDescriptor({
      symbol: params.symbol,
      pair: spotInfo.symbol,
      quote: spotInfo.quote,
      displaySymbol: `${spotInfo.base}-${spotInfo.quote}`,
      orderSymbol,
      spotIndex: spotInfo.marketIndex,
      assetId: spotInfo.assetId
    });
    if (!descriptor2) {
      throw new Error(`Unable to build Hyperliquid spot market descriptor: ${params.symbol}`);
    }
    return descriptor2;
  }
  const quote = parsed.dex ? await (async () => {
    const dex = parsed.dex;
    if (!dex) return null;
    const [dexMetaAndCtxs, spotMetaRaw] = await Promise.all([
      fetchHyperliquidDexMetaAndAssetCtxs(params.environment, dex),
      fetchHyperliquidSpotMeta(params.environment)
    ]);
    const metaHeader = Array.isArray(dexMetaAndCtxs) && dexMetaAndCtxs.length > 0 ? dexMetaAndCtxs[0] : null;
    const collateralToken = typeof metaHeader?.collateralToken === "number" ? metaHeader.collateralToken : null;
    if (collateralToken == null) return null;
    const spotMeta = spotMetaRaw;
    const token = (spotMeta.tokens ?? []).find((entry) => entry?.index === collateralToken) ?? null;
    return normalizeSpotTokenName2(token?.name).toUpperCase() || null;
  })() : "USDC";
  const descriptor = buildHyperliquidMarketDescriptor({
    symbol: params.symbol,
    ...quote ? { quote } : {}
  });
  if (!descriptor) {
    throw new Error(`Unable to build Hyperliquid market descriptor: ${params.symbol}`);
  }
  return descriptor;
}
async function fetchHyperliquidResolvedInfoCoin(params) {
  const descriptor = await fetchHyperliquidResolvedMarketDescriptor(params);
  return descriptor.marketDataCoin;
}
async function fetchHyperliquidSizeDecimals(params) {
  const { symbol, environment } = params;
  const parsed = parseHyperliquidSymbol(symbol);
  if (parsed?.kind === "outcome") {
    return 0;
  }
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
  if (match && typeof match.szDecimals === "number") {
    return match.szDecimals;
  }
  const dex = parsed?.dex ?? null;
  if (!dex) {
    throw new Error(`No size decimals found for ${symbol}.`);
  }
  const dexMetaAndCtxs = await fetchHyperliquidDexMetaAndAssetCtxs(environment, dex);
  const dexUniverse = Array.isArray(dexMetaAndCtxs?.[0]?.universe) ? dexMetaAndCtxs[0].universe : [];
  const dexMatch = dexUniverse.find(
    (entry) => normalizeHyperliquidMetaSymbol(entry?.name ?? "").toUpperCase() === normalized
  );
  const dexSizeDecimals = readHyperliquidNumber(dexMatch?.szDecimals);
  if (dexSizeDecimals == null) {
    throw new Error(`No size decimals found for ${symbol}.`);
  }
  return dexSizeDecimals;
}

// src/adapters/hyperliquid/order-utils.ts
function countDecimalPlaces(value) {
  const [, dec = ""] = value.split(".");
  return dec.length;
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
  roundInteger(value, mode) {
    const normalized = normalizeDecimalString(value);
    const negative = normalized.startsWith("-");
    if (negative) {
      throw new RangeError("Directional rounding only supports positive values.");
    }
    const [intPartRaw, fracPart = ""] = normalized.split(".");
    const intPart = intPartRaw.replace(/^0+(?=\d)/, "") || "0";
    const hasFraction = /[1-9]/.test(fracPart);
    if (!hasFraction) return intPart;
    if (mode === "down") return intPart;
    const digits = intPart.split("");
    let carry = 1;
    for (let idx = digits.length - 1; idx >= 0 && carry > 0; idx -= 1) {
      const next = Number(digits[idx] ?? "0") + carry;
      digits[idx] = String(next % 10);
      carry = next >= 10 ? 1 : 0;
    }
    if (carry > 0) {
      digits.unshift("1");
    }
    return digits.join("").replace(/^0+(?=\d)/, "") || "0";
  },
  toPrecisionDirectional(value, precision, mode) {
    if (!Number.isInteger(precision) || precision < 1) {
      throw new RangeError("Precision must be a positive integer.");
    }
    if (/^-?0+(\.0*)?$/.test(value)) return "0";
    const negative = value.startsWith("-");
    const abs = negative ? value.slice(1) : value;
    const magnitude = StringMath.log10Floor(abs);
    const shiftAmount = precision - magnitude - 1;
    const shifted = StringMath.multiplyByPow10(abs, shiftAmount);
    const rounded = StringMath.roundInteger(shifted, mode);
    const shiftedBack = StringMath.multiplyByPow10(rounded, -shiftAmount);
    return normalizeDecimalString(negative ? `-${shiftedBack}` : shiftedBack);
  },
  toFixedDirectional(value, decimals, mode) {
    if (!Number.isInteger(decimals) || decimals < 0) {
      throw new RangeError("Decimals must be a non-negative integer.");
    }
    if (decimals === 0) {
      return normalizeDecimalString(StringMath.roundInteger(value, mode));
    }
    const shifted = StringMath.multiplyByPow10(value, decimals);
    const rounded = StringMath.roundInteger(shifted, mode);
    return normalizeDecimalString(StringMath.multiplyByPow10(rounded, -decimals));
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
function ceilDiv(numerator, denominator) {
  if (denominator <= 0n) {
    throw new RangeError("Denominator must be positive.");
  }
  return (numerator + denominator - 1n) / denominator;
}
function scaleDecimalToInt(value, decimals, mode) {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new RangeError("Decimals must be a non-negative integer.");
  }
  const normalized = normalizeDecimalString(value);
  assertNumberString(normalized);
  const negative = normalized.startsWith("-");
  if (negative) {
    throw new RangeError("Only positive values are supported.");
  }
  const shifted = StringMath.multiplyByPow10(normalized, decimals);
  const rounded = StringMath.roundInteger(shifted, mode);
  return BigInt(rounded);
}
function formatScaledDecimal(value, decimals) {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new RangeError("Decimals must be a non-negative integer.");
  }
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const raw = abs.toString();
  if (decimals === 0) {
    return `${negative ? "-" : ""}${raw}`;
  }
  const padded = raw.padStart(decimals + 1, "0");
  const intPart = padded.slice(0, -decimals) || "0";
  const fracPart = padded.slice(-decimals);
  return normalizeDecimalString(`${negative ? "-" : ""}${intPart}.${fracPart}`);
}
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
function resolveSizeDecimals(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 8;
  return Math.max(0, Math.min(8, Math.floor(value)));
}
function formatDirectionalHyperliquidPrice(price, params) {
  const normalized = price.toString().trim();
  assertNumberString(normalized);
  if (/^-?\d+$/.test(normalized)) {
    return normalizeDecimalString(normalized);
  }
  const szDecimals = resolveSizeDecimals(params.szDecimals);
  const maxDecimals2 = Math.max((params.marketType === "perp" ? 6 : 8) - szDecimals, 0);
  const decimalsAdjusted = StringMath.toFixedDirectional(normalized, maxDecimals2, params.mode);
  const sigFigAdjusted = StringMath.toPrecisionDirectional(
    decimalsAdjusted,
    5,
    params.mode
  );
  return sigFigAdjusted === "0" ? null : sigFigAdjusted;
}
function roundHyperliquidPriceToTick(price, tick, side) {
  if (!Number.isFinite(tick.tickDecimals) || tick.tickDecimals < 0) {
    throw new Error("tick.tickDecimals must be a non-negative number.");
  }
  if (tick.tickSizeInt <= 0n) {
    throw new Error("tick.tickSizeInt must be positive.");
  }
  const normalized = normalizeDecimalString(price.toString());
  assertNumberString(normalized);
  if (Number.parseFloat(normalized) <= 0) {
    throw new Error("Price must be positive.");
  }
  const scaled = scaleDecimalToInt(
    normalized,
    tick.tickDecimals,
    side === "buy" ? "up" : "down"
  );
  const tickSize = tick.tickSizeInt;
  const rounded = side === "sell" ? scaled / tickSize * tickSize : (scaled + tickSize - 1n) / tickSize * tickSize;
  return formatScaledDecimal(rounded, tick.tickDecimals);
}
function formatHyperliquidMarketablePrice(params) {
  const { mid, side, slippageBps, tick, szDecimals, marketType = "perp" } = params;
  if (!Number.isFinite(mid) || mid <= 0) {
    throw new Error("mid must be a positive number.");
  }
  if (!Number.isFinite(slippageBps) || slippageBps < 0) {
    throw new Error("slippageBps must be a non-negative number.");
  }
  const adjustedMid = mid * (side === "buy" ? 1 + slippageBps / 1e4 : 1 - slippageBps / 1e4);
  if (typeof szDecimals === "number" && Number.isFinite(szDecimals)) {
    const formatted = formatDirectionalHyperliquidPrice(adjustedMid, {
      szDecimals,
      marketType,
      mode: side === "buy" ? "up" : "down"
    });
    if (!formatted) {
      throw new RangeError("Marketable price is too small and was truncated to 0.");
    }
    return tick ? roundHyperliquidPriceToTick(formatted, tick, side) : formatted;
  }
  const midString = normalizeDecimalString(mid.toString());
  const baseDecimals = countDecimalPlaces(midString);
  const workDecimals = Math.max(baseDecimals + 4, tick?.tickDecimals ?? 0, 8);
  const scaledMid = scaleDecimalToInt(midString, workDecimals, "down");
  const slippageNumerator = BigInt(
    side === "buy" ? 1e4 + slippageBps : 1e4 - slippageBps
  );
  const adjustedScaled = side === "buy" ? ceilDiv(scaledMid * slippageNumerator, 10000n) : scaledMid * slippageNumerator / 10000n;
  const adjustedString = formatScaledDecimal(adjustedScaled, workDecimals);
  if (tick) {
    return roundHyperliquidPriceToTick(adjustedString, tick, side);
  }
  const roundedScaled = scaleDecimalToInt(
    adjustedString,
    baseDecimals,
    side === "buy" ? "up" : "down"
  );
  return formatScaledDecimal(roundedScaled, baseDecimals);
}

// src/adapters/hyperliquid/tpsl.ts
var DEFAULT_HYPERLIQUID_TPSL_MARKET_SLIPPAGE_BPS = 1e3;
function toDecimalInput(value, label) {
  if (typeof value === "bigint") {
    if (value <= 0n) {
      throw new Error(`${label} must be positive.`);
    }
    return value.toString();
  }
  return value;
}
function toPositiveNumber(value, label) {
  if (typeof value === "bigint") {
    if (value <= 0n) {
      throw new Error(`${label} must be positive.`);
    }
    return Number(value);
  }
  const numeric = typeof value === "number" ? value : Number.parseFloat(value.toString().trim());
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`${label} must be positive.`);
  }
  return numeric;
}
function normalizeExecutionType(value) {
  return value ?? "market";
}
function assertSupportedParentOrder(parent) {
  if (parent.reduceOnly) {
    throw new Error(
      "Reduce-only parent orders are not supported with attached TP/SL. Use placeHyperliquidPositionTpSl for existing positions."
    );
  }
}
function resolveTriggerDirection(params) {
  const isLong = params.parentSide === "buy";
  if (params.leg === "tp") {
    if (isLong && params.triggerPx <= params.referencePrice) {
      throw new Error("Take profit trigger must be above the current price for long positions.");
    }
    if (!isLong && params.triggerPx >= params.referencePrice) {
      throw new Error("Take profit trigger must be below the current price for short positions.");
    }
    return;
  }
  if (isLong && params.triggerPx >= params.referencePrice) {
    throw new Error("Stop loss trigger must be below the current price for long positions.");
  }
  if (!isLong && params.triggerPx <= params.referencePrice) {
    throw new Error("Stop loss trigger must be above the current price for short positions.");
  }
}
async function buildTpSlChildOrder(params) {
  const marketType = isHyperliquidSpotSymbol(params.symbol) ? "spot" : "perp";
  const [szDecimals, tick] = await Promise.all([
    fetchHyperliquidSizeDecimals({
      environment: params.environment,
      symbol: params.symbol
    }),
    fetchHyperliquidTickSize({
      environment: params.environment,
      symbol: params.symbol
    }).catch(() => null)
  ]);
  const childSide = params.parentSide === "buy" ? "sell" : "buy";
  const triggerPxNumeric = toPositiveNumber(params.leg.triggerPx, `${params.legType} triggerPx`);
  resolveTriggerDirection({
    leg: params.legType,
    parentSide: params.parentSide,
    referencePrice: params.referencePrice,
    triggerPx: triggerPxNumeric
  });
  const execution = normalizeExecutionType(params.leg.execution);
  const size = formatHyperliquidSize(toDecimalInput(params.size, "size"), szDecimals);
  const triggerPx = formatHyperliquidPrice(triggerPxNumeric, szDecimals, marketType);
  const explicitLimitPrice = params.leg.price != null ? toDecimalInput(params.leg.price, `${params.legType} price`) : null;
  const explicitLimitPriceNumeric = explicitLimitPrice != null ? toPositiveNumber(explicitLimitPrice, `${params.legType} price`) : null;
  if (execution === "limit" && explicitLimitPriceNumeric == null) {
    throw new Error(`${params.legType} limit price is required for limit execution.`);
  }
  if (execution === "limit" && explicitLimitPriceNumeric != null) {
    if (childSide === "sell" && explicitLimitPriceNumeric > triggerPxNumeric) {
      throw new Error(`${params.legType} sell limit price must be at or below the trigger price.`);
    }
    if (childSide === "buy" && explicitLimitPriceNumeric < triggerPxNumeric) {
      throw new Error(`${params.legType} buy limit price must be at or above the trigger price.`);
    }
  }
  const price = execution === "limit" ? formatHyperliquidPrice(
    explicitLimitPrice,
    szDecimals,
    marketType
  ) : formatHyperliquidMarketablePrice({
    mid: triggerPxNumeric,
    side: childSide,
    slippageBps: params.triggerMarketSlippageBps,
    tick,
    szDecimals,
    marketType
  });
  return {
    symbol: params.symbol,
    side: childSide,
    price,
    size,
    reduceOnly: true,
    trigger: {
      triggerPx,
      isMarket: execution === "market",
      tpsl: params.legType
    },
    ...params.leg.clientId ? { clientId: params.leg.clientId } : {}
  };
}
async function buildAttachedTpSlOrders(params) {
  const referencePrice = toPositiveNumber(params.referencePrice, "referencePrice");
  const legs = await Promise.all(
    [
      params.takeProfit ? buildTpSlChildOrder({
        symbol: params.symbol,
        parentSide: params.parentSide,
        size: params.size,
        referencePrice,
        legType: "tp",
        leg: params.takeProfit,
        environment: params.environment,
        triggerMarketSlippageBps: params.triggerMarketSlippageBps
      }) : null,
      params.stopLoss ? buildTpSlChildOrder({
        symbol: params.symbol,
        parentSide: params.parentSide,
        size: params.size,
        referencePrice,
        legType: "sl",
        leg: params.stopLoss,
        environment: params.environment,
        triggerMarketSlippageBps: params.triggerMarketSlippageBps
      }) : null
    ]
  );
  return legs.filter((entry) => Boolean(entry));
}
async function placeHyperliquidOrderWithTpSl(options) {
  assertSupportedParentOrder(options.parent);
  const env = options.environment ?? "mainnet";
  const childOrders = await buildAttachedTpSlOrders({
    symbol: options.parent.symbol,
    parentSide: options.parent.side,
    size: options.parent.size,
    referencePrice: options.referencePrice,
    takeProfit: options.takeProfit ?? null,
    stopLoss: options.stopLoss ?? null,
    environment: env,
    triggerMarketSlippageBps: options.triggerMarketSlippageBps ?? DEFAULT_HYPERLIQUID_TPSL_MARKET_SLIPPAGE_BPS
  });
  return placeHyperliquidOrder({
    wallet: options.wallet,
    orders: [options.parent, ...childOrders],
    grouping: options.grouping ?? "normalTpsl",
    environment: env,
    ...options.vaultAddress ? { vaultAddress: options.vaultAddress } : {},
    ...typeof options.expiresAfter === "number" ? { expiresAfter: options.expiresAfter } : {},
    ...typeof options.nonce === "number" ? { nonce: options.nonce } : {},
    ...options.nonceSource ? { nonceSource: options.nonceSource } : {}
  });
}
async function placeHyperliquidPositionTpSl(options) {
  const env = options.environment ?? "mainnet";
  const parentSide = options.positionSide === "long" ? "buy" : "sell";
  const childOrders = await buildAttachedTpSlOrders({
    symbol: options.symbol,
    parentSide,
    size: options.size,
    referencePrice: options.referencePrice,
    takeProfit: options.takeProfit ?? null,
    stopLoss: options.stopLoss ?? null,
    environment: env,
    triggerMarketSlippageBps: options.triggerMarketSlippageBps ?? DEFAULT_HYPERLIQUID_TPSL_MARKET_SLIPPAGE_BPS
  });
  if (childOrders.length === 0) {
    throw new Error("At least one TP or SL order is required.");
  }
  return placeHyperliquidOrder({
    wallet: options.wallet,
    orders: childOrders,
    grouping: options.grouping ?? "positionTpsl",
    environment: env,
    ...options.vaultAddress ? { vaultAddress: options.vaultAddress } : {},
    ...typeof options.expiresAfter === "number" ? { expiresAfter: options.expiresAfter } : {},
    ...typeof options.nonce === "number" ? { nonce: options.nonce } : {},
    ...options.nonceSource ? { nonceSource: options.nonceSource } : {}
  });
}

// src/adapters/hyperliquid/risk-utils.ts
function toFinitePositive(value) {
  return Number.isFinite(value) && value > 0 ? value : null;
}
function estimateMaintenanceLeverage(maxLeverage) {
  const normalized = toFinitePositive(maxLeverage);
  if (!normalized) return null;
  return normalized * 2;
}
function estimateHyperliquidLiquidationPrice(params) {
  const entryPrice = toFinitePositive(params.entryPrice);
  const notionalUsd = toFinitePositive(params.notionalUsd);
  const leverage = toFinitePositive(params.leverage);
  const maintenanceLeverage = estimateMaintenanceLeverage(params.maxLeverage);
  if (!entryPrice || !notionalUsd || !leverage || !maintenanceLeverage) {
    return null;
  }
  const size = notionalUsd / entryPrice;
  if (!Number.isFinite(size) || size <= 0) {
    return null;
  }
  const isolatedMargin = notionalUsd / leverage;
  const marginAvailable = params.marginMode === "cross" ? Math.max(
    toFinitePositive(params.availableCollateralUsd ?? 0) ?? isolatedMargin,
    isolatedMargin
  ) : isolatedMargin;
  const sideSign = params.side === "buy" ? 1 : -1;
  const maintenanceFactor = 1 / maintenanceLeverage;
  const denominator = 1 - maintenanceFactor * sideSign;
  if (!Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  const liquidationPrice = entryPrice - sideSign * (marginAvailable / size) / denominator;
  if (!Number.isFinite(liquidationPrice) || liquidationPrice <= 0) {
    return null;
  }
  return liquidationPrice;
}

export { DEFAULT_HYPERLIQUID_MARKET_SLIPPAGE_BPS, DEFAULT_HYPERLIQUID_TPSL_MARKET_SLIPPAGE_BPS, HYPERLIQUID_HIP3_DEXES, HyperliquidApiError, HyperliquidBuilderApprovalError, HyperliquidExchangeClient, HyperliquidGuardError, HyperliquidInfoClient, HyperliquidTermsError, approveHyperliquidBuilderFee, batchModifyHyperliquidOrders, buildHyperliquidMarketDescriptor, buildHyperliquidMarketIdentity, buildHyperliquidOutcomeMarketIdentity, buildHyperliquidProfileAssets, cancelAllHyperliquidOrders, cancelHyperliquidOrders, cancelHyperliquidOrdersByCloid, cancelHyperliquidTwapOrder, computeHyperliquidMarketIocLimitPrice, createHyperliquidActionHash, createHyperliquidSubAccount, createMonotonicNonceFactory, depositToHyperliquidBridge, estimateHyperliquidLiquidationPrice, extractHyperliquidDex, fetchHyperliquidActiveAsset, fetchHyperliquidAssetCtxs, fetchHyperliquidClearinghouseState, fetchHyperliquidDexMetaAndAssetCtxs, fetchHyperliquidFrontendOpenOrders, fetchHyperliquidFrontendOpenOrdersAcrossDexes, fetchHyperliquidHistoricalOrders, fetchHyperliquidMeta, fetchHyperliquidMetaAndAssetCtxs, fetchHyperliquidOpenOrders, fetchHyperliquidOpenOrdersAcrossDexes, fetchHyperliquidOrderStatus, fetchHyperliquidPreTransferCheck, fetchHyperliquidResolvedInfoCoin, fetchHyperliquidResolvedMarketDescriptor, fetchHyperliquidSizeDecimals, fetchHyperliquidSpotAssetCtxs, fetchHyperliquidSpotClearinghouseState, fetchHyperliquidSpotMeta, fetchHyperliquidSpotMetaAndAssetCtxs, fetchHyperliquidTickSize, fetchHyperliquidUserFills, fetchHyperliquidUserFillsByTime, fetchHyperliquidUserRateLimit, formatHyperliquidMarketablePrice, formatHyperliquidPrice, formatHyperliquidSize, getHyperliquidMaxBuilderFee, getKnownHyperliquidDexes, isHyperliquidSpotSymbol, modifyHyperliquidOrder, normalizeHyperliquidBaseSymbol, normalizeHyperliquidMetaSymbol, normalizeSpotTokenName2 as normalizeSpotTokenName, parseHyperliquidOutcomeSymbol, parseHyperliquidSymbol, parseSpotPairSymbol, placeHyperliquidOrder, placeHyperliquidOrderWithTpSl, placeHyperliquidPositionTpSl, placeHyperliquidTwapOrder, reserveHyperliquidRequestWeight, resolveHyperliquidAbstractionFromMode, resolveHyperliquidLeverageMode, resolveHyperliquidMarketDataCoin, resolveHyperliquidOrderSymbol, resolveHyperliquidPair, resolveHyperliquidPerpSymbol, resolveHyperliquidProfileChain, resolveHyperliquidSpotSymbol, resolveHyperliquidSymbol, resolveSpotMidCandidates, resolveSpotTokenCandidates, scheduleHyperliquidCancel, sendHyperliquidSpot, setHyperliquidAccountAbstractionMode, setHyperliquidPortfolioMargin, supportsHyperliquidBuilderFee, transferHyperliquidSubAccount, updateHyperliquidIsolatedMargin, updateHyperliquidLeverage, withdrawFromHyperliquid };
//# sourceMappingURL=browser.js.map
//# sourceMappingURL=browser.js.map
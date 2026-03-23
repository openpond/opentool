import { createHmac, randomBytes } from 'crypto';
import { parseUnits } from 'viem';

// src/adapters/polymarket/base.ts
var PolymarketApiError = class extends Error {
  constructor(message, response) {
    super(message);
    this.response = response;
    this.name = "PolymarketApiError";
  }
};
var PolymarketAuthError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "PolymarketAuthError";
  }
};
var POLYMARKET_ENDPOINTS = {
  gamma: {
    mainnet: "https://gamma-api.polymarket.com",
    testnet: "https://gamma-api.polymarket.com"
  },
  clob: {
    mainnet: "https://clob.polymarket.com",
    testnet: "https://clob.polymarket.com"
  },
  data: {
    mainnet: "https://data-api.polymarket.com",
    testnet: "https://data-api.polymarket.com"
  }
};
var POLYMARKET_CHAIN_ID = {
  mainnet: 137,
  testnet: 80002
};
var POLYMARKET_EXCHANGE_ADDRESSES = {
  mainnet: {
    ctf: "0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
    negRisk: "0xc5d563a36ae78145c45a50134d48a1215220f80a"
  },
  testnet: {
    ctf: "0xdfe02eb6733538f8ea35d585af8de5958ad99e40",
    negRisk: "0xdfe02eb6733538f8ea35d585af8de5958ad99e40"
  }
};
var POLYMARKET_CLOB_DOMAIN = {
  name: "Polymarket CTF Exchange",
  version: "1"
};
var POLYMARKET_CLOB_AUTH_DOMAIN = {
  name: "ClobAuthDomain",
  version: "1"
};
var ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
function resolvePolymarketBaseUrl(service, environment) {
  return POLYMARKET_ENDPOINTS[service][environment];
}
function assertWalletSigner(wallet) {
  if (!wallet?.account || !wallet.walletClient) {
    throw new Error("Polymarket requires a wallet with signing capabilities.");
  }
}
function toDecimalString(value) {
  if (typeof value === "string") return value;
  if (typeof value === "bigint") return value.toString();
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
function normalizeArrayish(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [trimmed];
  }
  return [];
}
function normalizeStringArrayish(value) {
  return normalizeArrayish(value).map((entry) => entry == null ? "" : String(entry).trim()).filter((entry) => entry.length > 0);
}
function normalizeNumberArrayish(value) {
  return normalizeArrayish(value).map((entry) => typeof entry === "number" ? entry : Number.parseFloat(String(entry))).filter((entry) => Number.isFinite(entry));
}
function normalizeTags(value) {
  if (!Array.isArray(value)) return [];
  const tags = value.map((entry) => {
    if (entry && typeof entry === "object") {
      const record = entry;
      const label = record.label ?? record.id ?? record.tag;
      return label ? String(label).trim() : "";
    }
    return String(entry ?? "").trim();
  }).filter((entry) => entry.length > 0);
  return Array.from(new Set(tags));
}
function parseOptionalDate(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const ts = value > 1e12 ? value : value * 1e3;
    const date = new Date(ts);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}
function buildHmacSignature(args) {
  const timestamp = args.timestamp.toString();
  const method = args.method.toUpperCase();
  const path = args.path;
  const body = args.body == null ? "" : typeof args.body === "string" ? args.body : JSON.stringify(args.body);
  const payload = `${timestamp}${method}${path}${body}`;
  const key = Buffer.from(args.secret, "base64");
  return createHmac("sha256", key).update(payload).digest("hex");
}
function buildL2Headers(args) {
  const timestamp = args.timestamp ?? Math.floor(Date.now() / 1e3);
  const signature = buildHmacSignature({
    secret: args.credentials.secret,
    timestamp,
    method: args.method,
    path: args.path,
    body: args.body ?? null
  });
  return {
    POLY_ADDRESS: args.address,
    POLY_API_KEY: args.credentials.apiKey,
    POLY_PASSPHRASE: args.credentials.passphrase,
    POLY_TIMESTAMP: timestamp.toString(),
    POLY_SIGNATURE: signature
  };
}
async function buildL1Headers(args) {
  assertWalletSigner(args.wallet);
  const timestamp = args.timestamp ?? Math.floor(Date.now() / 1e3);
  const nonce = args.nonce ?? Date.now();
  const chainId = POLYMARKET_CHAIN_ID[args.environment ?? "mainnet"];
  const address = args.wallet.address;
  const message = args.message ?? "Create or derive a Polymarket API key";
  const signature = await args.wallet.walletClient.signTypedData({
    account: args.wallet.account,
    domain: {
      ...POLYMARKET_CLOB_AUTH_DOMAIN,
      chainId
    },
    types: {
      ClobAuth: [
        { name: "address", type: "address" },
        { name: "timestamp", type: "string" },
        { name: "nonce", type: "uint256" },
        { name: "message", type: "string" }
      ]
    },
    primaryType: "ClobAuth",
    message: {
      address,
      timestamp: timestamp.toString(),
      nonce: BigInt(nonce),
      message
    }
  });
  return {
    POLY_ADDRESS: address,
    POLY_TIMESTAMP: timestamp.toString(),
    POLY_NONCE: nonce.toString(),
    POLY_SIGNATURE: signature
  };
}
function resolveExchangeAddress(args) {
  if (args.exchangeAddress) return args.exchangeAddress;
  const env = args.environment;
  return args.negRisk ? POLYMARKET_EXCHANGE_ADDRESSES[env].negRisk : POLYMARKET_EXCHANGE_ADDRESSES[env].ctf;
}
function parseUintString(value, name) {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${name} must be a base-10 integer string.`);
  }
  return BigInt(trimmed);
}
function buildPolymarketOrderAmounts(args) {
  const priceStr = toDecimalString(args.price);
  const sizeStr = toDecimalString(args.size);
  if (!priceStr || !sizeStr) {
    throw new Error("Order price and size are required.");
  }
  const priceFloat = Number(priceStr);
  if (!Number.isFinite(priceFloat) || priceFloat <= 0 || priceFloat >= 1) {
    throw new Error("Order price must be between 0 and 1 (exclusive).");
  }
  const sizeFloat = Number(sizeStr);
  if (!Number.isFinite(sizeFloat) || sizeFloat <= 0) {
    throw new Error("Order size must be positive.");
  }
  let priceUnits = parseUnits(priceStr, 6);
  if (args.tickSize !== void 0) {
    const tickUnits = parseUnits(toDecimalString(args.tickSize), 6);
    if (tickUnits <= 0n) {
      throw new Error("tickSize must be positive.");
    }
    priceUnits = priceUnits / tickUnits * tickUnits;
  }
  const sizeUnits = parseUnits(sizeStr, 6);
  const quoteUnits = priceUnits * sizeUnits / 1000000n;
  if (args.side === "BUY") {
    return { makerAmount: quoteUnits, takerAmount: sizeUnits };
  }
  return { makerAmount: sizeUnits, takerAmount: quoteUnits };
}
async function buildSignedOrderPayload(args) {
  assertWalletSigner(args.wallet);
  const environment = args.environment ?? "mainnet";
  const chainId = POLYMARKET_CHAIN_ID[environment];
  const exchangeAddress = resolveExchangeAddress({
    environment,
    ...args.negRisk !== void 0 ? { negRisk: args.negRisk } : {},
    ...args.exchangeAddress ? { exchangeAddress: args.exchangeAddress } : {}
  });
  const maker = args.maker ?? args.wallet.address;
  const signer = args.signer ?? args.wallet.address;
  const taker = args.taker ?? ZERO_ADDRESS;
  const sideValue = args.side === "BUY" ? 0 : 1;
  const signatureType = args.signatureType ?? 0;
  const tokenIdValue = args.tokenId.startsWith("0x") ? BigInt(args.tokenId) : parseUintString(args.tokenId, "tokenId");
  const { makerAmount, takerAmount } = buildPolymarketOrderAmounts({
    side: args.side,
    price: args.price,
    size: args.size,
    ...args.tickSize !== void 0 ? { tickSize: args.tickSize } : {}
  });
  const salt = BigInt(`0x${randomBytes(16).toString("hex")}`);
  const expiration = BigInt(args.expiration ?? 0);
  const nonce = BigInt(args.nonce ?? 0);
  const feeRateBps = BigInt(args.feeRateBps ?? 0);
  const message = {
    salt,
    maker,
    signer,
    taker,
    tokenId: tokenIdValue,
    makerAmount,
    takerAmount,
    expiration,
    nonce,
    feeRateBps,
    side: sideValue,
    signatureType
  };
  const signature = await args.wallet.walletClient.signTypedData({
    account: args.wallet.account,
    domain: {
      ...POLYMARKET_CLOB_DOMAIN,
      chainId,
      verifyingContract: exchangeAddress
    },
    types: {
      Order: [
        { name: "salt", type: "uint256" },
        { name: "maker", type: "address" },
        { name: "signer", type: "address" },
        { name: "taker", type: "address" },
        { name: "tokenId", type: "uint256" },
        { name: "makerAmount", type: "uint256" },
        { name: "takerAmount", type: "uint256" },
        { name: "expiration", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "feeRateBps", type: "uint256" },
        { name: "side", type: "uint8" },
        { name: "signatureType", type: "uint8" }
      ]
    },
    primaryType: "Order",
    message
  });
  return {
    salt: message.salt.toString(),
    maker,
    signer,
    taker,
    tokenId: tokenIdValue.toString(),
    makerAmount: message.makerAmount.toString(),
    takerAmount: message.takerAmount.toString(),
    expiration: message.expiration.toString(),
    nonce: message.nonce.toString(),
    feeRateBps: message.feeRateBps.toString(),
    side: sideValue,
    signatureType,
    signature
  };
}

// src/adapters/polymarket/exchange.ts
async function resolveAuthContext(args) {
  if (args.wallet) {
    const credentials = args.credentials ?? await createOrDerivePolymarketApiKey({
      wallet: args.wallet,
      ...args.environment ? { environment: args.environment } : {}
    });
    return {
      credentials,
      address: args.wallet.address
    };
  }
  if (args.walletAddress && args.credentials) {
    return { credentials: args.credentials, address: args.walletAddress };
  }
  throw new PolymarketAuthError(
    "Polymarket auth requires a wallet (preferred) or credentials + walletAddress."
  );
}
async function requestJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text().catch(() => "");
  let data = null;
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
function resolvePath(url) {
  const parsed = new URL(url);
  return `${parsed.pathname}${parsed.search}`;
}
function normalizeApiKeyResponse(data) {
  if (!data?.apiKey || !data?.secret || !data?.passphrase) {
    return null;
  }
  return {
    apiKey: data.apiKey,
    secret: data.secret,
    passphrase: data.passphrase
  };
}
async function requestPolymarketApiKey(args) {
  const environment = args.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = args.mode === "create" ? `${baseUrl}/auth/api-key` : `${baseUrl}/auth/derive-api-key`;
  const headers = await buildL1Headers({
    wallet: args.wallet,
    environment,
    ...args.timestamp !== void 0 ? { timestamp: args.timestamp } : {},
    ...args.nonce !== void 0 ? { nonce: args.nonce } : {},
    ...args.message !== void 0 ? { message: args.message } : {}
  });
  return await requestJson(url, {
    method: args.mode === "create" ? "POST" : "GET",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    ...args.mode === "create" ? { body: JSON.stringify({}) } : {}
  });
}
async function createPolymarketApiKey(args) {
  const normalized = normalizeApiKeyResponse(
    await requestPolymarketApiKey({ ...args, mode: "create" })
  );
  if (!normalized) {
    throw new PolymarketAuthError("Failed to create Polymarket API key.");
  }
  return normalized;
}
async function derivePolymarketApiKey(args) {
  const normalized = normalizeApiKeyResponse(
    await requestPolymarketApiKey({ ...args, mode: "derive" })
  );
  if (!normalized) {
    throw new PolymarketAuthError("Failed to derive Polymarket API key.");
  }
  return normalized;
}
async function createOrDerivePolymarketApiKey(args) {
  const created = normalizeApiKeyResponse(
    await requestPolymarketApiKey({ ...args, mode: "create" })
  );
  if (created) {
    return created;
  }
  return derivePolymarketApiKey(args);
}
async function placePolymarketOrder(args) {
  const environment = args.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = `${baseUrl}/order`;
  const signedOrder = await buildSignedOrderPayload({
    wallet: args.wallet,
    environment,
    ...args.order
  });
  const auth = await resolveAuthContext({
    wallet: args.wallet,
    ...args.credentials ? { credentials: args.credentials } : {},
    environment
  });
  const body = {
    order: signedOrder,
    owner: auth.credentials.apiKey,
    orderType: args.orderType ?? "GTC"
  };
  const headers = buildL2Headers({
    credentials: auth.credentials,
    address: auth.address,
    method: "POST",
    path: resolvePath(url),
    body
  });
  return await requestJson(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}
async function cancelPolymarketOrder(args) {
  const environment = args.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = `${baseUrl}/order`;
  const body = { orderID: args.orderId };
  const auth = await resolveAuthContext({
    ...args.wallet ? { wallet: args.wallet } : {},
    ...args.walletAddress ? { walletAddress: args.walletAddress } : {},
    ...args.credentials ? { credentials: args.credentials } : {},
    environment
  });
  const headers = buildL2Headers({
    credentials: auth.credentials,
    address: auth.address,
    method: "DELETE",
    path: resolvePath(url),
    body
  });
  return await requestJson(url, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}
async function cancelPolymarketOrders(args) {
  const environment = args.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = `${baseUrl}/orders`;
  const body = { orderIDs: args.orderIds };
  const auth = await resolveAuthContext({
    ...args.wallet ? { wallet: args.wallet } : {},
    ...args.walletAddress ? { walletAddress: args.walletAddress } : {},
    ...args.credentials ? { credentials: args.credentials } : {},
    environment
  });
  const headers = buildL2Headers({
    credentials: auth.credentials,
    address: auth.address,
    method: "DELETE",
    path: resolvePath(url),
    body
  });
  return await requestJson(url, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}
async function cancelAllPolymarketOrders(args) {
  const environment = args.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = `${baseUrl}/cancel-all`;
  const auth = await resolveAuthContext({
    ...args.wallet ? { wallet: args.wallet } : {},
    ...args.walletAddress ? { walletAddress: args.walletAddress } : {},
    ...args.credentials ? { credentials: args.credentials } : {},
    environment
  });
  const headers = buildL2Headers({
    credentials: auth.credentials,
    address: auth.address,
    method: "DELETE",
    path: resolvePath(url)
  });
  return await requestJson(url, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      ...headers
    }
  });
}
async function cancelMarketPolymarketOrders(args) {
  const environment = args.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = `${baseUrl}/cancel-market-orders`;
  const body = { market: args.tokenId };
  const auth = await resolveAuthContext({
    ...args.wallet ? { wallet: args.wallet } : {},
    ...args.walletAddress ? { walletAddress: args.walletAddress } : {},
    ...args.credentials ? { credentials: args.credentials } : {},
    environment
  });
  const headers = buildL2Headers({
    credentials: auth.credentials,
    address: auth.address,
    method: "DELETE",
    path: resolvePath(url),
    body
  });
  return await requestJson(url, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
}
var PolymarketExchangeClient = class {
  constructor(args) {
    this.wallet = args.wallet;
    this.credentials = args.credentials;
    this.environment = args.environment ?? "mainnet";
  }
  async getCredentials() {
    if (this.cachedCredentials) return this.cachedCredentials;
    const resolved = await resolveAuthContext({
      wallet: this.wallet,
      ...this.credentials ? { credentials: this.credentials } : {},
      environment: this.environment
    });
    this.cachedCredentials = resolved.credentials;
    return resolved.credentials;
  }
  async placeOrder(order, orderType) {
    const credentials = await this.getCredentials();
    return placePolymarketOrder({
      wallet: this.wallet,
      credentials,
      environment: this.environment,
      order,
      ...orderType !== void 0 ? { orderType } : {}
    });
  }
  async cancelOrder(orderId) {
    const credentials = await this.getCredentials();
    return cancelPolymarketOrder({
      orderId,
      wallet: this.wallet,
      credentials,
      environment: this.environment
    });
  }
  async cancelOrders(orderIds) {
    const credentials = await this.getCredentials();
    return cancelPolymarketOrders({
      orderIds,
      wallet: this.wallet,
      credentials,
      environment: this.environment
    });
  }
  async cancelAll() {
    const credentials = await this.getCredentials();
    return cancelAllPolymarketOrders({
      wallet: this.wallet,
      credentials,
      environment: this.environment
    });
  }
  async cancelMarket(tokenId) {
    const credentials = await this.getCredentials();
    return cancelMarketPolymarketOrders({
      tokenId,
      wallet: this.wallet,
      credentials,
      environment: this.environment
    });
  }
};

// src/adapters/polymarket/info.ts
var DEFAULT_EVENT_LIMIT = 50;
async function requestJson2(url, init) {
  const response = await fetch(url, init);
  const text = await response.text().catch(() => "");
  let data = null;
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
function getString(value) {
  if (value == null) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}
function getNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}
function getInteger(value) {
  const numeric = getNumber(value);
  return numeric == null ? null : Math.trunc(numeric);
}
function getBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
}
function normalizeCsvStringInput(value) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => String(entry).split(",")).map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  }
  if (typeof value === "string") {
    return value.split(",").map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  }
  return [];
}
function normalizeCsvNumberInput(value) {
  if (Array.isArray(value)) {
    return value.filter((entry) => Number.isFinite(entry));
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return [value];
  }
  return [];
}
function appendCsvParam(url, key, values) {
  if (values.length > 0) {
    url.searchParams.set(key, values.join(","));
  }
}
function appendNumberParam(url, key, value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    url.searchParams.set(key, String(value));
  }
}
function appendBooleanParam(url, key, value) {
  if (typeof value === "boolean") {
    url.searchParams.set(key, value ? "true" : "false");
  }
}
function assertMutuallyExclusiveMarketScope(market, eventIds) {
  if (market.length > 0 && eventIds.length > 0) {
    throw new Error("market and eventId are mutually exclusive.");
  }
}
function normalizeOrderbookLevels(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    if (Array.isArray(entry)) {
      const [price, size] = entry;
      const p = Number(price);
      const s = Number(size);
      if (!Number.isFinite(p) || !Number.isFinite(s)) return null;
      return { price: p, size: s };
    }
    if (entry && typeof entry === "object") {
      const record = entry;
      const p = Number(record.price ?? record.p);
      const s = Number(record.size ?? record.s ?? record.quantity);
      if (!Number.isFinite(p) || !Number.isFinite(s)) return null;
      return { price: p, size: s };
    }
    return null;
  }).filter((entry) => Boolean(entry));
}
function normalizeGammaMarket(market, event) {
  const eventTags = normalizeTags(event?.tags);
  const marketTags = normalizeTags(market.tags);
  const mergedTags = Array.from(/* @__PURE__ */ new Set([...marketTags, ...eventTags]));
  const category = getString(market.category) ?? getString(event?.category) ?? getString(event?.title) ?? null;
  const normalized = {
    id: getString(market.id) ?? "",
    slug: getString(market.slug),
    question: getString(market.question),
    description: getString(market.description),
    eventId: getString(market.eventId ?? event?.id),
    eventSlug: getString(event?.slug),
    conditionId: getString(market.conditionId),
    marketMakerAddress: getString(market.marketMakerAddress),
    category,
    startDate: parseOptionalDate(market.startDate) ?? parseOptionalDate(event?.startDate) ?? parseOptionalDate(event?.eventStartTime),
    endDate: parseOptionalDate(market.endDate) ?? parseOptionalDate(event?.endDate) ?? parseOptionalDate(event?.eventEndTime),
    createdAt: parseOptionalDate(market.createdAt) ?? parseOptionalDate(event?.createdAt) ?? parseOptionalDate(event?.creationDate),
    updatedAt: parseOptionalDate(market.updatedAt) ?? parseOptionalDate(event?.updatedAt),
    closedTime: parseOptionalDate(market.closedTime) ?? parseOptionalDate(event?.closedTime),
    volume: getString(market.volume),
    liquidity: getString(market.liquidity),
    openInterest: getString(market.openInterest),
    outcomes: normalizeStringArrayish(market.outcomes),
    outcomePrices: normalizeNumberArrayish(market.outcomePrices),
    clobTokenIds: normalizeStringArrayish(market.clobTokenIds),
    icon: getString(market.icon),
    image: getString(market.image)
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
function normalizeUserPosition(raw) {
  const record = raw && typeof raw === "object" ? raw : {};
  const normalized = {
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
    endDate: parseOptionalDate(record.endDate)
  };
  const redeemable = getBoolean(record.redeemable);
  if (redeemable != null) normalized.redeemable = redeemable;
  const mergeable = getBoolean(record.mergeable);
  if (mergeable != null) normalized.mergeable = mergeable;
  const negativeRisk = getBoolean(record.negativeRisk);
  if (negativeRisk != null) normalized.negativeRisk = negativeRisk;
  return normalized;
}
function normalizeClosedPosition(raw) {
  const record = raw && typeof raw === "object" ? raw : {};
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
    endDate: parseOptionalDate(record.endDate)
  };
}
function normalizeUserActivity(raw) {
  const record = raw && typeof raw === "object" ? raw : {};
  return {
    proxyWallet: getString(record.proxyWallet),
    timestamp: getInteger(record.timestamp),
    conditionId: getString(record.conditionId),
    type: getString(record.type),
    size: getNumber(record.size),
    usdcSize: getNumber(record.usdcSize),
    transactionHash: getString(record.transactionHash),
    price: getNumber(record.price),
    asset: getString(record.asset),
    side: getString(record.side),
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
    profileImageOptimized: getString(record.profileImageOptimized)
  };
}
function normalizePositionValue(raw) {
  const record = raw && typeof raw === "object" ? raw : {};
  return {
    user: getString(record.user),
    value: getNumber(record.value)
  };
}
function normalizeProfileUsers(raw) {
  if (!Array.isArray(raw)) return null;
  return raw.map((entry) => {
    const record = entry && typeof entry === "object" ? entry : {};
    const normalized = {
      id: getString(record.id)
    };
    const creator = getBoolean(record.creator);
    if (creator != null) normalized.creator = creator;
    const mod = getBoolean(record.mod);
    if (mod != null) normalized.mod = mod;
    return normalized;
  });
}
function normalizePublicProfile(raw) {
  if (!raw || typeof raw !== "object") return null;
  const record = raw;
  const normalized = {
    createdAt: parseOptionalDate(record.createdAt),
    proxyWallet: getString(record.proxyWallet),
    profileImage: getString(record.profileImage),
    bio: getString(record.bio),
    pseudonym: getString(record.pseudonym),
    name: getString(record.name),
    users: normalizeProfileUsers(record.users),
    xUsername: getString(record.xUsername)
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
var PolymarketInfoClient = class {
  constructor(environment = "mainnet") {
    this.environment = environment;
  }
  markets(params = {}) {
    return fetchPolymarketMarkets({ ...params, environment: this.environment });
  }
  market(params) {
    return fetchPolymarketMarket({ ...params, environment: this.environment });
  }
  orderbook(tokenId) {
    return fetchPolymarketOrderbook({ tokenId, environment: this.environment });
  }
  price(tokenId, side) {
    return fetchPolymarketPrice({ tokenId, side, environment: this.environment });
  }
  midpoint(tokenId) {
    return fetchPolymarketMidpoint({ tokenId, environment: this.environment });
  }
  priceHistory(params) {
    return fetchPolymarketPriceHistory({ ...params, environment: this.environment });
  }
  positions(params) {
    return fetchPolymarketPositions({ ...params, environment: this.environment });
  }
  closedPositions(params) {
    return fetchPolymarketClosedPositions({ ...params, environment: this.environment });
  }
  activity(params) {
    return fetchPolymarketActivity({ ...params, environment: this.environment });
  }
  positionValue(params) {
    return fetchPolymarketPositionValue({ ...params, environment: this.environment });
  }
  publicProfile(address) {
    return fetchPolymarketPublicProfile({ address, environment: this.environment });
  }
};
async function fetchPolymarketMarkets(params = {}) {
  if (params.active !== void 0 && params.active !== true) {
    throw new Error("Polymarket market list requires active=true.");
  }
  if (params.closed !== void 0 && params.closed !== false) {
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
  const data = await requestJson2(url.toString());
  const markets = data.flatMap(
    (event) => Array.isArray(event?.markets) ? event.markets.map((market) => normalizeGammaMarket(market, event)) : []
  );
  const filtered = params.category ? markets.filter(
    (market) => (market.category ?? "").toLowerCase().includes(params.category.toLowerCase())
  ) : markets;
  return typeof params.limit === "number" ? filtered.slice(0, params.limit) : filtered;
}
async function fetchPolymarketMarket(params) {
  const environment = params.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("gamma", environment);
  if (params.slug) {
    const url = new URL(`/markets/slug/${params.slug}`, baseUrl);
    const data = await requestJson2(url.toString());
    if (!data) return null;
    return normalizeGammaMarket(data);
  }
  if (params.id) {
    const url = new URL(`/markets/${params.id}`, baseUrl);
    const data = await requestJson2(url.toString());
    if (!data) return null;
    return normalizeGammaMarket(data);
  }
  if (params.conditionId) {
    const url = new URL(`/markets`, baseUrl);
    url.searchParams.set("condition_id", params.conditionId);
    const data = await requestJson2(url.toString());
    if (!data) return null;
    const market = Array.isArray(data) ? data[0] : data;
    return market ? normalizeGammaMarket(market) : null;
  }
  throw new Error("id, slug, or conditionId is required.");
}
async function fetchPolymarketOrderbook(params) {
  const environment = params.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = new URL("/book", baseUrl);
  url.searchParams.set("token_id", params.tokenId);
  const data = await requestJson2(url.toString());
  return {
    market: params.tokenId,
    bids: normalizeOrderbookLevels(data.bids),
    asks: normalizeOrderbookLevels(data.asks),
    timestamp: getString(data.timestamp)
  };
}
async function fetchPolymarketPrice(params) {
  const environment = params.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = new URL("/price", baseUrl);
  url.searchParams.set("token_id", params.tokenId);
  url.searchParams.set("side", params.side);
  const data = await requestJson2(url.toString());
  const price = Number(data.price ?? data?.p);
  return Number.isFinite(price) ? price : null;
}
async function fetchPolymarketMidpoint(params) {
  const baseArgs = {
    tokenId: params.tokenId,
    ...params.environment ? { environment: params.environment } : {}
  };
  const buy = await fetchPolymarketPrice({ ...baseArgs, side: "BUY" });
  const sell = await fetchPolymarketPrice({ ...baseArgs, side: "SELL" });
  if (buy == null || sell == null) return null;
  return (buy + sell) / 2;
}
async function fetchPolymarketPriceHistory(params) {
  const environment = params.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("clob", environment);
  const url = new URL("/prices-history", baseUrl);
  url.searchParams.set("market", params.tokenId);
  if (params.startTs) url.searchParams.set("startTs", params.startTs.toString());
  if (params.endTs) url.searchParams.set("endTs", params.endTs.toString());
  if (params.interval) url.searchParams.set("interval", params.interval);
  if (params.fidelity) url.searchParams.set("fidelity", params.fidelity.toString());
  const data = await requestJson2(url.toString());
  const points = Array.isArray(data) ? data : data?.history ?? [];
  return points.map((point) => ({
    t: Number(point.t),
    p: Number(point.p)
  })).filter((point) => Number.isFinite(point.t) && Number.isFinite(point.p));
}
async function fetchPolymarketPositions(params) {
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
    eventIds.map((entry) => String(entry))
  );
  appendNumberParam(url, "sizeThreshold", params.sizeThreshold);
  appendBooleanParam(url, "redeemable", params.redeemable);
  appendBooleanParam(url, "mergeable", params.mergeable);
  appendNumberParam(url, "limit", params.limit);
  appendNumberParam(url, "offset", params.offset);
  if (params.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params.sortDirection) url.searchParams.set("sortDirection", params.sortDirection);
  if (params.title) url.searchParams.set("title", params.title);
  const data = await requestJson2(url.toString());
  return Array.isArray(data) ? data.map((entry) => normalizeUserPosition(entry)) : [];
}
async function fetchPolymarketClosedPositions(params) {
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
    eventIds.map((entry) => String(entry))
  );
  appendNumberParam(url, "limit", params.limit);
  appendNumberParam(url, "offset", params.offset);
  if (params.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params.sortDirection) url.searchParams.set("sortDirection", params.sortDirection);
  if (params.title) url.searchParams.set("title", params.title);
  const data = await requestJson2(url.toString());
  return Array.isArray(data) ? data.map((entry) => normalizeClosedPosition(entry)) : [];
}
async function fetchPolymarketActivity(params) {
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
    eventIds.map((entry) => String(entry))
  );
  appendCsvParam(url, "type", types);
  appendNumberParam(url, "start", params.start);
  appendNumberParam(url, "end", params.end);
  appendNumberParam(url, "limit", params.limit);
  appendNumberParam(url, "offset", params.offset);
  if (params.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params.sortDirection) url.searchParams.set("sortDirection", params.sortDirection);
  if (params.side) url.searchParams.set("side", params.side);
  const data = await requestJson2(url.toString());
  return Array.isArray(data) ? data.map((entry) => normalizeUserActivity(entry)) : [];
}
async function fetchPolymarketPositionValue(params) {
  const environment = params.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("data", environment);
  const url = new URL("/value", baseUrl);
  url.searchParams.set("user", params.user);
  appendCsvParam(url, "market", normalizeCsvStringInput(params.market));
  const data = await requestJson2(url.toString());
  return Array.isArray(data) ? data.map((entry) => normalizePositionValue(entry)) : [];
}
async function fetchPolymarketPublicProfile(params) {
  const environment = params.environment ?? "mainnet";
  const baseUrl = resolvePolymarketBaseUrl("gamma", environment);
  const url = new URL("/public-profile", baseUrl);
  url.searchParams.set("address", params.address);
  const data = await requestJson2(url.toString());
  return normalizePublicProfile(data);
}

export { POLYMARKET_CHAIN_ID, POLYMARKET_CLOB_AUTH_DOMAIN, POLYMARKET_CLOB_DOMAIN, POLYMARKET_ENDPOINTS, POLYMARKET_EXCHANGE_ADDRESSES, PolymarketApiError, PolymarketAuthError, PolymarketExchangeClient, PolymarketInfoClient, buildHmacSignature, buildL1Headers, buildL2Headers, buildPolymarketOrderAmounts, buildSignedOrderPayload, cancelAllPolymarketOrders, cancelMarketPolymarketOrders, cancelPolymarketOrder, cancelPolymarketOrders, createOrDerivePolymarketApiKey, createPolymarketApiKey, derivePolymarketApiKey, fetchPolymarketActivity, fetchPolymarketClosedPositions, fetchPolymarketMarket, fetchPolymarketMarkets, fetchPolymarketMidpoint, fetchPolymarketOrderbook, fetchPolymarketPositionValue, fetchPolymarketPositions, fetchPolymarketPrice, fetchPolymarketPriceHistory, fetchPolymarketPublicProfile, normalizeNumberArrayish, normalizeStringArrayish, placePolymarketOrder, resolveExchangeAddress, resolvePolymarketBaseUrl };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
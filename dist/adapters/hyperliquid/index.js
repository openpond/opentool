import { parseUnits, encodeFunctionData, erc20Abi } from 'viem';
import { encode } from '@msgpack/msgpack';
import { keccak_256 } from '@noble/hashes/sha3';
import { hexToBytes, concatBytes, bytesToHex } from '@noble/hashes/utils';

// src/adapters/hyperliquid/index.ts

// src/store/index.ts
var StoreError = class extends Error {
  constructor(message, status, causeData) {
    super(message);
    this.status = status;
    this.causeData = causeData;
    this.name = "StoreError";
  }
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
      body: JSON.stringify(input)
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
  const cacheKey = `${args.environment}:${args.baseUrl}`;
  const cached = metaCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.universe;
  }
  const response = await args.fetcher(`${args.baseUrl}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "meta" })
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
function normalizeHex(value) {
  const lower = value.toLowerCase();
  return lower.replace(/^0x0+/, "0x") || "0x0";
}
function normalizeAddress(value) {
  return normalizeHex(value);
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
        a: idx,
        c: normalizeAddress(entry.cloid)
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
  if (options.time !== null) {
    assertPositiveNumber(options.time, "time");
  }
  const action = { type: "scheduleCancel", time: options.time };
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
  const universe = await getUniverse({
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch
  });
  const asset = resolveAssetIndex(twap.symbol, universe);
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
  const universe = await getUniverse({
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch
  });
  const asset = resolveAssetIndex(options.cancel.symbol, universe);
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
  const universe = await getUniverse({
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch
  });
  const asset = resolveAssetIndex(options.input.symbol, universe);
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
  const universe = await getUniverse({
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch
  });
  const asset = resolveAssetIndex(options.input.symbol, universe);
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
  const universe = await getUniverse({
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch
  });
  return Promise.all(
    entries.map(async (entry) => {
      const assetIndex = resolveAssetIndex(entry.symbol, universe);
      return mapper(assetIndex, entry);
    })
  );
}
async function buildOrder(intent, options) {
  assertSymbol(intent.symbol);
  assertPositiveDecimal(intent.price, "price");
  assertPositiveDecimal(intent.size, "size");
  const env = options.environment ?? "mainnet";
  const universe = await getUniverse({
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch
  });
  const assetIndex = resolveAssetIndex(intent.symbol, universe);
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
      c: normalizeAddress(intent.clientId)
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
  return json;
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

// src/adapters/hyperliquid/index.ts
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
  const universe = await getUniverse({
    baseUrl: resolvedBaseUrl,
    environment: inferredEnvironment,
    fetcher: fetch
  });
  const preparedOrders = orders.map((intent) => {
    const assetIndex = resolveAssetIndex(intent.symbol, universe);
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
        c: normalizeHex(intent.clientId)
      } : {}
    };
    return order;
  });
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
    (entry) => "error" in entry
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
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    throw new Error("Withdraw amount must be a positive number.");
  }
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
    amount: parsedAmount.toString(),
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
      amount: parsedAmount.toString(),
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

export { HyperliquidApiError, HyperliquidBuilderApprovalError, HyperliquidExchangeClient, HyperliquidGuardError, HyperliquidInfoClient, HyperliquidTermsError, __hyperliquidInternals, approveHyperliquidBuilderFee, batchModifyHyperliquidOrders, cancelAllHyperliquidOrders, cancelHyperliquidOrders, cancelHyperliquidOrdersByCloid, cancelHyperliquidTwapOrder, createHyperliquidSubAccount, createMonotonicNonceFactory, depositToHyperliquidBridge, fetchHyperliquidAssetCtxs, fetchHyperliquidClearinghouseState, fetchHyperliquidFrontendOpenOrders, fetchHyperliquidHistoricalOrders, fetchHyperliquidMeta, fetchHyperliquidMetaAndAssetCtxs, fetchHyperliquidOpenOrders, fetchHyperliquidOrderStatus, fetchHyperliquidPreTransferCheck, fetchHyperliquidSpotAssetCtxs, fetchHyperliquidSpotClearinghouseState, fetchHyperliquidSpotMeta, fetchHyperliquidSpotMetaAndAssetCtxs, fetchHyperliquidUserFills, fetchHyperliquidUserFillsByTime, fetchHyperliquidUserRateLimit, getHyperliquidMaxBuilderFee, modifyHyperliquidOrder, placeHyperliquidOrder, placeHyperliquidTwapOrder, recordHyperliquidBuilderApproval, recordHyperliquidTermsAcceptance, reserveHyperliquidRequestWeight, scheduleHyperliquidCancel, sendHyperliquidSpot, setHyperliquidPortfolioMargin, transferHyperliquidSubAccount, updateHyperliquidIsolatedMargin, updateHyperliquidLeverage, withdrawFromHyperliquid };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
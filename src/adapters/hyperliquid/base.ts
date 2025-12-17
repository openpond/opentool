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

export type HyperliquidEnvironment = "mainnet" | "testnet";
export type HyperliquidTimeInForce =
  | "Gtc"
  | "Ioc"
  | "Alo"
  | "FrontendMarket"
  | "LiquidationMarket";
export type HyperliquidGrouping = "na" | "normalTpsl" | "positionTpsl";
export type HyperliquidTriggerType = "tp" | "sl";

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

export type HyperliquidExchangeResponse<T = unknown> = {
  status: "ok";
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
}): Promise<MetaResponse["universe"]> {
  const cacheKey = `${args.environment}:${args.baseUrl}`;
  const cached = metaCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.universe;
  }

  const response = await args.fetcher(`${args.baseUrl}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "meta" }),
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

export function normalizeHex(value: `0x${string}`): `0x${string}` {
  const lower = value.toLowerCase();
  return (lower.replace(/^0x0+/, "0x") || "0x0") as `0x${string}`;
}

export function normalizeAddress(value: `0x${string}`): `0x${string}` {
  return normalizeHex(value);
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

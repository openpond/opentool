import { createHmac, randomBytes } from "node:crypto";
import { formatUnits, parseUnits } from "viem";
import type { WalletFullContext } from "../../wallet/types";

export type PolymarketEnvironment = "mainnet" | "testnet";

export type PolymarketSide = "BUY" | "SELL";
export type PolymarketOrderType = "GTC" | "FOK" | "FAK" | "GTD";
export type PolymarketSignatureType = 0 | 1 | 2;

export interface PolymarketApiCredentials {
  apiKey: string;
  secret: string;
  passphrase: string;
}

export interface PolymarketMarket {
  id: string;
  slug?: string | null;
  question?: string | null;
  description?: string | null;
  eventId?: string | null;
  eventSlug?: string | null;
  conditionId?: string | null;
  marketMakerAddress?: string | null;
  category?: string | null;
  tags?: string[];
  active?: boolean;
  closed?: boolean;
  resolved?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  closedTime?: string | null;
  volume?: string | null;
  liquidity?: string | null;
  openInterest?: string | null;
  outcomes?: string[];
  outcomePrices?: number[];
  clobTokenIds?: string[];
  icon?: string | null;
  image?: string | null;
}

export interface PolymarketOrderbookLevel {
  price: number;
  size: number;
}

export interface PolymarketOrderbook {
  market: string;
  bids: PolymarketOrderbookLevel[];
  asks: PolymarketOrderbookLevel[];
  timestamp?: string | null;
}

export interface PolymarketPriceHistoryPoint {
  t: number;
  p: number;
}

export interface PolymarketSignedOrderPayload {
  salt: string;
  maker: `0x${string}`;
  signer: `0x${string}`;
  taker: `0x${string}`;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  expiration: string;
  nonce: string;
  feeRateBps: string;
  side: 0 | 1;
  signatureType: PolymarketSignatureType;
  signature: `0x${string}`;
}

export class PolymarketApiError extends Error {
  constructor(message: string, public readonly response: unknown) {
    super(message);
    this.name = "PolymarketApiError";
  }
}

export class PolymarketAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PolymarketAuthError";
  }
}

export const POLYMARKET_ENDPOINTS = {
  gamma: {
    mainnet: "https://gamma-api.polymarket.com",
    testnet: "https://gamma-api.polymarket.com",
  },
  clob: {
    mainnet: "https://clob.polymarket.com",
    testnet: "https://clob.polymarket.com",
  },
  data: {
    mainnet: "https://data-api.polymarket.com",
    testnet: "https://data-api.polymarket.com",
  },
} as const satisfies Record<
  "gamma" | "clob" | "data",
  Record<PolymarketEnvironment, string>
>;

export const POLYMARKET_CHAIN_ID: Record<PolymarketEnvironment, number> = {
  mainnet: 137,
  testnet: 80002,
};

export const POLYMARKET_EXCHANGE_ADDRESSES: Record<
  PolymarketEnvironment,
  { ctf: `0x${string}`; negRisk: `0x${string}` }
> = {
  mainnet: {
    ctf: "0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
    negRisk: "0xc5d563a36ae78145c45a50134d48a1215220f80a",
  },
  testnet: {
    ctf: "0xdfe02eb6733538f8ea35d585af8de5958ad99e40",
    negRisk: "0xdfe02eb6733538f8ea35d585af8de5958ad99e40",
  },
};

export const POLYMARKET_CLOB_DOMAIN = {
  name: "Polymarket CTF Exchange",
  version: "1",
};

export const POLYMARKET_CLOB_AUTH_DOMAIN = {
  name: "ClobAuthDomain",
  version: "1",
};

export const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;

export function resolvePolymarketBaseUrl(
  service: keyof typeof POLYMARKET_ENDPOINTS,
  environment: PolymarketEnvironment
): string {
  return POLYMARKET_ENDPOINTS[service][environment];
}

export function assertWalletSigner(wallet: WalletFullContext | undefined) {
  if (!wallet?.account || !wallet.walletClient) {
    throw new Error("Polymarket requires a wallet with signing capabilities.");
  }
}

export function toDecimalString(value: string | number | bigint): string {
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

function normalizeArrayish(value: unknown): unknown[] {
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

export function normalizeStringArrayish(value: unknown): string[] {
  return normalizeArrayish(value)
    .map((entry) => (entry == null ? "" : String(entry).trim()))
    .filter((entry) => entry.length > 0);
}

export function normalizeNumberArrayish(value: unknown): number[] {
  return normalizeArrayish(value)
    .map((entry) =>
      typeof entry === "number" ? entry : Number.parseFloat(String(entry))
    )
    .filter((entry) => Number.isFinite(entry));
}

export function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const tags = value
    .map((entry) => {
      if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        const label = record.label ?? record.id ?? record.tag;
        return label ? String(label).trim() : "";
      }
      return String(entry ?? "").trim();
    })
    .filter((entry) => entry.length > 0);
  return Array.from(new Set(tags));
}

export function parseOptionalDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const ts = value > 1_000_000_000_000 ? value : value * 1000;
    const date = new Date(ts);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

export function buildHmacSignature(args: {
  secret: string;
  timestamp: number | string;
  method: string;
  path: string;
  body?: string | Record<string, unknown> | null;
}): string {
  const timestamp = args.timestamp.toString();
  const method = args.method.toUpperCase();
  const path = args.path;
  const body =
    args.body == null
      ? ""
      : typeof args.body === "string"
        ? args.body
        : JSON.stringify(args.body);
  const payload = `${timestamp}${method}${path}${body}`;
  const key = Buffer.from(args.secret, "base64");
  return createHmac("sha256", key).update(payload).digest("hex");
}

export function buildL2Headers(args: {
  credentials: PolymarketApiCredentials;
  address: `0x${string}`;
  timestamp?: number;
  method: string;
  path: string;
  body?: Record<string, unknown> | string | null;
}): Record<string, string> {
  const timestamp = args.timestamp ?? Math.floor(Date.now() / 1000);
  const signature = buildHmacSignature({
    secret: args.credentials.secret,
    timestamp,
    method: args.method,
    path: args.path,
    body: args.body ?? null,
  });
  return {
    POLY_ADDRESS: args.address,
    POLY_API_KEY: args.credentials.apiKey,
    POLY_PASSPHRASE: args.credentials.passphrase,
    POLY_TIMESTAMP: timestamp.toString(),
    POLY_SIGNATURE: signature,
  };
}

export async function buildL1Headers(args: {
  wallet: WalletFullContext;
  timestamp?: number;
  nonce?: number;
  environment?: PolymarketEnvironment;
  message?: string;
}): Promise<Record<string, string>> {
  assertWalletSigner(args.wallet);
  const timestamp = args.timestamp ?? Math.floor(Date.now() / 1000);
  const nonce = args.nonce ?? Date.now();
  const chainId = POLYMARKET_CHAIN_ID[args.environment ?? "mainnet"];
  const address = args.wallet.address as `0x${string}`;
  const message = args.message ?? "Create or derive a Polymarket API key";

  const signature = await args.wallet.walletClient.signTypedData({
    account: args.wallet.account,
    domain: {
      ...POLYMARKET_CLOB_AUTH_DOMAIN,
      chainId,
    },
    types: {
      ClobAuth: [
        { name: "address", type: "address" },
        { name: "timestamp", type: "string" },
        { name: "nonce", type: "uint256" },
        { name: "message", type: "string" },
      ],
    },
    primaryType: "ClobAuth",
    message: {
      address,
      timestamp: timestamp.toString(),
      nonce: BigInt(nonce),
      message,
    },
  });

  return {
    POLY_ADDRESS: address,
    POLY_TIMESTAMP: timestamp.toString(),
    POLY_NONCE: nonce.toString(),
    POLY_SIGNATURE: signature,
  };
}

export function resolveExchangeAddress(args: {
  environment: PolymarketEnvironment;
  negRisk?: boolean;
  exchangeAddress?: `0x${string}`;
}): `0x${string}` {
  if (args.exchangeAddress) return args.exchangeAddress;
  const env = args.environment;
  return args.negRisk
    ? POLYMARKET_EXCHANGE_ADDRESSES[env].negRisk
    : POLYMARKET_EXCHANGE_ADDRESSES[env].ctf;
}

function parseUintString(value: string, name: string): bigint {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${name} must be a base-10 integer string.`);
  }
  return BigInt(trimmed);
}

export function buildPolymarketOrderAmounts(args: {
  side: PolymarketSide;
  price: string | number | bigint;
  size: string | number | bigint;
  tickSize?: string | number | bigint;
}): { makerAmount: bigint; takerAmount: bigint } {
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
  if (args.tickSize !== undefined) {
    const tickUnits = parseUnits(toDecimalString(args.tickSize), 6);
    if (tickUnits <= 0n) {
      throw new Error("tickSize must be positive.");
    }
    priceUnits = (priceUnits / tickUnits) * tickUnits;
  }

  const sizeUnits = parseUnits(sizeStr, 6);
  const quoteUnits = (priceUnits * sizeUnits) / 1_000_000n;

  if (args.side === "BUY") {
    return { makerAmount: quoteUnits, takerAmount: sizeUnits };
  }
  return { makerAmount: sizeUnits, takerAmount: quoteUnits };
}

export async function buildSignedOrderPayload(args: {
  wallet: WalletFullContext;
  environment?: PolymarketEnvironment;
  tokenId: string;
  side: PolymarketSide;
  price: string | number | bigint;
  size: string | number | bigint;
  expiration?: number;
  nonce?: number;
  feeRateBps?: number;
  tickSize?: string | number | bigint;
  maker?: `0x${string}`;
  signer?: `0x${string}`;
  taker?: `0x${string}`;
  signatureType?: PolymarketSignatureType;
  negRisk?: boolean;
  exchangeAddress?: `0x${string}`;
}): Promise<PolymarketSignedOrderPayload> {
  assertWalletSigner(args.wallet);
  const environment = args.environment ?? "mainnet";
  const chainId = POLYMARKET_CHAIN_ID[environment];
  const exchangeAddress = resolveExchangeAddress({
    environment,
    ...(args.negRisk !== undefined ? { negRisk: args.negRisk } : {}),
    ...(args.exchangeAddress ? { exchangeAddress: args.exchangeAddress } : {}),
  });

  const maker = args.maker ?? (args.wallet.address as `0x${string}`);
  const signer = args.signer ?? (args.wallet.address as `0x${string}`);
  const taker = args.taker ?? ZERO_ADDRESS;
  const sideValue: 0 | 1 = args.side === "BUY" ? 0 : 1;
  const signatureType: PolymarketSignatureType = args.signatureType ?? 0;

  const tokenIdValue = args.tokenId.startsWith("0x")
    ? BigInt(args.tokenId)
    : parseUintString(args.tokenId, "tokenId");

  const { makerAmount, takerAmount } = buildPolymarketOrderAmounts({
    side: args.side,
    price: args.price,
    size: args.size,
    ...(args.tickSize !== undefined ? { tickSize: args.tickSize } : {}),
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
    signatureType,
  };

  const signature = await args.wallet.walletClient.signTypedData({
    account: args.wallet.account,
    domain: {
      ...POLYMARKET_CLOB_DOMAIN,
      chainId,
      verifyingContract: exchangeAddress,
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
        { name: "signatureType", type: "uint8" },
      ],
    },
    primaryType: "Order",
    message,
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
    signature: signature as `0x${string}`,
  };
}

export function formatPriceFromUnits(units: bigint): string {
  return formatUnits(units, 6);
}

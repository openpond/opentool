import assert from "node:assert/strict";
import test from "node:test";

import dotenv from "dotenv";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Chain,
  type PublicClient,
  type Transport,
} from "viem";
import { mnemonicToAccount, type Account } from "viem/accounts";
import type { HexAddress, WalletFullContext } from "../../src/wallet";
import { chains, tokens, wallet } from "../../src/wallet";
import {
  cancelHyperliquidOrders,
  fetchHyperliquidAllMids,
  fetchHyperliquidOutcomeMeta,
  fetchHyperliquidPerpMarketInfo,
  fetchHyperliquidSpotClearinghouseState,
  fetchHyperliquidTickSize,
  formatHyperliquidPrice,
  formatHyperliquidSize,
  parseHyperliquidOutcomeSymbol,
  placeHyperliquidOrder,
  roundHyperliquidPriceToTick,
} from "../../src/adapters/hyperliquid";

dotenv.config({ override: false, quiet: true });

const ENVIRONMENT = "mainnet" as const;
const BTC_PERP_SYMBOL = "BTC";
const DEFAULT_PERP_SIZE = "0.0002";
const DEFAULT_OUTCOME_NOTIONAL_USD = 15;
const MIN_OUTCOME_NOTIONAL_USD = 10;
const ORDER_TIMEOUT_MS = 90_000;

let nonce = Date.now();
let signerPromise: Promise<WalletFullContext> | null = null;

type LiveOutcome = {
  outcomeId: number;
  description: string;
  expiryMs: number;
  yesSymbol: string;
  noSymbol: string;
};

type SpotBalance = {
  available: number;
  hold: number;
  total: number;
};

function nextNonce() {
  nonce = Math.max(Date.now(), nonce + 1);
  return nonce;
}

function readNonNegativeInteger(value: string | undefined): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function readPositiveNumber(value: string | undefined): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function readNumberLike(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readSpotBalance(payload: unknown, coin: string): SpotBalance {
  const balances =
    payload &&
    typeof payload === "object" &&
    "balances" in payload &&
    Array.isArray(payload.balances)
      ? payload.balances
      : [];
  const target = coin.toUpperCase();

  for (const row of balances) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const rowCoin = typeof record.coin === "string" ? record.coin.toUpperCase() : "";
    if (rowCoin !== target) continue;
    const total = readNumberLike(record.total) ?? 0;
    const hold = readNumberLike(record.hold) ?? 0;
    return {
      total,
      hold,
      available: Math.max(0, total - hold),
    };
  }

  return { total: 0, hold: 0, available: 0 };
}

function readSeedPhrase() {
  return process.env.SEED_PHRASE?.trim() || process.env.MNEMONIC?.trim() || null;
}

function createMnemonicTestWallet(seedPhrase: string): WalletFullContext {
  const path = process.env.SEED_PHRASE_PATH?.trim();
  const account = mnemonicToAccount(
    seedPhrase,
    path
      ? { path: path as `m/44'/60'/${string}` }
      : {
          accountIndex: readNonNegativeInteger(process.env.SEED_PHRASE_ACCOUNT_INDEX),
          addressIndex: readNonNegativeInteger(process.env.SEED_PHRASE_ADDRESS_INDEX),
          changeIndex: readNonNegativeInteger(process.env.SEED_PHRASE_CHANGE_INDEX),
        },
  ) as Account;

  const chain = chains.arbitrum;
  const rpcUrl = chain.rpcUrl({
    ...(process.env.RPC_URL?.trim() ? { url: process.env.RPC_URL.trim() } : {}),
    ...(process.env.ALCHEMY_API_KEY?.trim() ? { apiKey: process.env.ALCHEMY_API_KEY.trim() } : {}),
  });
  const transport = http(rpcUrl);
  const publicClient = createPublicClient<Transport, Chain>({
    chain: chain.chain,
    transport,
  });
  const walletClient = createWalletClient<Transport, Chain, Account>({
    account,
    chain: chain.chain,
    transport,
  });

  async function sendTransaction(params: {
    to?: HexAddress;
    value?: bigint;
    data?: `0x${string}`;
  }) {
    const tx: {
      account: Account;
      to?: HexAddress;
      value?: bigint;
      data?: `0x${string}`;
    } = { account };
    if (params.to) tx.to = params.to;
    if (params.value !== undefined) tx.value = params.value;
    if (params.data !== undefined) tx.data = params.data;
    return walletClient.sendTransaction(tx);
  }

  return {
    chain,
    tokens: tokens.arbitrum ?? {},
    rpcUrl,
    providerType: "privateKey",
    address: account.address as HexAddress,
    account,
    walletClient,
    publicClient: publicClient as PublicClient<Transport, Chain>,
    getRpcUrl: (override) => chain.rpcUrl(override),
    sendTransaction,
    getNativeBalance: () => publicClient.getBalance({ address: account.address }),
    transfer: (params) =>
      sendTransaction({ to: params.to, value: params.amount, data: params.data }),
    nonceSource: nextNonce,
  };
}

async function getSigner() {
  const seedPhrase = readSeedPhrase();
  if (seedPhrase) {
    signerPromise ??= Promise.resolve(createMnemonicTestWallet(seedPhrase));
    return signerPromise;
  }

  signerPromise ??= wallet({ chain: "arbitrum" }).then((value) => {
    if (!("walletClient" in value) || !value.address) {
      throw new Error(
        "A signing wallet is required. Configure SEED_PHRASE, Turnkey, or PRIVATE_KEY locally.",
      );
    }
    return value;
  });
  return signerPromise;
}

function parseDescription(value: string): Record<string, string> {
  return Object.fromEntries(
    value
      .split("|")
      .map((part) => part.split(":"))
      .filter((entry): entry is [string, string] => entry.length >= 2)
      .map(([key, ...rest]) => [key.trim(), rest.join(":").trim()]),
  );
}

function parseExpiryMs(value: string | undefined): number | null {
  const match = value?.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const expiryMs = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  return Number.isFinite(expiryMs) ? expiryMs : null;
}

function readOutcomeId(value: unknown): number | null {
  const id =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;
  return Number.isSafeInteger(id) && id >= 0 ? id : null;
}

function readLiveOutcomes(payload: unknown): LiveOutcome[] {
  const outcomes =
    payload &&
    typeof payload === "object" &&
    "outcomes" in payload &&
    Array.isArray(payload.outcomes)
      ? payload.outcomes
      : [];

  const now = Date.now();
  return outcomes
    .flatMap((entry): LiveOutcome[] => {
      if (!entry || typeof entry !== "object") return [];
      const record = entry as {
        outcome?: unknown;
        description?: unknown;
        sideSpecs?: unknown;
      };
      const outcomeId = readOutcomeId(record.outcome);
      const description = typeof record.description === "string" ? record.description : "";
      const fields = parseDescription(description);
      const expiryMs = parseExpiryMs(fields.expiry);
      const sideSpecs = Array.isArray(record.sideSpecs) ? record.sideSpecs : [];

      if (
        outcomeId == null ||
        expiryMs == null ||
        expiryMs <= now ||
        fields.class !== "priceBinary" ||
        fields.underlying !== "BTC" ||
        sideSpecs.length < 2
      ) {
        return [];
      }

      return [
        {
          outcomeId,
          description,
          expiryMs,
          yesSymbol: `#${outcomeId * 10}`,
          noSymbol: `#${outcomeId * 10 + 1}`,
        },
      ];
    })
    .sort((left, right) => left.expiryMs - right.expiryMs);
}

async function resolveBtcOutcome(): Promise<LiveOutcome> {
  const explicitSymbol = process.env.HIP4_SYMBOL?.trim();
  if (explicitSymbol) {
    const parsed = parseHyperliquidOutcomeSymbol(explicitSymbol);
    if (!parsed) {
      throw new Error("HIP4_SYMBOL must be a native outcome symbol like #10 or +10.");
    }
    return {
      outcomeId: parsed.outcomeId,
      description: "HIP4_SYMBOL override",
      expiryMs: Number.POSITIVE_INFINITY,
      yesSymbol: `#${parsed.outcomeId * 10}`,
      noSymbol: `#${parsed.outcomeId * 10 + 1}`,
    };
  }

  const meta = await fetchHyperliquidOutcomeMeta(ENVIRONMENT);
  const [first] = readLiveOutcomes(meta);
  if (!first) {
    throw new Error("No active BTC price-binary HIP-4 outcome was found in outcomeMeta.");
  }
  return first;
}

async function readAvailableUsdh(signer: WalletFullContext): Promise<SpotBalance> {
  const state = await fetchHyperliquidSpotClearinghouseState({
    environment: ENVIRONMENT,
    user: signer.address,
  });
  return readSpotBalance(state, "USDH");
}

async function resolveOutcomeSize(params: {
  price: string;
  signer: WalletFullContext;
  symbol: string;
}): Promise<string> {
  const priceValue = Number(params.price);
  assert.ok(
    Number.isFinite(priceValue) && priceValue > 0,
    `${params.symbol} should have a positive order price.`,
  );
  const usdh = await readAvailableUsdh(params.signer);
  const configuredNotional = readPositiveNumber(process.env.HIP4_LIVE_NOTIONAL_USD);
  const availableSize = Math.floor(usdh.available / priceValue);
  const minimumSize = Math.ceil(MIN_OUTCOME_NOTIONAL_USD / priceValue);
  const minimumQuote = minimumSize * priceValue;

  assert.ok(
    availableSize >= minimumSize,
    `HIP-4 live test needs ${minimumQuote.toFixed(6)} available USDH for the minimum ${MIN_OUTCOME_NOTIONAL_USD} notional order on ${params.symbol}; found ${usdh.available} USDH available (${usdh.total} total, ${usdh.hold} held).`,
  );

  const targetNotional = configuredNotional ?? DEFAULT_OUTCOME_NOTIONAL_USD;
  const targetSize = Math.max(minimumSize, Math.floor(targetNotional / priceValue));
  return Math.min(targetSize, availableSize).toString();
}

function readRestingOid(response: unknown): number | null {
  const statuses =
    response &&
    typeof response === "object" &&
    "response" in response &&
    response.response &&
    typeof response.response === "object" &&
    "data" in response.response &&
    response.response.data &&
    typeof response.response.data === "object" &&
    "statuses" in response.response.data &&
    Array.isArray(response.response.data.statuses)
      ? response.response.data.statuses
      : [];
  const first = statuses[0];
  if (
    first &&
    typeof first === "object" &&
    "resting" in first &&
    first.resting &&
    typeof first.resting === "object" &&
    "oid" in first.resting &&
    typeof first.resting.oid === "number"
  ) {
    return first.resting.oid;
  }
  return null;
}

async function placeAloAndCancel(params: {
  signer: WalletFullContext;
  symbol: string;
  side: "buy" | "sell";
  price: string;
  size: string;
}) {
  const response = await placeHyperliquidOrder({
    wallet: params.signer,
    environment: ENVIRONMENT,
    nonce: nextNonce(),
    orders: [
      {
        symbol: params.symbol,
        side: params.side,
        price: params.price,
        size: params.size,
        tif: "Alo",
      },
    ],
  });

  assert.equal(response.status, "ok");
  const oid = readRestingOid(response);
  assert.equal(typeof oid, "number", "Alo order should rest before the cancel smoke.");

  const cancelResponse = await cancelHyperliquidOrders({
    wallet: params.signer,
    environment: ENVIRONMENT,
    nonce: nextNonce(),
    cancels: [{ symbol: params.symbol, oid }],
  });
  assert.equal(cancelResponse.status, "ok");
}

async function buildPerpOrderInput(side: "buy" | "sell") {
  const info = await fetchHyperliquidPerpMarketInfo({
    environment: ENVIRONMENT,
    symbol: BTC_PERP_SYMBOL,
  });
  const rawPrice = side === "buy" ? info.price * 0.95 : info.price * 1.05;
  return {
    symbol: BTC_PERP_SYMBOL,
    side,
    price: formatHyperliquidPrice(rawPrice, info.szDecimals, "perp"),
    size: formatHyperliquidSize(
      process.env.HYPERLIQUID_LIVE_PERP_SIZE ?? DEFAULT_PERP_SIZE,
      info.szDecimals,
    ),
  };
}

async function buildOutcomeBuyInput(symbol: string, signer: WalletFullContext) {
  const mids = await fetchHyperliquidAllMids(ENVIRONMENT);
  const mid = Number(mids[symbol]);
  assert.ok(Number.isFinite(mid) && mid > 0, `${symbol} should have a positive mainnet mid.`);

  const rawPrice = Math.max(0.00001, Math.min(0.99999, mid * 0.1));
  const tick = await fetchHyperliquidTickSize({
    environment: ENVIRONMENT,
    symbol,
  }).catch(() => null);
  const formatted = formatHyperliquidPrice(rawPrice, 0, "spot");
  const price = tick ? roundHyperliquidPriceToTick(formatted, tick, "buy") : formatted;
  const size = await resolveOutcomeSize({ price, signer, symbol });

  return {
    symbol,
    side: "buy" as const,
    price,
    size,
  };
}

test(
  "live mainnet places and cancels BTC perp buy and sell Alo orders",
  { timeout: ORDER_TIMEOUT_MS },
  async () => {
    const signer = await getSigner();
    const buy = await buildPerpOrderInput("buy");
    const sell = await buildPerpOrderInput("sell");

    await placeAloAndCancel({ signer, ...buy });
    await placeAloAndCancel({ signer, ...sell });
  },
);

test(
  "live mainnet discovers BTC HIP-4 outcome and places/cancels Buy Yes and Buy No",
  { timeout: ORDER_TIMEOUT_MS },
  async () => {
    const signer = await getSigner();
    const outcome = await resolveBtcOutcome();
    const yes = await buildOutcomeBuyInput(outcome.yesSymbol, signer);
    await placeAloAndCancel({ signer, ...yes });

    const no = await buildOutcomeBuyInput(outcome.noSymbol, signer);
    await placeAloAndCancel({ signer, ...no });
  },
);

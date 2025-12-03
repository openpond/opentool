import type { WalletFullContext } from "../../wallet/types";
import {
  API_BASES,
  HL_CHAIN_LABEL,
  HyperliquidApiError,
  HyperliquidEnvironment,
  HyperliquidGrouping,
  HyperliquidOrderIntent,
  HyperliquidTriggerOptions,
  type ExchangeOrderAction,
  type ExchangeSignature,
  type NonceSource,
  type HyperliquidExchangeResponse,
  assertPositiveNumber,
  getSignatureChainId,
  getUniverse,
  normalizeAddress,
  resolveAssetIndex,
  signL1Action,
  signSpotSend,
  toApiDecimal,
} from "./base";

type CommonActionOptions = {
  environment?: HyperliquidEnvironment;
  vaultAddress?: `0x${string}` | undefined;
  expiresAfter?: number | undefined;
  nonce?: number | undefined;
  nonceSource?: NonceSource | undefined;
  /**
   * Optional per-wallet nonce provider (preferred if available).
   */
  walletNonceProvider?: NonceSource | undefined;
};

type CancelInput = { symbol: string; oid: number | string };
type CancelByCloidInput = { symbol: string; cloid: `0x${string}` };

type ModifyOrderInput = {
  oid: number | `0x${string}`;
  order: HyperliquidOrderIntent;
};

type TwapOrderInput = {
  symbol: string;
  side: "buy" | "sell";
  size: string | number | bigint;
  reduceOnly?: boolean;
  minutes: number;
  randomize?: boolean;
};

type TwapCancelInput = {
  symbol: string;
  twapId: number;
};

type UpdateLeverageInput = {
  symbol: string;
  leverageMode: "cross" | "isolated";
  leverage: number;
};

type UpdateIsolatedMarginInput = {
  symbol: string;
  isBuy: boolean;
  ntli: number;
};

export class HyperliquidExchangeClient {
  private readonly nonceSource: NonceSource;
  private readonly environment: HyperliquidEnvironment;
  private readonly vaultAddress: `0x${string}` | undefined;
  private readonly expiresAfter: number | undefined;
  private readonly wallet: WalletFullContext;

  constructor(args: {
    wallet: WalletFullContext;
    environment?: HyperliquidEnvironment;
    vaultAddress?: `0x${string}`;
    expiresAfter?: number;
    nonceSource?: NonceSource;
    walletNonceProvider?: NonceSource;
  }) {
    this.wallet = args.wallet;
    this.environment = args.environment ?? "mainnet";
    this.vaultAddress = args.vaultAddress;
    this.expiresAfter = args.expiresAfter;
    const resolvedNonceSource =
      args.walletNonceProvider ?? args.wallet.nonceSource ?? args.nonceSource;
    if (!resolvedNonceSource) {
      throw new Error(
        "Wallet nonce source is required for Hyperliquid exchange actions."
      );
    }
    this.nonceSource = resolvedNonceSource;
  }

  cancel(cancels: CancelInput[]) {
    return cancelHyperliquidOrders({
      wallet: this.wallet,
      cancels,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource,
    });
  }

  cancelByCloid(cancels: CancelByCloidInput[]) {
    return cancelHyperliquidOrdersByCloid({
      wallet: this.wallet,
      cancels,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource,
    });
  }

  cancelAll() {
    return cancelAllHyperliquidOrders({
      wallet: this.wallet,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource,
    });
  }

  scheduleCancel(time: number | null) {
    return scheduleHyperliquidCancel({
      wallet: this.wallet,
      time,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource,
    });
  }

  modify(modification: ModifyOrderInput) {
    return modifyHyperliquidOrder({
      wallet: this.wallet,
      modification,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource,
    });
  }

  batchModify(modifications: ModifyOrderInput[]) {
    return batchModifyHyperliquidOrders({
      wallet: this.wallet,
      modifications,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource,
    });
  }

  twapOrder(twap: TwapOrderInput) {
    return placeHyperliquidTwapOrder({
      wallet: this.wallet,
      twap,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource,
    });
  }

  twapCancel(cancel: TwapCancelInput) {
    return cancelHyperliquidTwapOrder({
      wallet: this.wallet,
      cancel,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource,
    });
  }

  updateLeverage(input: UpdateLeverageInput) {
    return updateHyperliquidLeverage({
      wallet: this.wallet,
      input,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource,
    });
  }

  updateIsolatedMargin(input: UpdateIsolatedMarginInput) {
    return updateHyperliquidIsolatedMargin({
      wallet: this.wallet,
      input,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource,
    });
  }

  reserveRequestWeight(weight: number) {
    return reserveHyperliquidRequestWeight({
      wallet: this.wallet,
      weight,
      environment: this.environment,
      vaultAddress: this.vaultAddress,
      expiresAfter: this.expiresAfter,
      nonceSource: this.nonceSource,
    });
  }

  spotSend(params: {
    destination: `0x${string}`;
    token: string;
    amount: string | number | bigint;
  }) {
    return sendHyperliquidSpot({
      wallet: this.wallet,
      environment: this.environment,
      nonceSource: this.nonceSource,
      ...params,
    });
  }
}

export async function cancelHyperliquidOrders(options: {
  wallet: WalletFullContext;
  cancels: CancelInput[];
} & CommonActionOptions) {
  options.cancels.forEach((c) => assertSymbol(c.symbol));
  const action = {
    type: "cancel",
    cancels: await withAssetIndexes(options, options.cancels, (idx, entry) => ({
      a: idx,
      o: entry.oid,
    })),
  };
  return submitExchangeAction(options, action);
}

export async function cancelHyperliquidOrdersByCloid(options: {
  wallet: WalletFullContext;
  cancels: CancelByCloidInput[];
} & CommonActionOptions) {
  options.cancels.forEach((c) => assertSymbol(c.symbol));
  const action = {
    type: "cancelByCloid",
    cancels: await withAssetIndexes(
      options,
      options.cancels,
      (idx, entry) => ({
        a: idx,
        c: normalizeAddress(entry.cloid),
      })
    ),
  };
  return submitExchangeAction(options, action);
}

export async function cancelAllHyperliquidOrders(options: {
  wallet: WalletFullContext;
} & CommonActionOptions) {
  const action = { type: "cancelAll" };
  return submitExchangeAction(options, action);
}

export async function scheduleHyperliquidCancel(options: {
  wallet: WalletFullContext;
  time: number | null;
} & CommonActionOptions) {
  if (options.time !== null) {
    assertPositiveNumber(options.time, "time");
  }
  const action = { type: "scheduleCancel", time: options.time };
  return submitExchangeAction(options, action);
}

export async function modifyHyperliquidOrder(options: {
  wallet: WalletFullContext;
  modification: ModifyOrderInput;
  grouping?: HyperliquidGrouping;
} & CommonActionOptions) {
  const { modification } = options;
  const order = await buildOrder(modification.order, options);
  const action = {
    type: "modify",
    oid: modification.oid,
    order,
  };
  return submitExchangeAction(options, action);
}

export async function batchModifyHyperliquidOrders(options: {
  wallet: WalletFullContext;
  modifications: ModifyOrderInput[];
} & CommonActionOptions) {
  options.modifications.forEach((m) => assertSymbol(m.order.symbol));
  const modifies = await Promise.all(
    options.modifications.map(async (mod) => ({
      oid: mod.oid,
      order: await buildOrder(mod.order, options),
    }))
  );
  const action = {
    type: "batchModify",
    modifies,
  };
  return submitExchangeAction(options, action);
}

export async function placeHyperliquidTwapOrder(options: {
  wallet: WalletFullContext;
  twap: TwapOrderInput;
} & CommonActionOptions) {
  const { twap } = options;
  assertSymbol(twap.symbol);
  assertPositiveDecimal(twap.size, "size");
  assertPositiveNumber(twap.minutes, "minutes");
  const env = options.environment ?? "mainnet";
  const universe = await getUniverse({
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch,
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
      t: Boolean(twap.randomize),
    },
  };
  return submitExchangeAction(options, action);
}

export async function cancelHyperliquidTwapOrder(options: {
  wallet: WalletFullContext;
  cancel: TwapCancelInput;
} & CommonActionOptions) {
  assertSymbol(options.cancel.symbol);
  const env = options.environment ?? "mainnet";
  const universe = await getUniverse({
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch,
  });
  const asset = resolveAssetIndex(options.cancel.symbol, universe);
  const action = {
    type: "twapCancel",
    a: asset,
    t: options.cancel.twapId,
  };
  return submitExchangeAction(options, action);
}

export async function updateHyperliquidLeverage(options: {
  wallet: WalletFullContext;
  input: UpdateLeverageInput;
} & CommonActionOptions) {
  assertSymbol(options.input.symbol);
  assertPositiveNumber(options.input.leverage, "leverage");
  const env = options.environment ?? "mainnet";
  const universe = await getUniverse({
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch,
  });
  const asset = resolveAssetIndex(options.input.symbol, universe);
  const action = {
    type: "updateLeverage",
    asset,
    isCross: options.input.leverageMode === "cross",
    leverage: options.input.leverage,
  };
  return submitExchangeAction(options, action);
}

export async function updateHyperliquidIsolatedMargin(options: {
  wallet: WalletFullContext;
  input: UpdateIsolatedMarginInput;
} & CommonActionOptions) {
  assertSymbol(options.input.symbol);
  assertPositiveNumber(options.input.ntli, "ntli");
  const env = options.environment ?? "mainnet";
  const universe = await getUniverse({
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch,
  });
  const asset = resolveAssetIndex(options.input.symbol, universe);
  const action = {
    type: "updateIsolatedMargin",
    asset,
    isBuy: options.input.isBuy,
    ntli: options.input.ntli,
  };
  return submitExchangeAction(options, action);
}

export async function reserveHyperliquidRequestWeight(options: {
  wallet: WalletFullContext;
  weight: number;
} & CommonActionOptions) {
  assertPositiveNumber(options.weight, "weight");
  const action = {
    type: "reserveRequestWeight",
    weight: options.weight,
  };
  return submitExchangeAction(options, action);
}

export async function createHyperliquidSubAccount(options: {
  wallet: WalletFullContext;
  name: string;
} & CommonActionOptions) {
  assertString(options.name, "name");
  const action = {
    type: "createSubAccount",
    name: options.name,
  };
  return submitExchangeAction(options, action);
}

export async function transferHyperliquidSubAccount(options: {
  wallet: WalletFullContext;
  subAccountUser: `0x${string}`;
  isDeposit: boolean;
  usd: string | number | bigint;
} & CommonActionOptions) {
  assertString(options.subAccountUser, "subAccountUser");
  const usdScaled = normalizeUsdToInt(options.usd);
  const action = {
    type: "subAccountTransfer",
    subAccountUser: normalizeAddress(options.subAccountUser),
    isDeposit: Boolean(options.isDeposit),
    usd: usdScaled,
  };
  return submitExchangeAction(options, action);
}

export async function sendHyperliquidSpot(options: {
  wallet: WalletFullContext;
  destination: `0x${string}`;
  token: string;
  amount: string | number | bigint;
  environment?: HyperliquidEnvironment;
  nonce?: number;
  nonceSource?: NonceSource;
}) {
  const env = options.environment ?? "mainnet";
  if (!options.wallet.account || !options.wallet.walletClient) {
    throw new Error("Wallet with signing capability is required for spotSend.");
  }
  assertString(options.token, "token");
  assertPositiveDecimal(options.amount, "amount");
  const signatureChainId = getSignatureChainId(env);
  const hyperliquidChain = HL_CHAIN_LABEL[env];

  const nonce =
    options.nonce ?? options.nonceSource?.() ?? Date.now();
  const time = BigInt(nonce);

  const signature = await signSpotSend({
    wallet: options.wallet,
    hyperliquidChain,
    signatureChainId,
    destination: normalizeAddress(options.destination),
    token: options.token,
    amount: toApiDecimal(options.amount),
    time,
  });

  const action = {
    type: "spotSend",
    hyperliquidChain,
    signatureChainId,
    destination: normalizeAddress(options.destination),
    token: options.token,
    amount: toApiDecimal(options.amount),
    time: nonce,
  };

  return postExchange(env, { action, nonce, signature });
}

async function submitExchangeAction(
  options: { wallet: WalletFullContext } & CommonActionOptions,
  action: Record<string, unknown> | ExchangeOrderAction
): Promise<HyperliquidExchangeResponse<unknown>> {
  if (!options.wallet?.account || !options.wallet.walletClient) {
    throw new Error("Hyperliquid exchange actions require a signing wallet.");
  }

  const env = options.environment ?? "mainnet";
  const nonceSource =
    options.walletNonceProvider ?? options.wallet.nonceSource ?? options.nonceSource;
  if (!nonceSource && options.nonce === undefined) {
    throw new Error("Wallet nonce source is required for Hyperliquid exchange actions.");
  }
  const effectiveNonce = options.nonce ?? nonceSource?.();
  if (effectiveNonce === undefined) {
    throw new Error("Hyperliquid exchange actions require a nonce.");
  }

  const signature: ExchangeSignature = await signL1Action({
    wallet: options.wallet,
    action,
    nonce: effectiveNonce,
    vaultAddress: options.vaultAddress
      ? normalizeAddress(options.vaultAddress)
      : undefined,
    expiresAfter: options.expiresAfter,
    isTestnet: env === "testnet",
  });

  const body: {
    action: typeof action;
    nonce: number;
    signature: ExchangeSignature;
    vaultAddress?: `0x${string}`;
    expiresAfter?: number;
  } = {
    action,
    nonce: effectiveNonce,
    signature,
  };

  if (options.vaultAddress) {
    body.vaultAddress = normalizeAddress(options.vaultAddress);
  }
  if (typeof options.expiresAfter === "number") {
    body.expiresAfter = options.expiresAfter;
  }

  return postExchange(env, body);
}

async function withAssetIndexes<TInput>(
  options: { environment?: HyperliquidEnvironment },
  entries: TInput[],
  mapper: (assetIndex: number, entry: TInput) => Record<string, unknown>
) {
  const env = options.environment ?? "mainnet";
  const universe = await getUniverse({
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch,
  });
  return Promise.all(
    entries.map(async (entry: any) => {
      const assetIndex = resolveAssetIndex(entry.symbol, universe);
      return mapper(assetIndex, entry);
    })
  );
}

async function buildOrder(
  intent: HyperliquidOrderIntent,
  options: { environment?: HyperliquidEnvironment }
): Promise<ExchangeOrderAction["orders"][number]> {
  assertSymbol(intent.symbol);
  assertPositiveDecimal(intent.price, "price");
  assertPositiveDecimal(intent.size, "size");
  const env = options.environment ?? "mainnet";
  const universe = await getUniverse({
    baseUrl: API_BASES[env],
    environment: env,
    fetcher: fetch,
  });
  const assetIndex = resolveAssetIndex(intent.symbol, universe);

  const limitOrTrigger = intent.trigger
    ? mapTrigger(intent.trigger)
    : {
        limit: {
          tif: intent.tif ?? "Ioc",
        },
      };

  return {
    a: assetIndex,
    b: intent.side === "buy",
    p: toApiDecimal(intent.price),
    s: toApiDecimal(intent.size),
    r: intent.reduceOnly ?? false,
    t: limitOrTrigger,
    ...(intent.clientId
      ? {
          c: normalizeAddress(intent.clientId),
        }
      : {}),
  };
}

function mapTrigger(
  trigger: HyperliquidTriggerOptions
): ExchangeOrderAction["orders"][number]["t"] {
  assertPositiveDecimal(trigger.triggerPx, "triggerPx");
  return {
    trigger: {
      isMarket: Boolean(trigger.isMarket),
      triggerPx: toApiDecimal(trigger.triggerPx),
      tpsl: trigger.tpsl,
    },
  };
}

function assertSymbol(value: string) {
  assertString(value, "symbol");
}

function normalizeUsdToInt(value: string | number | bigint): number {
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
  return Math.round(parsed * 1_000_000);
}

function assertString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertPositiveDecimal(
  value: string | number | bigint,
  label: string
) {
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

async function postExchange(
  env: HyperliquidEnvironment,
  body: Record<string, unknown>
): Promise<HyperliquidExchangeResponse<unknown>> {
  const response = await fetch(`${API_BASES[env]}/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await response.json().catch(() => null)) as
    | HyperliquidExchangeResponse<unknown>
    | null;
  if (!response.ok || !json) {
    throw new HyperliquidApiError(
      "Hyperliquid exchange action failed.",
      json ?? { status: response.status }
    );
  }
  if (json.status !== "ok") {
    throw new HyperliquidApiError("Hyperliquid exchange returned error.", json);
  }
  return json;
}

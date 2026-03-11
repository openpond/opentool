import { encodeFunctionData, erc20Abi, parseUnits } from "viem";

import type { WalletFullContext } from "../../wallet/types";
import {
  API_BASES,
  BUILDER_CODE,
  HL_CHAIN_LABEL,
  HL_ENDPOINT,
  HyperliquidApiError,
  MIN_DEPOSIT_USDC,
  ZERO_ADDRESS,
  createL1ActionHash,
  getBridgeAddress,
  getSignatureChainId,
  getUsdcAddress,
  normalizeAddress,
  normalizeCloid,
  resolveHyperliquidAssetIndex,
  signApproveBuilderFee,
  signL1Action,
  splitSignature,
  toApiDecimal,
} from "./base";
import { supportsHyperliquidBuilderFee } from "./symbols";
import type {
  ExchangeOrderAction,
  ExchangeSignature,
  HyperliquidEnvironment,
  HyperliquidGrouping,
  HyperliquidOrderIntent,
  NonceSource,
} from "./base";

export interface HyperliquidOrderOptions {
  wallet: WalletFullContext;
  orders: HyperliquidOrderIntent[];
  grouping?: HyperliquidGrouping;
  environment?: HyperliquidEnvironment;
  vaultAddress?: `0x${string}`;
  expiresAfter?: number;
  nonce?: number;
  nonceSource?: NonceSource;
}

export type HyperliquidOrderStatus =
  | { resting: { oid: number; cloid?: `0x${string}` } }
  | {
      filled: {
        totalSz: string;
        avgPx: string;
        oid: number;
        cloid?: `0x${string}`;
      };
    }
  | { error: string }
  | "waitingForFill"
  | "waitingForTrigger";

export interface HyperliquidOrderResponse {
  status: "ok";
  response: {
    type: "order";
    data: {
      statuses: HyperliquidOrderStatus[];
    };
  };
}

export interface HyperliquidDepositResult {
  txHash: `0x${string}`;
  amount: number;
  amountUnits: string;
  environment: HyperliquidEnvironment;
  bridgeAddress: `0x${string}`;
}

export interface HyperliquidWithdrawResult {
  amount: number;
  destination: `0x${string}`;
  environment: HyperliquidEnvironment;
  nonce: number;
  status: string;
}

export interface HyperliquidClearinghouseState {
  ok: boolean;
  data: Record<string, unknown> | null;
}

export interface HyperliquidApproveBuilderFeeOptions {
  environment: HyperliquidEnvironment;
  wallet: WalletFullContext;
  nonce?: number;
  nonceSource?: NonceSource;
  signatureChainId?: string;
}

export interface HyperliquidApproveBuilderFeeResponse {
  status: string;
  response?: unknown;
  error?: string;
}

function resolveRequiredNonce(params: {
  nonce?: number | undefined;
  nonceSource?: NonceSource | undefined;
  wallet?: Pick<WalletFullContext, "nonceSource"> | undefined;
  action: string;
}): number {
  if (typeof params.nonce === "number") {
    return params.nonce;
  }

  const resolved = params.nonceSource?.() ?? params.wallet?.nonceSource?.();
  if (resolved === undefined) {
    throw new Error(`${params.action} requires an explicit nonce or wallet nonce source.`);
  }

  return resolved;
}

type ExchangeRequestBody = {
  action: ExchangeOrderAction;
  nonce: number;
  signature: ExchangeSignature;
  vaultAddress?: `0x${string}`;
  expiresAfter?: number;
};

function assertPositiveDecimalInput(value: string | number | bigint, label: string): void {
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

function normalizePositiveDecimalString(raw: string, label: string): string {
  const trimmed = raw.trim();
  if (!trimmed.length) {
    throw new Error(`${label} must be a non-empty decimal string.`);
  }
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
    throw new Error(`${label} must be a positive decimal string.`);
  }
  const normalized = trimmed
    .replace(/^0+(?=\d)/, "")
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`${label} must be positive.`);
  }
  return normalized;
}

export async function placeHyperliquidOrder(
  options: HyperliquidOrderOptions,
): Promise<HyperliquidOrderResponse> {
  const {
    wallet,
    orders,
    grouping = "na",
    environment,
    vaultAddress,
    expiresAfter,
    nonce,
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
        fetcher: (...args) => fetch(...args),
      });

      const order: ExchangeOrderAction["orders"][number] = {
        a: assetIndex,
        b: intent.side === "buy",
        p: toApiDecimal(intent.price),
        s: toApiDecimal(intent.size),
        r: intent.reduceOnly ?? false,
        t: intent.trigger
          ? {
              trigger: {
                isMarket: Boolean(intent.trigger.isMarket),
                triggerPx: toApiDecimal(intent.trigger.triggerPx),
                tpsl: intent.trigger.tpsl,
              },
            }
          : {
              limit: {
                tif: intent.tif ?? "Ioc",
              },
            },
        ...(intent.clientId ? { c: normalizeCloid(intent.clientId) } : {}),
      };

      return order;
    }),
  );

  const action: ExchangeOrderAction = {
    type: "order",
    orders: preparedOrders,
    grouping,
  };

  if (orders.every((intent) => supportsHyperliquidBuilderFee(intent))) {
    action.builder = {
      b: normalizeAddress(BUILDER_CODE.address),
      f: BUILDER_CODE.fee,
    };
  }

  const effectiveNonce = resolveRequiredNonce({
    nonce,
    nonceSource: options.nonceSource,
    wallet,
    action: "Hyperliquid order submission",
  });
  const signature = await signL1Action({
    wallet,
    action,
    nonce: effectiveNonce,
    ...(vaultAddress ? { vaultAddress } : {}),
    ...(typeof expiresAfter === "number" ? { expiresAfter } : {}),
    isTestnet: inferredEnvironment === "testnet",
  });

  const body: ExchangeRequestBody = {
    action,
    nonce: effectiveNonce,
    signature,
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
    body: JSON.stringify(body),
  });

  const rawText = await response.text().catch(() => null);
  let parsed: HyperliquidOrderResponse | { error?: string; message?: string } | string | null =
    null;
  if (rawText && rawText.length) {
    try {
      parsed = JSON.parse(rawText) as
        | HyperliquidOrderResponse
        | { error?: string; message?: string }
        | null;
    } catch {
      parsed = rawText;
    }
  }

  const json =
    parsed && typeof parsed === "object" && "status" in parsed
      ? (parsed as HyperliquidOrderResponse)
      : null;

  if (!response.ok || !json) {
    const detail =
      (parsed as { error?: string; message?: string } | null)?.error ??
      (parsed as { error?: string; message?: string } | null)?.message ??
      (typeof parsed === "string" ? parsed : rawText);
    const suffix = detail ? ` Detail: ${detail}` : "";
    throw new HyperliquidApiError(
      `Failed to submit Hyperliquid order.${suffix}`,
      parsed ?? rawText ?? { status: response.status },
    );
  }

  if (json.status !== "ok") {
    const detail = (parsed as { error?: string } | null)?.error ?? rawText;
    throw new HyperliquidApiError(
      detail
        ? `Hyperliquid API returned an error status: ${detail}`
        : "Hyperliquid API returned an error status.",
      json,
    );
  }

  const statuses = json.response?.data?.statuses ?? [];
  const errorStatuses = statuses.filter((entry): entry is { error: string } =>
    Boolean(
      entry &&
        typeof entry === "object" &&
        "error" in entry &&
        typeof (entry as { error?: unknown }).error === "string",
    ),
  );
  if (errorStatuses.length) {
    const message = errorStatuses.map((entry) => entry.error).join(", ");
    throw new HyperliquidApiError(message || "Hyperliquid rejected the order.", json);
  }

  return json;
}

export async function depositToHyperliquidBridge(options: {
  environment: HyperliquidEnvironment;
  amount: string;
  wallet: WalletFullContext;
}): Promise<HyperliquidDepositResult> {
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
    args: [bridgeAddress, amountUnits],
  });

  const txHash = await wallet.walletClient.sendTransaction({
    account: wallet.account,
    to: usdcAddress,
    data,
  });

  await wallet.publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    txHash,
    amount: parsedAmount,
    amountUnits: amountUnits.toString(),
    environment,
    bridgeAddress,
  };
}

export async function withdrawFromHyperliquid(options: {
  environment: HyperliquidEnvironment;
  amount: string;
  destination: `0x${string}`;
  wallet: WalletFullContext;
  nonce?: number;
  nonceSource?: NonceSource;
}): Promise<HyperliquidWithdrawResult> {
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
    action: "Hyperliquid withdraw",
  });
  const time = BigInt(nonce);
  const normalizedDestination = normalizeAddress(destination);

  const signatureHex = await wallet.walletClient.signTypedData({
    account: wallet.account,
    domain: {
      name: "HyperliquidSignTransaction",
      version: "1",
      chainId: Number.parseInt(signatureChainId, 16),
      verifyingContract: ZERO_ADDRESS,
    },
    types: {
      "HyperliquidTransaction:Withdraw": [
        { name: "hyperliquidChain", type: "string" },
        { name: "destination", type: "string" },
        { name: "amount", type: "string" },
        { name: "time", type: "uint64" },
      ],
    },
    primaryType: "HyperliquidTransaction:Withdraw",
    message: {
      hyperliquidChain,
      destination: normalizedDestination,
      amount: normalizedAmount,
      time,
    },
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
        time: nonce,
      },
      nonce,
      signature: splitSignature(signatureHex),
    }),
  });

  const json = (await response.json().catch(() => null)) as {
    status?: string;
    response?: unknown;
    error?: string;
  } | null;

  if (!response.ok || json?.status !== "ok") {
    throw new Error(
      `Hyperliquid withdraw failed: ${json?.response ?? json?.error ?? response.statusText}`,
    );
  }

  return {
    amount: parsedAmount,
    destination: normalizedDestination,
    environment,
    nonce,
    status: json.status ?? "ok",
  };
}

export async function fetchHyperliquidClearinghouseState(params: {
  environment: HyperliquidEnvironment;
  walletAddress: `0x${string}`;
}): Promise<HyperliquidClearinghouseState> {
  const response = await fetch(`${HL_ENDPOINT[params.environment]}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "clearinghouseState", user: params.walletAddress }),
  });

  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { ok: response.ok, data };
}

export async function approveHyperliquidBuilderFee(
  options: HyperliquidApproveBuilderFeeOptions,
): Promise<HyperliquidApproveBuilderFeeResponse> {
  const { environment, wallet, nonce, signatureChainId } = options;

  if (!wallet?.account || !wallet.walletClient) {
    throw new Error("Hyperliquid builder approval requires a wallet with signing capabilities.");
  }

  const inferredEnvironment = environment ?? "mainnet";
  const maxFeeRate = `${BUILDER_CODE.fee / 1000}%`;
  const effectiveNonce = resolveRequiredNonce({
    nonce,
    nonceSource: options.nonceSource,
    wallet,
    action: "Hyperliquid builder approval",
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
        nonce: effectiveNonce,
      },
      nonce: effectiveNonce,
      signature: await signApproveBuilderFee({
        wallet,
        maxFeeRate,
        nonce: BigInt(effectiveNonce),
        signatureChainId: signatureChainId ?? getSignatureChainId(inferredEnvironment),
        isTestnet: inferredEnvironment === "testnet",
      }),
    }),
  });

  const rawText = await response.text().catch(() => null);
  let parsed:
    | HyperliquidApproveBuilderFeeResponse
    | { error?: string; message?: string }
    | string
    | null = null;
  if (rawText && rawText.length) {
    try {
      parsed = JSON.parse(rawText) as
        | HyperliquidApproveBuilderFeeResponse
        | { error?: string; message?: string }
        | null;
    } catch {
      parsed = rawText;
    }
  }

  const json =
    parsed && typeof parsed === "object" && "status" in parsed
      ? (parsed as HyperliquidApproveBuilderFeeResponse)
      : null;

  if (!response.ok || !json) {
    const detail =
      (parsed as { error?: string; message?: string } | null)?.error ??
      (parsed as { error?: string; message?: string } | null)?.message ??
      (typeof parsed === "string" ? parsed : rawText);
    const suffix = detail ? ` Detail: ${detail}` : "";
    throw new HyperliquidApiError(
      `Failed to submit builder approval.${suffix}`,
      parsed ?? rawText ?? { status: response.status },
    );
  }

  if (json.status !== "ok") {
    const detail = (parsed as { error?: string } | null)?.error ?? rawText;
    throw new HyperliquidApiError(
      detail
        ? `Hyperliquid builder approval returned an error: ${detail}`
        : "Hyperliquid builder approval returned an error.",
      json,
    );
  }

  return json;
}

export async function getHyperliquidMaxBuilderFee(params: {
  environment: HyperliquidEnvironment;
  user: `0x${string}`;
}): Promise<unknown> {
  const response = await fetch(`${API_BASES[params.environment]}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "maxBuilderFee",
      user: normalizeAddress(params.user),
      builder: BUILDER_CODE.address,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new HyperliquidApiError(
      "Failed to query max builder fee.",
      data ?? { status: response.status },
    );
  }

  return data;
}

export function createHyperliquidActionHash(params: {
  action: Record<string, unknown> | ExchangeOrderAction;
  nonce: number;
  isTestnet: boolean;
  vaultAddress?: `0x${string}`;
  expiresAfter?: number;
}) {
  return createL1ActionHash(params);
}

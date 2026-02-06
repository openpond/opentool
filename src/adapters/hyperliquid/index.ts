import { encodeFunctionData, erc20Abi, parseUnits } from "viem";
import type { WalletFullContext } from "../../wallet/types";
import { store, type StoreOptions } from "../../store";
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
  normalizeHex,
  resolveHyperliquidAssetIndex,
  signApproveBuilderFee,
  signL1Action,
  splitSignature,
  toApiDecimal,
} from "./base";
import type {
  HyperliquidEnvironment,
  HyperliquidGrouping,
  HyperliquidOrderIntent,
  ExchangeOrderAction,
  ExchangeSignature,
} from "./base";
export type {
  HyperliquidEnvironment as HyperliquidEnvironment,
  HyperliquidTimeInForce as HyperliquidTimeInForce,
  HyperliquidGrouping as HyperliquidGrouping,
  HyperliquidTriggerType as HyperliquidTriggerType,
  HyperliquidTriggerOptions as HyperliquidTriggerOptions,
  HyperliquidOrderIntent as HyperliquidOrderIntent,
  HyperliquidAbstraction as HyperliquidAbstraction,
  HyperliquidAccountMode as HyperliquidAccountMode,
  HyperliquidBuilderFee as HyperliquidBuilderFee,
  NonceSource,
  HyperliquidExchangeResponse,
} from "./base";
export {
  HyperliquidApiError,
  HyperliquidGuardError,
  HyperliquidTermsError,
  HyperliquidBuilderApprovalError,
  createMonotonicNonceFactory,
  DEFAULT_HYPERLIQUID_MARKET_SLIPPAGE_BPS,
  computeHyperliquidMarketIocLimitPrice,
  resolveHyperliquidAbstractionFromMode,
} from "./base";
export {
  fetchHyperliquidMeta,
  fetchHyperliquidMetaAndAssetCtxs,
  fetchHyperliquidSpotMeta,
  fetchHyperliquidSpotMetaAndAssetCtxs,
  fetchHyperliquidAssetCtxs,
  fetchHyperliquidSpotAssetCtxs,
  fetchHyperliquidOpenOrders,
  fetchHyperliquidFrontendOpenOrders,
  fetchHyperliquidOrderStatus,
  fetchHyperliquidHistoricalOrders,
  fetchHyperliquidUserFills,
  fetchHyperliquidUserFillsByTime,
  fetchHyperliquidUserRateLimit,
  fetchHyperliquidPreTransferCheck,
  fetchHyperliquidSpotClearinghouseState,
  HyperliquidInfoClient,
} from "./info";

export interface HyperliquidOrderOptions {
  wallet: WalletFullContext;
  orders: HyperliquidOrderIntent[];
  grouping?: HyperliquidGrouping;
  environment?: HyperliquidEnvironment;
  vaultAddress?: `0x${string}`;
  expiresAfter?: number;
  nonce?: number;
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
  | { error: string };

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
  /** Override default signature chain id. */
  signatureChainId?: string;
}

export interface HyperliquidApproveBuilderFeeResponse {
  status: string;
  response?: unknown;
  error?: string;
}

export interface HyperliquidTermsRecordInput {
  environment: HyperliquidEnvironment;
  walletAddress: `0x${string}`;
  storeOptions?: StoreOptions;
}

export interface HyperliquidBuilderApprovalRecordInput {
  environment: HyperliquidEnvironment;
  walletAddress: `0x${string}`;
  storeOptions?: StoreOptions;
}

type ExchangeRequestBody = {
  action: ExchangeOrderAction;
  nonce: number;
  signature: ExchangeSignature;
  vaultAddress?: `0x${string}`;
  expiresAfter?: number;
};

/**
 * Sign and submit one or more orders to the Hyperliquid exchange endpoint.
 */
export async function placeHyperliquidOrder(
  options: HyperliquidOrderOptions
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
      const assetIndex = await resolveHyperliquidAssetIndex({
        symbol: intent.symbol,
        baseUrl: resolvedBaseUrl,
        environment: inferredEnvironment,
        fetcher: fetch,
      });

      const limitOrTrigger = intent.trigger
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
          };

      const order: ExchangeOrderAction["orders"][number] = {
        a: assetIndex,
        b: intent.side === "buy",
        p: toApiDecimal(intent.price),
        s: toApiDecimal(intent.size),
        r: intent.reduceOnly ?? false,
        t: limitOrTrigger,
        ...(intent.clientId
          ? {
              c: normalizeHex(intent.clientId),
            }
          : {}),
      };

      return order;
    })
  );

  const action: ExchangeOrderAction = {
    type: "order",
    orders: preparedOrders,
    grouping,
  };

  if (effectiveBuilder) {
    action.builder = {
      b: normalizeAddress(effectiveBuilder.address),
      f: effectiveBuilder.fee,
    };
  }

  const effectiveNonce = nonce ?? Date.now();
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
  let parsed: HyperliquidOrderResponse | { error?: string; message?: string } | string | null = null;
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
      parsed ?? rawText ?? { status: response.status }
    );
  }

  if (json.status !== "ok") {
    const detail = (parsed as { error?: string } | null)?.error ?? rawText;
    throw new HyperliquidApiError(
      detail
        ? `Hyperliquid API returned an error status: ${detail}`
        : "Hyperliquid API returned an error status.",
      json
    );
  }

  const statuses = json.response?.data?.statuses ?? [];
  const errorStatuses = statuses.filter(
    (entry): entry is { error: string } => "error" in entry
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
    args: [bridgeAddress, amountUnits],
  });

  const txHash = await walletClient.sendTransaction({
    account: wallet.account,
    to: usdcAddress,
    data,
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

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
}): Promise<HyperliquidWithdrawResult> {
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
    verifyingContract: ZERO_ADDRESS,
  } as const;

  const time = BigInt(Date.now());
  const nonce = Number(time);
  const normalizedDestination = normalizeAddress(destination);

  const message = {
    hyperliquidChain,
    destination: normalizedDestination,
    amount: parsedAmount.toString(),
    time,
  };

  const types = {
    "HyperliquidTransaction:Withdraw": [
      { name: "hyperliquidChain", type: "string" },
      { name: "destination", type: "string" },
      { name: "amount", type: "string" },
      { name: "time", type: "uint64" },
    ],
  } as const;

  const signatureHex = await wallet.walletClient.signTypedData({
    account: wallet.account,
    domain,
    types,
    primaryType: "HyperliquidTransaction:Withdraw",
    message,
  });

  const signature = splitSignature(signatureHex);

  const payload = {
    action: {
      type: "withdraw3",
      signatureChainId,
      hyperliquidChain,
      destination: normalizedDestination,
      amount: parsedAmount.toString(),
      time: nonce,
    },
    nonce,
    signature,
  };

  const endpoint = `${HL_ENDPOINT[environment]}/exchange`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = (await response.json().catch(() => null)) as {
    status?: string;
    response?: unknown;
    error?: string;
  } | null;

  if (!response.ok || json?.status !== "ok") {
    throw new Error(
      `Hyperliquid withdraw failed: ${
        json?.response ?? json?.error ?? response.statusText
      }`
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
  const { environment, walletAddress } = params;
  const response = await fetch(`${HL_ENDPOINT[environment]}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "clearinghouseState", user: walletAddress }),
  });

  const data = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  return {
    ok: response.ok,
    data,
  };
}

/**
 * Approve a max builder fee for a specific builder address (user-signed action).
 */
export async function approveHyperliquidBuilderFee(
  options: HyperliquidApproveBuilderFeeOptions
): Promise<HyperliquidApproveBuilderFeeResponse> {
  const { environment, wallet, nonce, signatureChainId } = options;

  if (!wallet?.account || !wallet.walletClient) {
    throw new Error(
      "Hyperliquid builder approval requires a wallet with signing capabilities."
    );
  }

  const maxFeeRateValue = BUILDER_CODE.fee / 1000;
  const formattedPercent = `${maxFeeRateValue}%`;

  const normalizedBuilder = normalizeAddress(BUILDER_CODE.address);
  const inferredEnvironment = environment ?? "mainnet";
  const resolvedBaseUrl = API_BASES[inferredEnvironment];
  const maxFeeRate = formattedPercent;

  const effectiveNonce = nonce ?? Date.now();
  const signatureNonce = BigInt(effectiveNonce);
  const signatureChainHex =
    signatureChainId ?? getSignatureChainId(inferredEnvironment);

  const approvalSignature = await signApproveBuilderFee({
    wallet,
    maxFeeRate,
    nonce: signatureNonce,
    signatureChainId: signatureChainHex,
    isTestnet: inferredEnvironment === "testnet",
  });

  const action = {
    type: "approveBuilderFee",
    maxFeeRate,
    builder: normalizedBuilder,
    hyperliquidChain: HL_CHAIN_LABEL[inferredEnvironment],
    signatureChainId: signatureChainHex,
    nonce: effectiveNonce,
  };

  const payload = {
    action,
    nonce: effectiveNonce,
    signature: approvalSignature,
  };

  const response = await fetch(`${resolvedBaseUrl}/exchange`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text().catch(() => null);
  let parsed: HyperliquidApproveBuilderFeeResponse | { error?: string; message?: string } | string | null = null;
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
      parsed ?? rawText ?? { status: response.status }
    );
  }

  if (json.status !== "ok") {
    const detail = (parsed as { error?: string } | null)?.error ?? rawText;
    throw new HyperliquidApiError(
      detail
        ? `Hyperliquid builder approval returned an error: ${detail}`
        : "Hyperliquid builder approval returned an error.",
      json
    );
  }

  return json;
}

/**
 * Query max builder fee for a user/builder pair.
 */
export async function getHyperliquidMaxBuilderFee(params: {
  environment: HyperliquidEnvironment;
  user: `0x${string}`;
}): Promise<unknown> {
  const { environment, user } = params;
  const resolvedBaseUrl = API_BASES[environment];

  const response = await fetch(`${resolvedBaseUrl}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      type: "maxBuilderFee",
      user: normalizeAddress(user),
      builder: BUILDER_CODE.address,
    }),
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

export async function recordHyperliquidTermsAcceptance(
  input: HyperliquidTermsRecordInput
) {
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
        note: "Hyperliquid does not expose a terms endpoint; this records local acknowledgement only.",
      },
    },
    storeOptions
  );
}

export async function recordHyperliquidBuilderApproval(
  input: HyperliquidBuilderApprovalRecordInput
) {
  const { environment, walletAddress, storeOptions } = input;
  const maxFeeRate = `${BUILDER_CODE.fee / 1000}%`;
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
        maxFeeRate,
      },
    },
    storeOptions
  );
}

export * from "./exchange";
export * from "./info";

export const __hyperliquidInternals = {
  toApiDecimal,
  createL1ActionHash,
  splitSignature,
};

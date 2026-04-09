import type { WalletFullContext } from "../../wallet/types";
import type {
  HyperliquidEnvironment,
  HyperliquidGrouping,
  HyperliquidOrderIntent,
  HyperliquidTriggerType,
  NonceSource,
} from "./base";
import { placeHyperliquidOrder, type HyperliquidOrderResponse } from "./actions";
import { fetchHyperliquidSizeDecimals, fetchHyperliquidTickSize } from "./market-data";
import {
  formatHyperliquidMarketablePrice,
  formatHyperliquidPrice,
  formatHyperliquidSize,
} from "./order-utils";
import { isHyperliquidSpotSymbol } from "./symbols";

export const DEFAULT_HYPERLIQUID_TPSL_MARKET_SLIPPAGE_BPS = 1_000;

export type HyperliquidTpSlExecutionType = "market" | "limit";

export interface HyperliquidTpSlLegInput {
  triggerPx: string | number | bigint;
  execution?: HyperliquidTpSlExecutionType;
  price?: string | number | bigint;
  clientId?: `0x${string}`;
}

export interface HyperliquidPlaceOrderWithTpSlOptions {
  wallet: WalletFullContext;
  parent: HyperliquidOrderIntent;
  referencePrice: string | number;
  takeProfit?: HyperliquidTpSlLegInput | null;
  stopLoss?: HyperliquidTpSlLegInput | null;
  environment?: HyperliquidEnvironment;
  grouping?: Extract<HyperliquidGrouping, "normalTpsl">;
  vaultAddress?: `0x${string}`;
  expiresAfter?: number;
  nonce?: number;
  nonceSource?: NonceSource;
  triggerMarketSlippageBps?: number;
}

export interface HyperliquidPlacePositionTpSlOptions {
  wallet: WalletFullContext;
  symbol: string;
  positionSide: "long" | "short";
  size: string | number | bigint;
  referencePrice: string | number;
  takeProfit?: HyperliquidTpSlLegInput | null;
  stopLoss?: HyperliquidTpSlLegInput | null;
  environment?: HyperliquidEnvironment;
  grouping?: Extract<HyperliquidGrouping, "positionTpsl">;
  vaultAddress?: `0x${string}`;
  expiresAfter?: number;
  nonce?: number;
  nonceSource?: NonceSource;
  triggerMarketSlippageBps?: number;
}

function toDecimalInput(value: string | number | bigint, label: string): string | number {
  if (typeof value === "bigint") {
    if (value <= 0n) {
      throw new Error(`${label} must be positive.`);
    }
    return value.toString();
  }
  return value;
}

function toPositiveNumber(value: string | number | bigint, label: string): number {
  if (typeof value === "bigint") {
    if (value <= 0n) {
      throw new Error(`${label} must be positive.`);
    }
    return Number(value);
  }
  const numeric =
    typeof value === "number" ? value : Number.parseFloat(value.toString().trim());
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`${label} must be positive.`);
  }
  return numeric;
}

function normalizeExecutionType(value?: HyperliquidTpSlExecutionType): HyperliquidTpSlExecutionType {
  return value ?? "market";
}

function assertSupportedParentOrder(parent: HyperliquidOrderIntent) {
  if (parent.reduceOnly) {
    throw new Error(
      "Reduce-only parent orders are not supported with attached TP/SL. Use placeHyperliquidPositionTpSl for existing positions.",
    );
  }
}

function resolveTriggerDirection(params: {
  leg: HyperliquidTriggerType;
  parentSide: HyperliquidOrderIntent["side"];
  referencePrice: number;
  triggerPx: number;
}) {
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

async function buildTpSlChildOrder(params: {
  symbol: string;
  parentSide: HyperliquidOrderIntent["side"];
  size: string | number | bigint;
  referencePrice: number;
  legType: HyperliquidTriggerType;
  leg: HyperliquidTpSlLegInput;
  environment: HyperliquidEnvironment;
  triggerMarketSlippageBps: number;
}): Promise<HyperliquidOrderIntent> {
  const marketType = isHyperliquidSpotSymbol(params.symbol) ? "spot" : "perp";
  const [szDecimals, tick] = await Promise.all([
    fetchHyperliquidSizeDecimals({
      environment: params.environment,
      symbol: params.symbol,
    }),
    fetchHyperliquidTickSize({
      environment: params.environment,
      symbol: params.symbol,
    }).catch(() => null),
  ]);

  const childSide: HyperliquidOrderIntent["side"] = params.parentSide === "buy" ? "sell" : "buy";
  const triggerPxNumeric = toPositiveNumber(params.leg.triggerPx, `${params.legType} triggerPx`);
  resolveTriggerDirection({
    leg: params.legType,
    parentSide: params.parentSide,
    referencePrice: params.referencePrice,
    triggerPx: triggerPxNumeric,
  });

  const execution = normalizeExecutionType(params.leg.execution);
  const size = formatHyperliquidSize(toDecimalInput(params.size, "size"), szDecimals);
  const triggerPx = formatHyperliquidPrice(triggerPxNumeric, szDecimals, marketType);
  const explicitLimitPrice =
    params.leg.price != null ? toDecimalInput(params.leg.price, `${params.legType} price`) : null;
  const explicitLimitPriceNumeric =
    explicitLimitPrice != null
      ? toPositiveNumber(explicitLimitPrice, `${params.legType} price`)
      : null;
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
  const price =
    execution === "limit"
      ? formatHyperliquidPrice(
          explicitLimitPrice!,
          szDecimals,
          marketType,
        )
      : formatHyperliquidMarketablePrice({
          mid: triggerPxNumeric,
          side: childSide,
          slippageBps: params.triggerMarketSlippageBps,
          tick,
          szDecimals,
          marketType,
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
      tpsl: params.legType,
    },
    ...(params.leg.clientId ? { clientId: params.leg.clientId } : {}),
  };
}

async function buildAttachedTpSlOrders(params: {
  symbol: string;
  parentSide: HyperliquidOrderIntent["side"];
  size: string | number | bigint;
  referencePrice: string | number;
  takeProfit: HyperliquidTpSlLegInput | null;
  stopLoss: HyperliquidTpSlLegInput | null;
  environment: HyperliquidEnvironment;
  triggerMarketSlippageBps: number;
}): Promise<HyperliquidOrderIntent[]> {
  const referencePrice = toPositiveNumber(params.referencePrice, "referencePrice");
  const legs = await Promise.all(
    [
      params.takeProfit
        ? buildTpSlChildOrder({
            symbol: params.symbol,
            parentSide: params.parentSide,
            size: params.size,
            referencePrice,
            legType: "tp",
            leg: params.takeProfit,
            environment: params.environment,
            triggerMarketSlippageBps: params.triggerMarketSlippageBps,
          })
        : null,
      params.stopLoss
        ? buildTpSlChildOrder({
            symbol: params.symbol,
            parentSide: params.parentSide,
            size: params.size,
            referencePrice,
            legType: "sl",
            leg: params.stopLoss,
            environment: params.environment,
            triggerMarketSlippageBps: params.triggerMarketSlippageBps,
          })
        : null,
    ],
  );

  return legs.filter((entry): entry is HyperliquidOrderIntent => Boolean(entry));
}

export async function placeHyperliquidOrderWithTpSl(
  options: HyperliquidPlaceOrderWithTpSlOptions,
): Promise<HyperliquidOrderResponse> {
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
    triggerMarketSlippageBps:
      options.triggerMarketSlippageBps ?? DEFAULT_HYPERLIQUID_TPSL_MARKET_SLIPPAGE_BPS,
  });

  return placeHyperliquidOrder({
    wallet: options.wallet,
    orders: [options.parent, ...childOrders],
    grouping: options.grouping ?? "normalTpsl",
    environment: env,
    ...(options.vaultAddress ? { vaultAddress: options.vaultAddress } : {}),
    ...(typeof options.expiresAfter === "number" ? { expiresAfter: options.expiresAfter } : {}),
    ...(typeof options.nonce === "number" ? { nonce: options.nonce } : {}),
    ...(options.nonceSource ? { nonceSource: options.nonceSource } : {}),
  });
}

export async function placeHyperliquidPositionTpSl(
  options: HyperliquidPlacePositionTpSlOptions,
): Promise<HyperliquidOrderResponse> {
  const env = options.environment ?? "mainnet";
  const parentSide: HyperliquidOrderIntent["side"] =
    options.positionSide === "long" ? "buy" : "sell";
  const childOrders = await buildAttachedTpSlOrders({
    symbol: options.symbol,
    parentSide,
    size: options.size,
    referencePrice: options.referencePrice,
    takeProfit: options.takeProfit ?? null,
    stopLoss: options.stopLoss ?? null,
    environment: env,
    triggerMarketSlippageBps:
      options.triggerMarketSlippageBps ?? DEFAULT_HYPERLIQUID_TPSL_MARKET_SLIPPAGE_BPS,
  });

  if (childOrders.length === 0) {
    throw new Error("At least one TP or SL order is required.");
  }

  return placeHyperliquidOrder({
    wallet: options.wallet,
    orders: childOrders,
    grouping: options.grouping ?? "positionTpsl",
    environment: env,
    ...(options.vaultAddress ? { vaultAddress: options.vaultAddress } : {}),
    ...(typeof options.expiresAfter === "number" ? { expiresAfter: options.expiresAfter } : {}),
    ...(typeof options.nonce === "number" ? { nonce: options.nonce } : {}),
    ...(options.nonceSource ? { nonceSource: options.nonceSource } : {}),
  });
}

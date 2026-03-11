export type HyperliquidApproximateLiquidationParams = {
  entryPrice: number;
  side: "buy" | "sell";
  notionalUsd: number;
  leverage: number;
  maxLeverage: number;
  marginMode: "cross" | "isolated";
  availableCollateralUsd?: number | null;
};

function toFinitePositive(value: number): number | null {
  return Number.isFinite(value) && value > 0 ? value : null;
}

function estimateMaintenanceLeverage(maxLeverage: number): number | null {
  const normalized = toFinitePositive(maxLeverage);
  if (!normalized) return null;
  return normalized * 2;
}

export function estimateHyperliquidLiquidationPrice(
  params: HyperliquidApproximateLiquidationParams,
): number | null {
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
  const marginAvailable =
    params.marginMode === "cross"
      ? Math.max(
          toFinitePositive(params.availableCollateralUsd ?? 0) ?? isolatedMargin,
          isolatedMargin,
        )
      : isolatedMargin;

  const sideSign = params.side === "buy" ? 1 : -1;
  const maintenanceFactor = 1 / maintenanceLeverage;
  const denominator = 1 - maintenanceFactor * sideSign;
  if (!Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }

  const liquidationPrice =
    entryPrice - (sideSign * (marginAvailable / size)) / denominator;

  if (!Number.isFinite(liquidationPrice) || liquidationPrice <= 0) {
    return null;
  }

  return liquidationPrice;
}

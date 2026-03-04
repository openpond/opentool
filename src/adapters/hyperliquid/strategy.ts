export type HyperliquidExecutionMode = "long-only" | "long-short";

export type HyperliquidTradeSignal = "buy" | "sell" | "hold" | "unknown";

export type HyperliquidTradePlan = {
  side: "buy" | "sell";
  size: number;
  reduceOnly: boolean;
  targetSize: number;
};

export interface HyperliquidTargetSizeConfig {
  allocationMode: "percent_equity" | "fixed";
  percentOfEquity: number;
  maxPercentOfEquity: number;
  amountUsd?: number;
}

export interface HyperliquidTargetSizeExecution {
  size?: number;
}

export type HyperliquidDcaSymbolInput = { symbol: string; weight?: number } | string;

export type HyperliquidDcaSymbolEntry = {
  symbol: string;
  weight: number;
};

export type HyperliquidDcaNormalizedEntry = {
  symbol: string;
  weight: number;
  normalizedWeight: number;
};

function clampDcaWeight(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(1_000_000, Math.max(0, value));
}

export function resolveHyperliquidBudgetUsd(params: {
  config: HyperliquidTargetSizeConfig;
  accountValue: number | null;
}): number {
  const { config, accountValue } = params;
  if (config.allocationMode === "fixed") {
    const desiredUsd = config.amountUsd ?? 0;
    if (!Number.isFinite(desiredUsd) || desiredUsd <= 0) {
      throw new Error("fixed allocation requires amountUsd");
    }
    return desiredUsd;
  }

  if (!Number.isFinite(accountValue ?? Number.NaN)) {
    throw new Error("percent allocation requires accountValue");
  }
  const rawUsd = (accountValue as number) * (config.percentOfEquity / 100);
  const maxPercentUsd = (accountValue as number) * (config.maxPercentOfEquity / 100);
  return Math.min(rawUsd, maxPercentUsd);
}

export function resolveHyperliquidDcaSymbolEntries(
  inputs: HyperliquidDcaSymbolInput[] | undefined,
  fallbackSymbol: string,
): HyperliquidDcaSymbolEntry[] {
  const entries: HyperliquidDcaSymbolEntry[] = [];
  const values = Array.isArray(inputs) ? inputs : [];

  for (const input of values) {
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (!trimmed) continue;
      const [rawSymbol, rawWeight] = trimmed.split(":");
      const symbol = rawSymbol?.trim();
      if (!symbol) continue;
      const parsedWeight =
        typeof rawWeight === "string" && rawWeight.trim().length > 0
          ? Number.parseFloat(rawWeight.trim())
          : 1;
      const weight =
        Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : 1;
      entries.push({ symbol, weight });
      continue;
    }

    if (!input || typeof input !== "object") continue;
    const symbol = input.symbol?.trim();
    if (!symbol) continue;
    const parsedWeight =
      typeof input.weight === "number" && Number.isFinite(input.weight)
        ? input.weight
        : 1;
    const weight = parsedWeight > 0 ? parsedWeight : 1;
    entries.push({ symbol, weight });
  }

  if (entries.length > 0) {
    return entries;
  }
  return [{ symbol: fallbackSymbol, weight: 1 }];
}

export function normalizeHyperliquidDcaEntries(params: {
  entries: Array<{ symbol: string; weight?: number }> | undefined;
  fallbackSymbol: string;
}): HyperliquidDcaNormalizedEntry[] {
  const map = new Map<string, HyperliquidDcaSymbolEntry>();
  const entries = Array.isArray(params.entries) ? params.entries : [];

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const symbol = typeof entry.symbol === "string" ? entry.symbol.trim() : "";
    if (!symbol) continue;

    const key = symbol.toUpperCase();
    const weight = clampDcaWeight(entry.weight);
    if (weight <= 0) continue;
    const existing = map.get(key);
    if (existing) {
      existing.weight += weight;
    } else {
      map.set(key, { symbol, weight });
    }
  }

  if (map.size === 0) {
    map.set(params.fallbackSymbol.toUpperCase(), {
      symbol: params.fallbackSymbol,
      weight: 1,
    });
  }

  const entriesList = Array.from(map.values());
  const totalWeight = entriesList.reduce((sum, entry) => sum + entry.weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    return [];
  }

  return entriesList.map((entry) => ({
    symbol: entry.symbol,
    weight: entry.weight,
    normalizedWeight: entry.weight / totalWeight,
  }));
}

export function resolveHyperliquidMaxPerRunUsd(
  targetNotionalUsd: number,
  hedgeRatio: number,
): number {
  if (!Number.isFinite(targetNotionalUsd) || targetNotionalUsd <= 0) return 0;
  const ratio = Number.isFinite(hedgeRatio) && hedgeRatio > 0 ? hedgeRatio : 1;
  return Math.max(targetNotionalUsd, targetNotionalUsd * ratio);
}

export function clampHyperliquidAbs(value: number, limit: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(limit) || limit <= 0) return 0;
  const capped = Math.min(Math.abs(value), limit);
  return Math.sign(value) * capped;
}

export function resolveHyperliquidTargetSize(params: {
  config: HyperliquidTargetSizeConfig;
  execution: HyperliquidTargetSizeExecution;
  accountValue: number | null;
  currentPrice: number;
}): { targetSize: number; budgetUsd: number } {
  const { config, execution, accountValue, currentPrice } = params;

  if (execution.size && Number.isFinite(execution.size)) {
    return { targetSize: execution.size, budgetUsd: execution.size * currentPrice };
  }

  if (config.allocationMode === "fixed") {
    const budgetUsd = resolveHyperliquidBudgetUsd({
      config,
      accountValue,
    });
    return { targetSize: budgetUsd / currentPrice, budgetUsd };
  }

  const budgetUsd = resolveHyperliquidBudgetUsd({
    config,
    accountValue,
  });
  return { targetSize: budgetUsd / currentPrice, budgetUsd };
}

export function planHyperliquidTrade(params: {
  signal: HyperliquidTradeSignal;
  mode: HyperliquidExecutionMode;
  currentSize: number;
  targetSize: number;
}): HyperliquidTradePlan | null {
  const { signal, mode, currentSize, targetSize } = params;
  if (signal === "hold" || signal === "unknown") return null;

  if (signal === "buy") {
    const desired = mode === "long-short" ? targetSize : Math.max(targetSize, 0);
    const delta = desired - currentSize;
    if (delta <= 0) return null;
    return {
      side: "buy",
      size: delta,
      reduceOnly: false,
      targetSize: desired,
    };
  }

  if (mode === "long-only") {
    if (currentSize <= 0) return null;
    return {
      side: "sell",
      size: currentSize,
      reduceOnly: true,
      targetSize: 0,
    };
  }

  const desired = -Math.abs(targetSize);
  const delta = currentSize - desired;
  if (delta <= 0) return null;
  return {
    side: "sell",
    size: delta,
    reduceOnly: false,
    targetSize: desired,
  };
}

export type HyperliquidScheduleUnit = "minutes" | "hours";

export type HyperliquidCadence =
  | "daily"
  | "hourly"
  | "weekly"
  | "twice-weekly"
  | "monthly";

export type HyperliquidResolution = "1" | "5" | "15" | "30" | "60" | "240" | "1D" | "1W";

export const DEFAULT_HYPERLIQUID_CADENCE_CRON: Record<HyperliquidCadence, string> = {
  daily: "0 8 * * *",
  hourly: "0 * * * *",
  weekly: "0 8 * * 1",
  "twice-weekly": "0 8 * * 1,4",
  monthly: "0 8 1 * *",
};

export function parseHyperliquidJson(raw: string | null): unknown | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function clampHyperliquidInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (value == null) return fallback;
  if (typeof value === "string" && value.trim().length === 0) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const numeric = Math.trunc(parsed);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

export function clampHyperliquidFloat(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (value == null) return fallback;
  if (typeof value === "string" && value.trim().length === 0) return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

export function resolveHyperliquidScheduleEvery(
  input: unknown,
  options?: { min?: number; max?: number; fallback?: number },
): number {
  const min = options?.min ?? 1;
  const max = options?.max ?? 59;
  const fallback = options?.fallback ?? 1;
  return clampHyperliquidInt(input, min, max, fallback);
}

export function resolveHyperliquidScheduleUnit(
  input: unknown,
  fallback: HyperliquidScheduleUnit = "hours",
): HyperliquidScheduleUnit {
  if (input === "minutes") return "minutes";
  if (input === "hours") return "hours";
  return fallback;
}

export function resolveHyperliquidIntervalCron(
  every: number,
  unit: HyperliquidScheduleUnit,
): string {
  if (unit === "minutes") {
    return every === 1 ? "* * * * *" : `*/${every} * * * *`;
  }
  return every === 1 ? "0 * * * *" : `0 */${every} * * *`;
}

export function resolveHyperliquidHourlyInterval(
  input: unknown,
  fallback = 1,
): number {
  return clampHyperliquidInt(input, 1, 24, fallback);
}

export function resolveHyperliquidCadenceCron(
  cadence: HyperliquidCadence,
  hourlyInterval: unknown,
  cadenceToCron: Record<HyperliquidCadence, string> = DEFAULT_HYPERLIQUID_CADENCE_CRON,
): string {
  if (cadence !== "hourly") {
    return cadenceToCron[cadence];
  }
  const interval = resolveHyperliquidHourlyInterval(hourlyInterval, 1);
  return interval === 1 ? cadenceToCron.hourly : `0 */${interval} * * *`;
}

export function resolveHyperliquidCadenceFromResolution(
  resolution: HyperliquidResolution,
): { cadence: HyperliquidCadence; hourlyInterval?: number } {
  if (resolution === "60") {
    return { cadence: "hourly", hourlyInterval: 1 };
  }
  if (resolution === "240") {
    return { cadence: "hourly", hourlyInterval: 4 };
  }
  if (resolution === "1W") {
    return { cadence: "weekly" };
  }
  return { cadence: "daily" };
}

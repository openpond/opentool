import { z } from "zod";

export const backtestDecisionRequestSchema = z
  .object({
    mode: z.literal("backtest_decisions"),
    source: z.string().min(1).optional(),
    symbol: z.string().min(1).optional(),
    lookbackDays: z.number().positive().optional(),
    timeframeStart: z.string().optional(),
    timeframeEnd: z.string().optional(),
    from: z.number().int().nonnegative().optional(),
    to: z.number().int().nonnegative().optional(),
    initialEquityUsd: z.number().positive().optional(),
  })
  .strict();

export type BacktestDecisionRequest = z.infer<typeof backtestDecisionRequestSchema>;

export type BacktestResolution = "1" | "5" | "15" | "30" | "60" | "240" | "1D" | "1W";

const RESOLUTION_SECONDS: Record<BacktestResolution, number> = {
  "1": 60,
  "5": 300,
  "15": 900,
  "30": 1800,
  "60": 3600,
  "240": 14400,
  "1D": 86400,
  "1W": 604800,
};

export function parseTimeToSeconds(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const trimmed = value.trim();
    if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
      const numeric = Number.parseFloat(trimmed);
      return Math.max(0, Math.trunc(numeric));
    }
    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
      return Math.max(0, Math.trunc(parsedDate.getTime() / 1000));
    }
  }
  return null;
}

export function resolutionToSeconds(resolution: BacktestResolution): number {
  return RESOLUTION_SECONDS[resolution];
}

export function estimateCountBack(params: {
  fallback: number;
  lookbackDays?: number;
  resolution: BacktestResolution;
  fromSeconds?: number;
  toSeconds?: number;
  minCountBack?: number;
  bufferBars?: number;
}): number {
  const {
    fallback,
    lookbackDays,
    resolution,
    fromSeconds,
    toSeconds,
    minCountBack = 50,
    bufferBars = 5,
  } = params;

  if (typeof lookbackDays === "number" && Number.isFinite(lookbackDays) && lookbackDays > 0) {
    const interval = resolutionToSeconds(resolution);
    const bars = Math.ceil((lookbackDays * 86400) / interval);
    return Math.max(minCountBack, bars + bufferBars);
  }

  if (
    typeof fromSeconds === "number" &&
    Number.isFinite(fromSeconds) &&
    typeof toSeconds === "number" &&
    Number.isFinite(toSeconds) &&
    toSeconds > fromSeconds
  ) {
    const interval = resolutionToSeconds(resolution);
    const bars = Math.ceil((toSeconds - fromSeconds) / interval);
    return Math.max(minCountBack, bars + bufferBars);
  }

  return fallback;
}

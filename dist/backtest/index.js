import { z } from 'zod';

// src/backtest/index.ts
var BACKTEST_DECISION_MODE = "backtest_decisions";
var backtestDecisionRequestSchema = z.object({
  mode: z.literal(BACKTEST_DECISION_MODE),
  source: z.string().min(1).optional(),
  symbol: z.string().min(1).optional(),
  lookbackDays: z.number().positive().optional(),
  timeframeStart: z.string().optional(),
  timeframeEnd: z.string().optional(),
  from: z.number().int().nonnegative().optional(),
  to: z.number().int().nonnegative().optional(),
  initialEquityUsd: z.number().positive().optional()
}).strict();
var RESOLUTION_SECONDS = {
  "1": 60,
  "5": 300,
  "15": 900,
  "30": 1800,
  "60": 3600,
  "240": 14400,
  "1D": 86400,
  "1W": 604800
};
function parseTimeToSeconds(value) {
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
      return Math.max(0, Math.trunc(parsedDate.getTime() / 1e3));
    }
  }
  return null;
}
function resolutionToSeconds(resolution) {
  return RESOLUTION_SECONDS[resolution];
}
function estimateCountBack(params) {
  const {
    fallback,
    lookbackDays,
    resolution,
    fromSeconds,
    toSeconds,
    minCountBack = 50,
    bufferBars = 5
  } = params;
  if (typeof lookbackDays === "number" && Number.isFinite(lookbackDays) && lookbackDays > 0) {
    const interval = resolutionToSeconds(resolution);
    const bars = Math.ceil(lookbackDays * 86400 / interval);
    return Math.max(minCountBack, bars + bufferBars);
  }
  if (typeof fromSeconds === "number" && Number.isFinite(fromSeconds) && typeof toSeconds === "number" && Number.isFinite(toSeconds) && toSeconds > fromSeconds) {
    const interval = resolutionToSeconds(resolution);
    const bars = Math.ceil((toSeconds - fromSeconds) / interval);
    return Math.max(minCountBack, bars + bufferBars);
  }
  return fallback;
}
function resolveBacktestMode(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized === BACKTEST_DECISION_MODE ? BACKTEST_DECISION_MODE : null;
}
function resolveBacktestWindow(params) {
  const fromSeconds = parseTimeToSeconds(params.from) ?? parseTimeToSeconds(params.timeframeStart);
  const toSeconds = parseTimeToSeconds(params.to) ?? parseTimeToSeconds(params.timeframeEnd);
  const hasWindow = fromSeconds != null && toSeconds != null && Number.isFinite(fromSeconds) && Number.isFinite(toSeconds) && toSeconds > fromSeconds;
  const resolvedFrom = hasWindow ? fromSeconds : void 0;
  const resolvedTo = hasWindow ? toSeconds : void 0;
  const lookbackDays = typeof params.lookbackDays === "number" && Number.isFinite(params.lookbackDays) ? params.lookbackDays : void 0;
  const countBack = estimateCountBack({
    fallback: params.fallbackCountBack,
    resolution: params.resolution,
    ...lookbackDays != null ? { lookbackDays } : {},
    ...resolvedFrom != null ? { fromSeconds: resolvedFrom } : {},
    ...resolvedTo != null ? { toSeconds: resolvedTo } : {},
    ...typeof params.minCountBack === "number" ? { minCountBack: params.minCountBack } : {},
    ...typeof params.bufferBars === "number" ? { bufferBars: params.bufferBars } : {}
  });
  return {
    ...resolvedFrom != null ? { fromSeconds: resolvedFrom } : {},
    ...resolvedTo != null ? { toSeconds: resolvedTo } : {},
    countBack
  };
}
function resolveBacktestAccountValueUsd(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return void 0;
}
function buildBacktestDecisionSeriesInput(request) {
  const accountValueUsd = resolveBacktestAccountValueUsd(request.initialEquityUsd);
  return {
    ...request.symbol ? { symbol: request.symbol } : {},
    ...request.timeframeStart ? { timeframeStart: request.timeframeStart } : {},
    ...request.timeframeEnd ? { timeframeEnd: request.timeframeEnd } : {},
    ...request.from != null ? { from: request.from } : {},
    ...request.to != null ? { to: request.to } : {},
    ...request.lookbackDays != null ? { lookbackDays: request.lookbackDays } : {},
    ...accountValueUsd != null ? { accountValueUsd } : {}
  };
}

export { BACKTEST_DECISION_MODE, backtestDecisionRequestSchema, buildBacktestDecisionSeriesInput, estimateCountBack, parseTimeToSeconds, resolutionToSeconds, resolveBacktestAccountValueUsd, resolveBacktestMode, resolveBacktestWindow };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
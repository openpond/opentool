import { z } from 'zod';

declare const BACKTEST_DECISION_MODE: "backtest_decisions";
type BacktestMode = typeof BACKTEST_DECISION_MODE;
declare const backtestDecisionRequestSchema: z.ZodObject<{
    mode: z.ZodLiteral<"backtest_decisions">;
    source: z.ZodOptional<z.ZodString>;
    symbol: z.ZodOptional<z.ZodString>;
    lookbackDays: z.ZodOptional<z.ZodNumber>;
    timeframeStart: z.ZodOptional<z.ZodString>;
    timeframeEnd: z.ZodOptional<z.ZodString>;
    from: z.ZodOptional<z.ZodNumber>;
    to: z.ZodOptional<z.ZodNumber>;
    initialEquityUsd: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
type BacktestDecisionRequest = z.infer<typeof backtestDecisionRequestSchema>;
type BacktestResolution = "1" | "5" | "15" | "30" | "60" | "240" | "1D" | "1W";
declare function parseTimeToSeconds(value: unknown): number | null;
declare function resolutionToSeconds(resolution: BacktestResolution): number;
declare function estimateCountBack(params: {
    fallback: number;
    lookbackDays?: number;
    resolution: BacktestResolution;
    fromSeconds?: number;
    toSeconds?: number;
    minCountBack?: number;
    bufferBars?: number;
}): number;
declare function resolveBacktestMode(value: unknown): BacktestMode | null;
type ResolvedBacktestWindow = {
    fromSeconds?: number;
    toSeconds?: number;
    countBack: number;
};
declare function resolveBacktestWindow(params: {
    fallbackCountBack: number;
    lookbackDays?: unknown;
    resolution: BacktestResolution;
    from?: unknown;
    to?: unknown;
    timeframeStart?: unknown;
    timeframeEnd?: unknown;
    minCountBack?: number;
    bufferBars?: number;
}): ResolvedBacktestWindow;
declare function resolveBacktestAccountValueUsd(value: unknown): number | undefined;
type BacktestDecisionSeriesInput = {
    symbol?: string;
    timeframeStart?: string;
    timeframeEnd?: string;
    from?: number;
    to?: number;
    lookbackDays?: number;
    accountValueUsd?: number;
};
declare function buildBacktestDecisionSeriesInput(request: Partial<BacktestDecisionRequest>): BacktestDecisionSeriesInput;

export { BACKTEST_DECISION_MODE, type BacktestDecisionRequest, type BacktestDecisionSeriesInput, type BacktestMode, type BacktestResolution, type ResolvedBacktestWindow, backtestDecisionRequestSchema, buildBacktestDecisionSeriesInput, estimateCountBack, parseTimeToSeconds, resolutionToSeconds, resolveBacktestAccountValueUsd, resolveBacktestMode, resolveBacktestWindow };

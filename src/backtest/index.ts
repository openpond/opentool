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

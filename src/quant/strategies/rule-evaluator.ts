import { closePrices } from "../bars";
import { fundingRates } from "../features/funding";
import { momentum } from "../features/momentum";
import { donchian } from "../indicators/donchian";
import { ema } from "../indicators/ema";
import { macd } from "../indicators/macd";
import { rsi } from "../indicators/rsi";
import { sma } from "../indicators/sma";
import { rollingZScore } from "../indicators/zscore";
import type { QuantBar, QuantIdeaSpecV1 } from "../schemas";

export type EvaluatedRuleSeries = {
  condition: boolean[];
  positions: number[];
  signal: Array<number | null>;
  warnings: string[];
};

function numberParam(params: Record<string, unknown>, key: string, fallback: number): number {
  const value = params[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringParam(params: Record<string, unknown>, key: string, fallback: string): string {
  const value = params[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function ma(values: number[], type: string, period: number): Array<number | null> {
  return type.toLowerCase() === "sma" ? sma(values, period) : ema(values, period);
}

function shiftedBreakoutCondition(bars: QuantBar[], period: number): boolean[] {
  const channels = donchian(
    bars.map((bar) => bar.high),
    bars.map((bar) => bar.low),
    period,
  );
  return bars.map((bar, index) => {
    const prior = channels[index - 1];
    return prior?.upper != null && bar.close > prior.upper;
  });
}

export function evaluateQuantRule(params: {
  bars: QuantBar[];
  idea: QuantIdeaSpecV1;
}): EvaluatedRuleSeries {
  const prices = closePrices(params.bars);
  const rule = params.idea.rule;
  const kind = rule?.kind ?? (params.idea.family === "benchmark" ? "buy_hold" : "momentum");
  const ruleParams = rule?.params ?? {};
  const warnings: string[] = [];
  let condition: boolean[] = [];
  let positions: number[] = [];
  let signal: Array<number | null> = [];

  if (kind === "buy_hold") {
    condition = prices.map(() => true);
    positions = prices.map(() => 1);
    signal = prices.map(() => 1);
  } else if (kind === "ma_cross" || kind === "moving_average_crossover") {
    const fastPeriod = Math.max(1, Math.trunc(numberParam(ruleParams, "fastPeriod", 20)));
    const slowPeriod = Math.max(fastPeriod + 1, Math.trunc(numberParam(ruleParams, "slowPeriod", 100)));
    const averageType = stringParam(ruleParams, "averageType", "ema");
    const fast = ma(prices, averageType, fastPeriod);
    const slow = ma(prices, averageType, slowPeriod);
    signal = prices.map((_, index) =>
      fast[index] == null || slow[index] == null ? null : fast[index] - slow[index],
    );
    condition = signal.map((value) => value != null && value > 0);
    positions = condition.map((active) => (active ? 1 : 0));
  } else if (kind === "rsi_mean_reversion") {
    const period = Math.max(2, Math.trunc(numberParam(ruleParams, "period", 14)));
    const oversold = numberParam(ruleParams, "oversold", 30);
    const exit = numberParam(ruleParams, "exit", 50);
    signal = rsi(prices, period);
    let active = false;
    positions = signal.map((value) => {
      if (value == null) return 0;
      if (value <= oversold) active = true;
      if (value >= exit) active = false;
      return active ? 1 : 0;
    });
    condition = signal.map((value) => value != null && value <= oversold);
  } else if (kind === "macd_crossover") {
    const points = macd(prices);
    signal = points.map((point) =>
      point.macd == null || point.signal == null ? null : point.macd - point.signal,
    );
    condition = signal.map((value) => value != null && value > 0);
    positions = condition.map((active) => (active ? 1 : 0));
  } else if (kind === "donchian_breakout") {
    const period = Math.max(2, Math.trunc(numberParam(ruleParams, "period", 20)));
    condition = shiftedBreakoutCondition(params.bars, period);
    signal = condition.map((active) => (active ? 1 : 0));
    positions = condition.map((active) => (active ? 1 : 0));
  } else if (kind === "zscore_mean_reversion") {
    const period = Math.max(2, Math.trunc(numberParam(ruleParams, "period", 20)));
    const entry = Math.abs(numberParam(ruleParams, "entry", 2));
    const exit = Math.abs(numberParam(ruleParams, "exit", 0.25));
    signal = rollingZScore(prices, period);
    let active = false;
    positions = signal.map((value) => {
      if (value == null) return 0;
      if (value <= -entry) active = true;
      if (Math.abs(value) <= exit || value >= entry) active = false;
      return active ? 1 : 0;
    });
    condition = signal.map((value) => value != null && value <= -entry);
  } else if (kind === "momentum") {
    const lookbackBars = Math.max(1, Math.trunc(numberParam(ruleParams, "lookbackBars", 30)));
    const threshold = numberParam(ruleParams, "threshold", 0);
    signal = momentum(prices, lookbackBars);
    condition = signal.map((value) => value != null && value > threshold);
    positions = condition.map((active) => (active ? 1 : 0));
  } else if (kind === "funding_carry") {
    const threshold = numberParam(ruleParams, "maxFundingRate", 0);
    signal = fundingRates(params.bars);
    condition = signal.map((value) => value != null && value <= threshold);
    positions = condition.map((active) => (active ? 1 : 0));
  } else {
    warnings.push(`Rule kind ${kind} is not supported by the V1 evaluator; using signal-only flat positions.`);
    condition = prices.map(() => false);
    positions = prices.map(() => 0);
    signal = prices.map(() => null);
  }

  return { condition, positions, signal, warnings };
}

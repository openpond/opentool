import { z } from 'zod';

// src/quant/schemas.ts
var quantStrategyFamilySchema = z.enum([
  "benchmark",
  "signal_rule",
  "trend",
  "mean_reversion",
  "stat_arb",
  "carry",
  "hedge",
  "execution",
  "market_making",
  "options",
  "regime_ml",
  "prediction_market",
  "defi_lp"
]);
var quantTestKindSchema = z.enum([
  "prompt_plan_check",
  "data_availability",
  "signal_study",
  "idea_rule_simulation",
  "variant_sensitivity",
  "leakage_check",
  "cost_stress"
]);
var quantResolutionSchema = z.enum(["1", "5", "15", "30", "60", "240", "1D", "1W"]);
var quantBarSchema = z.object({
  time: z.number().int().nonnegative(),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().nonnegative().optional(),
  fundingRate: z.number().optional()
}).strict();
var quantFeatureSpecSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  params: z.record(z.string(), z.unknown()).default({})
}).strict();
var quantRuleSpecSchema = z.object({
  kind: z.string().min(1),
  params: z.record(z.string(), z.unknown()).default({})
}).strict();
var quantIdeaSpecV1Schema = z.object({
  version: z.literal("1"),
  family: quantStrategyFamilySchema,
  thesis: z.object({
    title: z.string().min(1),
    belief: z.string().min(1),
    expectedDirection: z.enum([
      "up",
      "down",
      "relative",
      "mean_revert",
      "volatility",
      "carry",
      "hedge",
      "unknown"
    ]),
    horizon: z.array(z.string().min(1)).min(1)
  }).strict(),
  market: z.object({
    venue: z.enum(["hyperliquid", "polymarket", "derive", "external_fixture"]),
    symbol: z.string().min(1).optional(),
    universe: z.array(z.string().min(1)).optional()
  }).strict(),
  requiredSources: z.array(z.string().min(1)).default([]),
  features: z.array(quantFeatureSpecSchema).default([]),
  rule: quantRuleSpecSchema.optional(),
  risk: z.object({
    maxPositionUsd: z.number().positive().optional(),
    maxLeverage: z.number().positive().optional(),
    stopLossPct: z.number().positive().optional(),
    takeProfitPct: z.number().positive().optional(),
    maxDrawdownPct: z.number().positive().optional()
  }).strict().optional()
}).strict();
var quantTestRequestV1Schema = z.object({
  version: z.literal("1"),
  idea: quantIdeaSpecV1Schema,
  testKinds: z.array(quantTestKindSchema).min(1),
  window: z.object({
    resolution: quantResolutionSchema,
    timeframeStart: z.string().min(1),
    timeframeEnd: z.string().min(1),
    warmupBars: z.number().int().nonnegative().optional()
  }).strict(),
  assumptions: z.object({
    initialEquityUsd: z.number().positive().optional(),
    makerFeeBps: z.number().nonnegative().optional(),
    takerFeeBps: z.number().nonnegative().optional(),
    slippageBps: z.number().nonnegative().optional(),
    fundingModel: z.enum(["ignore", "historical", "estimated"]).optional()
  }).strict().default({}),
  variantSpace: z.record(z.string(), z.unknown()).optional()
}).strict();
var quantDecisionActionSchema = z.enum(["hold", "flat", "long", "short", "exit"]);
var quantDecisionSchema = z.object({
  time: z.number().int().nonnegative(),
  symbol: z.string().min(1),
  action: quantDecisionActionSchema,
  targetPosition: z.number(),
  reason: z.string().min(1),
  price: z.number().positive().optional()
}).strict();
var quantDecisionArtifactV1Schema = z.object({
  version: z.literal("1"),
  family: quantStrategyFamilySchema,
  symbol: z.string().min(1),
  resolution: quantResolutionSchema,
  decisions: z.array(quantDecisionSchema),
  warnings: z.array(z.string()).default([])
}).strict();
var quantTesterReportV1Schema = z.object({
  ok: z.boolean(),
  testRunKind: z.enum([
    "prompt_plan_check",
    "data_availability",
    "signal_study",
    "idea_rule_simulation",
    "variant_sensitivity"
  ]),
  supported: z.boolean(),
  unsupportedReason: z.string().optional(),
  summary: z.string(),
  dataLineage: z.object({
    venue: z.string(),
    symbols: z.array(z.string()),
    resolution: quantResolutionSchema,
    timeframeStart: z.string(),
    timeframeEnd: z.string(),
    sourceIds: z.array(z.string()),
    warnings: z.array(z.string())
  }).strict(),
  signalStudy: z.record(z.string(), z.unknown()).optional(),
  ideaSimulation: z.record(z.string(), z.unknown()).optional(),
  decisionArtifact: quantDecisionArtifactV1Schema.optional(),
  warnings: z.array(z.string()).default([])
}).strict();

// src/quant/bars.ts
function normalizeQuantBars(input) {
  const bars = quantBarSchema.array().parse(input).slice();
  bars.sort((a, b) => a.time - b.time);
  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index];
    if (bar.high < Math.max(bar.open, bar.close) || bar.low > Math.min(bar.open, bar.close)) {
      throw new Error(`Invalid OHLC relationship at bar ${index}`);
    }
    if (index > 0 && bar.time <= bars[index - 1].time) {
      throw new Error(`Duplicate or non-increasing bar time at index ${index}`);
    }
  }
  return bars;
}
function closePrices(bars) {
  return bars.map((bar) => bar.close);
}
function typicalPrices(bars) {
  return bars.map((bar) => (bar.high + bar.low + bar.close) / 3);
}
function sliceBarsToWindow(params) {
  const startIndex = params.bars.findIndex((bar) => bar.time >= params.startSeconds);
  const fromIndex = startIndex < 0 ? params.bars.length : Math.max(0, startIndex - (params.warmupBars ?? 0));
  return params.bars.slice(fromIndex).filter((bar) => bar.time <= params.endSeconds);
}

// src/quant/decision-series.ts
function validateDecisionArtifact(value) {
  const artifact = quantDecisionArtifactV1Schema.parse(value);
  for (let index = 1; index < artifact.decisions.length; index += 1) {
    if (artifact.decisions[index].time < artifact.decisions[index - 1].time) {
      throw new Error(`Decision artifact times must be sorted at index ${index}`);
    }
  }
  return artifact;
}
function compactDecisionChanges(decisions) {
  const compact = [];
  let previousTarget = null;
  for (const decision of decisions) {
    if (previousTarget === null || decision.targetPosition !== previousTarget) {
      compact.push(decision);
      previousTarget = decision.targetPosition;
    }
  }
  return compact;
}

// src/quant/features/beta.ts
function beta(assetReturns, benchmarkReturns) {
  const length = Math.min(assetReturns.length, benchmarkReturns.length);
  if (length < 2) return null;
  const asset = assetReturns.slice(assetReturns.length - length);
  const benchmark = benchmarkReturns.slice(benchmarkReturns.length - length);
  const meanAsset = asset.reduce((total, value) => total + value, 0) / length;
  const meanBenchmark = benchmark.reduce((total, value) => total + value, 0) / length;
  let covariance = 0;
  let benchmarkVariance = 0;
  for (let index = 0; index < length; index += 1) {
    covariance += (asset[index] - meanAsset) * (benchmark[index] - meanBenchmark);
    benchmarkVariance += (benchmark[index] - meanBenchmark) ** 2;
  }
  return benchmarkVariance === 0 ? null : covariance / benchmarkVariance;
}

// src/quant/features/correlation.ts
function correlation(a, b) {
  const length = Math.min(a.length, b.length);
  if (length < 2) return null;
  const left = a.slice(a.length - length);
  const right = b.slice(b.length - length);
  const meanA = left.reduce((total, value) => total + value, 0) / length;
  const meanB = right.reduce((total, value) => total + value, 0) / length;
  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (let index = 0; index < length; index += 1) {
    const da = left[index] - meanA;
    const db = right[index] - meanB;
    covariance += da * db;
    varianceA += da * da;
    varianceB += db * db;
  }
  if (varianceA === 0 || varianceB === 0) return null;
  return covariance / Math.sqrt(varianceA * varianceB);
}
function rollingCorrelation(a, b, period = 20) {
  return a.map((_, index) => {
    if (index < period - 1) return null;
    return correlation(
      a.slice(index - period + 1, index + 1),
      b.slice(index - period + 1, index + 1)
    );
  });
}

// src/quant/features/funding.ts
function fundingRates(bars) {
  return bars.map((bar) => bar.fundingRate ?? 0);
}
function cumulativeFunding(bars) {
  let running = 0;
  return fundingRates(bars).map((rate) => {
    running += rate;
    return running;
  });
}

// src/quant/features/momentum.ts
function momentum(values, lookbackBars) {
  if (!Number.isInteger(lookbackBars) || lookbackBars <= 0) {
    throw new Error("Momentum lookback must be a positive integer");
  }
  return values.map((value, index) => {
    const prior = values[index - lookbackBars];
    return prior == null || prior === 0 ? null : value / prior - 1;
  });
}

// src/quant/features/relative-strength.ts
function relativeStrength(assetPrices, benchmarkPrices, lookbackBars) {
  const assetMomentum = momentum(assetPrices, lookbackBars);
  const benchmarkMomentum = momentum(benchmarkPrices, lookbackBars);
  return assetMomentum.map(
    (value, index) => value == null || benchmarkMomentum[index] == null ? null : value - benchmarkMomentum[index]
  );
}

// src/quant/features/returns.ts
function simpleReturns(values) {
  return values.map((value, index) => {
    if (index === 0) return 0;
    const previous = values[index - 1];
    return previous === 0 ? 0 : value / previous - 1;
  });
}
function logReturns(values) {
  return values.map((value, index) => {
    if (index === 0) return 0;
    const previous = values[index - 1];
    return previous <= 0 || value <= 0 ? 0 : Math.log(value / previous);
  });
}
function forwardReturns(values, horizonBars2) {
  if (!Number.isInteger(horizonBars2) || horizonBars2 <= 0) {
    throw new Error("Forward return horizon must be a positive integer");
  }
  return values.map((value, index) => {
    const future = values[index + horizonBars2];
    return future == null || value === 0 ? null : future / value - 1;
  });
}

// src/quant/indicators/sma.ts
function sma(values, period) {
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error("SMA period must be a positive integer");
  }
  const output = [];
  let sum = 0;
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index];
    if (index >= period) sum -= values[index - period];
    output.push(index >= period - 1 ? sum / period : null);
  }
  return output;
}

// src/quant/features/volume.ts
function volumes(bars) {
  return bars.map((bar) => bar.volume ?? 0);
}
function relativeVolume(bars, period = 20) {
  const raw = volumes(bars);
  const average = sma(raw, period);
  return raw.map((value, index) => {
    const baseline = average[index];
    return baseline == null || baseline === 0 ? null : value / baseline;
  });
}

// src/quant/indicators/atr.ts
function trueRanges(bars) {
  return bars.map((bar, index) => {
    const previousClose = index > 0 ? bars[index - 1].close : bar.close;
    return Math.max(
      bar.high - bar.low,
      Math.abs(bar.high - previousClose),
      Math.abs(bar.low - previousClose)
    );
  });
}
function atr(bars, period = 14) {
  return sma(trueRanges(bars), period);
}

// src/quant/indicators/bollinger.ts
function bollinger(values, period = 20, standardDeviations = 2) {
  const middle = sma(values, period);
  return values.map((_, index) => {
    const average = middle[index];
    if (average == null || index < period - 1) {
      return { lower: null, middle: null, upper: null, width: null };
    }
    const window = values.slice(index - period + 1, index + 1);
    const variance = window.reduce((total, value) => total + (value - average) ** 2, 0) / period;
    const deviation = Math.sqrt(variance);
    const lower = average - deviation * standardDeviations;
    const upper = average + deviation * standardDeviations;
    return {
      lower,
      middle: average,
      upper,
      width: average === 0 ? null : (upper - lower) / average
    };
  });
}

// src/quant/indicators/donchian.ts
function donchian(highs, lows, period = 20) {
  if (highs.length !== lows.length) {
    throw new Error("Donchian high/low arrays must have the same length");
  }
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error("Donchian period must be a positive integer");
  }
  return highs.map((_, index) => {
    if (index < period - 1) return { lower: null, upper: null };
    const highWindow = highs.slice(index - period + 1, index + 1);
    const lowWindow = lows.slice(index - period + 1, index + 1);
    return {
      lower: Math.min(...lowWindow),
      upper: Math.max(...highWindow)
    };
  });
}

// src/quant/indicators/ema.ts
function ema(values, period) {
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error("EMA period must be a positive integer");
  }
  const output = [];
  const multiplier = 2 / (period + 1);
  let previous = null;
  let seedSum = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (index < period) {
      seedSum += value;
      if (index === period - 1) {
        previous = seedSum / period;
        output.push(previous);
      } else {
        output.push(null);
      }
      continue;
    }
    previous = previous == null ? value : (value - previous) * multiplier + previous;
    output.push(previous);
  }
  return output;
}

// src/quant/indicators/macd.ts
function macd(values, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (fastPeriod >= slowPeriod) {
    throw new Error("MACD fast period must be less than slow period");
  }
  const fast = ema(values, fastPeriod);
  const slow = ema(values, slowPeriod);
  const macdLine = values.map(
    (_, index) => fast[index] == null || slow[index] == null ? null : fast[index] - slow[index]
  );
  const signalInput = macdLine.map((value) => value ?? 0);
  const signalLine = ema(signalInput, signalPeriod);
  return values.map((_, index) => {
    const macdValue = macdLine[index];
    const signalValue = macdValue == null ? null : signalLine[index];
    return {
      macd: macdValue,
      signal: signalValue,
      histogram: macdValue == null || signalValue == null ? null : macdValue - signalValue
    };
  });
}

// src/quant/indicators/rsi.ts
function rsi(values, period = 14) {
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error("RSI period must be a positive integer");
  }
  const output = Array.from({ length: values.length }, () => null);
  if (values.length <= period) return output;
  let gainSum = 0;
  let lossSum = 0;
  for (let index = 1; index <= period; index += 1) {
    const delta = values[index] - values[index - 1];
    if (delta >= 0) gainSum += delta;
    else lossSum += Math.abs(delta);
  }
  let averageGain = gainSum / period;
  let averageLoss = lossSum / period;
  output[period] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
  for (let index = period + 1; index < values.length; index += 1) {
    const delta = values[index] - values[index - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? Math.abs(delta) : 0;
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
    output[index] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
  }
  return output;
}

// src/quant/indicators/volatility.ts
function rollingVolatility(returns, period = 20, annualization = 365) {
  if (!Number.isInteger(period) || period <= 1) {
    throw new Error("Volatility period must be an integer greater than 1");
  }
  return returns.map((_, index) => {
    if (index < period - 1) return null;
    const window = returns.slice(index - period + 1, index + 1);
    const mean = window.reduce((total, value) => total + value, 0) / period;
    const variance = window.reduce((total, value) => total + (value - mean) ** 2, 0) / (period - 1);
    return Math.sqrt(variance) * Math.sqrt(annualization);
  });
}

// src/quant/indicators/zscore.ts
function rollingZScore(values, period = 20) {
  if (!Number.isInteger(period) || period <= 1) {
    throw new Error("Z-score period must be an integer greater than 1");
  }
  return values.map((value, index) => {
    if (index < period - 1) return null;
    const window = values.slice(index - period + 1, index + 1);
    const mean = window.reduce((total, current) => total + current, 0) / period;
    const variance = window.reduce((total, current) => total + (current - mean) ** 2, 0) / period;
    const deviation = Math.sqrt(variance);
    return deviation === 0 ? 0 : (value - mean) / deviation;
  });
}

// src/quant/lineage.ts
function buildQuantDataLineage(params) {
  const symbol = params.request.idea.market.symbol ?? params.request.idea.market.universe?.[0] ?? "UNKNOWN";
  return {
    venue: params.request.idea.market.venue,
    symbols: params.request.idea.market.universe ?? [symbol],
    resolution: params.request.window.resolution,
    timeframeStart: params.request.window.timeframeStart,
    timeframeEnd: params.request.window.timeframeEnd,
    sourceIds: params.request.idea.requiredSources,
    warnings: params.warnings ?? []
  };
}

// src/quant/result.ts
function summarizeNumbers(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) {
    return {
      count: 0,
      max: null,
      mean: null,
      median: null,
      min: null,
      positiveRate: null,
      standardDeviation: null
    };
  }
  const sorted = finite.slice().sort((a, b) => a - b);
  const mean = finite.reduce((total, value) => total + value, 0) / finite.length;
  const variance = finite.reduce((total, value) => total + (value - mean) ** 2, 0) / finite.length;
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
  return {
    count: finite.length,
    max: sorted[sorted.length - 1],
    mean,
    median,
    min: sorted[0],
    positiveRate: finite.filter((value) => value > 0).length / Math.max(1, finite.length),
    standardDeviation: Math.sqrt(variance)
  };
}

// src/quant/signal-study/adverse-excursion.ts
function summarizeExcursions(params) {
  const adverse = [];
  const favorable = [];
  for (let index = 0; index < params.bars.length; index += 1) {
    if (!params.condition[index]) continue;
    const entry = params.bars[index].close;
    const window = params.bars.slice(index + 1, index + params.horizonBars + 1);
    if (window.length === 0) continue;
    adverse.push(Math.min(...window.map((bar) => bar.low / entry - 1)));
    favorable.push(Math.max(...window.map((bar) => bar.high / entry - 1)));
  }
  return {
    averageAdverse: adverse.length === 0 ? null : adverse.reduce((total, value) => total + value, 0) / adverse.length,
    averageFavorable: favorable.length === 0 ? null : favorable.reduce((total, value) => total + value, 0) / favorable.length,
    count: adverse.length
  };
}

// src/quant/signal-study/event-windows.ts
function buildEventWindows(params) {
  const windows = [];
  for (let index = 0; index < params.bars.length; index += 1) {
    if (!params.condition[index]) continue;
    const start = params.bars[Math.max(0, index - params.preBars)];
    const end = params.bars[Math.min(params.bars.length - 1, index + params.postBars)];
    windows.push({
      endTime: end.time,
      eventTime: params.bars[index].time,
      startTime: start.time
    });
  }
  return windows;
}

// src/quant/signal-study/forward-returns.ts
function studyForwardReturns(params) {
  const forward = forwardReturns(params.prices, params.horizonBars);
  const all = forward.filter((value) => value != null);
  const conditioned = forward.filter(
    (value, index) => value != null && params.condition[index] === true
  );
  return {
    conditioned: summarizeNumbers(conditioned),
    horizonBars: params.horizonBars,
    unconditional: summarizeNumbers(all)
  };
}

// src/quant/signal-study/hit-rate.ts
function hitRate(values) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  return finite.filter((value) => value > 0).length / finite.length;
}

// src/quant/signal-study/information-coefficient.ts
function informationCoefficient(params) {
  const pairs = [];
  const length = Math.min(params.signal.length, params.forwardReturns.length);
  for (let index = 0; index < length; index += 1) {
    const x = params.signal[index];
    const y = params.forwardReturns[index];
    if (x != null && y != null && Number.isFinite(x) && Number.isFinite(y)) {
      pairs.push({ x, y });
    }
  }
  if (pairs.length < 3) return null;
  const meanX = pairs.reduce((total, pair) => total + pair.x, 0) / pairs.length;
  const meanY = pairs.reduce((total, pair) => total + pair.y, 0) / pairs.length;
  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;
  for (const pair of pairs) {
    const dx = pair.x - meanX;
    const dy = pair.y - meanY;
    covariance += dx * dy;
    varianceX += dx * dx;
    varianceY += dy * dy;
  }
  if (varianceX === 0 || varianceY === 0) return null;
  return covariance / Math.sqrt(varianceX * varianceY);
}

// src/quant/signal-study/summary.ts
function signalStudySummary(params) {
  if (params.conditionedCount === 0) {
    return "No signal events were available in the supplied window.";
  }
  const conditioned = params.conditionedMean == null ? "n/a" : `${(params.conditionedMean * 100).toFixed(2)}%`;
  const unconditional = params.unconditionalMean == null ? "n/a" : `${(params.unconditionalMean * 100).toFixed(2)}%`;
  return `Signal events=${params.conditionedCount}; conditioned forward return=${conditioned}; unconditional=${unconditional}.`;
}

// src/quant/strategies/breakout.ts
var DONCHIAN_BREAKOUT_RULE_KIND = "donchian_breakout";

// src/quant/strategies/funding-carry.ts
var FUNDING_CARRY_RULE_KIND = "funding_carry";

// src/quant/strategies/macd-trend.ts
var MACD_CROSSOVER_RULE_KIND = "macd_crossover";

// src/quant/strategies/ma-cross.ts
var MA_CROSS_RULE_KIND = "ma_cross";

// src/quant/strategies/momentum.ts
var MOMENTUM_RULE_KIND = "momentum";

// src/quant/strategies/registry.ts
var BASE_TESTS = [
  "prompt_plan_check",
  "data_availability",
  "signal_study",
  "idea_rule_simulation",
  "variant_sensitivity",
  "leakage_check",
  "cost_stress"
];
var QUANT_FAMILY_CAPABILITIES = [
  {
    aliases: ["benchmark", "buy-and-hold", "buy_and_hold", "hold"],
    family: "benchmark",
    supportLevel: "v1_replayable",
    supportedTestKinds: BASE_TESTS
  },
  {
    aliases: ["signal_rule", "moving_average", "ma_cross", "rsi", "macd", "bollinger", "donchian"],
    family: "signal_rule",
    supportLevel: "v1_replayable",
    supportedTestKinds: BASE_TESTS
  },
  {
    aliases: ["trend", "momentum", "breakout", "time_series_momentum"],
    family: "trend",
    supportLevel: "v1_replayable",
    supportedTestKinds: BASE_TESTS
  },
  {
    aliases: ["mean_reversion", "zscore", "rsi_mean_reversion", "bollinger_mean_reversion"],
    family: "mean_reversion",
    supportLevel: "v1_replayable",
    supportedTestKinds: BASE_TESTS
  },
  {
    aliases: ["stat_arb", "pairs", "pair_spread", "cointegration"],
    family: "stat_arb",
    supportLevel: "v1_signal_or_idea_test",
    supportedTestKinds: ["prompt_plan_check", "data_availability", "signal_study", "leakage_check"]
  },
  {
    aliases: ["carry", "funding", "basis", "funding_carry"],
    family: "carry",
    supportLevel: "v1_signal_or_idea_test",
    supportedTestKinds: BASE_TESTS
  },
  {
    aliases: ["hedge", "overlay", "tail_hedge"],
    family: "hedge",
    supportLevel: "v1_signal_or_idea_test",
    supportedTestKinds: ["prompt_plan_check", "data_availability", "signal_study", "cost_stress"]
  },
  {
    aliases: ["execution", "twap", "vwap", "participation", "iceberg"],
    family: "execution",
    supportLevel: "advanced_research",
    supportedTestKinds: ["prompt_plan_check", "data_availability", "cost_stress"]
  },
  {
    aliases: ["market_making", "maker", "avellaneda", "inventory_skew"],
    family: "market_making",
    supportLevel: "advanced_research",
    supportedTestKinds: ["prompt_plan_check", "data_availability", "cost_stress"]
  },
  {
    aliases: ["options", "vol", "black_scholes", "put_call_parity"],
    family: "options",
    supportLevel: "unsupported_until_data",
    supportedTestKinds: ["prompt_plan_check", "data_availability"]
  },
  {
    aliases: ["regime_ml", "ml", "regime", "markov", "hmm", "rl"],
    family: "regime_ml",
    supportLevel: "advanced_research",
    supportedTestKinds: ["prompt_plan_check", "data_availability", "leakage_check"]
  },
  {
    aliases: ["prediction_market", "outcome", "hip4", "binary"],
    family: "prediction_market",
    supportLevel: "v1_signal_or_idea_test",
    supportedTestKinds: ["prompt_plan_check", "data_availability", "signal_study", "cost_stress"]
  },
  {
    aliases: ["defi_lp", "amm", "lp", "concentrated_liquidity"],
    family: "defi_lp",
    supportLevel: "unsupported_until_data",
    supportedTestKinds: ["prompt_plan_check", "data_availability"]
  }
];
function resolveQuantFamilyCapability(value) {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return QUANT_FAMILY_CAPABILITIES.find(
    (capability) => capability.family === normalized || capability.aliases.some((alias) => alias === normalized)
  ) ?? null;
}

// src/quant/strategies/rsi-mean-reversion.ts
var RSI_MEAN_REVERSION_RULE_KIND = "rsi_mean_reversion";

// src/quant/strategies/rule-evaluator.ts
function numberParam(params, key, fallback) {
  const value = params[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function stringParam(params, key, fallback) {
  const value = params[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}
function ma(values, type, period) {
  return type.toLowerCase() === "sma" ? sma(values, period) : ema(values, period);
}
function shiftedBreakoutCondition(bars, period) {
  const channels = donchian(
    bars.map((bar) => bar.high),
    bars.map((bar) => bar.low),
    period
  );
  return bars.map((bar, index) => {
    const prior = channels[index - 1];
    return prior?.upper != null && bar.close > prior.upper;
  });
}
function evaluateQuantRule(params) {
  const prices = closePrices(params.bars);
  const rule = params.idea.rule;
  const kind = rule?.kind ?? (params.idea.family === "benchmark" ? "buy_hold" : "momentum");
  const ruleParams = rule?.params ?? {};
  const warnings = [];
  let condition = [];
  let positions = [];
  let signal = [];
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
    signal = prices.map(
      (_, index) => fast[index] == null || slow[index] == null ? null : fast[index] - slow[index]
    );
    condition = signal.map((value) => value != null && value > 0);
    positions = condition.map((active) => active ? 1 : 0);
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
    signal = points.map(
      (point) => point.macd == null || point.signal == null ? null : point.macd - point.signal
    );
    condition = signal.map((value) => value != null && value > 0);
    positions = condition.map((active) => active ? 1 : 0);
  } else if (kind === "donchian_breakout") {
    const period = Math.max(2, Math.trunc(numberParam(ruleParams, "period", 20)));
    condition = shiftedBreakoutCondition(params.bars, period);
    signal = condition.map((active) => active ? 1 : 0);
    positions = condition.map((active) => active ? 1 : 0);
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
    positions = condition.map((active) => active ? 1 : 0);
  } else if (kind === "funding_carry") {
    const threshold = numberParam(ruleParams, "maxFundingRate", 0);
    signal = fundingRates(params.bars);
    condition = signal.map((value) => value != null && value <= threshold);
    positions = condition.map((active) => active ? 1 : 0);
  } else {
    warnings.push(`Rule kind ${kind} is not supported by the V1 evaluator; using signal-only flat positions.`);
    condition = prices.map(() => false);
    positions = prices.map(() => 0);
    signal = prices.map(() => null);
  }
  return { condition, positions, signal, warnings };
}

// src/quant/strategies/zscore-mean-reversion.ts
var ZSCORE_MEAN_REVERSION_RULE_KIND = "zscore_mean_reversion";

// src/quant/tester/plan.ts
function buildQuantTestPlan(idea) {
  const capability = resolveQuantFamilyCapability(idea.family);
  if (!capability) {
    return {
      supportedTestKinds: ["prompt_plan_check", "data_availability"],
      supportLevel: "unsupported_until_data",
      warnings: [`No V1 quant capability found for family ${idea.family}.`]
    };
  }
  return {
    supportedTestKinds: capability.supportedTestKinds,
    supportLevel: capability.supportLevel,
    warnings: capability.supportLevel === "advanced_research" || capability.supportLevel === "unsupported_until_data" ? [`Family ${idea.family} is ${capability.supportLevel}; do not mark it strict-backtest-ready.`] : []
  };
}

// src/quant/tester/report.ts
function finalizeQuantTesterReport(report) {
  return quantTesterReportV1Schema.parse(report);
}

// src/quant/tester/warnings.ts
function quantDataWarnings(params) {
  const warnings = [];
  if (params.bars.length < 50) {
    warnings.push("Sample has fewer than 50 bars; treat metrics as unstable.");
  }
  if (params.bars.length > 1) {
    const gaps = [];
    for (let index = 1; index < params.bars.length; index += 1) {
      gaps.push(params.bars[index].time - params.bars[index - 1].time);
    }
    const medianGap = gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
    if (gaps.some((gap) => gap > medianGap * 2)) {
      warnings.push("Bars contain time gaps larger than twice the median interval.");
    }
  }
  if (params.request.variantSpace && Object.keys(params.request.variantSpace).length > 20) {
    warnings.push("Variant space is broad; use multiple-comparison controls before promotion.");
  }
  return warnings;
}
function quantCostBps(request) {
  return (request.assumptions.takerFeeBps ?? request.assumptions.makerFeeBps ?? 0) + (request.assumptions.slippageBps ?? 0);
}

// src/quant/tester/run-idea-test.ts
function symbolForRequest(request) {
  return request.idea.market.symbol ?? request.idea.market.universe?.[0] ?? "UNKNOWN";
}
function actionForPosition(target) {
  if (target > 0) return "long";
  if (target < 0) return "short";
  return "flat";
}
function simulate(params) {
  const prices = closePrices(params.bars);
  const initialEquity = params.request.assumptions.initialEquityUsd ?? 1e4;
  const symbol = symbolForRequest(params.request);
  let equity = initialEquity;
  let peak = initialEquity;
  let maxDrawdown = 0;
  let previousPosition = 0;
  let turnover = 0;
  let trades = 0;
  const decisions = [];
  for (let index = 0; index < params.bars.length; index += 1) {
    const targetPosition = params.positions[index] ?? 0;
    const deltaPosition = Math.abs(targetPosition - previousPosition);
    if (deltaPosition > 0) {
      turnover += deltaPosition;
      trades += 1;
      equity -= equity * deltaPosition * (params.costBps / 1e4);
    }
    if (index > 0) {
      const priceReturn = prices[index - 1] === 0 ? 0 : prices[index] / prices[index - 1] - 1;
      equity *= 1 + previousPosition * priceReturn;
    }
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak === 0 ? 0 : (peak - equity) / peak);
    decisions.push({
      time: params.bars[index].time,
      symbol,
      action: actionForPosition(targetPosition),
      targetPosition,
      reason: targetPosition === previousPosition ? "rule maintained target position" : "rule changed target position",
      price: params.bars[index].close
    });
    previousPosition = targetPosition;
  }
  return {
    decisions: compactDecisionChanges(decisions),
    metrics: {
      endingEquityUsd: equity,
      maxDrawdownPct: maxDrawdown * 100,
      netReturnPct: (equity / initialEquity - 1) * 100,
      turnover,
      trades
    }
  };
}
function runQuantIdeaTest(params) {
  const request = quantTestRequestV1Schema.parse(params.request);
  const bars = normalizeQuantBars(params.bars);
  const plan = buildQuantTestPlan(request.idea);
  const warnings = [...plan.warnings, ...quantDataWarnings({ bars, request })];
  const supported = plan.supportedTestKinds.includes("idea_rule_simulation");
  if (!supported) {
    return finalizeQuantTesterReport({
      ok: false,
      testRunKind: "idea_rule_simulation",
      supported: false,
      unsupportedReason: `Family ${request.idea.family} does not support deterministic idea simulation in V1.`,
      summary: "Idea simulation is not supported for this family.",
      dataLineage: buildQuantDataLineage({ request, warnings }),
      warnings
    });
  }
  const evaluated = evaluateQuantRule({ bars, idea: request.idea });
  warnings.push(...evaluated.warnings);
  const simulation = simulate({
    bars,
    costBps: quantCostBps(request),
    positions: evaluated.positions,
    request
  });
  const decisionArtifact = validateDecisionArtifact({
    version: "1",
    family: request.idea.family,
    symbol: symbolForRequest(request),
    resolution: request.window.resolution,
    decisions: simulation.decisions,
    warnings
  });
  return finalizeQuantTesterReport({
    ok: true,
    testRunKind: "idea_rule_simulation",
    supported: true,
    summary: `Idea simulation completed: net return ${simulation.metrics.netReturnPct.toFixed(2)}%, trades ${simulation.metrics.trades}.`,
    dataLineage: buildQuantDataLineage({ request, warnings }),
    ideaSimulation: simulation.metrics,
    decisionArtifact,
    warnings
  });
}

// src/quant/tester/run-signal-study.ts
function horizonBars(request) {
  const value = request.idea.rule?.params.horizonBars;
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 1;
}
function runSignalStudy(params) {
  const request = quantTestRequestV1Schema.parse(params.request);
  const bars = normalizeQuantBars(params.bars);
  const plan = buildQuantTestPlan(request.idea);
  const warnings = [...plan.warnings, ...quantDataWarnings({ bars, request })];
  const supported = plan.supportedTestKinds.includes("signal_study");
  if (!supported) {
    return finalizeQuantTesterReport({
      ok: false,
      testRunKind: "signal_study",
      supported: false,
      unsupportedReason: `Family ${request.idea.family} does not support signal studies in V1.`,
      summary: "Signal study is not supported for this family.",
      dataLineage: buildQuantDataLineage({ request, warnings }),
      warnings
    });
  }
  const evaluated = evaluateQuantRule({ bars, idea: request.idea });
  warnings.push(...evaluated.warnings);
  const prices = closePrices(bars);
  const horizon = horizonBars(request);
  const study = studyForwardReturns({
    condition: evaluated.condition,
    horizonBars: horizon,
    prices
  });
  const forward = forwardReturns(prices, horizon);
  const excursions = summarizeExcursions({
    bars,
    condition: evaluated.condition,
    horizonBars: horizon
  });
  const ic = informationCoefficient({
    forwardReturns: forward,
    signal: evaluated.signal
  });
  const summary = signalStudySummary({
    conditionedCount: study.conditioned.count,
    conditionedMean: study.conditioned.mean,
    unconditionalMean: study.unconditional.mean
  });
  return finalizeQuantTesterReport({
    ok: true,
    testRunKind: "signal_study",
    supported: true,
    summary,
    dataLineage: buildQuantDataLineage({ request, warnings }),
    signalStudy: {
      forwardReturns: study,
      informationCoefficient: ic,
      excursions,
      signalEventCount: evaluated.condition.filter(Boolean).length
    },
    warnings
  });
}

// src/quant/timeframes.ts
var QUANT_RESOLUTION_SECONDS = {
  "1": 60,
  "5": 300,
  "15": 900,
  "30": 1800,
  "60": 3600,
  "240": 14400,
  "1D": 86400,
  "1W": 604800
};
function quantResolutionToSeconds(resolution) {
  return QUANT_RESOLUTION_SECONDS[resolution];
}
function parseQuantTimeToSeconds(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const trimmed = value.trim();
    if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
      return Math.max(0, Math.trunc(Number.parseFloat(trimmed)));
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return Math.max(0, Math.trunc(parsed.getTime() / 1e3));
    }
  }
  return null;
}
function assertQuantWindow(params) {
  const startSeconds = parseQuantTimeToSeconds(params.timeframeStart);
  const endSeconds = parseQuantTimeToSeconds(params.timeframeEnd);
  if (startSeconds == null || endSeconds == null) {
    throw new Error("Quant test window must use parseable start and end times");
  }
  if (endSeconds <= startSeconds) {
    throw new Error("Quant test window end must be after start");
  }
  return { endSeconds, startSeconds };
}

export { DONCHIAN_BREAKOUT_RULE_KIND, FUNDING_CARRY_RULE_KIND, MACD_CROSSOVER_RULE_KIND, MA_CROSS_RULE_KIND, MOMENTUM_RULE_KIND, QUANT_FAMILY_CAPABILITIES, QUANT_RESOLUTION_SECONDS, RSI_MEAN_REVERSION_RULE_KIND, ZSCORE_MEAN_REVERSION_RULE_KIND, assertQuantWindow, atr, beta, bollinger, buildEventWindows, buildQuantDataLineage, buildQuantTestPlan, closePrices, compactDecisionChanges, correlation, cumulativeFunding, donchian, ema, evaluateQuantRule, finalizeQuantTesterReport, forwardReturns, fundingRates, hitRate, informationCoefficient, logReturns, macd, momentum, normalizeQuantBars, parseQuantTimeToSeconds, quantBarSchema, quantCostBps, quantDataWarnings, quantDecisionActionSchema, quantDecisionArtifactV1Schema, quantDecisionSchema, quantFeatureSpecSchema, quantIdeaSpecV1Schema, quantResolutionSchema, quantResolutionToSeconds, quantRuleSpecSchema, quantStrategyFamilySchema, quantTestKindSchema, quantTestRequestV1Schema, quantTesterReportV1Schema, relativeStrength, relativeVolume, resolveQuantFamilyCapability, rollingCorrelation, rollingVolatility, rollingZScore, rsi, runQuantIdeaTest, runSignalStudy, signalStudySummary, simpleReturns, sliceBarsToWindow, sma, studyForwardReturns, summarizeExcursions, summarizeNumbers, trueRanges, typicalPrices, validateDecisionArtifact, volumes };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
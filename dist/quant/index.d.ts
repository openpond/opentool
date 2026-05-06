import { z } from 'zod';

declare const quantStrategyFamilySchema: z.ZodEnum<{
    execution: "execution";
    benchmark: "benchmark";
    signal_rule: "signal_rule";
    trend: "trend";
    mean_reversion: "mean_reversion";
    stat_arb: "stat_arb";
    carry: "carry";
    hedge: "hedge";
    market_making: "market_making";
    options: "options";
    regime_ml: "regime_ml";
    prediction_market: "prediction_market";
    defi_lp: "defi_lp";
}>;
type QuantStrategyFamily = z.infer<typeof quantStrategyFamilySchema>;
declare const quantTestKindSchema: z.ZodEnum<{
    prompt_plan_check: "prompt_plan_check";
    data_availability: "data_availability";
    signal_study: "signal_study";
    idea_rule_simulation: "idea_rule_simulation";
    variant_sensitivity: "variant_sensitivity";
    leakage_check: "leakage_check";
    cost_stress: "cost_stress";
}>;
type QuantTestKind = z.infer<typeof quantTestKindSchema>;
declare const quantResolutionSchema: z.ZodEnum<{
    1: "1";
    5: "5";
    15: "15";
    30: "30";
    60: "60";
    240: "240";
    "1D": "1D";
    "1W": "1W";
}>;
type QuantResolution = z.infer<typeof quantResolutionSchema>;
declare const quantBarSchema: z.ZodObject<{
    time: z.ZodNumber;
    open: z.ZodNumber;
    high: z.ZodNumber;
    low: z.ZodNumber;
    close: z.ZodNumber;
    volume: z.ZodOptional<z.ZodNumber>;
    fundingRate: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
type QuantBar = z.infer<typeof quantBarSchema>;
declare const quantFeatureSpecSchema: z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodString;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strict>;
type QuantFeatureSpec = z.infer<typeof quantFeatureSpecSchema>;
declare const quantRuleSpecSchema: z.ZodObject<{
    kind: z.ZodString;
    params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strict>;
type QuantRuleSpec = z.infer<typeof quantRuleSpecSchema>;
declare const quantIdeaSpecV1Schema: z.ZodObject<{
    version: z.ZodLiteral<"1">;
    family: z.ZodEnum<{
        execution: "execution";
        benchmark: "benchmark";
        signal_rule: "signal_rule";
        trend: "trend";
        mean_reversion: "mean_reversion";
        stat_arb: "stat_arb";
        carry: "carry";
        hedge: "hedge";
        market_making: "market_making";
        options: "options";
        regime_ml: "regime_ml";
        prediction_market: "prediction_market";
        defi_lp: "defi_lp";
    }>;
    thesis: z.ZodObject<{
        title: z.ZodString;
        belief: z.ZodString;
        expectedDirection: z.ZodEnum<{
            unknown: "unknown";
            down: "down";
            up: "up";
            carry: "carry";
            hedge: "hedge";
            relative: "relative";
            mean_revert: "mean_revert";
            volatility: "volatility";
        }>;
        horizon: z.ZodArray<z.ZodString>;
    }, z.core.$strict>;
    market: z.ZodObject<{
        venue: z.ZodEnum<{
            hyperliquid: "hyperliquid";
            derive: "derive";
            polymarket: "polymarket";
            external_fixture: "external_fixture";
        }>;
        symbol: z.ZodOptional<z.ZodString>;
        universe: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>;
    requiredSources: z.ZodDefault<z.ZodArray<z.ZodString>>;
    features: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        kind: z.ZodString;
        params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strict>>>;
    rule: z.ZodOptional<z.ZodObject<{
        kind: z.ZodString;
        params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, z.core.$strict>>;
    risk: z.ZodOptional<z.ZodObject<{
        maxPositionUsd: z.ZodOptional<z.ZodNumber>;
        maxLeverage: z.ZodOptional<z.ZodNumber>;
        stopLossPct: z.ZodOptional<z.ZodNumber>;
        takeProfitPct: z.ZodOptional<z.ZodNumber>;
        maxDrawdownPct: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
}, z.core.$strict>;
type QuantIdeaSpecV1 = z.infer<typeof quantIdeaSpecV1Schema>;
declare const quantTestRequestV1Schema: z.ZodObject<{
    version: z.ZodLiteral<"1">;
    idea: z.ZodObject<{
        version: z.ZodLiteral<"1">;
        family: z.ZodEnum<{
            execution: "execution";
            benchmark: "benchmark";
            signal_rule: "signal_rule";
            trend: "trend";
            mean_reversion: "mean_reversion";
            stat_arb: "stat_arb";
            carry: "carry";
            hedge: "hedge";
            market_making: "market_making";
            options: "options";
            regime_ml: "regime_ml";
            prediction_market: "prediction_market";
            defi_lp: "defi_lp";
        }>;
        thesis: z.ZodObject<{
            title: z.ZodString;
            belief: z.ZodString;
            expectedDirection: z.ZodEnum<{
                unknown: "unknown";
                down: "down";
                up: "up";
                carry: "carry";
                hedge: "hedge";
                relative: "relative";
                mean_revert: "mean_revert";
                volatility: "volatility";
            }>;
            horizon: z.ZodArray<z.ZodString>;
        }, z.core.$strict>;
        market: z.ZodObject<{
            venue: z.ZodEnum<{
                hyperliquid: "hyperliquid";
                derive: "derive";
                polymarket: "polymarket";
                external_fixture: "external_fixture";
            }>;
            symbol: z.ZodOptional<z.ZodString>;
            universe: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strict>;
        requiredSources: z.ZodDefault<z.ZodArray<z.ZodString>>;
        features: z.ZodDefault<z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            kind: z.ZodString;
            params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strict>>>;
        rule: z.ZodOptional<z.ZodObject<{
            kind: z.ZodString;
            params: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strict>>;
        risk: z.ZodOptional<z.ZodObject<{
            maxPositionUsd: z.ZodOptional<z.ZodNumber>;
            maxLeverage: z.ZodOptional<z.ZodNumber>;
            stopLossPct: z.ZodOptional<z.ZodNumber>;
            takeProfitPct: z.ZodOptional<z.ZodNumber>;
            maxDrawdownPct: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
    }, z.core.$strict>;
    testKinds: z.ZodArray<z.ZodEnum<{
        prompt_plan_check: "prompt_plan_check";
        data_availability: "data_availability";
        signal_study: "signal_study";
        idea_rule_simulation: "idea_rule_simulation";
        variant_sensitivity: "variant_sensitivity";
        leakage_check: "leakage_check";
        cost_stress: "cost_stress";
    }>>;
    window: z.ZodObject<{
        resolution: z.ZodEnum<{
            1: "1";
            5: "5";
            15: "15";
            30: "30";
            60: "60";
            240: "240";
            "1D": "1D";
            "1W": "1W";
        }>;
        timeframeStart: z.ZodString;
        timeframeEnd: z.ZodString;
        warmupBars: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>;
    assumptions: z.ZodDefault<z.ZodObject<{
        initialEquityUsd: z.ZodOptional<z.ZodNumber>;
        makerFeeBps: z.ZodOptional<z.ZodNumber>;
        takerFeeBps: z.ZodOptional<z.ZodNumber>;
        slippageBps: z.ZodOptional<z.ZodNumber>;
        fundingModel: z.ZodOptional<z.ZodEnum<{
            ignore: "ignore";
            historical: "historical";
            estimated: "estimated";
        }>>;
    }, z.core.$strict>>;
    variantSpace: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strict>;
type QuantTestRequestV1 = z.infer<typeof quantTestRequestV1Schema>;
declare const quantDecisionActionSchema: z.ZodEnum<{
    flat: "flat";
    hold: "hold";
    long: "long";
    short: "short";
    exit: "exit";
}>;
type QuantDecisionAction = z.infer<typeof quantDecisionActionSchema>;
declare const quantDecisionSchema: z.ZodObject<{
    time: z.ZodNumber;
    symbol: z.ZodString;
    action: z.ZodEnum<{
        flat: "flat";
        hold: "hold";
        long: "long";
        short: "short";
        exit: "exit";
    }>;
    targetPosition: z.ZodNumber;
    reason: z.ZodString;
    price: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>;
type QuantDecision = z.infer<typeof quantDecisionSchema>;
declare const quantDecisionArtifactV1Schema: z.ZodObject<{
    version: z.ZodLiteral<"1">;
    family: z.ZodEnum<{
        execution: "execution";
        benchmark: "benchmark";
        signal_rule: "signal_rule";
        trend: "trend";
        mean_reversion: "mean_reversion";
        stat_arb: "stat_arb";
        carry: "carry";
        hedge: "hedge";
        market_making: "market_making";
        options: "options";
        regime_ml: "regime_ml";
        prediction_market: "prediction_market";
        defi_lp: "defi_lp";
    }>;
    symbol: z.ZodString;
    resolution: z.ZodEnum<{
        1: "1";
        5: "5";
        15: "15";
        30: "30";
        60: "60";
        240: "240";
        "1D": "1D";
        "1W": "1W";
    }>;
    decisions: z.ZodArray<z.ZodObject<{
        time: z.ZodNumber;
        symbol: z.ZodString;
        action: z.ZodEnum<{
            flat: "flat";
            hold: "hold";
            long: "long";
            short: "short";
            exit: "exit";
        }>;
        targetPosition: z.ZodNumber;
        reason: z.ZodString;
        price: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>>;
    warnings: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strict>;
type QuantDecisionArtifactV1 = z.infer<typeof quantDecisionArtifactV1Schema>;
declare const quantTesterReportV1Schema: z.ZodObject<{
    ok: z.ZodBoolean;
    testRunKind: z.ZodEnum<{
        prompt_plan_check: "prompt_plan_check";
        data_availability: "data_availability";
        signal_study: "signal_study";
        idea_rule_simulation: "idea_rule_simulation";
        variant_sensitivity: "variant_sensitivity";
    }>;
    supported: z.ZodBoolean;
    unsupportedReason: z.ZodOptional<z.ZodString>;
    summary: z.ZodString;
    dataLineage: z.ZodObject<{
        venue: z.ZodString;
        symbols: z.ZodArray<z.ZodString>;
        resolution: z.ZodEnum<{
            1: "1";
            5: "5";
            15: "15";
            30: "30";
            60: "60";
            240: "240";
            "1D": "1D";
            "1W": "1W";
        }>;
        timeframeStart: z.ZodString;
        timeframeEnd: z.ZodString;
        sourceIds: z.ZodArray<z.ZodString>;
        warnings: z.ZodArray<z.ZodString>;
    }, z.core.$strict>;
    signalStudy: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    ideaSimulation: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    decisionArtifact: z.ZodOptional<z.ZodObject<{
        version: z.ZodLiteral<"1">;
        family: z.ZodEnum<{
            execution: "execution";
            benchmark: "benchmark";
            signal_rule: "signal_rule";
            trend: "trend";
            mean_reversion: "mean_reversion";
            stat_arb: "stat_arb";
            carry: "carry";
            hedge: "hedge";
            market_making: "market_making";
            options: "options";
            regime_ml: "regime_ml";
            prediction_market: "prediction_market";
            defi_lp: "defi_lp";
        }>;
        symbol: z.ZodString;
        resolution: z.ZodEnum<{
            1: "1";
            5: "5";
            15: "15";
            30: "30";
            60: "60";
            240: "240";
            "1D": "1D";
            "1W": "1W";
        }>;
        decisions: z.ZodArray<z.ZodObject<{
            time: z.ZodNumber;
            symbol: z.ZodString;
            action: z.ZodEnum<{
                flat: "flat";
                hold: "hold";
                long: "long";
                short: "short";
                exit: "exit";
            }>;
            targetPosition: z.ZodNumber;
            reason: z.ZodString;
            price: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strict>>;
        warnings: z.ZodDefault<z.ZodArray<z.ZodString>>;
    }, z.core.$strict>>;
    warnings: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strict>;
type QuantTesterReportV1 = z.infer<typeof quantTesterReportV1Schema>;

declare function normalizeQuantBars(input: unknown): QuantBar[];
declare function closePrices(bars: QuantBar[]): number[];
declare function typicalPrices(bars: QuantBar[]): number[];
declare function sliceBarsToWindow(params: {
    bars: QuantBar[];
    endSeconds: number;
    startSeconds: number;
    warmupBars?: number;
}): QuantBar[];

declare function validateDecisionArtifact(value: unknown): QuantDecisionArtifactV1;
declare function compactDecisionChanges(decisions: QuantDecision[]): QuantDecision[];

declare function beta(assetReturns: number[], benchmarkReturns: number[]): number | null;

declare function correlation(a: number[], b: number[]): number | null;
declare function rollingCorrelation(a: number[], b: number[], period?: number): Array<number | null>;

declare function fundingRates(bars: QuantBar[]): number[];
declare function cumulativeFunding(bars: QuantBar[]): number[];

declare function momentum(values: number[], lookbackBars: number): Array<number | null>;

declare function relativeStrength(assetPrices: number[], benchmarkPrices: number[], lookbackBars: number): Array<number | null>;

declare function simpleReturns(values: number[]): number[];
declare function logReturns(values: number[]): number[];
declare function forwardReturns(values: number[], horizonBars: number): Array<number | null>;

declare function volumes(bars: QuantBar[]): number[];
declare function relativeVolume(bars: QuantBar[], period?: number): Array<number | null>;

declare function trueRanges(bars: QuantBar[]): number[];
declare function atr(bars: QuantBar[], period?: number): Array<number | null>;

type BollingerPoint = {
    lower: number | null;
    middle: number | null;
    upper: number | null;
    width: number | null;
};
declare function bollinger(values: number[], period?: number, standardDeviations?: number): BollingerPoint[];

type DonchianPoint = {
    lower: number | null;
    upper: number | null;
};
declare function donchian(highs: number[], lows: number[], period?: number): DonchianPoint[];

declare function ema(values: number[], period: number): Array<number | null>;

type MacdPoint = {
    histogram: number | null;
    macd: number | null;
    signal: number | null;
};
declare function macd(values: number[], fastPeriod?: number, slowPeriod?: number, signalPeriod?: number): MacdPoint[];

declare function rsi(values: number[], period?: number): Array<number | null>;

declare function sma(values: number[], period: number): Array<number | null>;

declare function rollingVolatility(returns: number[], period?: number, annualization?: number): Array<number | null>;

declare function rollingZScore(values: number[], period?: number): Array<number | null>;

declare function buildQuantDataLineage(params: {
    bars: QuantBar[];
    request: QuantTestRequestV1;
    warnings?: string[];
}): {
    venue: "hyperliquid" | "derive" | "polymarket" | "external_fixture";
    symbols: string[];
    resolution: "1" | "5" | "15" | "30" | "60" | "240" | "1D" | "1W";
    timeframeStart: string;
    timeframeEnd: string;
    sourceIds: string[];
    warnings: string[];
};

type QuantMetricSummary = {
    count: number;
    max: number | null;
    mean: number | null;
    median: number | null;
    min: number | null;
    positiveRate: number | null;
    standardDeviation: number | null;
};
declare function summarizeNumbers(values: number[]): QuantMetricSummary;

type ExcursionSummary = {
    averageAdverse: number | null;
    averageFavorable: number | null;
    count: number;
};
declare function summarizeExcursions(params: {
    bars: QuantBar[];
    condition: boolean[];
    horizonBars: number;
}): ExcursionSummary;

type EventWindow = {
    endTime: number;
    eventTime: number;
    startTime: number;
};
declare function buildEventWindows(params: {
    bars: QuantBar[];
    condition: boolean[];
    postBars: number;
    preBars: number;
}): EventWindow[];

type ForwardReturnStudy = {
    conditioned: QuantMetricSummary;
    horizonBars: number;
    unconditional: QuantMetricSummary;
};
declare function studyForwardReturns(params: {
    condition: boolean[];
    horizonBars: number;
    prices: number[];
}): ForwardReturnStudy;

declare function hitRate(values: number[]): number | null;

declare function informationCoefficient(params: {
    forwardReturns: Array<number | null>;
    signal: Array<number | null>;
}): number | null;

declare function signalStudySummary(params: {
    conditionedCount: number;
    conditionedMean: number | null;
    unconditionalMean: number | null;
}): string;

declare const DONCHIAN_BREAKOUT_RULE_KIND: "donchian_breakout";

declare const FUNDING_CARRY_RULE_KIND: "funding_carry";

declare const MACD_CROSSOVER_RULE_KIND: "macd_crossover";

declare const MA_CROSS_RULE_KIND: "ma_cross";

declare const MOMENTUM_RULE_KIND: "momentum";

type QuantSupportLevel = "v1_replayable" | "v1_signal_or_idea_test" | "advanced_research" | "unsupported_until_data";
type QuantFamilyCapability = {
    aliases: string[];
    family: QuantStrategyFamily;
    supportLevel: QuantSupportLevel;
    supportedTestKinds: QuantTestKind[];
};
declare const QUANT_FAMILY_CAPABILITIES: QuantFamilyCapability[];
declare function resolveQuantFamilyCapability(value: string): QuantFamilyCapability | null;

declare const RSI_MEAN_REVERSION_RULE_KIND: "rsi_mean_reversion";

type EvaluatedRuleSeries = {
    condition: boolean[];
    positions: number[];
    signal: Array<number | null>;
    warnings: string[];
};
declare function evaluateQuantRule(params: {
    bars: QuantBar[];
    idea: QuantIdeaSpecV1;
}): EvaluatedRuleSeries;

declare const ZSCORE_MEAN_REVERSION_RULE_KIND: "zscore_mean_reversion";

type QuantTestPlan = {
    supportedTestKinds: QuantTestKind[];
    supportLevel: string;
    warnings: string[];
};
declare function buildQuantTestPlan(idea: QuantIdeaSpecV1): QuantTestPlan;

declare function finalizeQuantTesterReport(report: QuantTesterReportV1): QuantTesterReportV1;

declare function runQuantIdeaTest(params: {
    bars: QuantBar[] | unknown;
    request: QuantTestRequestV1 | unknown;
}): QuantTesterReportV1;

declare function runSignalStudy(params: {
    bars: QuantBar[] | unknown;
    request: QuantTestRequestV1 | unknown;
}): QuantTesterReportV1;

declare function quantDataWarnings(params: {
    bars: QuantBar[];
    request: QuantTestRequestV1;
}): string[];
declare function quantCostBps(request: QuantTestRequestV1): number;

declare const QUANT_RESOLUTION_SECONDS: Record<QuantResolution, number>;
declare function quantResolutionToSeconds(resolution: QuantResolution): number;
declare function parseQuantTimeToSeconds(value: unknown): number | null;
declare function assertQuantWindow(params: {
    timeframeEnd: string;
    timeframeStart: string;
}): {
    endSeconds: number;
    startSeconds: number;
};

export { type BollingerPoint, DONCHIAN_BREAKOUT_RULE_KIND, type DonchianPoint, type EvaluatedRuleSeries, type EventWindow, type ExcursionSummary, FUNDING_CARRY_RULE_KIND, type ForwardReturnStudy, MACD_CROSSOVER_RULE_KIND, MA_CROSS_RULE_KIND, MOMENTUM_RULE_KIND, type MacdPoint, QUANT_FAMILY_CAPABILITIES, QUANT_RESOLUTION_SECONDS, type QuantBar, type QuantDecision, type QuantDecisionAction, type QuantDecisionArtifactV1, type QuantFamilyCapability, type QuantFeatureSpec, type QuantIdeaSpecV1, type QuantMetricSummary, type QuantResolution, type QuantRuleSpec, type QuantStrategyFamily, type QuantSupportLevel, type QuantTestKind, type QuantTestPlan, type QuantTestRequestV1, type QuantTesterReportV1, RSI_MEAN_REVERSION_RULE_KIND, ZSCORE_MEAN_REVERSION_RULE_KIND, assertQuantWindow, atr, beta, bollinger, buildEventWindows, buildQuantDataLineage, buildQuantTestPlan, closePrices, compactDecisionChanges, correlation, cumulativeFunding, donchian, ema, evaluateQuantRule, finalizeQuantTesterReport, forwardReturns, fundingRates, hitRate, informationCoefficient, logReturns, macd, momentum, normalizeQuantBars, parseQuantTimeToSeconds, quantBarSchema, quantCostBps, quantDataWarnings, quantDecisionActionSchema, quantDecisionArtifactV1Schema, quantDecisionSchema, quantFeatureSpecSchema, quantIdeaSpecV1Schema, quantResolutionSchema, quantResolutionToSeconds, quantRuleSpecSchema, quantStrategyFamilySchema, quantTestKindSchema, quantTestRequestV1Schema, quantTesterReportV1Schema, relativeStrength, relativeVolume, resolveQuantFamilyCapability, rollingCorrelation, rollingVolatility, rollingZScore, rsi, runQuantIdeaTest, runSignalStudy, signalStudySummary, simpleReturns, sliceBarsToWindow, sma, studyForwardReturns, summarizeExcursions, summarizeNumbers, trueRanges, typicalPrices, validateDecisionArtifact, volumes };

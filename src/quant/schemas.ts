import { z } from "zod";

export const quantStrategyFamilySchema = z.enum([
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
  "defi_lp",
]);
export type QuantStrategyFamily = z.infer<typeof quantStrategyFamilySchema>;

export const quantTestKindSchema = z.enum([
  "prompt_plan_check",
  "data_availability",
  "signal_study",
  "idea_rule_simulation",
  "variant_sensitivity",
  "leakage_check",
  "cost_stress",
]);
export type QuantTestKind = z.infer<typeof quantTestKindSchema>;

export const quantResolutionSchema = z.enum(["1", "5", "15", "30", "60", "240", "1D", "1W"]);
export type QuantResolution = z.infer<typeof quantResolutionSchema>;

export const quantBarSchema = z
  .object({
    time: z.number().int().nonnegative(),
    open: z.number().positive(),
    high: z.number().positive(),
    low: z.number().positive(),
    close: z.number().positive(),
    volume: z.number().nonnegative().optional(),
    fundingRate: z.number().optional(),
  })
  .strict();
export type QuantBar = z.infer<typeof quantBarSchema>;

export const quantFeatureSpecSchema = z
  .object({
    id: z.string().min(1),
    kind: z.string().min(1),
    params: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();
export type QuantFeatureSpec = z.infer<typeof quantFeatureSpecSchema>;

export const quantRuleSpecSchema = z
  .object({
    kind: z.string().min(1),
    params: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();
export type QuantRuleSpec = z.infer<typeof quantRuleSpecSchema>;

export const quantIdeaSpecV1Schema = z
  .object({
    version: z.literal("1"),
    family: quantStrategyFamilySchema,
    thesis: z
      .object({
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
          "unknown",
        ]),
        horizon: z.array(z.string().min(1)).min(1),
      })
      .strict(),
    market: z
      .object({
        venue: z.enum(["hyperliquid", "polymarket", "derive", "external_fixture"]),
        symbol: z.string().min(1).optional(),
        universe: z.array(z.string().min(1)).optional(),
      })
      .strict(),
    requiredSources: z.array(z.string().min(1)).default([]),
    features: z.array(quantFeatureSpecSchema).default([]),
    rule: quantRuleSpecSchema.optional(),
    risk: z
      .object({
        maxPositionUsd: z.number().positive().optional(),
        maxLeverage: z.number().positive().optional(),
        stopLossPct: z.number().positive().optional(),
        takeProfitPct: z.number().positive().optional(),
        maxDrawdownPct: z.number().positive().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type QuantIdeaSpecV1 = z.infer<typeof quantIdeaSpecV1Schema>;

export const quantTestRequestV1Schema = z
  .object({
    version: z.literal("1"),
    idea: quantIdeaSpecV1Schema,
    testKinds: z.array(quantTestKindSchema).min(1),
    window: z
      .object({
        resolution: quantResolutionSchema,
        timeframeStart: z.string().min(1),
        timeframeEnd: z.string().min(1),
        warmupBars: z.number().int().nonnegative().optional(),
      })
      .strict(),
    assumptions: z
      .object({
        initialEquityUsd: z.number().positive().optional(),
        makerFeeBps: z.number().nonnegative().optional(),
        takerFeeBps: z.number().nonnegative().optional(),
        slippageBps: z.number().nonnegative().optional(),
        fundingModel: z.enum(["ignore", "historical", "estimated"]).optional(),
      })
      .strict()
      .default({}),
    variantSpace: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type QuantTestRequestV1 = z.infer<typeof quantTestRequestV1Schema>;

export const quantDecisionActionSchema = z.enum(["hold", "flat", "long", "short", "exit"]);
export type QuantDecisionAction = z.infer<typeof quantDecisionActionSchema>;

export const quantDecisionSchema = z
  .object({
    time: z.number().int().nonnegative(),
    symbol: z.string().min(1),
    action: quantDecisionActionSchema,
    targetPosition: z.number(),
    reason: z.string().min(1),
    price: z.number().positive().optional(),
  })
  .strict();
export type QuantDecision = z.infer<typeof quantDecisionSchema>;

export const quantDecisionArtifactV1Schema = z
  .object({
    version: z.literal("1"),
    family: quantStrategyFamilySchema,
    symbol: z.string().min(1),
    resolution: quantResolutionSchema,
    decisions: z.array(quantDecisionSchema),
    warnings: z.array(z.string()).default([]),
  })
  .strict();
export type QuantDecisionArtifactV1 = z.infer<typeof quantDecisionArtifactV1Schema>;

export const quantTesterReportV1Schema = z
  .object({
    ok: z.boolean(),
    testRunKind: z.enum([
      "prompt_plan_check",
      "data_availability",
      "signal_study",
      "idea_rule_simulation",
      "variant_sensitivity",
    ]),
    supported: z.boolean(),
    unsupportedReason: z.string().optional(),
    summary: z.string(),
    dataLineage: z
      .object({
        venue: z.string(),
        symbols: z.array(z.string()),
        resolution: quantResolutionSchema,
        timeframeStart: z.string(),
        timeframeEnd: z.string(),
        sourceIds: z.array(z.string()),
        warnings: z.array(z.string()),
      })
      .strict(),
    signalStudy: z.record(z.string(), z.unknown()).optional(),
    ideaSimulation: z.record(z.string(), z.unknown()).optional(),
    decisionArtifact: quantDecisionArtifactV1Schema.optional(),
    warnings: z.array(z.string()).default([]),
  })
  .strict();
export type QuantTesterReportV1 = z.infer<typeof quantTesterReportV1Schema>;

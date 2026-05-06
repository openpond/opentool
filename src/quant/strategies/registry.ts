import type { QuantStrategyFamily, QuantTestKind } from "../schemas";

export type QuantSupportLevel =
  | "v1_replayable"
  | "v1_signal_or_idea_test"
  | "advanced_research"
  | "unsupported_until_data";

export type QuantFamilyCapability = {
  aliases: string[];
  family: QuantStrategyFamily;
  supportLevel: QuantSupportLevel;
  supportedTestKinds: QuantTestKind[];
};

const BASE_TESTS: QuantTestKind[] = [
  "prompt_plan_check",
  "data_availability",
  "signal_study",
  "idea_rule_simulation",
  "variant_sensitivity",
  "leakage_check",
  "cost_stress",
];

export const QUANT_FAMILY_CAPABILITIES: QuantFamilyCapability[] = [
  {
    aliases: ["benchmark", "buy-and-hold", "buy_and_hold", "hold"],
    family: "benchmark",
    supportLevel: "v1_replayable",
    supportedTestKinds: BASE_TESTS,
  },
  {
    aliases: ["signal_rule", "moving_average", "ma_cross", "rsi", "macd", "bollinger", "donchian"],
    family: "signal_rule",
    supportLevel: "v1_replayable",
    supportedTestKinds: BASE_TESTS,
  },
  {
    aliases: ["trend", "momentum", "breakout", "time_series_momentum"],
    family: "trend",
    supportLevel: "v1_replayable",
    supportedTestKinds: BASE_TESTS,
  },
  {
    aliases: ["mean_reversion", "zscore", "rsi_mean_reversion", "bollinger_mean_reversion"],
    family: "mean_reversion",
    supportLevel: "v1_replayable",
    supportedTestKinds: BASE_TESTS,
  },
  {
    aliases: ["stat_arb", "pairs", "pair_spread", "cointegration"],
    family: "stat_arb",
    supportLevel: "v1_signal_or_idea_test",
    supportedTestKinds: ["prompt_plan_check", "data_availability", "signal_study", "leakage_check"],
  },
  {
    aliases: ["carry", "funding", "basis", "funding_carry"],
    family: "carry",
    supportLevel: "v1_signal_or_idea_test",
    supportedTestKinds: BASE_TESTS,
  },
  {
    aliases: ["hedge", "overlay", "tail_hedge"],
    family: "hedge",
    supportLevel: "v1_signal_or_idea_test",
    supportedTestKinds: ["prompt_plan_check", "data_availability", "signal_study", "cost_stress"],
  },
  {
    aliases: ["execution", "twap", "vwap", "participation", "iceberg"],
    family: "execution",
    supportLevel: "advanced_research",
    supportedTestKinds: ["prompt_plan_check", "data_availability", "cost_stress"],
  },
  {
    aliases: ["market_making", "maker", "avellaneda", "inventory_skew"],
    family: "market_making",
    supportLevel: "advanced_research",
    supportedTestKinds: ["prompt_plan_check", "data_availability", "cost_stress"],
  },
  {
    aliases: ["options", "vol", "black_scholes", "put_call_parity"],
    family: "options",
    supportLevel: "unsupported_until_data",
    supportedTestKinds: ["prompt_plan_check", "data_availability"],
  },
  {
    aliases: ["regime_ml", "ml", "regime", "markov", "hmm", "rl"],
    family: "regime_ml",
    supportLevel: "advanced_research",
    supportedTestKinds: ["prompt_plan_check", "data_availability", "leakage_check"],
  },
  {
    aliases: ["prediction_market", "outcome", "hip4", "binary"],
    family: "prediction_market",
    supportLevel: "v1_signal_or_idea_test",
    supportedTestKinds: ["prompt_plan_check", "data_availability", "signal_study", "cost_stress"],
  },
  {
    aliases: ["defi_lp", "amm", "lp", "concentrated_liquidity"],
    family: "defi_lp",
    supportLevel: "unsupported_until_data",
    supportedTestKinds: ["prompt_plan_check", "data_availability"],
  },
];

export function resolveQuantFamilyCapability(value: string): QuantFamilyCapability | null {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (
    QUANT_FAMILY_CAPABILITIES.find(
      (capability) =>
        capability.family === normalized ||
        capability.aliases.some((alias) => alias === normalized),
    ) ?? null
  );
}

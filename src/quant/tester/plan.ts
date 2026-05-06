import type { QuantIdeaSpecV1, QuantTestKind } from "../schemas";
import { resolveQuantFamilyCapability } from "../strategies/registry";

export type QuantTestPlan = {
  supportedTestKinds: QuantTestKind[];
  supportLevel: string;
  warnings: string[];
};

export function buildQuantTestPlan(idea: QuantIdeaSpecV1): QuantTestPlan {
  const capability = resolveQuantFamilyCapability(idea.family);
  if (!capability) {
    return {
      supportedTestKinds: ["prompt_plan_check", "data_availability"],
      supportLevel: "unsupported_until_data",
      warnings: [`No V1 quant capability found for family ${idea.family}.`],
    };
  }
  return {
    supportedTestKinds: capability.supportedTestKinds,
    supportLevel: capability.supportLevel,
    warnings:
      capability.supportLevel === "advanced_research" ||
      capability.supportLevel === "unsupported_until_data"
        ? [`Family ${idea.family} is ${capability.supportLevel}; do not mark it strict-backtest-ready.`]
        : [],
  };
}

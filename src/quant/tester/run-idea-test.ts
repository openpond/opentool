import { closePrices, normalizeQuantBars } from "../bars";
import { compactDecisionChanges, validateDecisionArtifact } from "../decision-series";
import { buildQuantDataLineage } from "../lineage";
import {
  quantTestRequestV1Schema,
  type QuantBar,
  type QuantDecision,
  type QuantTesterReportV1,
  type QuantTestRequestV1,
} from "../schemas";
import { evaluateQuantRule } from "../strategies/rule-evaluator";
import { buildQuantTestPlan } from "./plan";
import { finalizeQuantTesterReport } from "./report";
import { quantCostBps, quantDataWarnings } from "./warnings";

type SimulationMetrics = {
  endingEquityUsd: number;
  maxDrawdownPct: number;
  netReturnPct: number;
  turnover: number;
  trades: number;
};

function symbolForRequest(request: QuantTestRequestV1): string {
  return request.idea.market.symbol ?? request.idea.market.universe?.[0] ?? "UNKNOWN";
}

function actionForPosition(target: number): QuantDecision["action"] {
  if (target > 0) return "long";
  if (target < 0) return "short";
  return "flat";
}

function simulate(params: {
  bars: QuantBar[];
  costBps: number;
  positions: number[];
  request: QuantTestRequestV1;
}): { decisions: QuantDecision[]; metrics: SimulationMetrics } {
  const prices = closePrices(params.bars);
  const initialEquity = params.request.assumptions.initialEquityUsd ?? 10_000;
  const symbol = symbolForRequest(params.request);
  let equity = initialEquity;
  let peak = initialEquity;
  let maxDrawdown = 0;
  let previousPosition = 0;
  let turnover = 0;
  let trades = 0;
  const decisions: QuantDecision[] = [];

  for (let index = 0; index < params.bars.length; index += 1) {
    const targetPosition = params.positions[index] ?? 0;
    const deltaPosition = Math.abs(targetPosition - previousPosition);
    if (deltaPosition > 0) {
      turnover += deltaPosition;
      trades += 1;
      equity -= equity * deltaPosition * (params.costBps / 10_000);
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
      reason:
        targetPosition === previousPosition
          ? "rule maintained target position"
          : "rule changed target position",
      price: params.bars[index].close,
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
      trades,
    },
  };
}

export function runQuantIdeaTest(params: {
  bars: QuantBar[] | unknown;
  request: QuantTestRequestV1 | unknown;
}): QuantTesterReportV1 {
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
      dataLineage: buildQuantDataLineage({ bars, request, warnings }),
      warnings,
    });
  }

  const evaluated = evaluateQuantRule({ bars, idea: request.idea });
  warnings.push(...evaluated.warnings);
  const simulation = simulate({
    bars,
    costBps: quantCostBps(request),
    positions: evaluated.positions,
    request,
  });
  const decisionArtifact = validateDecisionArtifact({
    version: "1",
    family: request.idea.family,
    symbol: symbolForRequest(request),
    resolution: request.window.resolution,
    decisions: simulation.decisions,
    warnings,
  });

  return finalizeQuantTesterReport({
    ok: true,
    testRunKind: "idea_rule_simulation",
    supported: true,
    summary: `Idea simulation completed: net return ${simulation.metrics.netReturnPct.toFixed(2)}%, trades ${simulation.metrics.trades}.`,
    dataLineage: buildQuantDataLineage({ bars, request, warnings }),
    ideaSimulation: simulation.metrics,
    decisionArtifact,
    warnings,
  });
}

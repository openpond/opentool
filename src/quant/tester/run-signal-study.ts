import { closePrices, normalizeQuantBars } from "../bars";
import { forwardReturns } from "../features/returns";
import { buildQuantDataLineage } from "../lineage";
import { summarizeExcursions } from "../signal-study/adverse-excursion";
import { studyForwardReturns } from "../signal-study/forward-returns";
import { informationCoefficient } from "../signal-study/information-coefficient";
import { signalStudySummary } from "../signal-study/summary";
import {
  quantTestRequestV1Schema,
  type QuantBar,
  type QuantTesterReportV1,
  type QuantTestRequestV1,
} from "../schemas";
import { evaluateQuantRule } from "../strategies/rule-evaluator";
import { buildQuantTestPlan } from "./plan";
import { finalizeQuantTesterReport } from "./report";
import { quantDataWarnings } from "./warnings";

function horizonBars(request: QuantTestRequestV1): number {
  const value = request.idea.rule?.params.horizonBars;
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 1;
}

export function runSignalStudy(params: {
  bars: QuantBar[] | unknown;
  request: QuantTestRequestV1 | unknown;
}): QuantTesterReportV1 {
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
      dataLineage: buildQuantDataLineage({ bars, request, warnings }),
      warnings,
    });
  }

  const evaluated = evaluateQuantRule({ bars, idea: request.idea });
  warnings.push(...evaluated.warnings);
  const prices = closePrices(bars);
  const horizon = horizonBars(request);
  const study = studyForwardReturns({
    condition: evaluated.condition,
    horizonBars: horizon,
    prices,
  });
  const forward = forwardReturns(prices, horizon);
  const excursions = summarizeExcursions({
    bars,
    condition: evaluated.condition,
    horizonBars: horizon,
  });
  const ic = informationCoefficient({
    forwardReturns: forward,
    signal: evaluated.signal,
  });
  const summary = signalStudySummary({
    conditionedCount: study.conditioned.count,
    conditionedMean: study.conditioned.mean,
    unconditionalMean: study.unconditional.mean,
  });

  return finalizeQuantTesterReport({
    ok: true,
    testRunKind: "signal_study",
    supported: true,
    summary,
    dataLineage: buildQuantDataLineage({ bars, request, warnings }),
    signalStudy: {
      forwardReturns: study,
      informationCoefficient: ic,
      excursions,
      signalEventCount: evaluated.condition.filter(Boolean).length,
    },
    warnings,
  });
}

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildQuantTestPlan,
  normalizeQuantBars,
  quantIdeaSpecV1Schema,
  runQuantIdeaTest,
  runSignalStudy,
  validateDecisionArtifact,
  type QuantBar,
  type QuantTestRequestV1,
} from "../src/quant";

function fixtureBars(count = 120): QuantBar[] {
  return Array.from({ length: count }, (_, index) => {
    const base = 100 + index * 0.4 + Math.sin(index / 4) * 3;
    const close = base + Math.sin(index / 3);
    return {
      time: 1_700_000_000 + index * 3600,
      open: base,
      high: Math.max(base, close) + 1,
      low: Math.min(base, close) - 1,
      close,
      volume: 1000 + index,
      fundingRate: index % 8 === 0 ? -0.0001 : 0.00005,
    };
  });
}

const request: QuantTestRequestV1 = {
  version: "1",
  idea: {
    version: "1",
    family: "signal_rule",
    thesis: {
      title: "RSI pullback",
      belief: "Oversold pullbacks should recover over the next few bars.",
      expectedDirection: "mean_revert",
      horizon: ["4h"],
    },
    market: {
      venue: "external_fixture",
      symbol: "BTC",
    },
    requiredSources: ["Q04"],
    features: [{ id: "rsi_14", kind: "rsi", params: { period: 14 } }],
    rule: {
      kind: "rsi_mean_reversion",
      params: { period: 14, oversold: 45, exit: 55, horizonBars: 4 },
    },
  },
  testKinds: ["signal_study", "idea_rule_simulation", "cost_stress"],
  window: {
    resolution: "60",
    timeframeStart: "2023-11-14T22:13:20Z",
    timeframeEnd: "2023-11-20T22:13:20Z",
  },
  assumptions: {
    initialEquityUsd: 10_000,
    takerFeeBps: 5,
    slippageBps: 2,
  },
};

test("quant schemas validate strict idea specs", () => {
  assert.equal(quantIdeaSpecV1Schema.parse(request.idea).family, "signal_rule");
  assert.throws(() =>
    quantIdeaSpecV1Schema.parse({
      ...request.idea,
      unexpected: true,
    }),
  );
});

test("quant bars normalize and reject invalid OHLC data", () => {
  const reversed = fixtureBars(3).reverse();
  assert.equal(normalizeQuantBars(reversed)[0].time, fixtureBars(3)[0].time);
  assert.throws(() =>
    normalizeQuantBars([{ time: 1, open: 10, high: 9, low: 8, close: 10 }]),
  );
});

test("quant test plan maps supported V1 families", () => {
  const plan = buildQuantTestPlan(request.idea);
  assert.equal(plan.supportLevel, "v1_replayable");
  assert.equal(plan.supportedTestKinds.includes("idea_rule_simulation"), true);
});

test("signal study emits source-backed lineage and metrics", () => {
  const report = runSignalStudy({ request, bars: fixtureBars() });
  assert.equal(report.ok, true);
  assert.equal(report.supported, true);
  assert.equal(report.dataLineage.sourceIds[0], "Q04");
  assert.equal(typeof report.signalStudy?.signalEventCount, "number");
});

test("idea tester emits validated decision artifact", () => {
  const report = runQuantIdeaTest({ request, bars: fixtureBars() });
  assert.equal(report.ok, true);
  assert.equal(report.supported, true);
  assert.equal(typeof report.ideaSimulation?.netReturnPct, "number");
  assert.ok(report.decisionArtifact);
  assert.equal(validateDecisionArtifact(report.decisionArtifact).symbol, "BTC");
});

test("advanced research families do not pretend to support deterministic idea simulation", () => {
  const unsupported = runQuantIdeaTest({
    bars: fixtureBars(),
    request: {
      ...request,
      idea: {
        ...request.idea,
        family: "options",
        rule: { kind: "black_scholes", params: {} },
      },
    },
  });
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.supported, false);
  assert.match(unsupported.unsupportedReason ?? "", /does not support/);
});

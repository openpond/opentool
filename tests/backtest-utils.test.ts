import assert from "node:assert/strict";
import { test } from "node:test";

import {
  BACKTEST_DECISION_MODE,
  buildBacktestDecisionSeriesInput,
  estimateCountBack,
  parseTimeToSeconds,
  resolveBacktestAccountValueUsd,
  resolveBacktestMode,
  resolveBacktestWindow,
  resolutionToSeconds,
} from "../src/backtest";

test("parseTimeToSeconds handles numeric, ISO, and invalid values", () => {
  assert.equal(parseTimeToSeconds(123.9), 123);
  assert.equal(parseTimeToSeconds("456.7"), 456);
  assert.equal(parseTimeToSeconds("2026-03-04T00:00:00Z"), 1772582400);
  assert.equal(parseTimeToSeconds(-30), 0);
  assert.equal(parseTimeToSeconds("-12.5"), 0);
  assert.equal(parseTimeToSeconds(""), null);
  assert.equal(parseTimeToSeconds("not-a-date"), null);
});

test("resolutionToSeconds maps canonical resolutions", () => {
  assert.equal(resolutionToSeconds("1"), 60);
  assert.equal(resolutionToSeconds("60"), 3600);
  assert.equal(resolutionToSeconds("1D"), 86400);
  assert.equal(resolutionToSeconds("1W"), 604800);
});

test("estimateCountBack derives from lookbackDays/window and falls back", () => {
  const fromLookback = estimateCountBack({
    fallback: 240,
    lookbackDays: 2,
    resolution: "60",
  });
  assert.equal(fromLookback, 53);

  const fromWindow = estimateCountBack({
    fallback: 240,
    resolution: "60",
    fromSeconds: 0,
    toSeconds: 3600 * 10,
  });
  assert.equal(fromWindow, 50);

  const fallback = estimateCountBack({
    fallback: 240,
    resolution: "60",
    fromSeconds: 100,
    toSeconds: 50,
  });
  assert.equal(fallback, 240);
});

test("resolveBacktestMode normalizes accepted mode and rejects others", () => {
  assert.equal(resolveBacktestMode(" backtest_decisions "), BACKTEST_DECISION_MODE);
  assert.equal(resolveBacktestMode("BACKTEST_DECISIONS"), BACKTEST_DECISION_MODE);
  assert.equal(resolveBacktestMode("other"), null);
  assert.equal(resolveBacktestMode(null), null);
});

test("resolveBacktestWindow applies precedence and invalid-range fallback", () => {
  const direct = resolveBacktestWindow({
    fallbackCountBack: 240,
    resolution: "60",
    from: 100,
    to: 1000,
    timeframeStart: "2026-03-01T00:00:00Z",
    timeframeEnd: "2026-03-02T00:00:00Z",
  });
  assert.equal(direct.fromSeconds, 100);
  assert.equal(direct.toSeconds, 1000);
  assert.equal(direct.countBack, 50);

  const withLookback = resolveBacktestWindow({
    fallbackCountBack: 240,
    resolution: "60",
    lookbackDays: 3,
  });
  assert.equal(withLookback.fromSeconds, undefined);
  assert.equal(withLookback.toSeconds, undefined);
  assert.equal(withLookback.countBack, 77);

  const invalidRange = resolveBacktestWindow({
    fallbackCountBack: 240,
    resolution: "60",
    from: 2000,
    to: 1000,
  });
  assert.equal(invalidRange.fromSeconds, undefined);
  assert.equal(invalidRange.toSeconds, undefined);
  assert.equal(invalidRange.countBack, 240);

  const fromTimeframe = resolveBacktestWindow({
    fallbackCountBack: 240,
    resolution: "60",
    timeframeStart: "2026-03-01T00:00:00Z",
    timeframeEnd: "2026-03-01T04:00:00Z",
  });
  assert.equal(fromTimeframe.fromSeconds, 1772323200);
  assert.equal(fromTimeframe.toSeconds, 1772337600);
  assert.equal(fromTimeframe.countBack, 50);
});

test("resolveBacktestAccountValueUsd parses finite positive values", () => {
  assert.equal(resolveBacktestAccountValueUsd(1000), 1000);
  assert.equal(resolveBacktestAccountValueUsd("2500.5"), 2500.5);
  assert.equal(resolveBacktestAccountValueUsd(0), undefined);
  assert.equal(resolveBacktestAccountValueUsd(""), undefined);
  assert.equal(resolveBacktestAccountValueUsd("nope"), undefined);
});

test("buildBacktestDecisionSeriesInput maps request payload to runtime params", () => {
  const input = buildBacktestDecisionSeriesInput({
    mode: BACKTEST_DECISION_MODE,
    symbol: "BTC",
    timeframeStart: "2026-03-01T00:00:00Z",
    timeframeEnd: "2026-03-03T00:00:00Z",
    from: 111,
    to: 222,
    lookbackDays: 2,
    initialEquityUsd: 5000,
  });

  assert.deepEqual(input, {
    symbol: "BTC",
    timeframeStart: "2026-03-01T00:00:00Z",
    timeframeEnd: "2026-03-03T00:00:00Z",
    from: 111,
    to: 222,
    lookbackDays: 2,
    accountValueUsd: 5000,
  });
});

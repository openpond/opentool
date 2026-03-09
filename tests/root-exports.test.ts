import assert from "node:assert/strict";
import test from "node:test";

import * as opentool from "../src/index";
import * as backtest from "../src/backtest/index";

test("root exports stay runtime-only and do not expose CLI helpers", () => {
  assert.equal("generateMetadata" in opentool, false);
  assert.equal("generateMetadataCommand" in opentool, false);
  assert.equal("loadAndValidateTools" in opentool, false);
  assert.equal("validateCommand" in opentool, false);
});

test("backtest helpers remain available from the dedicated backtest entrypoint", () => {
  assert.equal(typeof backtest.backtestDecisionRequestSchema.safeParse, "function");
  assert.equal(typeof backtest.resolveBacktestMode, "function");
  assert.equal(typeof backtest.resolveBacktestWindow, "function");
  assert.equal(typeof backtest.resolveBacktestAccountValueUsd, "function");
  assert.equal(typeof backtest.buildBacktestDecisionSeriesInput, "function");
});

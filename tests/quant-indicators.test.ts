import assert from "node:assert/strict";
import { test } from "node:test";

import {
  bollinger,
  ema,
  forwardReturns,
  macd,
  momentum,
  quantResolutionToSeconds,
  rollingZScore,
  rsi,
  simpleReturns,
  sma,
} from "../src/quant";

test("quant timeframe helpers map canonical resolutions", () => {
  assert.equal(quantResolutionToSeconds("1"), 60);
  assert.equal(quantResolutionToSeconds("240"), 14400);
  assert.equal(quantResolutionToSeconds("1D"), 86400);
});

test("quant indicators produce deterministic rolling values", () => {
  const values = [1, 2, 3, 4, 5, 6];
  assert.deepEqual(sma(values, 3), [null, null, 2, 3, 4, 5]);
  assert.equal(ema(values, 3)[2], 2);
  assert.equal(rollingZScore([1, 2, 3], 3)[2]?.toFixed(6), "1.224745");
  assert.equal(bollinger(values, 3, 2)[2].middle, 2);
});

test("quant returns and momentum use forward-looking nulls explicitly", () => {
  const values = [100, 110, 99, 120];
  assert.deepEqual(simpleReturns(values).map((value) => Number(value.toFixed(4))), [
    0,
    0.1,
    -0.1,
    0.2121,
  ]);
  assert.deepEqual(forwardReturns(values, 2).map((value) => value == null ? null : Number(value.toFixed(4))), [
    -0.01,
    0.0909,
    null,
    null,
  ]);
  assert.deepEqual(momentum(values, 2).map((value) => value == null ? null : Number(value.toFixed(4))), [
    null,
    null,
    -0.01,
    0.0909,
  ]);
});

test("RSI and MACD return aligned arrays", () => {
  const values = Array.from({ length: 60 }, (_, index) => 100 + index + Math.sin(index));
  assert.equal(rsi(values, 14).length, values.length);
  assert.equal(macd(values).length, values.length);
  assert.equal(typeof rsi(values, 14).at(-1), "number");
  assert.equal(typeof macd(values).at(-1)?.histogram, "number");
});

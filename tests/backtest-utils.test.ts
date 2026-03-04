import assert from "node:assert/strict";
import { test } from "node:test";

import {
  estimateCountBack,
  parseTimeToSeconds,
  resolutionToSeconds,
} from "../src/backtest";

test("parseTimeToSeconds handles numeric, ISO, and invalid values", () => {
  assert.equal(parseTimeToSeconds(123.9), 123);
  assert.equal(parseTimeToSeconds("456.7"), 456);
  assert.equal(parseTimeToSeconds("2026-03-04T00:00:00Z"), 1772582400);
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

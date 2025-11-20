import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeScheduleExpression } from "../src/utils/schedule";

test("normalizes cron wrapper to plain cron fields", () => {
  const result = normalizeScheduleExpression("cron(0 12 * * *)", "tools/foo.ts");
  assert.equal(result.type, "cron");
  assert.equal(result.expression, "0 12 * * *");
});

test("accepts 6-field cron", () => {
  const result = normalizeScheduleExpression("0 0 ? * MON-FRI *", "tools/bar.ts");
  assert.equal(result.expression, "0 0 ? * MON-FRI *");
});

test("rejects wrong field counts", () => {
  assert.throws(() => normalizeScheduleExpression("0 0 * *", "tools/bad.ts"));
});

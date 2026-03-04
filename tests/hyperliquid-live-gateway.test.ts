import assert from "node:assert/strict";
import { test } from "node:test";

import { fetchHyperliquidBars } from "../src/adapters/hyperliquid";

const gatewayBase = process.env.OPENPOND_GATEWAY_URL ?? "https://gateway.openpond.dev";

test("live gateway smoke: fetchHyperliquidBars returns normalized bar rows", async () => {
  const bars = await fetchHyperliquidBars({
    // Production gateway bars endpoint currently accepts canonical perp symbols (e.g. BTC).
    symbol: "BTC",
    resolution: "60",
    countBack: 50,
    gatewayBase,
  });

  assert.ok(Array.isArray(bars));
  assert.ok(bars.length > 0, "expected at least one bar from live gateway");
  const first = bars[0];
  assert.equal(typeof first?.time, "number");
  assert.equal(typeof first?.close, "number");
});

test("live gateway resolves canonical symbol casing", async () => {
  const barsUpper = await fetchHyperliquidBars({
    symbol: "BTC",
    resolution: "60",
    countBack: 20,
    gatewayBase,
  });
  const barsLower = await fetchHyperliquidBars({
    symbol: "btc",
    resolution: "60",
    countBack: 20,
    gatewayBase,
  });

  assert.ok(barsUpper.length > 0);
  assert.ok(barsLower.length > 0);
  assert.equal(typeof barsUpper[0]?.close, "number");
  assert.equal(typeof barsLower[0]?.close, "number");
});

test("live gateway accepts bounded backfill window params", async () => {
  const now = Math.trunc(Date.now() / 1000);
  const from = now - 6 * 3600;
  const to = now;
  const bars = await fetchHyperliquidBars({
    symbol: "BTC",
    resolution: "60",
    countBack: 10,
    fromSeconds: from,
    toSeconds: to,
    gatewayBase,
  });

  assert.ok(Array.isArray(bars));
  assert.ok(bars.length > 0, "expected bars for bounded window");
});

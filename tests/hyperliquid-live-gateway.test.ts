import assert from "node:assert/strict";
import { test } from "node:test";

import { fetchHyperliquidBars } from "../src/adapters/hyperliquid";

const runLiveGatewayTest = process.env.OPENTOOL_LIVE_GATEWAY_TEST === "1";
const gatewayBase = process.env.OPENPOND_GATEWAY_URL ?? "https://gateway.openpond.dev";

test(
  "live gateway smoke: fetchHyperliquidBars returns normalized bar rows",
  { skip: !runLiveGatewayTest },
  async () => {
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
  },
);

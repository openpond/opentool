import assert from "node:assert/strict";
import { test } from "node:test";

import {
  computeHyperliquidMarketIocLimitPrice,
  resolveHyperliquidAbstractionFromMode,
} from "../src/adapters/hyperliquid/base";

test("resolveHyperliquidAbstractionFromMode maps product modes to API values", () => {
  assert.equal(resolveHyperliquidAbstractionFromMode("standard"), "disabled");
  assert.equal(resolveHyperliquidAbstractionFromMode("unified"), "unifiedAccount");
  assert.equal(resolveHyperliquidAbstractionFromMode("portfolio"), "portfolioMargin");
});

test("computeHyperliquidMarketIocLimitPrice applies slippage bps and rounds", () => {
  assert.equal(
    computeHyperliquidMarketIocLimitPrice({
      markPrice: 100,
      side: "buy",
      slippageBps: 30,
      decimals: 6,
    }),
    "100.3"
  );

  assert.equal(
    computeHyperliquidMarketIocLimitPrice({
      markPrice: 100,
      side: "sell",
      slippageBps: 30,
      decimals: 6,
    }),
    "99.7"
  );
});

test("computeHyperliquidMarketIocLimitPrice rejects invalid inputs", () => {
  assert.throws(() =>
    computeHyperliquidMarketIocLimitPrice({
      markPrice: 0,
      side: "buy",
    })
  );

  assert.throws(() =>
    computeHyperliquidMarketIocLimitPrice({
      markPrice: 100,
      side: "buy",
      slippageBps: -1,
    })
  );
});


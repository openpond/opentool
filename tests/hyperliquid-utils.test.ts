import assert from "node:assert/strict";
import { test } from "node:test";

import {
  HyperliquidApiError,
  buildHyperliquidProfileAssets,
  extractHyperliquidDex,
  extractHyperliquidOrderIds,
  fetchHyperliquidBars,
  normalizeHyperliquidIndicatorBars,
  formatHyperliquidPrice,
  formatHyperliquidSize,
  formatHyperliquidMarketablePrice,
  formatHyperliquidOrderSize,
  normalizeHyperliquidMetaSymbol,
  parseSpotPairSymbol,
  clampHyperliquidAbs,
  normalizeHyperliquidDcaEntries,
  normalizeHyperliquidBaseSymbol,
  planHyperliquidTrade,
  readHyperliquidAccountValue,
  readHyperliquidPerpPositionSize,
  resolveHyperliquidBudgetUsd,
  resolveHyperliquidChainConfig,
  resolveHyperliquidDcaSymbolEntries,
  resolveHyperliquidErrorDetail,
  resolveHyperliquidLeverageMode,
  resolveHyperliquidMaxPerRunUsd,
  resolveHyperliquidOrderSymbol,
  resolveHyperliquidOrderRef,
  resolveHyperliquidPerpSymbol,
  resolveHyperliquidPair,
  resolveHyperliquidCadenceCron,
  resolveHyperliquidCadenceFromResolution,
  resolveHyperliquidSpotSymbol,
  resolveHyperliquidSymbol,
  resolveHyperliquidScheduleEvery,
  resolveHyperliquidScheduleUnit,
  resolveHyperliquidIntervalCron,
  resolveSpotMidCandidates,
  resolveSpotTokenCandidates,
  roundHyperliquidPriceToTick,
  clampHyperliquidInt,
  clampHyperliquidFloat,
  parseHyperliquidJson,
  resolveHyperliquidTargetSize,
  resolveHyperliquidStoreNetwork,
} from "../src/adapters/hyperliquid";

test("resolveHyperliquidChainConfig maps environment to chain + rpc env", () => {
  const main = resolveHyperliquidChainConfig("mainnet", {
    ARBITRUM_RPC_URL: "https://arb",
  });
  assert.equal(main.chain, "arbitrum");
  assert.equal(main.rpcUrl, "https://arb");

  const testnet = resolveHyperliquidChainConfig("testnet", {
    ARBITRUM_SEPOLIA_RPC_URL: "https://arb-sepolia",
  });
  assert.equal(testnet.chain, "arbitrum-sepolia");
  assert.equal(testnet.rpcUrl, "https://arb-sepolia");

  assert.equal(resolveHyperliquidStoreNetwork("mainnet"), "hyperliquid");
  assert.equal(resolveHyperliquidStoreNetwork("testnet"), "hyperliquid-testnet");
});

test("shared utility helpers parse and clamp config values", () => {
  assert.deepEqual(parseHyperliquidJson("{\"ok\":true}"), { ok: true });
  assert.equal(parseHyperliquidJson("{"), null);
  assert.equal(clampHyperliquidInt("10", 1, 20, 5), 10);
  assert.equal(clampHyperliquidInt("bad", 1, 20, 5), 5);
  assert.equal(clampHyperliquidFloat("1.25", 0, 10, 2), 1.25);
  assert.equal(clampHyperliquidFloat(null, 0, 10, 2), 2);
  assert.equal(resolveHyperliquidScheduleEvery(90, { min: 1, max: 59, fallback: 1 }), 59);
  assert.equal(resolveHyperliquidScheduleUnit("minutes"), "minutes");
  assert.equal(resolveHyperliquidScheduleUnit("nope"), "hours");
  assert.equal(resolveHyperliquidIntervalCron(5, "minutes"), "*/5 * * * *");
  assert.equal(resolveHyperliquidIntervalCron(2, "hours"), "0 */2 * * *");
  assert.equal(resolveHyperliquidCadenceCron("hourly", 4), "0 */4 * * *");
  assert.deepEqual(resolveHyperliquidCadenceFromResolution("240"), {
    cadence: "hourly",
    hourlyInterval: 4,
  });
});

test("symbol helpers normalize perp and spot symbols consistently", () => {
  assert.equal(extractHyperliquidDex("hl:btc"), "hl");
  assert.equal(normalizeHyperliquidBaseSymbol("btc-usdc"), "BTC");
  assert.equal(normalizeHyperliquidBaseSymbol("xyz:sol"), "SOL");
  assert.equal(normalizeHyperliquidMetaSymbol("hl:eth-usdc"), "eth");
  assert.equal(resolveHyperliquidPair("btc-usdc"), "BTC/USDC");
  assert.equal(resolveHyperliquidPair("hl:eth-usdc"), "ETH/USDC");
  assert.equal(resolveHyperliquidPerpSymbol("hl:eth-usdc"), "hl:ETH");
  assert.equal(resolveHyperliquidSymbol("hl:eth-usdc"), "hl:ETH");
  assert.equal(resolveHyperliquidSymbol("btc-usdc"), "BTC/USDC");
  assert.deepEqual(resolveHyperliquidSpotSymbol("eth"), {
    symbol: "ETH/USDC",
    base: "ETH",
    quote: "USDC",
  });
  assert.equal(resolveHyperliquidLeverageMode("hl:BTC"), "isolated");
  assert.equal(resolveHyperliquidLeverageMode("BTC"), "cross");
  assert.equal(resolveHyperliquidOrderSymbol("btc-usdc"), "BTC/USDC");
  assert.equal(resolveHyperliquidOrderSymbol("xyz:sol"), "xyz:SOL");
  assert.equal(resolveHyperliquidOrderSymbol("@123"), "@123");
  assert.deepEqual(parseSpotPairSymbol("btc/usdc"), { base: "BTC", quote: "USDC" });
  assert.deepEqual(resolveSpotMidCandidates("UBTC"), ["UBTC", "BTC"]);
  assert.deepEqual(resolveSpotTokenCandidates("UBTC0"), ["UBTC", "BTC"]);
});

test("shared target sizing helper supports fixed and percent modes", () => {
  assert.deepEqual(
    resolveHyperliquidTargetSize({
      config: {
        allocationMode: "fixed",
        amountUsd: 200,
        percentOfEquity: 2,
        maxPercentOfEquity: 10,
      },
      execution: {},
      accountValue: null,
      currentPrice: 100,
    }),
    { targetSize: 2, budgetUsd: 200 },
  );

  assert.deepEqual(
    resolveHyperliquidTargetSize({
      config: {
        allocationMode: "percent_equity",
        amountUsd: 200,
        percentOfEquity: 2,
        maxPercentOfEquity: 10,
      },
      execution: {},
      accountValue: 1000,
      currentPrice: 100,
    }),
    { targetSize: 0.2, budgetUsd: 20 },
  );
});

test("shared dca/budget helpers parse and normalize reusable strategy inputs", () => {
  assert.equal(
    resolveHyperliquidBudgetUsd({
      config: {
        allocationMode: "fixed",
        amountUsd: 150,
        percentOfEquity: 2,
        maxPercentOfEquity: 10,
      },
      accountValue: null,
    }),
    150,
  );
  assert.equal(
    resolveHyperliquidBudgetUsd({
      config: {
        allocationMode: "percent_equity",
        amountUsd: 0,
        percentOfEquity: 5,
        maxPercentOfEquity: 20,
      },
      accountValue: 1000,
    }),
    50,
  );

  assert.deepEqual(
    resolveHyperliquidDcaSymbolEntries(["BTC:2", "ETH", { symbol: "SOL", weight: 3 }], "BTC"),
    [
      { symbol: "BTC", weight: 2 },
      { symbol: "ETH", weight: 1 },
      { symbol: "SOL", weight: 3 },
    ],
  );

  const normalized = normalizeHyperliquidDcaEntries({
    entries: [
      { symbol: "btc", weight: 2 },
      { symbol: "BTC", weight: 1 },
      { symbol: "ETH", weight: 1 },
    ],
    fallbackSymbol: "BTC",
  });
  assert.equal(normalized.length, 2);
  assert.equal(normalized[0]?.weight, 3);
  assert.equal(normalized[1]?.weight, 1);
  assert.equal(Math.round((normalized[0]?.normalizedWeight ?? 0) * 100), 75);
  assert.equal(Math.round((normalized[1]?.normalizedWeight ?? 0) * 100), 25);

  assert.equal(resolveHyperliquidMaxPerRunUsd(1000, 1.5), 1500);
  assert.equal(clampHyperliquidAbs(-30, 10), -10);
  assert.equal(clampHyperliquidAbs(30, 10), 10);
});

test("shared trade planner handles long-only and long-short modes", () => {
  assert.deepEqual(
    planHyperliquidTrade({
      signal: "buy",
      mode: "long-only",
      currentSize: 0,
      targetSize: 1,
    }),
    { side: "buy", size: 1, reduceOnly: false, targetSize: 1 },
  );

  assert.deepEqual(
    planHyperliquidTrade({
      signal: "sell",
      mode: "long-only",
      currentSize: 1,
      targetSize: 1,
    }),
    { side: "sell", size: 1, reduceOnly: true, targetSize: 0 },
  );

  assert.deepEqual(
    planHyperliquidTrade({
      signal: "sell",
      mode: "long-short",
      currentSize: 1,
      targetSize: 0.5,
    }),
    { side: "sell", size: 1.5, reduceOnly: false, targetSize: -0.5 },
  );
});

test("order utils format sizes/prices and extract ids", () => {
  assert.equal(formatHyperliquidOrderSize(1.23456, 3), "1.234");
  assert.equal(
    formatHyperliquidMarketablePrice({
      mid: 100,
      side: "buy",
      slippageBps: 50,
    }),
    "101"
  );

  const ids = extractHyperliquidOrderIds([
    {
      response: {
        data: {
          statuses: [
            { resting: { oid: 1, cloid: "0xabc" } },
            { filled: { oid: 2, cloid: "0xdef" } },
          ],
        },
      },
    },
  ]);

  assert.deepEqual(ids.cloids.sort(), ["0xabc", "0xdef"]);
  assert.deepEqual(ids.oids.sort(), ["1", "2"]);

  const orderRef = resolveHyperliquidOrderRef({
    response: {
      response: {
        data: {
          statuses: [{ filled: { oid: 5, cloid: "0xfeed" } }],
        },
      },
    },
  });
  assert.equal(orderRef, "0xfeed");

  const detail = resolveHyperliquidErrorDetail(
    new HyperliquidApiError("failed", { reason: "bad-order" }),
  );
  assert.deepEqual(detail, { reason: "bad-order" });
});

test("canonical price/size format helpers enforce hyperliquid constraints", () => {
  assert.equal(formatHyperliquidPrice("12345.6789", 2, "perp"), "12345");
  assert.equal(formatHyperliquidPrice("0.0000123456789", 0, "spot"), "0.00001234");
  assert.equal(formatHyperliquidSize("1.23456789", 5), "1.23456");
  assert.equal(
    roundHyperliquidPriceToTick(100.123, { tickSizeInt: 5n, tickDecimals: 2 }, "buy"),
    "100.15",
  );
  assert.throws(() => formatHyperliquidSize("0.0000001", 5));
});

test("state readers handle account value and position matching", () => {
  const accountValue = readHyperliquidAccountValue({
    data: { marginSummary: { accountValue: "123.45" } },
  });
  assert.equal(accountValue, 123.45);

  const payload = {
    data: {
      assetPositions: [
        { position: { coin: "BTC-PERP", szi: "0.25" } },
        { position: { coin: "ETH", szi: "1" } },
      ],
    },
  };

  assert.equal(readHyperliquidPerpPositionSize(payload, "BTC", { prefixMatch: true }), 0.25);
  assert.equal(readHyperliquidPerpPositionSize(payload, "BTC", { prefixMatch: false }), 0);
});

test("fetchHyperliquidBars normalizes symbol and filters invalid rows", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  globalThis.fetch = (async (input: URL | RequestInfo) => {
    capturedUrl = String(input);
    return {
      ok: true,
      json: async () => ({
        bars: [
          { time: 1700000000, close: 100.5 },
          { time: 1700000100, close: "bad" },
          { time: "bad", close: 101.5 },
        ],
      }),
    } as unknown as Response;
  }) as typeof fetch;

  try {
    const bars = await fetchHyperliquidBars({
      symbol: "hl:btc",
      resolution: "60",
      countBack: 100,
      fromSeconds: 1000,
      toSeconds: 2000,
      gatewayBase: "https://gateway.example/",
    });

    const url = new URL(capturedUrl);
    assert.equal(url.origin + url.pathname, "https://gateway.example/v1/hyperliquid/bars");
    assert.equal(url.searchParams.get("symbol"), "hl:BTC");
    assert.equal(url.searchParams.get("resolution"), "60");
    assert.equal(url.searchParams.get("countBack"), "100");
    assert.equal(url.searchParams.get("from"), "1000");
    assert.equal(url.searchParams.get("to"), "2000");
    assert.equal(bars.length, 1);
    assert.equal(bars[0]?.close, 100.5);
    const indicatorBars = normalizeHyperliquidIndicatorBars([
      ...bars,
      { time: 1700000200, close: 101.5 },
    ]);
    assert.equal(indicatorBars.length, 2);
    assert.equal(indicatorBars[0]?.high, 100.5);
    assert.equal(indicatorBars[1]?.volume, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("fetchHyperliquidBars falls back to production gateway when unset", async () => {
  const originalFetch = globalThis.fetch;
  const originalGatewayEnv = process.env.OPENPOND_GATEWAY_URL;
  let capturedUrl = "";
  delete process.env.OPENPOND_GATEWAY_URL;

  globalThis.fetch = (async (input: URL | RequestInfo) => {
    capturedUrl = String(input);
    return {
      ok: true,
      json: async () => ({ bars: [{ time: 1700000000, close: 100 }] }),
    } as unknown as Response;
  }) as typeof fetch;

  try {
    const bars = await fetchHyperliquidBars({
      symbol: "hl:btc",
      resolution: "60",
      countBack: 10,
    });
    assert.equal(bars.length, 1);
    const url = new URL(capturedUrl);
    assert.equal(url.origin + url.pathname, "https://gateway.openpond.dev/v1/hyperliquid/bars");
  } finally {
    if (typeof originalGatewayEnv === "string") {
      process.env.OPENPOND_GATEWAY_URL = originalGatewayEnv;
    } else {
      delete process.env.OPENPOND_GATEWAY_URL;
    }
    globalThis.fetch = originalFetch;
  }
});

test("profile asset builder normalizes symbols and optional metadata", () => {
  const assets = buildHyperliquidProfileAssets({
    environment: "testnet",
    assets: [
      {
        assetSymbols: ["hl:btc-usdc", "  eth "],
        leverage: 5,
        walletAddress: " 0xabc ",
      },
    ],
  });

  assert.equal(assets.length, 1);
  assert.deepEqual(assets[0], {
    venue: "hyperliquid",
    chain: "hyperliquid-testnet",
    assetSymbols: ["BTC", "ETH"],
    leverage: 5,
    walletAddress: "0xabc",
  });
});

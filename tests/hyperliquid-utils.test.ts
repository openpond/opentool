import assert from "node:assert/strict";
import { test } from "node:test";

import {
  HYPERLIQUID_HIP3_DEXES,
  HyperliquidApiError,
  buildHyperliquidMarketDescriptor,
  buildHyperliquidProfileAssets,
  extractHyperliquidDex,
  estimateHyperliquidLiquidationPrice,
  extractHyperliquidOrderIds,
  fetchHyperliquidActiveAsset,
  fetchHyperliquidFrontendOpenOrdersAcrossDexes,
  fetchHyperliquidOpenOrdersAcrossDexes,
  fetchHyperliquidBars,
  formatHyperliquidPrice,
  formatHyperliquidSize,
  formatHyperliquidMarketablePrice,
  formatHyperliquidOrderSize,
  isHyperliquidSpotSymbol,
  normalizeHyperliquidMetaSymbol,
  parseHyperliquidSymbol,
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
  fetchHyperliquidResolvedMarketDescriptor,
  resolveHyperliquidMarketDataCoin,
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
  supportsHyperliquidBuilderFee,
  roundHyperliquidPriceToTick,
  clampHyperliquidInt,
  clampHyperliquidFloat,
  parseHyperliquidJson,
  getKnownHyperliquidDexes,
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

test("clamp helpers enforce boundaries and handle invalid numeric inputs", () => {
  assert.equal(clampHyperliquidInt(undefined, 1, 10, 7), 7);
  assert.equal(clampHyperliquidInt("", 1, 10, 7), 7);
  assert.equal(clampHyperliquidInt("  ", 1, 10, 7), 7);
  assert.equal(clampHyperliquidInt("1.99", 1, 10, 7), 1);
  assert.equal(clampHyperliquidInt(-100, 1, 10, 7), 1);
  assert.equal(clampHyperliquidInt(100, 1, 10, 7), 10);
  assert.equal(clampHyperliquidInt(Number.NaN, 1, 10, 7), 7);
  assert.equal(clampHyperliquidInt(Number.POSITIVE_INFINITY, 1, 10, 7), 7);

  assert.equal(clampHyperliquidFloat(undefined, 0, 5, 2), 2);
  assert.equal(clampHyperliquidFloat("", 0, 5, 2), 2);
  assert.equal(clampHyperliquidFloat("  ", 0, 5, 2), 2);
  assert.equal(clampHyperliquidFloat(-1, 0, 5, 2), 0);
  assert.equal(clampHyperliquidFloat(9.9, 0, 5, 2), 5);
  assert.equal(clampHyperliquidFloat("3.25", 0, 5, 2), 3.25);
  assert.equal(clampHyperliquidFloat(Number.NaN, 0, 5, 2), 2);
  assert.equal(clampHyperliquidFloat(Number.NEGATIVE_INFINITY, 0, 5, 2), 2);
});

test("schedule helpers compose clamping with cron generation", () => {
  const everyMin = resolveHyperliquidScheduleEvery(0, { min: 1, max: 59, fallback: 1 });
  assert.equal(everyMin, 1);
  assert.equal(resolveHyperliquidIntervalCron(everyMin, "minutes"), "* * * * *");

  const everyMax = resolveHyperliquidScheduleEvery(120, { min: 1, max: 59, fallback: 1 });
  assert.equal(everyMax, 59);
  assert.equal(resolveHyperliquidIntervalCron(everyMax, "minutes"), "*/59 * * * *");

  assert.equal(resolveHyperliquidScheduleUnit("bad-unit", "minutes"), "minutes");
  assert.equal(resolveHyperliquidCadenceCron("hourly", 25), "0 */24 * * *");
  assert.equal(resolveHyperliquidCadenceCron("hourly", "not-a-number"), "0 * * * *");
  assert.equal(resolveHyperliquidCadenceCron("daily", 8), "0 8 * * *");
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
  assert.equal(resolveHyperliquidMarketDataCoin("SOL-USDC"), "SOL/USDC");
  assert.equal(resolveHyperliquidMarketDataCoin("PURR/USDC"), "PURR/USDC");
  assert.equal(resolveHyperliquidMarketDataCoin("xyz:GOLD"), "xyz:GOLD");
  assert.equal(resolveHyperliquidMarketDataCoin("@107"), "@107");
  assert.deepEqual(parseSpotPairSymbol("btc/usdc"), { base: "BTC", quote: "USDC" });
  assert.deepEqual(resolveSpotMidCandidates("UBTC"), ["UBTC", "BTC"]);
  assert.deepEqual(resolveSpotTokenCandidates("UBTC0"), ["UBTC", "BTC"]);
  assert.equal(isHyperliquidSpotSymbol("SOL-USDC"), true);
  assert.equal(supportsHyperliquidBuilderFee({ symbol: "BTC", side: "buy" }), true);
  assert.equal(supportsHyperliquidBuilderFee({ symbol: "PURR-USDC", side: "buy" }), false);
  assert.equal(supportsHyperliquidBuilderFee({ symbol: "PURR-USDC", side: "sell" }), true);
});

test("parseHyperliquidSymbol returns canonical descriptors for perp, spot, dex, and spot index", () => {
  assert.deepEqual(parseHyperliquidSymbol("BTC"), {
    raw: "BTC",
    kind: "perp",
    normalized: "BTC",
    routeTicker: "BTC",
    displaySymbol: "BTC-USDC",
    base: "BTC",
    quote: null,
    pair: null,
    dex: null,
    leverageMode: "cross",
  });
  assert.deepEqual(parseHyperliquidSymbol("HYPE-USDC"), {
    raw: "HYPE-USDC",
    kind: "spot",
    normalized: "HYPE/USDC",
    routeTicker: "HYPE-USDC",
    displaySymbol: "HYPE-USDC",
    base: "HYPE",
    quote: "USDC",
    pair: "HYPE/USDC",
    dex: null,
    leverageMode: "cross",
  });
  assert.deepEqual(parseHyperliquidSymbol("xyz:BTC-USDC"), {
    raw: "xyz:BTC-USDC",
    kind: "perp",
    normalized: "xyz:BTC",
    routeTicker: "xyz:BTC",
    displaySymbol: "XYZ:BTC-USDC",
    base: "BTC",
    quote: null,
    pair: null,
    dex: "xyz",
    leverageMode: "isolated",
  });
  assert.deepEqual(parseHyperliquidSymbol("@107"), {
    raw: "@107",
    kind: "spotIndex",
    normalized: "@107",
    routeTicker: "@107",
    displaySymbol: "@107",
    base: null,
    quote: null,
    pair: null,
    dex: null,
    leverageMode: "cross",
  });
  assert.deepEqual(parseHyperliquidSymbol("kPEPE"), {
    raw: "kPEPE",
    kind: "perp",
    normalized: "kPEPE",
    routeTicker: "kPEPE",
    displaySymbol: "kPEPE-USDC",
    base: "kPEPE",
    quote: null,
    pair: null,
    dex: null,
    leverageMode: "cross",
  });
});

test("symbol helpers handle empty/unknown variants consistently", () => {
  assert.equal(normalizeHyperliquidBaseSymbol("UNKNOWN"), null);
  assert.equal(normalizeHyperliquidBaseSymbol("  "), null);
  assert.equal(resolveHyperliquidPair("BTC"), null);
  assert.equal(resolveHyperliquidOrderSymbol("  "), null);
  assert.equal(resolveHyperliquidOrderSymbol(null), null);
  assert.equal(resolveHyperliquidSymbol(""), "");
  assert.equal(parseSpotPairSymbol("BTC"), null);
});

test("symbol helpers preserve canonical mixed-case symbols", () => {
  assert.equal(normalizeHyperliquidBaseSymbol("kPEPE"), "kPEPE");
  assert.equal(resolveHyperliquidOrderSymbol("kPEPE"), "kPEPE");
  assert.equal(resolveHyperliquidMarketDataCoin("kPEPE"), "kPEPE");
  assert.equal(resolveHyperliquidOrderSymbol("cash:USA500"), "cash:USA500");
  assert.equal(resolveHyperliquidMarketDataCoin("cash:USA500"), "cash:USA500");
  assert.equal(resolveHyperliquidPair("HYPE-USDT0"), "HYPE/USDT0");
  assert.equal(resolveHyperliquidPair("HYPE/USDE"), "HYPE/USDE");
});

test("resolved market descriptor separates spot order symbol from spot market-data coin", async () => {
  const descriptor = await fetchHyperliquidResolvedMarketDescriptor({
    environment: "mainnet",
    symbol: "HYPE-USDC",
  });
  assert.equal(descriptor.kind, "spot");
  assert.equal(descriptor.routeTicker, "HYPE-USDC");
  assert.equal(descriptor.orderSymbol, "HYPE/USDC");
  assert.equal(descriptor.marketDataCoin, "@107");
  assert.equal(descriptor.spotIndex, 107);
  assert.equal(descriptor.canonicalPair, "HYPE/USDC");
});

test("buildHyperliquidMarketDescriptor applies metadata-aware quote assets for HIP-3 perps", () => {
  const descriptor = buildHyperliquidMarketDescriptor({
    symbol: "hyna:BTC",
    quote: "USDE",
  });
  assert.ok(descriptor);
  assert.equal(descriptor?.kind, "perp");
  assert.equal(descriptor?.normalized, "hyna:BTC");
  assert.equal(descriptor?.orderSymbol, "hyna:BTC");
  assert.equal(descriptor?.marketDataCoin, "hyna:BTC");
  assert.equal(descriptor?.displaySymbol, "BTC-USDE");
  assert.equal(descriptor?.canonicalPair, "BTC/USDE");
  assert.equal(descriptor?.routeTicker, "hyna:BTC");
});

test("buildHyperliquidMarketDescriptor does not invent USDC for raw HIP-3 symbols without metadata", () => {
  const descriptor = buildHyperliquidMarketDescriptor({
    symbol: "xyz:GOLD",
  });
  assert.ok(descriptor);
  assert.equal(descriptor?.displaySymbol, "GOLD");
  assert.equal(descriptor?.canonicalPair, null);
});

test("known dex helper returns HIP-3 dexes only on mainnet", () => {
  assert.deepEqual(getKnownHyperliquidDexes("mainnet"), [...HYPERLIQUID_HIP3_DEXES]);
  assert.deepEqual(getKnownHyperliquidDexes("testnet"), []);
});

test("open order aggregation merges primary and dex-scoped open orders", async (t) => {
  const originalFetch = globalThis.fetch;
  const seenBodies: Array<Record<string, unknown>> = [];
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    seenBodies.push(body);
    const dex = typeof body.dex === "string" ? body.dex : null;
    const payload =
      body.type === "frontendOpenOrders"
        ? dex === "xyz"
          ? [{ oid: 2, cloid: "0xxyz", coin: "xyz:GOLD" }]
          : [{ oid: 1, cloid: "0xbase", coin: "BTC" }]
        : dex === "xyz"
          ? [{ oid: 2, cloid: "0xxyz", coin: "xyz:GOLD" }]
          : [{ oid: 1, cloid: "0xbase", coin: "BTC" }, { oid: 2, cloid: "0xxyz", coin: "xyz:GOLD" }];
    return new Response(JSON.stringify(payload), { status: 200 });
  }) as typeof globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const openOrders = await fetchHyperliquidOpenOrdersAcrossDexes({
    environment: "mainnet",
    user: "0x0000000000000000000000000000000000000001",
    dexes: ["xyz"],
  });
  assert.equal(openOrders.length, 2);
  assert.deepEqual(
    seenBodies.map((body) => body.dex ?? null),
    [null, "xyz"],
  );

  seenBodies.length = 0;
  const frontendOrders = await fetchHyperliquidFrontendOpenOrdersAcrossDexes({
    environment: "mainnet",
    user: "0x0000000000000000000000000000000000000001",
    dexes: ["xyz"],
  });
  assert.equal(frontendOrders.length, 2);
  assert.deepEqual(
    seenBodies.map((body) => body.dex ?? null),
    [null, "xyz"],
  );
});

test("active asset helper resolves canonical order symbol before request", async (t) => {
  const originalFetch = globalThis.fetch;
  let seenBody: Record<string, unknown> | null = null;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    seenBody = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    return new Response(
      JSON.stringify({
        leverage: { value: "5", type: "cross" },
      }),
      { status: 200 },
    );
  }) as typeof globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const asset = await fetchHyperliquidActiveAsset({
    environment: "mainnet",
    user: "0x0000000000000000000000000000000000000001",
    symbol: "xyz:GOLD-USDC",
  });
  assert.equal(seenBody?.type, "activeAssetData");
  assert.equal(seenBody?.coin, "xyz:GOLD");
  assert.equal(asset.coin, "xyz:GOLD");
  assert.equal(asset.leverage, 5);
  assert.equal(asset.leverageType, "cross");
});

test("marketable price helpers keep directional rounding and tick alignment", () => {
  assert.equal(
    formatHyperliquidMarketablePrice({
      mid: 1.11111,
      side: "buy",
      slippageBps: 30,
    }),
    "1.11445",
  );
  assert.equal(
    formatHyperliquidMarketablePrice({
      mid: 1.11111,
      side: "sell",
      slippageBps: 30,
    }),
    "1.10777",
  );
  assert.equal(
    roundHyperliquidPriceToTick("1.11441", { tickSizeInt: 5n, tickDecimals: 4 }, "buy"),
    "1.1145",
  );
  assert.equal(
    roundHyperliquidPriceToTick("1.11449", { tickSizeInt: 5n, tickDecimals: 4 }, "sell"),
    "1.114",
  );
});

test("estimateHyperliquidLiquidationPrice uses asset max leverage and mode-aware collateral", () => {
  const isolatedLong = estimateHyperliquidLiquidationPrice({
    entryPrice: 2000,
    side: "buy",
    notionalUsd: 100,
    leverage: 5,
    maxLeverage: 20,
    marginMode: "isolated",
  });
  const crossLong = estimateHyperliquidLiquidationPrice({
    entryPrice: 2000,
    side: "buy",
    notionalUsd: 100,
    leverage: 5,
    maxLeverage: 20,
    marginMode: "cross",
    availableCollateralUsd: 60,
  });
  const isolatedShort = estimateHyperliquidLiquidationPrice({
    entryPrice: 2000,
    side: "sell",
    notionalUsd: 100,
    leverage: 5,
    maxLeverage: 20,
    marginMode: "isolated",
  });

  assert.ok(isolatedLong != null);
  assert.ok(crossLong != null);
  assert.ok(isolatedShort != null);
  assert.ok((crossLong as number) < (isolatedLong as number));
  assert.ok((isolatedShort as number) > 2000);
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

test("fetchHyperliquidBars clamps query params and rejects invalid countBack", async () => {
  await assert.rejects(
    () =>
      fetchHyperliquidBars({
        symbol: "BTC",
        resolution: "60",
        countBack: Number.NaN,
      }),
    /countBack must be a positive integer/,
  );
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

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  extractHyperliquidOrderIds,
  fetchHyperliquidBars,
  formatHyperliquidPrice,
  formatHyperliquidSize,
  formatHyperliquidMarketablePrice,
  formatHyperliquidOrderSize,
  normalizeHyperliquidBaseSymbol,
  readHyperliquidAccountValue,
  readHyperliquidPerpPositionSize,
  resolveHyperliquidChainConfig,
  resolveHyperliquidOrderSymbol,
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

test("symbol helpers normalize perp and spot symbols consistently", () => {
  assert.equal(normalizeHyperliquidBaseSymbol("btc-usdc"), "BTC");
  assert.equal(normalizeHyperliquidBaseSymbol("xyz:sol"), "SOL");
  assert.equal(resolveHyperliquidOrderSymbol("btc-usdc"), "BTC/USDC");
  assert.equal(resolveHyperliquidOrderSymbol("xyz:sol"), "xyz:SOL");
  assert.equal(resolveHyperliquidOrderSymbol("@123"), "@123");
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
});

test("canonical price/size format helpers enforce hyperliquid constraints", () => {
  assert.equal(formatHyperliquidPrice("12345.6789", 2, "perp"), "12345");
  assert.equal(formatHyperliquidPrice("0.0000123456789", 0, "spot"), "0.00001234");
  assert.equal(formatHyperliquidSize("1.23456789", 5), "1.23456");
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
  } finally {
    globalThis.fetch = originalFetch;
  }
});

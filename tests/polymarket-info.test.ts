import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fetchPolymarketMarket,
  fetchPolymarketMarkets,
} from "../src/adapters/polymarket/info";

function withMockFetch(
  handler: (url: string, init?: RequestInit) => Promise<Response>
) {
  const original = globalThis.fetch;
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    return handler(url, init);
  };
  return () => {
    globalThis.fetch = original;
  };
}

test("fetchPolymarketMarkets enforces active/closed and normalizes fields", async () => {
  const restore = withMockFetch(async (url) => {
    assert.ok(url.includes("active=true"));
    assert.ok(url.includes("closed=false"));
    const payload = [
      {
        id: 1,
        slug: "event-1",
        category: "Crypto",
        tags: [{ label: "Crypto" }],
        markets: [
          {
            id: "10",
            slug: "market-1",
            question: "Example?",
            outcomes: "[\"Yes\", \"No\"]",
            outcomePrices: "[0.4, 0.6]",
            clobTokenIds: "[\"1\", \"2\"]",
            icon: "https://example.com/icon.png",
            image: "https://example.com/image.png",
          },
        ],
      },
    ];
    return new Response(JSON.stringify(payload), { status: 200 });
  });

  try {
    const markets = await fetchPolymarketMarkets({ limit: 1 });
    assert.equal(markets.length, 1);
    const market = markets[0];
    assert.equal(market.slug, "market-1");
    assert.deepEqual(market.outcomes, ["Yes", "No"]);
    assert.deepEqual(market.outcomePrices, [0.4, 0.6]);
    assert.deepEqual(market.clobTokenIds, ["1", "2"]);
    assert.equal(market.icon, "https://example.com/icon.png");
    assert.equal(market.image, "https://example.com/image.png");
  } finally {
    restore();
  }
});

test("fetchPolymarketMarket uses slug endpoint", async () => {
  const restore = withMockFetch(async (url) => {
    assert.ok(url.includes("/markets/slug/test-market"));
    const payload = {
      id: "123",
      slug: "test-market",
      question: "Test",
    };
    return new Response(JSON.stringify(payload), { status: 200 });
  });

  try {
    const market = await fetchPolymarketMarket({ slug: "test-market" });
    assert.ok(market);
    assert.equal(market?.id, "123");
  } finally {
    restore();
  }
});

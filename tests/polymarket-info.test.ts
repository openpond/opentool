import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fetchPolymarketActivity,
  fetchPolymarketClosedPositions,
  fetchPolymarketMarket,
  fetchPolymarketMarkets,
  fetchPolymarketPositions,
  fetchPolymarketPositionValue,
  fetchPolymarketPublicProfile,
  PolymarketInfoClient,
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

test("fetchPolymarketPositions encodes user filters and normalizes account fields", async () => {
  const restore = withMockFetch(async (url) => {
    assert.ok(url.includes("/positions"));
    assert.ok(url.includes("user=0xabc"));
    assert.ok(url.includes("market=0xcondition1%2C0xcondition2"));
    assert.ok(url.includes("sortBy=PRICE"));
    assert.ok(url.includes("sortDirection=ASC"));
    assert.ok(url.includes("redeemable=true"));
    const payload = [
      {
        proxyWallet: "0xabc",
        asset: "123",
        conditionId: "0xcondition1",
        size: 10,
        avgPrice: 0.42,
        currentValue: 4.4,
        redeemable: true,
        title: "Example market",
        outcome: "Yes",
        negativeRisk: false,
      },
    ];
    return new Response(JSON.stringify(payload), { status: 200 });
  });

  try {
    const positions = await fetchPolymarketPositions({
      user: "0xabc",
      market: ["0xcondition1", "0xcondition2"],
      redeemable: true,
      sortBy: "PRICE",
      sortDirection: "ASC",
    });
    assert.equal(positions.length, 1);
    assert.equal(positions[0]?.proxyWallet, "0xabc");
    assert.equal(positions[0]?.redeemable, true);
    assert.equal(positions[0]?.negativeRisk, false);
    assert.equal(positions[0]?.title, "Example market");
  } finally {
    restore();
  }
});

test("fetchPolymarketClosedPositions and fetchPolymarketActivity build Data API requests", async () => {
  let callCount = 0;
  const restore = withMockFetch(async (url) => {
    callCount += 1;

    if (callCount === 1) {
      assert.ok(url.includes("/closed-positions"));
      assert.ok(url.includes("eventId=123%2C456"));
      assert.ok(url.includes("sortBy=TIMESTAMP"));
      return new Response(
        JSON.stringify([
          {
            proxyWallet: "0xabc",
            conditionId: "0xcondition1",
            realizedPnl: 7.5,
            timestamp: 1700000000,
          },
        ]),
        { status: 200 },
      );
    }

    assert.ok(url.includes("/activity"));
    assert.ok(url.includes("type=TRADE%2CREDEEM"));
    assert.ok(url.includes("side=BUY"));
    return new Response(
      JSON.stringify([
        {
          proxyWallet: "0xabc",
          conditionId: "0xcondition1",
          type: "TRADE",
          side: "BUY",
          usdcSize: 12.5,
        },
      ]),
      { status: 200 },
    );
  });

  try {
    const closed = await fetchPolymarketClosedPositions({
      user: "0xabc",
      eventId: [123, 456],
      sortBy: "TIMESTAMP",
    });
    assert.equal(closed[0]?.realizedPnl, 7.5);
    assert.equal(closed[0]?.timestamp, 1700000000);

    const activity = await fetchPolymarketActivity({
      user: "0xabc",
      type: ["TRADE", "REDEEM"],
      side: "BUY",
    });
    assert.equal(activity[0]?.type, "TRADE");
    assert.equal(activity[0]?.side, "BUY");
    assert.equal(activity[0]?.usdcSize, 12.5);
  } finally {
    restore();
  }
});

test("fetchPolymarketPositionValue and fetchPolymarketPublicProfile normalize auxiliary account endpoints", async () => {
  let callCount = 0;
  const restore = withMockFetch(async (url) => {
    callCount += 1;

    if (callCount === 1) {
      assert.ok(url.includes("/value"));
      assert.ok(url.includes("user=0xabc"));
      return new Response(JSON.stringify([{ user: "0xabc", value: 123.45 }]), { status: 200 });
    }

    assert.ok(url.includes("/public-profile"));
    assert.ok(url.includes("address=0xabc"));
    return new Response(
      JSON.stringify({
        createdAt: 1700000000,
        proxyWallet: "0xproxy",
        pseudonym: "Trader",
        displayUsernamePublic: true,
        users: [{ id: "user-1", creator: true, mod: false }],
      }),
      { status: 200 },
    );
  });

  try {
    const value = await fetchPolymarketPositionValue({ user: "0xabc" });
    assert.equal(value[0]?.value, 123.45);

    const profile = await fetchPolymarketPublicProfile({ address: "0xabc" });
    assert.equal(profile?.proxyWallet, "0xproxy");
    assert.equal(profile?.displayUsernamePublic, true);
    assert.equal(profile?.users?.[0]?.id, "user-1");
  } finally {
    restore();
  }
});

test("PolymarketInfoClient forwards environment to account helpers", async () => {
  const client = new PolymarketInfoClient("testnet");
  const restore = withMockFetch(async (url) => {
    assert.ok(url.startsWith("https://data-api.polymarket.com/activity"));
    return new Response(JSON.stringify([]), { status: 200 });
  });

  try {
    const activity = await client.activity({ user: "0xabc" });
    assert.deepEqual(activity, []);
  } finally {
    restore();
  }
});

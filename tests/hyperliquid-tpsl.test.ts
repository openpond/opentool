import assert from "node:assert/strict";
import { test } from "node:test";

import {
  placeHyperliquidOrderWithTpSl,
  placeHyperliquidPositionTpSl,
} from "../src/adapters/hyperliquid";
import type { WalletFullContext } from "../src/wallet/types";

const mockWallet = {
  address: "0x0000000000000000000000000000000000000001",
  account: {
    address: "0x0000000000000000000000000000000000000001",
    type: "json-rpc",
  },
  walletClient: {
    signTypedData: async () =>
      `0x${"1".repeat(128)}1b`,
  },
  publicClient: {
    getBalance: async () => 0n,
  },
  sendTransaction: async () => "0xabc",
  getNativeBalance: async () => 0n,
  transfer: async () => "0xabc",
} as unknown as WalletFullContext;

type ExchangeBody = {
  action?: {
    grouping?: string;
    orders?: Array<{
      b?: boolean;
      p?: string;
      s?: string;
      r?: boolean;
      c?: string;
      t?: {
        limit?: { tif?: string };
        trigger?: {
          isMarket?: boolean;
          triggerPx?: string;
          tpsl?: string;
        };
      };
    }>;
  };
};

function installFetchMock() {
  const originalFetch = globalThis.fetch;
  const exchangeBodies: ExchangeBody[] = [];

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof _input === "string" ? _input : _input instanceof URL ? _input.toString() : _input.url;
    const bodyText = typeof init?.body === "string" ? init.body : "{}";
    const body = JSON.parse(bodyText) as Record<string, unknown>;

    if (url.endsWith("/exchange")) {
      const exchangeBody = body as ExchangeBody;
      exchangeBodies.push(exchangeBody);
      const orderCount = exchangeBody.action?.orders?.length ?? 0;
      const statuses = Array.from({ length: orderCount }, (_, index) =>
        index === 0
          ? {
              resting: {
                oid: 1000 + index,
                cloid: exchangeBody.action?.orders?.[index]?.c,
              },
            }
          : "waitingForTrigger",
      );
      return new Response(
        JSON.stringify({
          status: "ok",
          response: {
            type: "order",
            data: { statuses },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.endsWith("/info")) {
      if (body.type === "meta") {
        return new Response(
          JSON.stringify({
            universe: [{ name: "ETH", szDecimals: 4 }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      if (body.type === "l2Book") {
        return new Response(
          JSON.stringify({
            levels: [
              [{ px: "2000.2" }],
              [{ px: "1999.8" }],
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
    }

    throw new Error(`Unexpected fetch: ${url} ${bodyText}`);
  }) as typeof globalThis.fetch;

  return {
    exchangeBodies,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

test("placeHyperliquidOrderWithTpSl submits grouped parent and child trigger orders", async () => {
  const { exchangeBodies, restore } = installFetchMock();

  try {
    await placeHyperliquidOrderWithTpSl({
      wallet: mockWallet,
      environment: "testnet",
      nonce: 123,
      referencePrice: 2000,
      parent: {
        symbol: "ETH",
        side: "buy",
        price: "2001",
        size: "0.01",
        tif: "Ioc",
        clientId: "0x10000000000000000000000000000000",
      },
      takeProfit: {
        triggerPx: "2080",
        execution: "market",
        clientId: "0x20000000000000000000000000000000",
      },
      stopLoss: {
        triggerPx: "1940",
        execution: "limit",
        price: "1939.5",
        clientId: "0x30000000000000000000000000000000",
      },
    });

    assert.equal(exchangeBodies.length, 1);
    const body = exchangeBodies[0];
    assert.equal(body.action?.grouping, "normalTpsl");
    assert.equal(body.action?.orders?.length, 3);

    const [parent, takeProfit, stopLoss] = body.action?.orders ?? [];
    assert.equal(parent?.r, false);
    assert.equal(parent?.t?.limit?.tif, "Ioc");

    assert.equal(takeProfit?.r, true);
    assert.equal(takeProfit?.b, false);
    assert.equal(takeProfit?.t?.trigger?.tpsl, "tp");
    assert.equal(takeProfit?.t?.trigger?.isMarket, true);
    assert.equal(takeProfit?.t?.trigger?.triggerPx, "2080");

    assert.equal(stopLoss?.r, true);
    assert.equal(stopLoss?.b, false);
    assert.equal(stopLoss?.t?.trigger?.tpsl, "sl");
    assert.equal(stopLoss?.t?.trigger?.isMarket, false);
    assert.equal(stopLoss?.p, "1939.5");
  } finally {
    restore();
  }
});

test("placeHyperliquidPositionTpSl submits grouped reduce-only trigger orders", async () => {
  const { exchangeBodies, restore } = installFetchMock();

  try {
    await placeHyperliquidPositionTpSl({
      wallet: mockWallet,
      environment: "testnet",
      nonce: 456,
      symbol: "ETH",
      positionSide: "short",
      size: "0.02",
      referencePrice: 2000,
      takeProfit: {
        triggerPx: "1900",
        execution: "market",
      },
      stopLoss: {
        triggerPx: "2050",
        execution: "market",
      },
    });

    assert.equal(exchangeBodies.length, 1);
    const body = exchangeBodies[0];
    assert.equal(body.action?.grouping, "positionTpsl");
    assert.equal(body.action?.orders?.length, 2);
    const [takeProfit, stopLoss] = body.action?.orders ?? [];
    assert.equal(takeProfit?.r, true);
    assert.equal(stopLoss?.r, true);
    assert.equal(takeProfit?.b, true);
    assert.equal(stopLoss?.b, true);
  } finally {
    restore();
  }
});

test("placeHyperliquidOrderWithTpSl rejects invalid long stop loss trigger direction", async () => {
  await assert.rejects(
    () =>
      placeHyperliquidOrderWithTpSl({
        wallet: mockWallet,
        environment: "testnet",
        nonce: 789,
        referencePrice: 2000,
        parent: {
          symbol: "ETH",
          side: "buy",
          price: "2001",
          size: "0.01",
          tif: "Ioc",
        },
        stopLoss: {
          triggerPx: "2010",
          execution: "market",
        },
      }),
    /Stop loss trigger must be below the current price for long positions/i,
  );
});

test("placeHyperliquidOrderWithTpSl rejects reduce-only parent orders", async () => {
  await assert.rejects(
    () =>
      placeHyperliquidOrderWithTpSl({
        wallet: mockWallet,
        environment: "testnet",
        nonce: 790,
        referencePrice: 2000,
        parent: {
          symbol: "ETH",
          side: "sell",
          price: "1999",
          size: "0.01",
          tif: "Ioc",
          reduceOnly: true,
        },
        takeProfit: {
          triggerPx: "1900",
          execution: "market",
        },
      }),
    /Reduce-only parent orders are not supported with attached TP\/SL/i,
  );
});

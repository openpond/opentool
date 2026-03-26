import assert from "node:assert/strict";
import { test } from "node:test";

import {
  approveHyperliquidBuilderFee,
  placeHyperliquidOrder,
  withdrawFromHyperliquid,
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

test("hyperliquid order submission requires nonce source when nonce is omitted", async () => {
  await assert.rejects(
    () =>
      placeHyperliquidOrder({
        wallet: mockWallet,
        environment: "testnet",
        orders: [
          {
            symbol: "BTC",
            side: "buy",
            price: "100",
            size: "1",
          },
        ],
      }),
    /nonce source/i,
  );
});

test("hyperliquid builder approval requires nonce source when nonce is omitted", async () => {
  await assert.rejects(
    () =>
      approveHyperliquidBuilderFee({
        wallet: mockWallet,
        environment: "testnet",
      }),
    /nonce source/i,
  );
});

test("hyperliquid withdraw requires nonce source when nonce is omitted", async () => {
  await assert.rejects(
    () =>
      withdrawFromHyperliquid({
        wallet: mockWallet,
        environment: "testnet",
        amount: "10",
        destination: "0x0000000000000000000000000000000000000002",
      }),
    /nonce source/i,
  );
});

test("hyperliquid spot order submission resolves explicit pair aliases to numeric spot asset ids", async (t) => {
  const originalFetch = globalThis.fetch;
  let exchangeBody: Record<string, unknown> | null = null;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};

    if (url.endsWith("/info") && body.type === "spotMeta") {
      return new Response(
        JSON.stringify({
          universe: [{ name: "HYPE/USDC", tokens: [150, 0], index: 107 }],
          tokens: [
            { name: "USDC", index: 0 },
            { name: "HYPE", index: 150 },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.endsWith("/exchange")) {
      exchangeBody = body;
      return new Response(
        JSON.stringify({
          status: "ok",
          response: {
            type: "order",
            data: {
              statuses: [{ resting: { oid: 1 } }],
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    throw new Error(`Unexpected fetch: ${url} ${JSON.stringify(body)}`);
  }) as typeof globalThis.fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await placeHyperliquidOrder({
    wallet: mockWallet,
    environment: "testnet",
    nonce: 7,
    orders: [
      {
        symbol: "HYPE-USDC",
        side: "buy",
        price: "40",
        size: "1",
      },
    ],
  });

  const action = (exchangeBody?.action as { orders?: Array<{ a?: number }> } | undefined) ?? {};
  assert.equal(action.orders?.[0]?.a, 10107);
});

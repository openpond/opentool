import assert from "node:assert/strict";
import { test } from "node:test";

import { updateHyperliquidLeverage } from "../src/adapters/hyperliquid";
import type { WalletFullContext } from "../src/wallet/types";

const mockWallet = {
  address: "0x0000000000000000000000000000000000000001",
  account: {
    address: "0x0000000000000000000000000000000000000001",
    type: "json-rpc",
  },
  walletClient: {
    signTypedData: async () => `0x${"1".repeat(128)}1b`,
  },
  publicClient: {
    getBalance: async () => 0n,
  },
  sendTransaction: async () => "0xabc",
  getNativeBalance: async () => 0n,
  transfer: async () => "0xabc",
} as unknown as WalletFullContext;

function installExchangeFetchMock(activeAssetStates: Array<{ leverage: string; type: string }>) {
  const originalFetch = globalThis.fetch;
  const infoBodies: Array<Record<string, unknown>> = [];
  const exchangeBodies: Array<Record<string, unknown>> = [];
  let activeAssetIndex = 0;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};

    if (url.endsWith("/exchange")) {
      exchangeBodies.push(body);
      return new Response(JSON.stringify({ status: "ok", response: { type: "default" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (url.endsWith("/info")) {
      infoBodies.push(body);
      if (body.type === "meta") {
        return new Response(JSON.stringify({ universe: [{ name: "ETH" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (body.type === "activeAssetData") {
        const next =
          activeAssetStates[Math.min(activeAssetIndex, activeAssetStates.length - 1)] ??
          activeAssetStates[activeAssetStates.length - 1];
        activeAssetIndex += 1;
        return new Response(
          JSON.stringify({
            leverage: {
              value: next?.leverage ?? "0",
              type: next?.type ?? null,
            },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }
    }

    throw new Error(`Unexpected fetch: ${url} ${JSON.stringify(body)}`);
  }) as typeof globalThis.fetch;

  return {
    exchangeBodies,
    infoBodies,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

test("updateHyperliquidLeverage verifies the applied leverage before returning", async () => {
  const { exchangeBodies, infoBodies, restore } = installExchangeFetchMock([
    { leverage: "10", type: "cross" },
    { leverage: "40", type: "isolated" },
  ]);

  try {
    const response = await updateHyperliquidLeverage({
      wallet: mockWallet,
      environment: "testnet",
      nonce: 101,
      input: {
        symbol: "ETH",
        leverage: 40,
        leverageMode: "isolated",
        verifyAttempts: 2,
        verifyDelayMs: 0,
      },
    });

    assert.equal(response.status, "ok");
    assert.equal(exchangeBodies.length, 1);
    assert.equal(
      infoBodies.filter((body) => body.type === "activeAssetData").length,
      2,
    );
    const activeAssetBodies = infoBodies.filter((body) => body.type === "activeAssetData");
    assert.equal(activeAssetBodies[0]?.user, mockWallet.address.toLowerCase());
    assert.equal(activeAssetBodies[0]?.coin, "ETH");
  } finally {
    restore();
  }
});

test("updateHyperliquidLeverage rejects when Hyperliquid still reports stale leverage", async () => {
  const { restore } = installExchangeFetchMock([
    { leverage: "10", type: "cross" },
    { leverage: "10", type: "cross" },
    { leverage: "10", type: "cross" },
  ]);

  try {
    await assert.rejects(
      () =>
        updateHyperliquidLeverage({
          wallet: mockWallet,
          environment: "testnet",
          nonce: 102,
          input: {
            symbol: "ETH",
            leverage: 40,
            leverageMode: "isolated",
            verifyAttempts: 3,
            verifyDelayMs: 0,
          },
        }),
      /still reports 10x cross for ETH after requesting 40x isolated/i,
    );
  } finally {
    restore();
  }
});

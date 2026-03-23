import assert from "node:assert/strict";
import { test } from "node:test";
import type { WalletFullContext } from "../src/wallet/types";
import { PolymarketAuthError } from "../src/adapters/polymarket/base";
import {
  createOrDerivePolymarketApiKey,
  placePolymarketOrder,
} from "../src/adapters/polymarket/exchange";

function withMockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  const original = globalThis.fetch;
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    return handler(url, init);
  };
  return () => {
    globalThis.fetch = original;
  };
}

function createMockWallet() {
  return {
    address: "0x0000000000000000000000000000000000000001",
    account: {
      address: "0x0000000000000000000000000000000000000001",
      type: "json-rpc",
    },
    walletClient: {
      signTypedData: async () =>
        "0x1111111111111111111111111111111111111111111111111111111111111111",
    },
  } as unknown as WalletFullContext;
}

test("placePolymarketOrder builds signed payload and L2 headers", async () => {
  const mockWallet = createMockWallet();

  const restore = withMockFetch(async (_url, init) => {
    const body = JSON.parse(init?.body as string);
    const headers = new Headers(init?.headers as HeadersInit);

    assert.equal(body.owner, "api-key");
    assert.equal(body.order.signatureType, 0);
    assert.equal(body.order.side, 0);
    assert.equal(
      body.order.signature,
      "0x1111111111111111111111111111111111111111111111111111111111111111",
    );
    assert.equal(headers.get("POLY_ADDRESS"), "0x0000000000000000000000000000000000000001");
    assert.ok(headers.get("POLY_SIGNATURE"));

    return new Response(JSON.stringify({ orderId: "1" }), { status: 200 });
  });

  try {
    const result = await placePolymarketOrder({
      wallet: mockWallet,
      credentials: {
        apiKey: "api-key",
        secret: Buffer.from("supersecret").toString("base64"),
        passphrase: "pass",
      },
      order: {
        tokenId: "123",
        side: "BUY",
        price: 0.5,
        size: 10,
      },
    });

    assert.equal(result.orderId, "1");
  } finally {
    restore();
  }
});

test("createOrDerivePolymarketApiKey falls back to create when derive returns an empty payload", async () => {
  const mockWallet = createMockWallet();
  let callCount = 0;

  const restore = withMockFetch(async (url, init) => {
    callCount += 1;

    if (callCount === 1) {
      assert.ok(url.endsWith("/auth/derive-api-key"));
      assert.equal(init?.method, "GET");
      return new Response(JSON.stringify({}), { status: 200 });
    }

    assert.ok(url.endsWith("/auth/api-key"));
    assert.equal(init?.method, "POST");
    return new Response(
      JSON.stringify({
        apiKey: "created-key",
        secret: Buffer.from("created-secret").toString("base64"),
        passphrase: "created-passphrase",
      }),
      { status: 200 },
    );
  });

  try {
    const result = await createOrDerivePolymarketApiKey({
      wallet: mockWallet,
      nonce: 424242,
    });
    assert.deepEqual(result, {
      apiKey: "created-key",
      secret: Buffer.from("created-secret").toString("base64"),
      passphrase: "created-passphrase",
    });
  } finally {
    restore();
  }
});

test("createOrDerivePolymarketApiKey rejects missing nonce", async () => {
  const mockWallet = createMockWallet();

  await assert.rejects(
    () => createOrDerivePolymarketApiKey({ wallet: mockWallet }),
    (error: unknown) =>
      error instanceof PolymarketAuthError &&
      error.message === "Polymarket API key operations require an explicit nonce.",
  );
});

test("placePolymarketOrder derives credentials with a stable apiKeyNonce when none are supplied", async () => {
  const mockWallet = createMockWallet();
  const apiKeyNonce = 424242;
  let callCount = 0;

  const restore = withMockFetch(async (url, init) => {
    callCount += 1;
    const headers = new Headers(init?.headers as HeadersInit);

    if (callCount === 1) {
      assert.ok(url.endsWith("/auth/derive-api-key"));
      assert.equal(headers.get("POLY_NONCE"), apiKeyNonce.toString());
      return new Response(
        JSON.stringify({
          apiKey: "derived-key",
          secret: Buffer.from("derived-secret").toString("base64"),
          passphrase: "derived-passphrase",
        }),
        { status: 200 },
      );
    }

    const body = JSON.parse(init?.body as string);
    assert.ok(url.endsWith("/order"));
    assert.equal(body.owner, "derived-key");

    return new Response(JSON.stringify({ orderId: "2" }), { status: 200 });
  });

  try {
    const result = await placePolymarketOrder({
      wallet: mockWallet,
      apiKeyNonce,
      order: {
        tokenId: "123",
        side: "BUY",
        price: 0.4,
        size: 5,
      },
    });

    assert.equal(result.orderId, "2");
    assert.equal(callCount, 2);
  } finally {
    restore();
  }
});

test("placePolymarketOrder rejects missing apiKeyNonce when credentials are not supplied", async () => {
  const mockWallet = createMockWallet();

  await assert.rejects(
    () =>
      placePolymarketOrder({
        wallet: mockWallet,
        order: {
          tokenId: "123",
          side: "BUY",
          price: 0.4,
          size: 5,
        },
      }),
    (error: unknown) =>
      error instanceof PolymarketAuthError &&
      error.message ===
        "Polymarket auto-auth requires apiKeyNonce when credentials are not provided.",
  );
});

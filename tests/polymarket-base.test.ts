import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac } from "node:crypto";
import {
  buildL1Headers,
  buildHmacSignature,
  buildPolymarketOrderAmounts,
  normalizeNumberArrayish,
  normalizeStringArrayish,
} from "../src/adapters/polymarket/base";

test("buildHmacSignature uses base64 secret and canonical payload", () => {
  const rawSecret = "supersecret";
  const secret = Buffer.from(rawSecret).toString("base64");
  const timestamp = 1700000000;
  const method = "POST";
  const path = "/order";
  const body = { foo: "bar" };
  const payload = `${timestamp}${method}${path}${JSON.stringify(body)}`;
  const expected = createHmac("sha256", Buffer.from(rawSecret))
    .update(payload)
    .digest("hex");

  const signature = buildHmacSignature({
    secret,
    timestamp,
    method,
    path,
    body,
  });

  assert.equal(signature, expected);
});

test("normalize arrayish helpers", () => {
  assert.deepEqual(normalizeStringArrayish('["Yes","No"]'), ["Yes", "No"]);
  assert.deepEqual(normalizeStringArrayish(["Yes", "No"]), ["Yes", "No"]);
  assert.deepEqual(normalizeNumberArrayish("[0.1, 0.9]"), [0.1, 0.9]);
  assert.deepEqual(normalizeNumberArrayish(["0.2", 0.8]), [0.2, 0.8]);
});

test("buildPolymarketOrderAmounts calculates quote/size correctly", () => {
  const buy = buildPolymarketOrderAmounts({
    side: "BUY",
    price: 0.5,
    size: 10,
  });
  assert.equal(buy.makerAmount.toString(), "5000000");
  assert.equal(buy.takerAmount.toString(), "10000000");

  const sell = buildPolymarketOrderAmounts({
    side: "SELL",
    price: 0.5,
    size: 10,
  });
  assert.equal(sell.makerAmount.toString(), "10000000");
  assert.equal(sell.takerAmount.toString(), "5000000");
});

test("buildL1Headers uses the official Polymarket attestation message by default", async () => {
  let capturedMessage: unknown = null;

  const headers = await buildL1Headers({
    wallet: {
      address: "0x0000000000000000000000000000000000000001",
      account: {
        address: "0x0000000000000000000000000000000000000001",
        type: "json-rpc",
      },
      walletClient: {
        signTypedData: async (params: { message: unknown }) => {
          capturedMessage = params.message;
          return "0xsignature";
        },
      },
    } as never,
    timestamp: 1700000000,
    nonce: 42,
  });

  assert.equal(headers.POLY_SIGNATURE, "0xsignature");
  assert.deepEqual(capturedMessage, {
    address: "0x0000000000000000000000000000000000000001",
    timestamp: "1700000000",
    nonce: 42n,
    message: "This message attests that I control the given wallet",
  });
});

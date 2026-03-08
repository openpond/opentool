import assert from "node:assert/strict";
import { test } from "node:test";

import { createBrowserWalletContext, createMonotonicNonceSource } from "../src/wallet/browser";

test("createBrowserWalletContext wires signer helpers and monotonic nonce source", async () => {
  let sendCalls = 0;
  let balanceCalls = 0;
  let nonce = 100;

  const wallet = createBrowserWalletContext({
    chain: "arbitrum",
    address: "0x0000000000000000000000000000000000000001",
    account: {
      address: "0x0000000000000000000000000000000000000001",
      type: "json-rpc",
    } as any,
    walletClient: {
      sendTransaction: async () => {
        sendCalls += 1;
        return "0xabc";
      },
    } as any,
    publicClient: {
      getBalance: async () => {
        balanceCalls += 1;
        return 123n;
      },
    } as any,
    nonceSource: () => {
      nonce += 1;
      return nonce;
    },
  });

  const nonceA = wallet.nonceSource?.();
  const nonceB = wallet.nonceSource?.();

  assert.equal(wallet.providerType, "turnkey");
  assert.equal(wallet.chain.slug, "arbitrum");
  assert.equal(await wallet.sendTransaction({}), "0xabc");
  assert.equal(await wallet.getNativeBalance(), 123n);
  assert.equal(await wallet.transfer({ to: "0x0000000000000000000000000000000000000002", amount: 1n }), "0xabc");
  assert.equal(sendCalls, 2);
  assert.equal(balanceCalls, 1);
  assert.equal(nonceA, 101);
  assert.equal(nonceB, 102);
});

test("createMonotonicNonceSource stays monotonic", () => {
  const source = createMonotonicNonceSource();
  const nonceA = source();
  const nonceB = source();

  assert.equal(typeof nonceA, "number");
  assert.equal(typeof nonceB, "number");
  assert.ok(nonceB > nonceA);
});

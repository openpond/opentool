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
      "0x11111111111111111111111111111111111111111111111111111111111111111c",
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

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createMppClient,
  MPP_DEFAULT_TEMPO_CURRENCY,
  MPP_TEMPO_USDCE_ADDRESS,
} from "../src/mpp/index";
import { wallet } from "../src/wallet/index";

test("Tempo is available in the wallet registry for MPP payments", async () => {
  const ctx = await wallet({ chain: "tempo" });

  assert.equal(ctx.chain.id, 4217);
  assert.equal(ctx.tokens.USDC?.address, MPP_TEMPO_USDCE_ADDRESS);
  assert.equal(ctx.tokens.PathUSD?.address, "0x20c0000000000000000000000000000000000000");
  assert.equal(MPP_DEFAULT_TEMPO_CURRENCY, MPP_TEMPO_USDCE_ADDRESS);
});

test("createMppClient keeps global fetch untouched by default", async () => {
  const originalFetch = globalThis.fetch;
  const ctx = await wallet({
    chain: "tempo",
    privateKey: "0x0000000000000000000000000000000000000000000000000000000000000001",
  });

  const client = createMppClient({ wallet: ctx });

  assert.equal(globalThis.fetch, originalFetch);
  assert.equal(typeof client.fetch, "function");
  assert.equal(ctx.address, "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf");
});

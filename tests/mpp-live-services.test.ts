import assert from "node:assert/strict";
import { test } from "node:test";

import { fetchWithMpp } from "../src/mpp/index";
import { wallet } from "../src/wallet/index";

const RUN_LIVE = process.env.OPENTOOL_MPP_LIVE === "1";
const PRIVATE_KEY = process.env.OPENTOOL_MPP_PRIVATE_KEY;
const RPC_URL = process.env.OPENTOOL_MPP_RPC_URL;
const OPENAI_MODEL = process.env.OPENTOOL_MPP_OPENAI_MODEL ?? "gpt-5-nano";
const SESSION_DEPOSIT = process.env.OPENTOOL_MPP_SESSION_DEPOSIT ?? "0.05";

async function fundedTempoWallet() {
  if (!PRIVATE_KEY) {
    throw new Error("Set OPENTOOL_MPP_PRIVATE_KEY to run live MPP service tests");
  }
  return wallet({
    chain: "tempo",
    privateKey: PRIVATE_KEY,
    ...(RPC_URL ? { rpcUrl: RPC_URL } : {}),
  });
}

test("live MPP charge: Exa search", { skip: !RUN_LIVE }, async () => {
  const tempoWallet = await fundedTempoWallet();
  const result = await fetchWithMpp(
    {
      input: "https://exa.mpp.tempo.xyz/search",
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "OpenPond agent payments",
          numResults: 1,
        }),
      },
    },
    { wallet: tempoWallet },
  );

  assert.equal(result.response.ok, true);
  assert.equal(result.receipt?.status, "success");
});

test("live MPP session: OpenAI Responses", { skip: !RUN_LIVE }, async () => {
  const tempoWallet = await fundedTempoWallet();
  const result = await fetchWithMpp(
    {
      input: "https://openai.mpp.tempo.xyz/v1/responses",
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          input: "Reply with exactly: ok",
          max_output_tokens: 8,
        }),
      },
    },
    {
      wallet: tempoWallet,
      tempo: {
        deposit: SESSION_DEPOSIT,
      },
    },
  );

  assert.equal(result.response.ok, true);
  assert.equal(result.receipt?.status, "success");
});

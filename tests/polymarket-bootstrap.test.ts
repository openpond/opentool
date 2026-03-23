import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildPolymarketApprovalTransactions,
  decodePolymarketBootstrapTransaction,
  fetchPolymarketApprovalState,
  fetchPolymarketDepositAddresses,
  resolvePolymarketBootstrapContracts,
} from "../src/adapters/polymarket/bootstrap";

function withMockFetch(
  handler: (url: string, init?: RequestInit) => Promise<Response>,
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

test("buildPolymarketApprovalTransactions creates the expected approval calls", () => {
  const contracts = resolvePolymarketBootstrapContracts("mainnet");
  const transactions = buildPolymarketApprovalTransactions({ environment: "mainnet" });

  assert.equal(transactions.length, 3);

  const usdcApproval = decodePolymarketBootstrapTransaction(transactions[0]!);
  assert.equal(usdcApproval.to, contracts.usdc);
  assert.equal(usdcApproval.functionName, "approve");
  assert.equal(usdcApproval.args[0], contracts.ctf);

  const ctfApproval = decodePolymarketBootstrapTransaction(transactions[1]!);
  assert.equal(ctfApproval.to, contracts.ctf);
  assert.equal(ctfApproval.functionName, "setApprovalForAll");
  assert.equal(
    String(ctfApproval.args[0]).toLowerCase(),
    "0x4bfb41d5b3570defd03c39a9a4d8de6bd8b8982e",
  );
  assert.equal(ctfApproval.args[1], true);

  const negRiskApproval = decodePolymarketBootstrapTransaction(transactions[2]!);
  assert.equal(negRiskApproval.functionName, "setApprovalForAll");
  assert.equal(
    String(negRiskApproval.args[0]).toLowerCase(),
    "0xc5d563a36ae78145c45a50134d48a1215220f80a",
  );
  assert.equal(negRiskApproval.args[1], true);
});

test("fetchPolymarketApprovalState reads allowance and operator approvals", async () => {
  const calls: Array<{ address: string; functionName: string }> = [];
  const state = await fetchPolymarketApprovalState({
    funder: "0x0000000000000000000000000000000000000abc",
    publicClient: {
      readContract: async (args: {
        address: string;
        functionName: string;
      }) => {
        calls.push({ address: args.address, functionName: args.functionName });
        if (args.functionName === "allowance") {
          return 123n;
        }
        return true;
      },
    },
  });

  assert.equal(state.usdcAllowance, 123n);
  assert.equal(state.usdcApproved, true);
  assert.equal(state.ctfExchangeApproved, true);
  assert.equal(state.negRiskExchangeApproved, true);
  assert.equal(state.approvalsReady, true);
  assert.deepEqual(
    calls.map((entry) => entry.functionName),
    ["allowance", "isApprovedForAll", "isApprovedForAll"],
  );
});

test("fetchPolymarketDepositAddresses posts wallet address to bridge API", async () => {
  const restore = withMockFetch(async (url, init) => {
    assert.equal(url, "https://bridge.polymarket.com/deposit");
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(init?.body as string), {
      address: "0x0000000000000000000000000000000000000abc",
    });
    return new Response(
      JSON.stringify({
        address: {
          evm: "0xdeposit",
          svm: "So11111111111111111111111111111111111111112",
        },
        note: "Only certain chains and tokens are supported.",
      }),
      { status: 200 },
    );
  });

  try {
    const result = await fetchPolymarketDepositAddresses({
      address: "0x0000000000000000000000000000000000000abc",
    });
    assert.equal(result.address?.evm, "0xdeposit");
    assert.equal(result.address?.svm, "So11111111111111111111111111111111111111112");
  } finally {
    restore();
  }
});

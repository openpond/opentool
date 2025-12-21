import { wallet } from "opentool/wallet";
import { store } from "opentool/store";
import { parseUnits } from "viem";

const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
];

const AAVE_POOL_ABI = [
  {
    type: "function",
    name: "supply",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
      { name: "referralCode", type: "uint16" },
    ],
    outputs: [],
  },
];

export const profile = {
  description: "Stake 1 USDC every day at noon UTC",
  fixedAmount: "1",
  tokenSymbol: "USDC",
  schedule: { cron: "0 12 * * *", enabled: false },
  limits: { concurrency: 1, dailyCap: 1 },
};

export async function GET(_req: Request) {
  const amount = profile.fixedAmount || "1";

  const ctx = await wallet({
    chain: "base-sepolia",
    apiKey: process.env.ALCHEMY_API_KEY,
    rpcUrl: process.env.RPC_URL,
    turnkey: {
      organizationId: process.env.TURNKEY_SUBORG_ID!,
      apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
      apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
      signWith: process.env.TURNKEY_WALLET_ADDRESS!,
      apiBaseUrl: process.env.TURNKEY_API_BASE_URL,
    },
  });

  const AAVE_POOL =
    "0x8bab6d1b75f19e9ed9fce8b9bd338844ff79ae27" as `0x${string}`;
  const TOKEN_ADDRESS =
    "0xba50cd2a20f6da35d788639e581bca8d0b5d4d5f" as `0x${string}`;
  const amountUnits = parseUnits(amount, 6);

  const approveHash = await ctx.walletClient.writeContract({
    address: TOKEN_ADDRESS,
    abi: ERC20_ABI as any,
    functionName: "approve",
    args: [AAVE_POOL, amountUnits],
    account: ctx.account,
  });

  await ctx.publicClient.waitForTransactionReceipt({ hash: approveHash });

  const supplyHash = await ctx.walletClient.writeContract({
    address: AAVE_POOL,
    abi: AAVE_POOL_ABI as any,
    functionName: "supply",
    args: [TOKEN_ADDRESS, amountUnits, ctx.address, 0],
    account: ctx.account,
  });

  await store({
    source: "aave-v3",
    ref: supplyHash,
    status: "submitted",
    chainId: ctx.chain.id,
    walletAddress: ctx.address,
    action: "stake",
    notional: amount,
    metadata: {
      tool: "aave-stake",
      approveHash,
    },
  });

  return new Response(null, { status: 204 });
}

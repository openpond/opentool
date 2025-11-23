import { z } from "zod";
import { wallet } from "opentool/wallet";
import { parseUnits } from "viem";

// POST-only one-off staking tool mirroring aave-stake.ts behavior
export const profile = {
  description: "Stake a user-specified USDC amount to Aave (Base Sepolia)",
};

export const schema = z.object({
  amount: z
    .string()
    .min(1, "amount is required")
    .refine(
      (v) => /^\d+(?:\.\d+)?$/.test(v),
      "amount must be a decimal string"
    ),
});

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

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { amount } = schema.parse(body);

  // Establish wallet context (same network and envs as aave-stake.ts)
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

  // Constants (Base Sepolia values from aave-stake.ts)
  const AAVE_POOL =
    "0x8bab6d1b75f19e9ed9fce8b9bd338844ff79ae27" as `0x${string}`; // Base Sepolia Pool
  const TOKEN_ADDRESS =
    "0xba50cd2a20f6da35d788639e581bca8d0b5d4d5f" as `0x${string}`; // Base Sepolia USDC
  const amountUnits = parseUnits(amount, 6);

  // 1) Approve pool to spend USDC
  const approveHash = await ctx.walletClient.writeContract({
    address: TOKEN_ADDRESS,
    abi: ERC20_ABI as any,
    functionName: "approve",
    args: [AAVE_POOL, amountUnits],
    account: ctx.account,
  });

  // Wait for approve to be mined to avoid replacement/nonce conflicts
  await ctx.publicClient.waitForTransactionReceipt({ hash: approveHash });

  // Slightly bump fees to avoid "replacement underpriced" on congested testnets
  let feeOverrides: { maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint } =
    {};
  try {
    const fee = await ctx.publicClient.estimateFeesPerGas();
    if (fee.maxFeePerGas && fee.maxPriorityFeePerGas) {
      // +20% bump over suggestion
      feeOverrides = {
        maxFeePerGas: (fee.maxFeePerGas * 12n) / 10n,
        maxPriorityFeePerGas: (fee.maxPriorityFeePerGas * 12n) / 10n,
      };
    }
  } catch {}

  // 2) Supply to Aave Pool with fee bump
  const supplyHash = await ctx.walletClient.writeContract({
    address: AAVE_POOL,
    abi: AAVE_POOL_ABI as any,
    functionName: "supply",
    args: [TOKEN_ADDRESS, amountUnits, ctx.address, 0],
    account: ctx.account,
    ...feeOverrides,
  });

  return Response.json({
    ok: true,
    action: "stake",
    amount,
    approveHash,
    supplyHash,
  });
}

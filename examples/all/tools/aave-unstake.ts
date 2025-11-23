// POST-only one-off unstake tool using OpenTool wallet + Aave V3 Pool
import { wallet } from "opentool/wallet";
import { parseUnits } from "viem";
import { z } from "zod";

const AAVE_POOL_ABI = [
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "to", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
];

export const schema = z.object({
  amount: z.string(),
  token: z.string().default("USDC"),
});

export async function POST(req: Request) {
  const body = await req.json();
  const { amount, token } = schema.parse(body);

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

  const AAVE_POOL = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951" as `0x${string}`; // Base Sepolia Pool
  const TOKEN_ADDRESS = "0xba50cd2a20f6da35d788639e581bca8d0b5d4d5f" as `0x${string}`; // Base Sepolia USDC
  const amountUnits = parseUnits(amount, 6);

  // Withdraw from Aave Pool
  const withdrawHash = await ctx.walletClient.writeContract({
    address: AAVE_POOL,
    abi: AAVE_POOL_ABI as any,
    functionName: "withdraw",
    args: [TOKEN_ADDRESS, amountUnits, ctx.address],
    account: ctx.account,
  });

  // No content response (intentionally empty)
  return new Response(null, { status: 204 });
}

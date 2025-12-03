import { z } from "zod";
import { store } from "opentool/store";
import { wallet } from "opentool/wallet";
import { withdrawFromHyperliquid } from "opentool/adapters/hyperliquid";

function resolveChainConfig(environment: "mainnet" | "testnet") {
  return environment === "mainnet"
    ? { chain: "arbitrum", rpcUrl: process.env.ARBITRUM_RPC_URL }
    : {
        chain: "arbitrum-sepolia",
        rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL,
      };
}

export const profile = {
  description:
    "Withdraw USDC from Hyperliquid back to an on-chain address via withdraw3.",
};

const decimalString = z
  .string()
  .min(1, "amount is required")
  .refine((v) => /^\d+(?:\.\d+)?$/.test(v), "must be a decimal string");

export const schema = z.object({
  amount: decimalString,
  destination: z
    .string()
    .min(1, "destination is required")
    .refine(
      (v) => /^0x[a-fA-F0-9]{40}$/.test(v),
      "destination must be a hex address"
    ),
  environment: z.enum(["mainnet", "testnet"]).default("testnet"),
});

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { amount, destination, environment } = schema.parse(body);

  const chainConfig = resolveChainConfig(environment);
  const context = await wallet({
    chain: chainConfig.chain,
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

  const walletAddress = context.address;

  const withdraw = await withdrawFromHyperliquid({
    amount,
    destination: destination as `0x${string}`,
    environment,
    wallet: context,
  });

  await store({
    source: "hyperliquid",
    ref: `${withdraw.nonce}`,
    status: "submitted",
    walletAddress,
    action: "withdraw",
    notional: amount,
    metadata: {
      environment,
      destination,
      nonce: withdraw.nonce,
      status: withdraw.status,
    },
  });

  return Response.json({
    ok: true,
    environment,
    walletAddress,
    withdraw,
  });
}

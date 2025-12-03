import { z } from "zod";
import { store } from "opentool/store";
import { wallet } from "opentool/wallet";
import {
  depositToHyperliquidBridge,
  fetchHyperliquidClearinghouseState,
} from "opentool/adapters/hyperliquid";

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
    "Bridge USDC to the Hyperliquid bridge (creates the HL user on first deposit).",
};

const decimalString = z
  .string()
  .min(1, "amount is required")
  .refine((v) => /^\d+(?:\.\d+)?$/.test(v), "must be a decimal string");

export const schema = z.object({
  amount: decimalString,
  environment: z.enum(["mainnet", "testnet"]).default("testnet"),
});

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { amount, environment } = schema.parse(body);

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

  const deposit = await depositToHyperliquidBridge({
    amount,
    environment,
    wallet: context,
  });

  const clearinghouse = await fetchHyperliquidClearinghouseState({
    environment,
    walletAddress,
  });

  await store({
    source: "hyperliquid",
    ref: deposit.txHash,
    status: "submitted",
    walletAddress,
    action: "deposit",
    notional: amount,
    metadata: {
      environment,
      txHash: deposit.txHash,
      bridge: deposit.bridgeAddress,
      amountUnits: deposit.amountUnits,
      clearinghouse,
    },
  });

  return Response.json({
    ok: true,
    environment,
    walletAddress,
    deposit,
    clearinghouse,
  });
}

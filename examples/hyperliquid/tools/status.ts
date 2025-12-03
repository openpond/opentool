import { z } from "zod";
import { store } from "opentool/store";
import { wallet } from "opentool/wallet";
import { fetchHyperliquidClearinghouseState } from "opentool/adapters/hyperliquid";

function resolveChainConfig(environment: "mainnet" | "testnet") {
  return environment === "mainnet"
    ? { chain: "base" }
    : { chain: "base-sepolia" };
}

export const profile = {
  description:
    "Check Hyperliquid clearinghouse state for the configured Turnkey wallet (confirms user existence).",
};

export const schema = z.object({
  environment: z.enum(["mainnet", "testnet"]).default("testnet"),
});

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { environment } = schema.parse(body);

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
  const clearinghouse = await fetchHyperliquidClearinghouseState({
    environment,
    walletAddress,
  });

  await store({
    source: "hyperliquid",
    ref: `${environment}-status-${Date.now()}`,
    status: "submitted",
    walletAddress,
    action: "status",
    metadata: {
      environment,
      clearinghouse,
    },
  });

  return Response.json({
    ok: true,
    environment,
    walletAddress,
    clearinghouse,
  });
}

import { z } from "zod";
import { store } from "opentool/store";
import { wallet } from "opentool/wallet";
import { recordHyperliquidTermsAcceptance } from "opentool/adapters/hyperliquid";

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
    "Record a local acknowledgement of Hyperliquid API terms for the configured Turnkey wallet.",
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

  await recordHyperliquidTermsAcceptance({
    environment,
    walletAddress,
  });

  await store({
    source: "hyperliquid",
    ref: `${environment}-terms-${Date.now()}`,
    status: "accepted",
    walletAddress,
    action: "terms",
    metadata: {
      environment,
      note: "Hyperliquid does not expose a terms endpoint; this records local acknowledgement only.",
    },
  });

  return Response.json({
    ok: true,
    environment,
    walletAddress,
    termsAccepted: true,
    note: "Hyperliquid does not expose a terms endpoint; this records local acknowledgement only.",
  });
}

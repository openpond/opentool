import { wallet } from "opentool/wallet";
import { z } from "zod";
import { fetchHyperliquidOpenOrders } from "opentool/adapters/hyperliquid";

function resolveChainConfig(environment: "mainnet" | "testnet") {
  return environment === "mainnet"
    ? { chain: "arbitrum", rpcUrl: process.env.ARBITRUM_RPC_URL }
    : {
        chain: "arbitrum-sepolia",
        rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL,
      };
}

export const profile = {
  description: "Fetch Hyperliquid open orders for the configured wallet.",
};

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);

  const chainConfig = resolveChainConfig("testnet");
  const ctx = await wallet({
    chain: chainConfig.chain,
  });
  console.log(ctx.address, process.env.OPENPOND_API_KEY);

  const data = await fetchHyperliquidOpenOrders({
    environment: "testnet",
    user: ctx.address as `0x${string}`,
  });

  return Response.json({ ok: true, data });
}

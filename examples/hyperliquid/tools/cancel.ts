import { z } from "zod";
import { wallet, WalletFullContext } from "opentool/wallet";
import { store } from "opentool/store";
import {
  cancelHyperliquidOrders,
  cancelHyperliquidOrdersByCloid,
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
    "Cancel a Hyperliquid order by oid or client order id (cloid). Logs to store.",
};

export const schema = z.object({
  oid: z.union([
    z.number().int().nonnegative(),
    z.string().regex(/^\d+$/, "oid must be a positive integer"),
  ]),
});

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { oid } = schema.parse(body);

  const chainConfig = resolveChainConfig("testnet");
  const ctx = await wallet({
    chain: chainConfig.chain,
  });

  let result: unknown;
  const environment = "testnet";
  const numericOid = typeof oid === "string" ? Number.parseInt(oid, 10) : oid;
  result = await cancelHyperliquidOrders({
    wallet: ctx as WalletFullContext,
    environment,
    cancels: [{ symbol: "BTC-USD", oid: numericOid }],
  });

  await store({
    source: "hyperliquid",
    ref: (oid ?? "").toString(),
    status: "cancelled",
    walletAddress: ctx.address,
    action: "order",
    metadata: { symbol: "BTC-USD", cancelled: oid },
  });

  return Response.json({ ok: true, result });
}

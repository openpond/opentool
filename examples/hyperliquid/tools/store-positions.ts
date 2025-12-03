import { retrieve } from "opentool/store";
import { wallet } from "opentool/wallet";
export const profile = {
  description:
    "Retrieve all Hyperliquid store events for this wallet (no filters).",
};

export async function GET(_req: Request): Promise<Response> {
  const ctx = await wallet({
    chain: "arbitrum-sepolia",
  });

  console.log(ctx.address, process.env.OPENPOND_API_KEY);

  const result = await retrieve({
    source: "hyperliquid",
    walletAddress: ctx.address,
  });

  return Response.json({ ok: true, ...result });
}

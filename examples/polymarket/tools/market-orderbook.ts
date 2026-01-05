import { fetchPolymarketOrderbook } from "opentool/adapters/polymarket";

export const profile = {
  description: "Fetch the Polymarket orderbook for a YES/NO token.",
};

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const tokenId = url.searchParams.get("tokenId") ?? "";
  if (!tokenId) {
    return new Response(
      JSON.stringify({ ok: false, error: "tokenId is required" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const orderbook = await fetchPolymarketOrderbook({ tokenId });
  return Response.json({ ok: true, orderbook });
}

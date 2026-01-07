import { fetchPolymarketMarkets } from "opentool/adapters/polymarket";

export const profile = {
  description: "List active Polymarket markets (active=true & closed=false).",
  category: "tracker",
};

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 24);
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const category = url.searchParams.get("category") ?? undefined;
  const tagId = url.searchParams.get("tagId") ?? undefined;

  const markets = await fetchPolymarketMarkets({
    limit: Number.isFinite(limit) ? limit : 24,
    offset: Number.isFinite(offset) ? offset : 0,
    category,
    tagId,
  });

  return Response.json({
    ok: true,
    count: markets.length,
    items: markets,
  });
}

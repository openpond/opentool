import { z } from "zod";
import { fetchPolymarketOrderbook } from "opentool/adapters/polymarket";
import { resolveYesNoTokenIds } from "../utils";

const schema = z.object({
  marketSlug: z.string().min(1).optional(),
  marketId: z.string().min(1).optional(),
  depth: z.number().int().min(1).max(50).default(5),
});

export const profile = {
  description:
    "Compute Polymarket spread and orderbook imbalance for a YES token.",
  category: "tracker",
};

function aggregateDepth(levels: Array<{ price: number; size: number }>, depth: number) {
  return levels.slice(0, depth).reduce((acc, level) => acc + level.size, 0);
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ ok: false, error: parsed.error.flatten() }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const { marketSlug, marketId, depth } = parsed.data;
  const { yesTokenId } = await resolveYesNoTokenIds({
    marketSlug,
    marketId,
  });
  const orderbook = await fetchPolymarketOrderbook({ tokenId: yesTokenId });
  const bestBid = orderbook.bids[0]?.price ?? null;
  const bestAsk = orderbook.asks[0]?.price ?? null;
  const mid =
    bestBid != null && bestAsk != null ? (bestBid + bestAsk) / 2 : null;
  const spreadBps =
    bestBid != null && bestAsk != null && mid
      ? ((bestAsk - bestBid) / mid) * 10_000
      : null;

  const bidDepth = aggregateDepth(orderbook.bids, depth);
  const askDepth = aggregateDepth(orderbook.asks, depth);
  const imbalance =
    bidDepth + askDepth > 0 ? (bidDepth - askDepth) / (bidDepth + askDepth) : 0;

  return Response.json({
    ok: true,
    tokenId: yesTokenId,
    bestBid,
    bestAsk,
    mid,
    spreadBps,
    bidDepth,
    askDepth,
    imbalance,
  });
}

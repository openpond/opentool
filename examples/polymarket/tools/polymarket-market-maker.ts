import { z } from "zod";
import { retrieve, store } from "opentool/store";
import { wallet } from "opentool/wallet";
import {
  fetchPolymarketOrderbook,
  PolymarketExchangeClient,
} from "opentool/adapters/polymarket";
import { resolveYesNoTokenIds } from "../utils";

const schema = z.object({
  marketSlug: z.string().min(1).optional(),
  marketId: z.string().min(1).optional(),
  quoteSize: z.number().positive(),
  spreadBps: z.number().positive(),
  repriceBps: z.number().positive().default(25),
});

export const profile = {
  description: "Simple Polymarket market maker with configurable spread.",
};

function bestPrices(orderbook: {
  bids: Array<{ price: number }>;
  asks: Array<{ price: number }>;
}) {
  const bestBid = orderbook.bids[0]?.price ?? null;
  const bestAsk = orderbook.asks[0]?.price ?? null;
  if (bestBid == null || bestAsk == null) return { bestBid, bestAsk, mid: null };
  return { bestBid, bestAsk, mid: (bestBid + bestAsk) / 2 };
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

  const {
    marketSlug,
    marketId,
    quoteSize,
    spreadBps,
    repriceBps,
  } = parsed.data;

  const context = await wallet({ chain: "ethereum" });
  const { yesTokenId, noTokenId } = await resolveYesNoTokenIds({
    marketSlug,
    marketId,
  });
  const exchange = new PolymarketExchangeClient({ wallet: context });

  const yesBook = await fetchPolymarketOrderbook({ tokenId: yesTokenId });
  const { mid } = bestPrices(yesBook);
  if (mid == null) {
    throw new Error("Unable to compute midpoint from orderbook.");
  }

  const previous = await retrieve({
    source: "polymarket-mm",
    walletAddress: context.address,
    limit: 1,
  });
  const lastMid =
    (previous.items?.[0]?.metadata as { mid?: number } | undefined)?.mid ?? null;

  if (lastMid != null) {
    const diffBps = Math.abs((mid - lastMid) / lastMid) * 10_000;
    if (diffBps < repriceBps) {
      return Response.json({
        ok: true,
        skipped: true,
        reason: "midpoint move below reprice threshold",
        mid,
        lastMid,
        diffBps,
      });
    }
  }

  await exchange.cancelMarket(yesTokenId);
  await exchange.cancelMarket(noTokenId);

  const halfSpread = (spreadBps / 10_000) / 2;
  const yesBid = Math.max(0.01, mid * (1 - halfSpread));
  const yesAsk = Math.min(0.99, mid * (1 + halfSpread));
  const noMid = 1 - mid;
  const noBid = Math.max(0.01, noMid * (1 - halfSpread));
  const noAsk = Math.min(0.99, noMid * (1 + halfSpread));

  const orders = [
    { tokenId: yesTokenId, side: "BUY" as const, price: yesBid, size: quoteSize },
    { tokenId: yesTokenId, side: "SELL" as const, price: yesAsk, size: quoteSize },
    { tokenId: noTokenId, side: "BUY" as const, price: noBid, size: quoteSize },
    { tokenId: noTokenId, side: "SELL" as const, price: noAsk, size: quoteSize },
  ];

  const results = [];
  for (const order of orders) {
    const result = await exchange.placeOrder(order);
    results.push(result);
  }

  await store({
    source: "polymarket-mm",
    ref: `${yesTokenId}-${Date.now()}`,
    status: "submitted",
    walletAddress: context.address,
    action: "order",
    notional: quoteSize.toString(),
    metadata: {
      mid,
      spreadBps,
      yesBid,
      yesAsk,
      noBid,
      noAsk,
      orders: results,
    },
  });

  return Response.json({
    ok: true,
    mid,
    spreadBps,
    orders: results,
  });
}

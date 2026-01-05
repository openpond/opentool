import { z } from "zod";
import { retrieve, store } from "opentool/store";
import { wallet } from "opentool/wallet";
import {
  fetchPolymarketMidpoint,
  PolymarketExchangeClient,
} from "opentool/adapters/polymarket";
import {
  computeRsi,
  computeSma,
  fetchHyperliquidMarkPrice,
  resolveYesNoTokenIds,
} from "../utils";

const schema = z.object({
  marketSlug: z.string().min(1).optional(),
  marketId: z.string().min(1).optional(),
  orderSize: z.number().positive(),
  maxSlippage: z.number().min(0).max(0.5).default(0.02),
  symbol: z.string().min(1).default("BTC"),
  historyLimit: z.number().int().min(20).max(240).default(60),
});

export const profile = {
  description:
    "BTC directional bot: uses Hyperliquid BTC price + SMA/RSI to trade Polymarket Up/Down outcomes.",
};

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
    orderSize,
    maxSlippage,
    symbol,
    historyLimit,
  } = parsed.data;

  const context = await wallet({ chain: "ethereum" });
  const { yesTokenId, noTokenId } = await resolveYesNoTokenIds({
    marketSlug,
    marketId,
  });

  const exchange = new PolymarketExchangeClient({ wallet: context });

  const mark = await fetchHyperliquidMarkPrice(symbol);
  await store({
    source: "polymarket-btc-ta",
    ref: `${symbol}-${Date.now()}`,
    status: "info",
    walletAddress: context.address,
    action: "custom",
    notional: mark.toString(),
    metadata: {
      symbol,
      price: mark,
      timestamp: Date.now(),
    },
  });

  const history = await retrieve({
    source: "polymarket-btc-ta",
    walletAddress: context.address,
    symbol,
    limit: historyLimit,
  });
  const prices = (history.items ?? [])
    .map((item) => Number((item.metadata as { price?: number })?.price))
    .filter((value) => Number.isFinite(value))
    .reverse();

  const smaFast = computeSma(prices, 5);
  const smaSlow = computeSma(prices, 20);
  const rsi = computeRsi(prices, 14);

  if (smaFast == null || smaSlow == null || rsi == null) {
    return Response.json({
      ok: true,
      reason: "Not enough price history yet.",
      latestPrice: mark,
      historyCount: prices.length,
    });
  }

  let signal: "UP" | "DOWN" | "HOLD" = "HOLD";
  if (smaFast > smaSlow && rsi > 55) signal = "UP";
  if (smaFast < smaSlow && rsi < 45) signal = "DOWN";

  if (signal === "HOLD") {
    return Response.json({
      ok: true,
      signal,
      latestPrice: mark,
      smaFast,
      smaSlow,
      rsi,
    });
  }

  const targetToken = signal === "UP" ? yesTokenId : noTokenId;
  const midpoint = await fetchPolymarketMidpoint({ tokenId: targetToken });
  if (midpoint == null) {
    throw new Error("Unable to fetch Polymarket midpoint.");
  }

  const price = Math.min(0.99, Math.max(0.01, midpoint * (1 + maxSlippage)));

  const result = await exchange.placeOrder({
    tokenId: targetToken,
    side: "BUY",
    price,
    size: orderSize,
  });

  return Response.json({
    ok: true,
    signal,
    latestPrice: mark,
    smaFast,
    smaSlow,
    rsi,
    historyCount: prices.length,
    order: result,
  });
}

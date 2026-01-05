import { z } from "zod";
import { retrieve, store } from "opentool/store";
import { wallet } from "opentool/wallet";
import {
  computeRsi,
  computeSma,
  fetchHyperliquidMarkPrice,
} from "../utils";

const schema = z.object({
  symbol: z.string().min(1).default("BTC"),
  historyLimit: z.number().int().min(20).max(240).default(60),
});

export const profile = {
  description: "TA signal-only tool for BTC using Hyperliquid pricing.",
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

  const { symbol, historyLimit } = parsed.data;
  const context = await wallet({ chain: "ethereum" });
  const mark = await fetchHyperliquidMarkPrice(symbol);
  await store({
    source: "polymarket-btc-signal",
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
    source: "polymarket-btc-signal",
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

  let signal: "UP" | "DOWN" | "HOLD" = "HOLD";
  if (smaFast != null && smaSlow != null && rsi != null) {
    if (smaFast > smaSlow && rsi > 55) signal = "UP";
    if (smaFast < smaSlow && rsi < 45) signal = "DOWN";
  }

  return Response.json({
    ok: true,
    signal,
    latestPrice: mark,
    smaFast,
    smaSlow,
    rsi,
    historyCount: prices.length,
  });
}

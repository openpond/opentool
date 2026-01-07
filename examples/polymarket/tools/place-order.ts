import { z } from "zod";
import { wallet } from "opentool/wallet";
import { PolymarketExchangeClient } from "opentool/adapters/polymarket";
import { resolveOutcomeTokenId } from "../utils";

const schema = z.object({
  tokenId: z.string().min(1).optional(),
  marketSlug: z.string().min(1).optional(),
  marketId: z.string().min(1).optional(),
  outcome: z.string().min(1).optional(),
  side: z.enum(["BUY", "SELL"]),
  price: z.union([z.string(), z.number()]),
  size: z.union([z.string(), z.number()]),
  orderType: z.enum(["GTC", "FOK", "FAK", "GTD"]).optional(),
  expiration: z.number().int().nonnegative().optional(),
  feeRateBps: z.number().int().nonnegative().optional(),
  signatureType: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
}).superRefine((value, ctx) => {
  const hasToken = Boolean(value.tokenId);
  const hasMarket = Boolean(value.marketSlug || value.marketId);
  const hasOutcome = Boolean(value.outcome);
  if (!hasToken && !(hasMarket && hasOutcome)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide tokenId or (marketSlug/marketId + outcome).",
    });
  }
});

export const profile = {
  description: "Place a Polymarket order using OpenTool wallet signing.",
  category: "strategy",
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

  const context = await wallet({ chain: "ethereum" });
  const exchange = new PolymarketExchangeClient({ wallet: context });
  const resolvedTokenId = parsed.data.tokenId
    ? parsed.data.tokenId
    : (
        await resolveOutcomeTokenId({
          marketSlug: parsed.data.marketSlug,
          marketId: parsed.data.marketId,
          outcome: parsed.data.outcome ?? "",
        })
      ).tokenId;

  const result = await exchange.placeOrder(
    {
      tokenId: resolvedTokenId,
      side: parsed.data.side,
      price: parsed.data.price,
      size: parsed.data.size,
      expiration: parsed.data.expiration,
      feeRateBps: parsed.data.feeRateBps,
      signatureType: parsed.data.signatureType,
    },
    parsed.data.orderType ?? "GTC"
  );

  return Response.json({ ok: true, result });
}

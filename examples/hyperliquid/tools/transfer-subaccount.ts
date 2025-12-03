import { wallet, WalletFullContext } from "opentool/wallet";
import { transferHyperliquidSubAccount } from "opentool/adapters/hyperliquid";
import { z } from "zod";

export const profile = {
  description:
    "Transfer USDC between main account and a Hyperliquid sub-account.",
};

export async function GET(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const parsed = z
    .object({
      subAccountUser: z
        .string()
        .regex(
          /^0x[a-fA-F0-9]{40}$/,
          "subAccountUser must be a 0x-prefixed address"
        ),
      amount: z
        .union([z.string(), z.number()])
        .transform((v) => Number(v))
        .refine(
          (v) => Number.isFinite(v) && v >= 0,
          "amount must be non-negative"
        ),
      direction: z.enum(["deposit", "withdraw"]).default("deposit"),
    })
    .safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ ok: false, error: parsed.error.flatten() }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      }
    );
  }
  const { subAccountUser, amount, direction } = parsed.data;
  const environment = "testnet";

  const ctx = await wallet({
    chain: "arbitrum-sepolia",
  });

  const result = await transferHyperliquidSubAccount({
    wallet: ctx as WalletFullContext,
    environment,
    subAccountUser: subAccountUser as `0x${string}`,
    isDeposit: direction === "deposit",
    usd: amount,
  });

  return Response.json({
    ok: true,
    environment,
    subAccountUser,
    direction,
    amount,
    result,
  });
}

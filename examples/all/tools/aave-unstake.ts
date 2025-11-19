import { z } from "zod";

export const profile = {
  description: "One-off unstake utility",
};

export const schema = z.object({ amount: z.string(), token: z.string().default("USDC") });

export async function POST(req: Request) {
  const body = await req.json();
  const { amount, token } = schema.parse(body);
  return Response.json({ ok: true, action: "unstake", amount, token });
}


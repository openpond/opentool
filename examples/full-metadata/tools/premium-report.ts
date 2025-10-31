import { generateText } from "opentool/ai";
import { definePayment } from "opentool/payment";
import { z } from "zod";

export const schema = z.object({
  symbol: z
    .string()
    .min(1)
    .default("BTC")
    .describe("Ticker symbol to generate a premium market summary for"),
});

export const payment = definePayment({
  amount: "0.50",
  currency: "USDC",
  payTo: "0x...",
  message: "Premium analytics require payment before access.",
  acceptedMethods: ["x402", "402"],
  acceptedCurrencies: ["USDC"],
  chains: ["base"],
  facilitator: "opentool",
});

export const mcp = { enabled: true };

export async function POST(request: Request) {
  const payload = await request.json();
  const { symbol } = schema.parse(payload);
  const report = await generateText("Premium Content " + symbol);
  return new Response(
    JSON.stringify({
      report,
    }),
    {
      status: 200,
    }
  );
}

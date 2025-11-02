import { defineX402Payment } from "opentool/x402";
import { z } from "zod";

export const schema = z.object({
  symbol: z
    .string()
    .min(1)
    .default("BTC")
    .describe("Ticker symbol to generate a premium market summary for"),
});

export const payment = defineX402Payment({
  amount: "0.001",
  currency: "USDC",
  payTo: process.env.WALLET_ADDRESS!,
  message: "Premium analytics require payment before access.",
  resource: "https://localhost:7000/premium-report",
  network: "base-sepolia",
  assetAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  scheme: "exact",
});

export const mcp = { enabled: true };

export async function POST(request: Request) {
  const payload = await request.json();
  const { symbol } = schema.parse(payload);
  return new Response(
    JSON.stringify({
      report: "Hello World",
    }),
    {
      status: 200,
    }
  );
}

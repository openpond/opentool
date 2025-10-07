import { definePayment, requirePayment } from "opentool/payment";
import { z } from "zod";

export const schema = z.object({
  symbol: z
    .string()
    .min(1)
    .default("OPN")
    .describe("Ticker symbol to generate a premium market summary for"),
});

export const payment = definePayment({
  amount: "0.50",
  currency: "USDC",
  payTo: "0x2222222222222222222222222222222222222222",
  message: "Premium analytics require payment before access.",
  acceptedMethods: ["x402", "402"],
  acceptedCurrencies: ["USDC"],
  chainIds: [8453],
  facilitator: "opentool",
});

export const metadata = {
  name: "premium_report",
  description: "Delivers premium market analytics once payment is satisfied",
  annotations: {
    requiresPayment: true,
  },
  discovery: {
    keywords: ["market", "analytics", "payments", "premium"],
    category: "finance",
    useCases: [
      "Pay-to-unlock premium market KPIs",
      "Demonstrate payment-gated tools",
    ],
    examples: [
      {
        description: "Request premium analytics for OPN",
        input: { symbol: "OPN" },
        expectedOutput: "Premium analytics with payment receipt",
      },
    ],
  },
};

export const mcp = { enabled: true };

export async function POST(request: Request) {
  const paymentResult = await requirePayment(request, payment);
  if (paymentResult instanceof Response) {
    return paymentResult;
  }

  const payload = await request.json();
  const { symbol } = schema.parse(payload);
  const report = buildReport(symbol);

  const headers = new Headers(paymentResult.headers);
  headers.set("content-type", "application/json; charset=utf-8");

  return new Response(
    JSON.stringify({
      report,
      payment: paymentResult.payment,
    }),
    {
      status: 200,
      headers,
    }
  );
}

async function parseBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function buildReport(symbol: string) {
  return {
    symbol,
    priceUsd: 2.37,
    change24h: 4.12,
    highlights: [
      `${symbol} liquidity depth improved 8% over the last 24h`,
      `${symbol} treasury runway extended by 6 months`,
      `${symbol} is trending with 2.3x week-over-week developer activity`,
    ],
  };
}

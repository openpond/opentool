import { flattenMessageContent, generateText } from "opentool/ai";
import { z } from "zod";
import { ClobClient, OrderType, Side } from "@polymarket/clob-client";
import { Wallet } from "ethers";

const aiConfig = {
  baseUrl: process.env.OPENPOND_GATEWAY_URL,
  apiKey: process.env.OPENPOND_API_KEY,
};

const POLYMARKET_API_BASE = "https://gamma-api.polymarket.com";
const POLYMARKET_CLOB_HOST = "https://clob.polymarket.com";

export const schema = z.object({
  sport: z
    .enum(["NFL", "NBA", "MLB", "soccer"])
    .default("NFL")
    .describe("Sport to analyze"),
  team: z
    .string()
    .optional()
    .describe("Specific team to research (optional)"),
  betAmount: z
    .number()
    .min(1)
    .max(100)
    .default(10)
    .describe("Amount in USDC to bet"),
  confidenceThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe("Minimum confidence level to place bet (0-1)"),
  dryRun: z
    .boolean()
    .default(true)
    .describe("If true, analyze but don't place actual bet"),
  model: z
    .string()
    .optional()
    .describe("Override default AI model for analysis"),
});

export const metadata = {
  name: "polymarket_sports_bet",
  description:
    "Research sports games, find betting opportunities on Polymarket, and optionally place bets based on AI analysis",
  annotations: {
    readOnlyHint: false,
    idempotentHint: false,
  },
  discovery: {
    keywords: [
      "polymarket",
      "betting",
      "sports",
      "nfl",
      "prediction",
      "market",
      "web3",
    ],
    category: "finance",
    useCases: [
      "Analyze NFL Sunday games and place informed bets",
      "Research team performance and betting odds",
      "Find value opportunities in prediction markets",
      "Automate sports betting with AI-powered analysis",
    ],
    examples: [
      {
        description: "Analyze NFL Sunday games",
        input: {
          sport: "NFL",
          betAmount: 10,
          confidenceThreshold: 0.65,
          dryRun: true,
        },
        expectedOutput:
          "Detailed analysis of games with betting recommendations and market opportunities",
      },
      {
        description: "Research specific team",
        input: {
          sport: "NFL",
          team: "Chiefs",
          betAmount: 25,
          confidenceThreshold: 0.7,
          dryRun: false,
        },
        expectedOutput:
          "Team-specific analysis with bet placement result",
      },
    ],
    relatedTools: ["ai_research", "market_analysis"],
  },
};

interface PolymarketMarket {
  id: string;
  question: string;
  description?: string;
  outcomes: string[];
  tokens: Array<{ token_id: string; outcome: string; price: string }>;
  volume: string;
  active: boolean;
  end_date_iso: string;
}

async function searchPolymarketMarkets(
  query: string
): Promise<PolymarketMarket[]> {
  const url = new URL(`${POLYMARKET_API_BASE}/markets`);
  url.searchParams.append("limit", "10");
  url.searchParams.append("order", "volume");
  url.searchParams.append("ascending", "false");

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Polymarket API error: ${response.statusText}`);
  }

  const markets = await response.json();

  // Filter markets based on query
  const filtered = markets.filter(
    (m: PolymarketMarket) =>
      m.active &&
      (m.question.toLowerCase().includes(query.toLowerCase()) ||
        m.description?.toLowerCase().includes(query.toLowerCase()))
  );

  return filtered;
}

async function placeBet(
  tokenId: string,
  price: number,
  size: number,
  side: "BUY" | "SELL"
) {
  const privateKey = process.env.POLYMARKET_PRIVATE_KEY;
  const funderAddress = process.env.POLYMARKET_FUNDER_ADDRESS;

  if (!privateKey || !funderAddress) {
    throw new Error(
      "Missing POLYMARKET_PRIVATE_KEY or POLYMARKET_FUNDER_ADDRESS in environment"
    );
  }

  const signer = new Wallet(privateKey);
  const clobClient = new ClobClient(POLYMARKET_CLOB_HOST, 137, signer);

  const apiCreds = await clobClient.createOrDeriveApiKey();

  const authenticatedClient = new ClobClient(
    POLYMARKET_CLOB_HOST,
    137,
    signer,
    apiCreds,
    1, // signature type
    funderAddress
  );

  const order = await authenticatedClient.createAndPostOrder(
    {
      tokenID: tokenId,
      price,
      side: side === "BUY" ? Side.BUY : Side.SELL,
      size,
    },
    {
      tickSize: "0.001",
      negRisk: false,
    },
    OrderType.GTC
  );

  return order;
}

export async function POST(request: Request) {
  const payload = schema.parse(await request.json());

  // Step 1: Research the sport/team using AI with web search
  const researchQuery = payload.team
    ? `${payload.sport} ${payload.team} latest news injury reports performance analysis betting odds`
    : `${payload.sport} games this week Sunday betting analysis odds injury reports`;

  const researchResponse = await generateText(
    {
      messages: [
        {
          role: "system" as const,
          content:
            "You are a sports betting analyst. Research the latest information and provide detailed analysis with confidence levels for potential bets. Focus on: 1) Team performance trends, 2) Injury reports, 3) Historical matchups, 4) Expert predictions, 5) Value opportunities.",
        },
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: `Research request: ${researchQuery}\n\nProvide a comprehensive analysis with specific teams, matchups, and your confidence level (0-1) for potential betting opportunities. Include citations from your sources.`,
            },
          ],
        },
      ],
      model: payload.model,
      toolExecution: {
        enableTools: true,
        webSearch: {
          limit: 5,
        },
      },
      toolChoice: "auto",
    },
    aiConfig
  );

  const analysis = flattenMessageContent(researchResponse.message.content);

  // Step 2: Search Polymarket for relevant markets
  const searchTerm = payload.team || payload.sport;
  let markets: PolymarketMarket[] = [];
  let marketError = null;

  try {
    markets = await searchPolymarketMarkets(searchTerm);
  } catch (error) {
    marketError =
      error instanceof Error ? error.message : "Unknown market search error";
  }

  // Step 3: Analyze markets and determine bet
  let recommendation = null;
  let betResult = null;

  if (markets.length > 0) {
    const marketsSummary = markets
      .slice(0, 3)
      .map(
        (m, idx) =>
          `${idx + 1}. ${m.question}\n   Outcomes: ${m.outcomes.join(", ")}\n   Tokens: ${m.tokens.map((t) => `${t.outcome}: $${t.price}`).join(", ")}\n   Volume: $${m.volume}`
      )
      .join("\n\n");

    const decisionResponse = await generateText(
      {
        messages: [
          {
            role: "system" as const,
            content:
              "You are a betting decision assistant. Based on research analysis and available markets, recommend the best betting opportunity with a confidence level.",
          },
          {
            role: "user" as const,
            content: [
              {
                type: "text" as const,
                text: `Based on this research:\n\n${analysis}\n\nAnd these available Polymarket markets:\n\n${marketsSummary}\n\nRecommend the best bet, specify which outcome to bet on, suggest a price (probability 0-1), and provide your confidence level (0-1). Format your response as JSON with: {marketIndex: number, outcome: string, suggestedPrice: number, confidence: number, reasoning: string}`,
              },
            ],
          },
        ],
        model: payload.model,
      },
      aiConfig
    );

    const decisionText = flattenMessageContent(
      decisionResponse.message.content
    );

    try {
      // Try to parse JSON recommendation from response
      const jsonMatch = decisionText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recommendation = JSON.parse(jsonMatch[0]);

        // Place bet if confidence meets threshold and not dry run
        if (
          !payload.dryRun &&
          recommendation.confidence >= payload.confidenceThreshold
        ) {
          const selectedMarket = markets[recommendation.marketIndex];
          const token = selectedMarket.tokens.find(
            (t) => t.outcome === recommendation.outcome
          );

          if (token) {
            try {
              betResult = await placeBet(
                token.token_id,
                recommendation.suggestedPrice,
                payload.betAmount,
                "BUY"
              );
            } catch (error) {
              betResult = {
                error:
                  error instanceof Error
                    ? error.message
                    : "Unknown betting error",
              };
            }
          }
        }
      }
    } catch {
      // If parsing fails, just keep the text recommendation
      recommendation = { rawResponse: decisionText };
    }
  }

  return Response.json({
    analysis,
    markets: markets.slice(0, 3).map((m) => ({
      id: m.id,
      question: m.question,
      outcomes: m.outcomes,
      tokens: m.tokens,
      volume: m.volume,
      endDate: m.end_date_iso,
    })),
    marketError,
    recommendation,
    betPlaced: !payload.dryRun && betResult && !betResult.error,
    betResult,
    dryRun: payload.dryRun,
    model: researchResponse.model,
    usage: researchResponse.usage,
  });
}

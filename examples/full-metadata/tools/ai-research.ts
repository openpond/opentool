import { flattenMessageContent, generateText } from "opentool/ai";
import { z } from "zod";

const aiConfig = {
  baseUrl: process.env.OPENPOND_GATEWAY_URL,
  apiKey: process.env.OPENPOND_API_KEY,
};

export const schema = z.object({
  query: z
    .string()
    .min(5)
    .describe("Research question or topic to investigate"),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe("Maximum number of web results to inspect"),
  model: z
    .string()
    .optional()
    .describe(
      "Override default model for research (provider/model format or short name)"
    ),
});

export const metadata = {
  name: "ai_research",
  description:
    "Investigate a topic using the gateway websearch tool and return sourced findings",
  annotations: {
    readOnlyHint: true,
    idempotentHint: false,
  },
  discovery: {
    keywords: ["research", "websearch", "exa", "analysis", "ai", "report"],
    category: "ai_assistant",
    useCases: [
      "Collect recent news with citations",
      "Summarize documentation updates",
      "Scan market insights",
      "Compile security advisories",
    ],
    examples: [
      {
        description: "Summarize the latest MCP protocol releases",
        input: {
          query: "Recent Model Context Protocol updates",
          maxResults: 3,
        },
        expectedOutput:
          "Short narrative with bullet citations pointing to authoritative sources.",
      },
      {
        description: "Investigate a new AI model",
        input: {
          query: "OpenAI gpt-5-mini capabilities",
          maxResults: 4,
          model: "claude-4-sonnet-20250514",
        },
        expectedOutput:
          "Structured analysis referencing each source and highlighting strengths/risks.",
      },
    ],
    relatedTools: ["ai_summarize", "trend_monitor", "intel_digest"],
  },
};

export async function POST(request: Request) {
  const payload = schema.parse(await request.json());

  const response = await generateText(
    {
      messages: [
        {
          role: "system" as const,
          content:
            "You are an investigative assistant. Use the websearch tool when the user asks for current information.",
        },
        {
          role: "user" as const,
          content: [
            {
              type: "text" as const,
              text: `Research request: ${payload.query}\nReturn findings with inline citations and a final verdict line.`,
            },
          ],
        },
      ],
      model: payload.model,

      toolExecution: {
        enableTools: true,
        webSearch: {
          limit: payload.maxResults,
        },
      },
      toolChoice: "auto",
    },
    aiConfig
  );

  const analysis = flattenMessageContent(response.message.content);

  return Response.json({
    analysis,
    model: response.model,
    finishReason: response.finishReason,
    usage: response.usage,
  });
}

import { flattenMessageContent, generateText } from "opentool/ai";
import { z } from "zod";

const aiConfig = {
  baseUrl: process.env.OPENPOND_GATEWAY_URL,
  apiKey: process.env.OPENPOND_API_KEY,
};

export const schema = z.object({
  topic: z.string().min(3).describe("Subject to summarize"),
  focus: z
    .string()
    .optional()
    .describe("Key angle or audience focus for the summary"),
  tone: z
    .enum(["neutral", "enthusiastic", "technical", "casual"])
    .default("neutral")
    .describe("Desired tone of the summary"),
  maxTokens: z
    .number()
    .int()
    .min(200)
    .max(1200)
    .default(400)
    .describe("Token limit for the generated summary"),
  model: z
    .string()
    .optional()
    .describe("Override default model (e.g., 'claude-4-sonnet-20250514')"),
});

export const metadata = {
  name: "ai_summarize",
  description:
    "Generate concise summaries tailored to different tones and audiences",
  annotations: {
    readOnlyHint: true,
    idempotentHint: false,
  },
  discovery: {
    keywords: [
      "summary",
      "writing",
      "gpt",
      "content",
      "documentation",
      "analysis",
    ],
    category: "ai_generation",
    useCases: [
      "Produce release note drafts",
      "Summarize product feedback",
      "Generate onboarding copy",
      "Create meeting recaps",
    ],
    examples: [
      {
        description: "Summarize a new feature announcement",
        input: {
          topic: "OpenTool AI package release",
          focus: "Benefits for external tool builders",
          tone: "enthusiastic",
        },
        expectedOutput:
          "A short paragraph highlighting what the AI package enables and why it matters.",
      },
      {
        description: "Create a technical briefing",
        input: {
          topic: "Server-sent events in the OpenPond gateway",
          tone: "technical",
          maxTokens: 600,
        },
        expectedOutput:
          "Detailed explanation that references stream mechanics and abort behavior.",
      },
    ],
    relatedTools: ["ai_brainstorm", "doc_generator", "release_notes"],
  },
};

export async function POST(request: Request) {
  const payload = schema.parse(await request.json());

  const response = await generateText(
    {
      messages: [
        {
          role: "system",
          content:
            "You are a helpful technical writer. Summaries should be factual, concise, and respect the requested tone.",
        },
        {
          role: "user",
          content: [
            `Topic: ${payload.topic}`,
            `Tone: ${payload.tone}`,
            payload.focus ? `Focus: ${payload.focus}` : undefined,
            "Output: A coherent paragraph plus 3 bullet takeaways.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      model: payload.model,
    },
    aiConfig
  );

  const summary = flattenMessageContent(response.message.content);

  return Response.json({
    summary,
    model: response.model,
    finishReason: response.finishReason,
    usage: response.usage,
  });
}

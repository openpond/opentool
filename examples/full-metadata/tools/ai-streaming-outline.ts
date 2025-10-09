import { streamText } from "opentool/ai";
import { z } from "zod";

const aiConfig = {
  baseUrl: process.env.OPENPOND_GATEWAY_URL,
  apiKey: process.env.OPENPOND_API_KEY,
};

export const schema = z.object({
  topic: z.string().min(3).describe("Subject to outline"),
  bulletCount: z
    .number()
    .int()
    .min(3)
    .max(12)
    .default(6)
    .describe("How many bullet points to include"),
  includeSummary: z
    .boolean()
    .default(true)
    .describe("Whether to append a short summary after the bullet list"),
});

export const metadata = {
  name: "ai_streaming_outline",
  description:
    "Demonstrate streaming outline generation with incremental deltas",
  annotations: {
    readOnlyHint: true,
    idempotentHint: false,
  },
  discovery: {
    keywords: ["streaming", "outline", "ai", "demo"],
    category: "ai_generation",
    useCases: [
      "Live-generate outlines for docs",
      "Demonstrate streaming handler usage",
      "Prototype interactive drafting workflows",
    ],
    examples: [
      {
        description: "Create a product launch outline",
        input: {
          topic: "OpenTool AI package launch",
          bulletCount: 5,
          includeSummary: true,
        },
        expectedOutput:
          "Outline text streamed in chunks, with a concluding summary paragraph.",
      },
    ],
    relatedTools: ["ai_summarize", "ai_code_suggestion", "ai_research"],
  },
};

export async function POST(request: Request) {
  const payload = schema.parse(await request.json());

  const textChunks: string[] = [];
  const reasoningChunks: string[] = [];
  const toolSignals: unknown[] = [];
  let usage: Record<string, unknown> | undefined;

  try {
    const { finished } = await streamText(
      {
        messages: [
          {
            role: "system",
            content:
              "You produce well-structured outlines. Stream bullet items as they are ready, then append an optional summary.",
          },
          {
            role: "user",
            content: [
              `Topic: ${payload.topic}`,
              `Bullets: ${payload.bulletCount}`,
              payload.includeSummary
                ? "Include a short summary paragraph."
                : undefined,
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
        generation: {
          temperature: 0.6,
          maxTokens: 600,
          responseFormat: "text",
        },
        includeUsage: true,
        sendReasoning: true,
        handlers: {
          onTextDelta: (delta) => {
            textChunks.push(delta);
          },
          onReasoningDelta: (delta) => {
            reasoningChunks.push(delta);
          },
          onToolCallDelta: (call) => {
            toolSignals.push(call);
          },
          onUsage: (stats) => {
            usage = stats;
          },
        },
      },
      aiConfig
    );

    await finished;
  } catch (error) {
    return Response.json(
      {
        error: "Streaming generation failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }

  return Response.json({
    outline: textChunks.join(""),
    reasoning:
      reasoningChunks.length > 0 ? reasoningChunks.join("") : undefined,
    toolSignals: toolSignals.length > 0 ? toolSignals : undefined,
    usage,
  });
}

import { flattenMessageContent, generateText } from "opentool/ai";
import { z } from "zod";

const aiConfig = {
  baseUrl: process.env.OPENPOND_GATEWAY_URL,
  apiKey: process.env.OPENPOND_API_KEY,
};

export const schema = z.object({
  language: z
    .enum(["typescript", "python", "rust", "go", "bash"])
    .describe("Target programming language"),
  task: z.string().min(5).describe("What the code snippet should accomplish"),
  constraints: z
    .array(z.string().min(1))
    .default([])
    .describe("Additional requirements, such as libraries or style"),
  tests: z
    .boolean()
    .default(true)
    .describe("Whether to include a lightweight test or usage example"),
});

export const metadata = {
  name: "ai_code_suggestion",
  description:
    "Draft language-specific code snippets with optional usage examples",
  annotations: {
    readOnlyHint: true,
    idempotentHint: false,
  },
  discovery: {
    keywords: [
      "code generation",
      "ai",
      "developer",
      "snippet",
      "typescript",
      "python",
    ],
    category: "developer_tools",
    useCases: [
      "Produce quick reference snippets",
      "Draft helper utilities",
      "Prototype CLI commands",
      "Bootstrap integration tests",
    ],
    examples: [
      {
        description: "Generate a TypeScript utility",
        input: {
          language: "typescript",
          task: "Convert snake_case keys to camelCase",
          constraints: ["avoid lodash", "include JSDoc"],
        },
        expectedOutput:
          "Complete function with inline documentation and optional usage block.",
      },
      {
        description: "Draft a Python CLI snippet",
        input: {
          language: "python",
          task: "List files in a directory with size metadata",
          tests: false,
        },
        expectedOutput:
          "Self-contained CLI using argparse with error handling.",
      },
    ],
    relatedTools: ["ai_research", "ai_summarize", "code_review"],
    performance: {
      estimatedDuration: 15,
      isAsync: false,
    },
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
            "You are an expert software engineer. Provide well-commented code that follows modern best practices.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Language: ${payload.language} Task: ${payload.task}`,
            },
          ],
        },
      ],
    },
    aiConfig
  );

  const code = flattenMessageContent(response.message.content);
  return Response.json({
    code: code?.trim() ?? "",
    model: response.model,
    finishReason: response.finishReason,
    usage: response.usage,
  });
}

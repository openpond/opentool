import { z } from "zod";

// Define the input schema for the greeting tool
export const schema = z.object({
  name: z.string().describe("The name of the person to greet"),
  language: z
    .enum(["english", "spanish", "french"])
    .optional()
    .describe("Language for the greeting"),
});

// Export the tool function
export async function TOOL(params: z.infer<typeof schema>) {
  if (params.language === "spanish") {
    return `Hola, ${params.name}! Welcome to the AI Assistant.`;
  }
  if (params.language === "french") {
    return `Bonjour, ${params.name}! Welcome to the AI Assistant.`;
  }
  return `Hello, ${params.name}! Welcome to the AI Assistant.`;
}

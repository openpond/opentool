import { z } from "zod";

export const schema = z.object({
  operation: z
    .enum(["add", "subtract", "multiply", "divide"])
    .describe("Mathematical operation to perform"),
  a: z.number().describe("First number"),
  b: z.number().describe("Second number"),
});

export async function TOOL(params: z.infer<typeof schema>) {
  const { operation, a, b } = params;

  let result: number;

  switch (operation) {
    case "add":
      result = a + b;
      break;
    case "subtract":
      result = a - b;
      break;
    case "multiply":
      result = a * b;
      break;
    case "divide":
      if (b === 0) {
        throw new Error("Cannot divide by zero");
      }
      result = a / b;
      break;
    default:
      throw new Error("Invalid operation");
  }

  return `${a} ${operation} ${b} = ${result}`;
}

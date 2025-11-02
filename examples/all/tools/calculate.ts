import { z } from "zod";

export const schema = z.object({
  operation: z
    .enum(["add", "subtract", "multiply", "divide"])
    .describe("Mathematical operation to perform"),
  a: z.number().describe("First number"),
  b: z.number().describe("Second number"),
});

export const metadata = {
  name: "calculate",
  description: "Perform basic mathematical operations on two numbers",
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
  payment: {
    amountUSDC: 0.001,
    description: "Basic mathematical operations",
    x402: true,
    plain402: true,
    acceptedMethods: ["x402", "402"],
    acceptedCurrencies: ["USDC"],
    chains: [8453],
    facilitator: "opentool",
  },
  discovery: {
    keywords: ["math", "calculation", "arithmetic", "numbers", "compute"],
    category: "mathematics",
    useCases: [
      "Basic calculator functionality in applications",
      "Financial calculations and cost computations",
      "Mathematical operations in data processing",
      "Educational tools for learning arithmetic",
    ],
    examples: [
      {
        description: "Simple addition",
        input: { operation: "add", a: 5, b: 3 },
        expectedOutput: "5 add 3 = 8",
      },
      {
        description: "Division with decimal result",
        input: { operation: "divide", a: 10, b: 3 },
        expectedOutput: "10 divide 3 = 3.3333333333333335",
      },
    ],
    relatedTools: ["advanced_math", "statistical_analysis"],
    performance: {
      estimatedDuration: 10,
      isAsync: false,
    },
    cost: {
      complexity: "low",
      resourceUsage: {
        cpu: "low",
        memory: "low",
        network: "low",
      },
    },
    safety: {
      requiresConfirmation: false,
      isReversible: true,
      sideEffects: [],
      validationErrors: ["Division by zero"],
    },
  },
};

export async function POST(request: Request) {
  const payload = await request.json();
  const { operation, a, b } = schema.parse(payload);

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
        return Response.json(
          { error: "Cannot divide by zero" },
          { status: 400 }
        );
      }
      result = a / b;
      break;
    default:
      return Response.json({ error: "Invalid operation" }, { status: 400 });
  }

  return Response.json({
    result: `${a} ${operation} ${b} = ${result}`,
    computation: { operation, a, b, result },
  });
}

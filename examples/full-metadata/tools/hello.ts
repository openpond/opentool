import { z } from "zod";

export const schema = z.object({
  name: z.string().describe("Name of the person to greet"),
});

export const metadata = {
  name: "hello",
  description: "Simple greeting tool for testing",
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
  },
};

export async function POST(request: Request) {
  const body = await request.json();

  return Response.json({
    message: `Hello, ${body.name}!`,
    timestamp: new Date().toISOString()
  });
}

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
  const payload = await request.json();
  const { name } = schema.parse(payload);

  return Response.json({
    message: `Hello, ${name}!`,
    timestamp: new Date().toISOString()
  });
}

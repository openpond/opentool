import { z } from "zod";

export const schema = z.object({
  message: z.string().default("ping").describe("Optional message to echo back"),
});

export const metadata = {
  name: "mcp_ping",
  description: "Simple tool to verify MCP + HTTP dual-mode behaviour",
};

export const mcp = { enabled: true };

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    json = {};
  }

  const { message } = schema.parse(json ?? {});

  return Response.json({
    message,
    transport: request.headers.get("x-opentool-invocation") ?? "http",
    timestamp: new Date().toISOString(),
  });
}

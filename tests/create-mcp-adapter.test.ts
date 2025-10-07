import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { createMcpAdapter, responseToToolResponse } from "../src/adapters/mcp";

const noopLegacy = async () => ({
  content: [{ type: "text", text: "legacy" }],
});

test("createMcpAdapter bridges HTTP handler responses", async () => {
  const schema = z.object({ name: z.string() });
  const adapter = createMcpAdapter({
    name: "hello",
    schema,
    httpHandlers: {
      POST: async (request: Request) => {
        const body = await request.json();
        return Response.json({ greeting: `Hello ${body.name}!` });
      },
    },
  });

  const result = await adapter({ name: "world" });

  assert.equal(result.isError ?? false, false);
  assert.equal(result.content.length, 1);
  assert.equal(result.content[0]?.type, "text");
  assert.match(result.content[0]?.text ?? "", /Hello world!/);
});

test("createMcpAdapter falls back to legacy TOOL handlers", async () => {
  const adapter = createMcpAdapter({
    name: "legacy",
    httpHandlers: {},
    legacyTool: noopLegacy,
  });

  const result = await adapter({});
  assert.equal(result.isError ?? false, false);
  assert.equal(result.content[0]?.text, "legacy");
});

test("responseToToolResponse converts JSON payloads", async () => {
  const response = Response.json({ message: "ok" });
  const toolResponse = await responseToToolResponse(response);
  assert.equal(toolResponse.isError, false);
  assert.equal(toolResponse.content[0]?.type, "text");
  assert.match(toolResponse.content[0]?.text ?? "", /message/);
});

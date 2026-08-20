import assert from "node:assert/strict";
import { test } from "node:test";

import { executeTool } from "../src/store/index";

test("executeTool can return parsed streaming events", async () => {
  const encoder = new TextEncoder();
  const responseBody = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          [
            "event: run.started",
            'data: {"runId":"run_test"}',
            "",
            "event: response.delta",
            'data: {"text":"hello"}',
            "",
          ].join("\n"),
        ),
      );
      controller.close();
    },
  });

  const result = await executeTool(
    {
      appId: "app_test",
      deploymentId: "deployment_test",
      toolName: "chat",
      stream: true,
      body: { messages: [] },
    },
    {
      baseUrl: "https://api.openpond.test",
      apiKey: "opk_test",
      fetchFn: async (input, init) => {
        assert.equal(String(input), "https://api.openpond.test/apps/tools/execute");
        assert.equal(init?.method, "POST");
        assert.equal((init?.headers as Record<string, string>).accept, "text/event-stream");
        return new Response(responseBody, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        });
      },
    },
  );

  const events = [];
  for await (const event of result.events) {
    events.push(event);
  }

  assert.equal(result.response.status, 200);
  assert.deepEqual(events, [
    { event: "run.started", data: { runId: "run_test" } },
    { event: "response.delta", data: { text: "hello" } },
  ]);
});

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  fetchNewsEventSignal,
  fetchNewsPropositionSignal,
} from "../src/adapters/news";

const newsGatewayBase = process.env.OPENPOND_GATEWAY_URL ?? null;
const question = "Is the US still at war with Iran?";
const testLiveNews = newsGatewayBase ? test : test.skip;

testLiveNews("live gateway smoke: proposition signal resolves current Iran war example", async () => {
  const propositionSignal = await fetchNewsPropositionSignal({
    gatewayBase: newsGatewayBase!,
    question,
    includePredictionMarkets: true,
    maxAgeHours: 24 * 30,
    candidateLimit: 4,
  });

  assert.equal(propositionSignal.question, question);
  assert.ok(
    ["yes", "no", "unclear", "no_matching_event"].includes(
      propositionSignal.propositionStatus,
    ),
  );
  assert.equal(typeof propositionSignal.reasoning, "string");
  assert.ok(
    propositionSignal.resolvedEventKey,
    "expected Iran war question to resolve to a canonical event key",
  );
});

testLiveNews("live gateway smoke: resolved Iran event can be fetched through event signal", async () => {
  const propositionSignal = await fetchNewsPropositionSignal({
    gatewayBase: newsGatewayBase!,
    question,
    includePredictionMarkets: true,
    maxAgeHours: 24 * 30,
    candidateLimit: 4,
  });

  assert.ok(propositionSignal.resolvedEventKey);
  const eventSignal = await fetchNewsEventSignal({
    gatewayBase: newsGatewayBase!,
    eventKey: propositionSignal.resolvedEventKey ?? undefined,
    includePredictionMarkets: true,
    maxAgeHours: 24 * 30,
  });

  assert.equal(eventSignal.eventKey, propositionSignal.resolvedEventKey);
  assert.equal(typeof eventSignal.eventConfidence, "number");
  assert.equal(typeof eventSignal.triggerPassed, "boolean");
});

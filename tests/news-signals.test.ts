import assert from "node:assert/strict";
import { test } from "node:test";

import {
  NewsSignalClient,
  evaluateNewsContinuationGate,
  fetchNewsEventSignal,
  fetchNewsPropositionSignal,
  resolveNewsGatewayBase,
} from "../src/adapters/news";

function withMockFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  const original = globalThis.fetch;
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    return handler(url, init);
  };
  return () => {
    globalThis.fetch = original;
  };
}

test("resolveNewsGatewayBase trims trailing slash and honors override", () => {
  assert.equal(
    resolveNewsGatewayBase("https://gateway.example.test/"),
    "https://gateway.example.test",
  );
});

test("fetchNewsEventSignal posts policy thresholds to gateway", async () => {
  const restore = withMockFetch(async (url, init) => {
    assert.equal(url, "https://gateway.example/v1/news/event-signal");
    assert.equal(init?.method, "POST");
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    assert.equal(body.eventKey, "geopolitics:us-iran-conflict");
    assert.equal(body.includePredictionMarkets, true);
    assert.equal((body.policy as Record<string, unknown>).minConfidence, 0.8);
    return new Response(
      JSON.stringify({
        eventId: "evt_1",
        eventKey: "geopolitics:us-iran-conflict",
        title: "US-Iran conflict",
        eventState: "escalation",
        eventConfidence: 0.91,
        confidenceBreakdown: {
          baseScore: 0.8,
          winningBucketScore: 0.9,
          opposingPenalty: 0,
          contradictionPenalty: 0,
          stateBonus: 0.1,
          finalScore: 0.91,
        },
        signal: "escalation",
        triggerPassed: true,
        policyRisk: "low",
        effectivePolicy: {
          minConfidence: 0.8,
          minIndependentSources: 2,
          minTierASources: 1,
          cooldownMinutes: 0,
        },
        whyNotTriggered: null,
        warnings: [],
        contradictionCount: 0,
        supportingSourceCount: 3,
        tierASourceCount: 2,
        rebuttingSourceSummary: [],
        evidence: [],
        dataAgeMs: 120000,
        predictionMarketContext: {
          matchedMarkets: [
            {
              marketId: "pm_1",
              eventId: "30829",
              eventSlug: "democratic-presidential-nominee-2028",
              eventTitle: "Democratic Presidential Nominee 2028",
              conditionId: "0xabc",
              title: "Will Oprah Winfrey win the 2028 Democratic presidential nomination?",
              slug: "will-oprah-winfrey-win-the-2028-democratic-presidential-nomination",
              category: "Politics",
              yesProbability: 0.02,
              noProbability: 0.98,
              leadingOutcome: "No",
              leadingProbability: 0.98,
              volume: 1000,
              liquidity: 5000,
              openInterest: 2500,
              probabilityDelta1h: 0,
              probabilityDelta24h: -0.01,
              fetchedAt: "2026-03-24T14:00:00.000Z",
            },
          ],
          consensusProbability: 0.98,
          probabilityDelta1h: 0,
          probabilityDelta24h: -0.01,
          liquidityWeightedScore: 0.98,
          predictionDisagreementScore: 0,
          dataAgeMs: 120000,
        },
      }),
      { status: 200 },
    );
  });

  try {
    const signal = await fetchNewsEventSignal({
      gatewayBase: "https://gateway.example",
      eventKey: "geopolitics:us-iran-conflict",
      includePredictionMarkets: true,
      minConfidence: 0.8,
      minIndependentSources: 2,
      minTierASources: 1,
    });

    assert.equal(signal.eventKey, "geopolitics:us-iran-conflict");
    assert.equal(signal.triggerPassed, true);
    assert.equal(
      signal.predictionMarketContext?.matchedMarkets[0]?.eventSlug,
      "democratic-presidential-nominee-2028",
    );
  } finally {
    restore();
  }
});

test("fetchNewsPropositionSignal posts question and asOf to gateway", async () => {
  const restore = withMockFetch(async (url, init) => {
    assert.equal(url, "https://gateway.example/v1/news/event-proposition-signal");
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    assert.equal(body.question, "Is the US still at war with Iran?");
    assert.equal(body.asOf, "2026-03-07T00:00:00.000Z");
    return new Response(
      JSON.stringify({
        question: "Is the US still at war with Iran?",
        query: null,
        propositionType: null,
        propositionStatus: "yes",
        answer: "yes",
        propositionConfidence: 0.88,
        reasoning: "Recent evidence still supports active conflict.",
        evidenceWindowSummary: "Strong recent supporting evidence.",
        resolvedEventId: "evt_1",
        resolvedEventKey: "geopolitics:us-iran-conflict",
        resolvedEventTitle: "US-Iran conflict",
        eventState: "escalation",
        eventConfidence: 0.91,
        confidenceBreakdown: {
          baseScore: 0.8,
          winningBucketScore: 0.9,
          opposingPenalty: 0,
          contradictionPenalty: 0,
          stateBonus: 0.1,
          finalScore: 0.91,
        },
        supportingEvidence: [],
        rebuttingEvidence: [],
        supportingEvidenceArticleIds: [],
        rebuttingEvidenceArticleIds: [],
        operatorReviewRecommended: false,
        dataAgeMs: 60000,
        predictionMarketContext: null,
      }),
      { status: 200 },
    );
  });

  try {
    const signal = await fetchNewsPropositionSignal({
      gatewayBase: "https://gateway.example",
      question: "Is the US still at war with Iran?",
      asOf: "2026-03-07T00:00:00.000Z",
    });

    assert.equal(signal.answer, "yes");
    assert.equal(signal.resolvedEventKey, "geopolitics:us-iran-conflict");
  } finally {
    restore();
  }
});

test("NewsSignalClient reuses configured gateway base and fetch implementation", async () => {
  const restore = withMockFetch(async (url) => {
    assert.equal(url, "https://gateway.example/v1/news/event-proposition-signal");
    return new Response(
      JSON.stringify({
        question: "Is the US still at war with Iran?",
        query: null,
        propositionType: null,
        propositionStatus: "unclear",
        answer: "unclear",
        propositionConfidence: 0.52,
        reasoning: "Mixed evidence.",
        evidenceWindowSummary: "Mixed recent evidence.",
        resolvedEventId: null,
        resolvedEventKey: null,
        resolvedEventTitle: null,
        eventState: null,
        eventConfidence: null,
        confidenceBreakdown: null,
        supportingEvidence: [],
        rebuttingEvidence: [],
        supportingEvidenceArticleIds: [],
        rebuttingEvidenceArticleIds: [],
        operatorReviewRecommended: true,
        dataAgeMs: 30000,
        predictionMarketContext: null,
      }),
      { status: 200 },
    );
  });

  try {
    const client = new NewsSignalClient({
      gatewayBase: "https://gateway.example",
    });
    const signal = await client.propositionSignal({
      question: "Is the US still at war with Iran?",
    });
    assert.equal(signal.propositionStatus, "unclear");
  } finally {
    restore();
  }
});

test("evaluateNewsContinuationGate allows passing event signals", () => {
  const result = evaluateNewsContinuationGate(
    {
      eventId: "evt_1",
      eventKey: "geopolitics:us-iran-conflict",
      title: "US-Iran conflict",
      eventState: "escalation",
      eventConfidence: 0.91,
      confidenceBreakdown: {
        baseScore: 0.8,
        winningBucketScore: 0.9,
        opposingPenalty: 0,
        contradictionPenalty: 0,
        stateBonus: 0.1,
        finalScore: 0.91,
      },
      signal: "escalation",
      triggerPassed: true,
      policyRisk: "low",
      effectivePolicy: {
        minConfidence: 0.75,
        minIndependentSources: 2,
        minTierASources: 1,
        cooldownMinutes: 0,
      },
      whyNotTriggered: null,
      warnings: [],
      contradictionCount: 0,
      supportingSourceCount: 4,
      tierASourceCount: 2,
      rebuttingSourceSummary: [],
      evidence: [],
      dataAgeMs: 1000,
      predictionMarketContext: null,
    },
    {
      mode: "event",
      minConfidence: 0.8,
      minIndependentSources: 2,
      minTierASources: 1,
    },
  );

  assert.equal(result.allowed, true);
  assert.equal(result.action, "continue");
});

test("evaluateNewsContinuationGate blocks failing proposition signals", () => {
  const result = evaluateNewsContinuationGate(
    {
      question: "Is the US still at war with Iran?",
      query: null,
      propositionType: null,
      propositionStatus: "no",
      answer: "no",
      propositionConfidence: 0.66,
      reasoning: "Ceasefire evidence outweighs escalation evidence.",
      evidenceWindowSummary: "Recent de-escalation evidence.",
      resolvedEventId: "evt_1",
      resolvedEventKey: "geopolitics:us-iran-conflict",
      resolvedEventTitle: "US-Iran conflict",
      eventState: "de_escalation",
      eventConfidence: 0.71,
      confidenceBreakdown: {
        baseScore: 0.6,
        winningBucketScore: 0.66,
        opposingPenalty: 0,
        contradictionPenalty: 0,
        stateBonus: 0.05,
        finalScore: 0.71,
      },
      supportingEvidence: [],
      rebuttingEvidence: [],
      supportingEvidenceArticleIds: [],
      rebuttingEvidenceArticleIds: [],
      operatorReviewRecommended: false,
      dataAgeMs: 1000,
      predictionMarketContext: null,
    },
    {
      mode: "proposition",
      expectedAnswer: "yes",
      minConfidence: 0.75,
      onBlocked: "pause",
    },
  );

  assert.equal(result.allowed, false);
  assert.equal(result.action, "pause");
  assert.deepEqual(result.blockingFactors, ["unexpected_answer", "confidence_below_threshold"]);
});

// src/adapters/news/signals.ts
var DEFAULT_OPENPOND_GATEWAY_URL = "https://gateway.openpond.dev";
function resolveFetchImplementation(override) {
  const fetchImplementation = override ?? globalThis.fetch;
  if (!fetchImplementation) {
    throw new Error(
      "No fetch implementation available. Provide one via NewsSignalClientConfig.fetchImplementation."
    );
  }
  return fetchImplementation;
}
function resolveNewsGatewayBase(override) {
  const value = override ?? process.env.OPENPOND_GATEWAY_URL ?? DEFAULT_OPENPOND_GATEWAY_URL;
  if (typeof value !== "string") {
    throw new Error("OPENPOND_GATEWAY_URL is required.");
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("OPENPOND_GATEWAY_URL is required.");
  }
  return trimmed.replace(/\/$/, "");
}
function normalizeAsOf(value) {
  if (value == null) return void 0;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("asOf must be a valid ISO-8601 datetime or Date.");
  }
  return date.toISOString();
}
async function postGatewayJson(params) {
  const gatewayBase = resolveNewsGatewayBase(params.gatewayBase);
  const fetchImplementation = resolveFetchImplementation(params.fetchImplementation);
  const response = await fetchImplementation(`${gatewayBase}${params.path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params.body)
  });
  const text = await response.text().catch(() => "");
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    throw new Error(
      `Gateway request failed (${response.status}) for ${params.path}: ${typeof payload === "string" && payload ? payload : "no_body"}`
    );
  }
  return payload;
}
async function fetchNewsEventSignal(params) {
  if (!params.query?.trim() && !params.eventKey?.trim()) {
    throw new Error("query or eventKey is required.");
  }
  return postGatewayJson({
    path: "/v1/news/event-signal",
    gatewayBase: params.gatewayBase,
    fetchImplementation: params.fetchImplementation,
    body: {
      ...params.query?.trim() ? { query: params.query.trim() } : {},
      ...params.eventKey?.trim() ? { eventKey: params.eventKey.trim() } : {},
      ...normalizeAsOf(params.asOf) ? { asOf: normalizeAsOf(params.asOf) } : {},
      ...typeof params.includePredictionMarkets === "boolean" ? { includePredictionMarkets: params.includePredictionMarkets } : {},
      ...typeof params.ingestOnRequest === "boolean" ? { ingestOnRequest: params.ingestOnRequest } : {},
      ...typeof params.maxAgeHours === "number" ? { maxAgeHours: params.maxAgeHours } : {},
      policy: {
        ...typeof params.minConfidence === "number" ? { minConfidence: params.minConfidence } : {},
        ...typeof params.minIndependentSources === "number" ? { minIndependentSources: params.minIndependentSources } : {},
        ...typeof params.minTierASources === "number" ? { minTierASources: params.minTierASources } : {}
      }
    }
  });
}
async function fetchNewsPropositionSignal(params) {
  const question = params.question.trim();
  if (!question) {
    throw new Error("question is required.");
  }
  return postGatewayJson({
    path: "/v1/news/event-proposition-signal",
    gatewayBase: params.gatewayBase,
    fetchImplementation: params.fetchImplementation,
    body: {
      question,
      ...params.query?.trim() ? { query: params.query.trim() } : {},
      ...params.eventKey?.trim() ? { eventKey: params.eventKey.trim() } : {},
      ...params.propositionType?.trim() ? { propositionType: params.propositionType.trim() } : {},
      ...normalizeAsOf(params.asOf) ? { asOf: normalizeAsOf(params.asOf) } : {},
      ...typeof params.includePredictionMarkets === "boolean" ? { includePredictionMarkets: params.includePredictionMarkets } : {},
      ...typeof params.ingestOnRequest === "boolean" ? { ingestOnRequest: params.ingestOnRequest } : {},
      ...typeof params.maxAgeHours === "number" ? { maxAgeHours: params.maxAgeHours } : {},
      ...typeof params.candidateLimit === "number" ? { candidateLimit: params.candidateLimit } : {}
    }
  });
}
function evaluateNewsContinuationGate(signal, gate) {
  const blockedAction = gate.onBlocked ?? "skip";
  const blockingFactors = [];
  if (gate.mode === "event") {
    const eventSignal = signal;
    if (gate.requireTriggerPassed !== false && !eventSignal.triggerPassed) {
      blockingFactors.push("trigger_not_passed");
    }
    if (typeof gate.minConfidence === "number" && eventSignal.eventConfidence < gate.minConfidence) {
      blockingFactors.push("confidence_below_threshold");
    }
    if (typeof gate.maxDataAgeMs === "number" && typeof eventSignal.dataAgeMs === "number" && eventSignal.dataAgeMs > gate.maxDataAgeMs) {
      blockingFactors.push("signal_too_stale");
    }
    if (typeof gate.minIndependentSources === "number" && eventSignal.supportingSourceCount < gate.minIndependentSources) {
      blockingFactors.push("insufficient_supporting_sources");
    }
    if (typeof gate.minTierASources === "number" && eventSignal.tierASourceCount < gate.minTierASources) {
      blockingFactors.push("insufficient_tier_a_sources");
    }
  } else {
    const propositionSignal = signal;
    if (gate.requireResolvedEvent !== false && propositionSignal.propositionStatus === "no_matching_event") {
      blockingFactors.push("no_matching_event");
    }
    if (gate.expectedAnswer && propositionSignal.answer !== gate.expectedAnswer) {
      blockingFactors.push("unexpected_answer");
    }
    if (typeof gate.minConfidence === "number" && propositionSignal.propositionConfidence < gate.minConfidence) {
      blockingFactors.push("confidence_below_threshold");
    }
    if (typeof gate.maxDataAgeMs === "number" && typeof propositionSignal.dataAgeMs === "number" && propositionSignal.dataAgeMs > gate.maxDataAgeMs) {
      blockingFactors.push("signal_too_stale");
    }
  }
  if (blockingFactors.length === 0) {
    return {
      allowed: true,
      action: "continue",
      reason: "All continuation gate checks passed.",
      matchedRule: gate.mode,
      blockingFactors: []
    };
  }
  return {
    allowed: false,
    action: blockedAction,
    reason: `Blocked by continuation gate: ${blockingFactors.join(", ")}.`,
    matchedRule: gate.mode,
    blockingFactors
  };
}
var NewsSignalClient = class {
  constructor(config = {}) {
    this.gatewayBase = resolveNewsGatewayBase(config.gatewayBase);
    this.fetchImplementation = resolveFetchImplementation(config.fetchImplementation);
  }
  eventSignal(params) {
    return fetchNewsEventSignal({
      ...params,
      gatewayBase: this.gatewayBase,
      fetchImplementation: this.fetchImplementation
    });
  }
  propositionSignal(params) {
    return fetchNewsPropositionSignal({
      ...params,
      gatewayBase: this.gatewayBase,
      fetchImplementation: this.fetchImplementation
    });
  }
};

export { DEFAULT_OPENPOND_GATEWAY_URL, NewsSignalClient, evaluateNewsContinuationGate, fetchNewsEventSignal, fetchNewsPropositionSignal, resolveNewsGatewayBase };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
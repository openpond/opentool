const DEFAULT_OPENPOND_GATEWAY_URL = "https://gateway.openpond.dev";

export type NewsEventState =
  | "monitoring"
  | "escalation"
  | "de_escalation"
  | "resolved"
  | "contradiction";

export type NewsSignalValue =
  | "none"
  | "escalation"
  | "de_escalation"
  | "resolved"
  | "contradiction";

export type NewsPropositionAnswer = "yes" | "no" | "unclear";
export type NewsPropositionStatus = NewsPropositionAnswer | "no_matching_event";
export type NewsContinuationAction = "continue" | "skip" | "pause";

export type NewsPredictionMarketMatchedMarket = {
  marketId: string;
  eventId?: string | null;
  eventSlug?: string | null;
  eventTitle?: string | null;
  conditionId?: string | null;
  title: string;
  slug?: string | null;
  category?: string | null;
  yesProbability?: number | null;
  noProbability?: number | null;
  leadingOutcome?: string | null;
  leadingProbability?: number | null;
  volume?: number | null;
  liquidity?: number | null;
  openInterest?: number | null;
  probabilityDelta1h?: number | null;
  probabilityDelta24h?: number | null;
  fetchedAt: string;
};

export type NewsPredictionMarketContext = {
  matchedMarkets: NewsPredictionMarketMatchedMarket[];
  consensusProbability?: number | null;
  probabilityDelta1h?: number | null;
  probabilityDelta24h?: number | null;
  liquidityWeightedScore?: number | null;
  predictionDisagreementScore?: number | null;
  dataAgeMs?: number | null;
} | null;

export type NewsSignalEvidence = {
  articleId: string;
  sourceId: string;
  sourceName: string;
  title: string;
  canonicalUrl: string;
  claimType: string;
  claimPolarity: string;
  evidenceConfidence: number;
  evidenceAt: string;
  summary?: string | null;
  contentPreview?: string | null;
};

export type NewsSignalConfidenceBreakdown = {
  baseScore: number;
  winningBucketScore: number;
  opposingPenalty: number;
  contradictionPenalty: number;
  stateBonus: number;
  finalScore: number;
};

export type NewsEventSignalPolicy = {
  minConfidence: number;
  minIndependentSources: number;
  minTierASources: number;
  cooldownMinutes: number;
  allowedSourceIds?: string[];
};

export type NewsEventSignal = {
  eventId: string;
  eventKey: string;
  title: string | null;
  eventState: NewsEventState;
  eventConfidence: number;
  confidenceBreakdown: NewsSignalConfidenceBreakdown;
  signal: NewsSignalValue;
  triggerPassed: boolean;
  policyRisk: "low" | "medium" | "high";
  effectivePolicy: NewsEventSignalPolicy;
  whyNotTriggered: string | null;
  warnings: string[];
  contradictionCount: number;
  supportingSourceCount: number;
  tierASourceCount: number;
  rebuttingSourceSummary: Array<{
    sourceId: string;
    sourceName: string;
    title: string;
  }>;
  evidence: NewsSignalEvidence[];
  dataAgeMs: number | null;
  predictionMarketContext: NewsPredictionMarketContext;
};

export type NewsPropositionSignal = {
  question: string;
  query: string | null;
  propositionType: string | null;
  propositionStatus: NewsPropositionStatus;
  answer: NewsPropositionAnswer;
  propositionConfidence: number;
  reasoning: string;
  evidenceWindowSummary: string;
  resolvedEventId: string | null;
  resolvedEventKey: string | null;
  resolvedEventTitle: string | null;
  eventState: NewsEventState | null;
  eventConfidence: number | null;
  confidenceBreakdown: NewsSignalConfidenceBreakdown | null;
  supportingEvidence: NewsSignalEvidence[];
  rebuttingEvidence: NewsSignalEvidence[];
  supportingEvidenceArticleIds: string[];
  rebuttingEvidenceArticleIds: string[];
  operatorReviewRecommended: boolean;
  dataAgeMs: number | null;
  predictionMarketContext: NewsPredictionMarketContext;
};

export type NewsEventSignalRequest = {
  gatewayBase?: string | null;
  fetchImplementation?: typeof fetch;
  query?: string;
  eventKey?: string;
  asOf?: string | Date | null;
  includePredictionMarkets?: boolean;
  ingestOnRequest?: boolean;
  maxAgeHours?: number;
  minConfidence?: number;
  minIndependentSources?: number;
  minTierASources?: number;
};

export type NewsPropositionSignalRequest = {
  gatewayBase?: string | null;
  fetchImplementation?: typeof fetch;
  question: string;
  query?: string;
  eventKey?: string;
  propositionType?: string;
  asOf?: string | Date | null;
  includePredictionMarkets?: boolean;
  ingestOnRequest?: boolean;
  maxAgeHours?: number;
  candidateLimit?: number;
};

export type NewsSignalClientConfig = {
  gatewayBase?: string | null;
  fetchImplementation?: typeof fetch;
};

export type NewsEventContinuationGate = {
  mode: "event";
  minConfidence?: number;
  maxDataAgeMs?: number;
  minIndependentSources?: number;
  minTierASources?: number;
  requireTriggerPassed?: boolean;
  onBlocked?: Exclude<NewsContinuationAction, "continue">;
};

export type NewsPropositionContinuationGate = {
  mode: "proposition";
  expectedAnswer?: NewsPropositionAnswer;
  minConfidence?: number;
  maxDataAgeMs?: number;
  requireResolvedEvent?: boolean;
  onBlocked?: Exclude<NewsContinuationAction, "continue">;
};

export type NewsContinuationGate = NewsEventContinuationGate | NewsPropositionContinuationGate;

export type NewsContinuationGateResult = {
  allowed: boolean;
  action: NewsContinuationAction;
  reason: string;
  matchedRule: NewsContinuationGate["mode"];
  blockingFactors: string[];
};

function resolveFetchImplementation(override?: typeof fetch): typeof fetch {
  const fetchImplementation = override ?? globalThis.fetch;
  if (!fetchImplementation) {
    throw new Error(
      "No fetch implementation available. Provide one via NewsSignalClientConfig.fetchImplementation.",
    );
  }
  return fetchImplementation;
}

export function resolveNewsGatewayBase(override?: string | null): string {
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

function normalizeAsOf(value?: string | Date | null): string | undefined {
  if (value == null) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("asOf must be a valid ISO-8601 datetime or Date.");
  }
  return date.toISOString();
}

async function postGatewayJson<T>(params: {
  path: string;
  body: Record<string, unknown>;
  gatewayBase?: string | null | undefined;
  fetchImplementation?: typeof fetch | undefined;
}): Promise<T> {
  const gatewayBase = resolveNewsGatewayBase(params.gatewayBase);
  const fetchImplementation = resolveFetchImplementation(params.fetchImplementation);
  const response = await fetchImplementation(`${gatewayBase}${params.path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params.body),
  });
  const text = await response.text().catch(() => "");
  let payload: unknown = null;
  try {
    payload = text ? (JSON.parse(text) as unknown) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    throw new Error(
      `Gateway request failed (${response.status}) for ${params.path}: ${
        typeof payload === "string" && payload ? payload : "no_body"
      }`,
    );
  }
  return payload as T;
}

export async function fetchNewsEventSignal(
  params: NewsEventSignalRequest,
): Promise<NewsEventSignal> {
  if (!params.query?.trim() && !params.eventKey?.trim()) {
    throw new Error("query or eventKey is required.");
  }

  return postGatewayJson<NewsEventSignal>({
    path: "/v1/news/event-signal",
    gatewayBase: params.gatewayBase,
    fetchImplementation: params.fetchImplementation,
    body: {
      ...(params.query?.trim() ? { query: params.query.trim() } : {}),
      ...(params.eventKey?.trim() ? { eventKey: params.eventKey.trim() } : {}),
      ...(normalizeAsOf(params.asOf) ? { asOf: normalizeAsOf(params.asOf) } : {}),
      ...(typeof params.includePredictionMarkets === "boolean"
        ? { includePredictionMarkets: params.includePredictionMarkets }
        : {}),
      ...(typeof params.ingestOnRequest === "boolean"
        ? { ingestOnRequest: params.ingestOnRequest }
        : {}),
      ...(typeof params.maxAgeHours === "number" ? { maxAgeHours: params.maxAgeHours } : {}),
      policy: {
        ...(typeof params.minConfidence === "number"
          ? { minConfidence: params.minConfidence }
          : {}),
        ...(typeof params.minIndependentSources === "number"
          ? { minIndependentSources: params.minIndependentSources }
          : {}),
        ...(typeof params.minTierASources === "number"
          ? { minTierASources: params.minTierASources }
          : {}),
      },
    },
  });
}

export async function fetchNewsPropositionSignal(
  params: NewsPropositionSignalRequest,
): Promise<NewsPropositionSignal> {
  const question = params.question.trim();
  if (!question) {
    throw new Error("question is required.");
  }

  return postGatewayJson<NewsPropositionSignal>({
    path: "/v1/news/event-proposition-signal",
    gatewayBase: params.gatewayBase,
    fetchImplementation: params.fetchImplementation,
    body: {
      question,
      ...(params.query?.trim() ? { query: params.query.trim() } : {}),
      ...(params.eventKey?.trim() ? { eventKey: params.eventKey.trim() } : {}),
      ...(params.propositionType?.trim() ? { propositionType: params.propositionType.trim() } : {}),
      ...(normalizeAsOf(params.asOf) ? { asOf: normalizeAsOf(params.asOf) } : {}),
      ...(typeof params.includePredictionMarkets === "boolean"
        ? { includePredictionMarkets: params.includePredictionMarkets }
        : {}),
      ...(typeof params.ingestOnRequest === "boolean"
        ? { ingestOnRequest: params.ingestOnRequest }
        : {}),
      ...(typeof params.maxAgeHours === "number" ? { maxAgeHours: params.maxAgeHours } : {}),
      ...(typeof params.candidateLimit === "number"
        ? { candidateLimit: params.candidateLimit }
        : {}),
    },
  });
}

export function evaluateNewsContinuationGate(
  signal: NewsEventSignal | NewsPropositionSignal,
  gate: NewsContinuationGate,
): NewsContinuationGateResult {
  const blockedAction = gate.onBlocked ?? "skip";
  const blockingFactors: string[] = [];

  if (gate.mode === "event") {
    const eventSignal = signal as NewsEventSignal;
    if (gate.requireTriggerPassed !== false && !eventSignal.triggerPassed) {
      blockingFactors.push("trigger_not_passed");
    }
    if (
      typeof gate.minConfidence === "number" &&
      eventSignal.eventConfidence < gate.minConfidence
    ) {
      blockingFactors.push("confidence_below_threshold");
    }
    if (
      typeof gate.maxDataAgeMs === "number" &&
      typeof eventSignal.dataAgeMs === "number" &&
      eventSignal.dataAgeMs > gate.maxDataAgeMs
    ) {
      blockingFactors.push("signal_too_stale");
    }
    if (
      typeof gate.minIndependentSources === "number" &&
      eventSignal.supportingSourceCount < gate.minIndependentSources
    ) {
      blockingFactors.push("insufficient_supporting_sources");
    }
    if (
      typeof gate.minTierASources === "number" &&
      eventSignal.tierASourceCount < gate.minTierASources
    ) {
      blockingFactors.push("insufficient_tier_a_sources");
    }
  } else {
    const propositionSignal = signal as NewsPropositionSignal;
    if (
      gate.requireResolvedEvent !== false &&
      propositionSignal.propositionStatus === "no_matching_event"
    ) {
      blockingFactors.push("no_matching_event");
    }
    if (gate.expectedAnswer && propositionSignal.answer !== gate.expectedAnswer) {
      blockingFactors.push("unexpected_answer");
    }
    if (
      typeof gate.minConfidence === "number" &&
      propositionSignal.propositionConfidence < gate.minConfidence
    ) {
      blockingFactors.push("confidence_below_threshold");
    }
    if (
      typeof gate.maxDataAgeMs === "number" &&
      typeof propositionSignal.dataAgeMs === "number" &&
      propositionSignal.dataAgeMs > gate.maxDataAgeMs
    ) {
      blockingFactors.push("signal_too_stale");
    }
  }

  if (blockingFactors.length === 0) {
    return {
      allowed: true,
      action: "continue",
      reason: "All continuation gate checks passed.",
      matchedRule: gate.mode,
      blockingFactors: [],
    };
  }

  return {
    allowed: false,
    action: blockedAction,
    reason: `Blocked by continuation gate: ${blockingFactors.join(", ")}.`,
    matchedRule: gate.mode,
    blockingFactors,
  };
}

export class NewsSignalClient {
  private readonly gatewayBase: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(config: NewsSignalClientConfig = {}) {
    this.gatewayBase = resolveNewsGatewayBase(config.gatewayBase);
    this.fetchImplementation = resolveFetchImplementation(config.fetchImplementation);
  }

  eventSignal(params: Omit<NewsEventSignalRequest, "gatewayBase" | "fetchImplementation">) {
    return fetchNewsEventSignal({
      ...params,
      gatewayBase: this.gatewayBase,
      fetchImplementation: this.fetchImplementation,
    });
  }

  propositionSignal(
    params: Omit<NewsPropositionSignalRequest, "gatewayBase" | "fetchImplementation">,
  ) {
    return fetchNewsPropositionSignal({
      ...params,
      gatewayBase: this.gatewayBase,
      fetchImplementation: this.fetchImplementation,
    });
  }
}

export { DEFAULT_OPENPOND_GATEWAY_URL };

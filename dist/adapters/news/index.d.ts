declare const DEFAULT_OPENPOND_GATEWAY_URL = "https://gateway.openpond.dev";
type NewsEventState = "monitoring" | "escalation" | "de_escalation" | "resolved" | "contradiction";
type NewsSignalValue = "none" | "escalation" | "de_escalation" | "resolved" | "contradiction";
type NewsPropositionAnswer = "yes" | "no" | "unclear";
type NewsPropositionStatus = NewsPropositionAnswer | "no_matching_event";
type NewsContinuationAction = "continue" | "skip" | "pause";
type NewsPredictionMarketMatchedMarket = {
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
type NewsPredictionMarketContext = {
    matchedMarkets: NewsPredictionMarketMatchedMarket[];
    consensusProbability?: number | null;
    probabilityDelta1h?: number | null;
    probabilityDelta24h?: number | null;
    liquidityWeightedScore?: number | null;
    predictionDisagreementScore?: number | null;
    dataAgeMs?: number | null;
} | null;
type NewsSignalEvidence = {
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
type NewsSignalConfidenceBreakdown = {
    baseScore: number;
    winningBucketScore: number;
    opposingPenalty: number;
    contradictionPenalty: number;
    stateBonus: number;
    finalScore: number;
};
type NewsEventSignalPolicy = {
    minConfidence: number;
    minIndependentSources: number;
    minTierASources: number;
    cooldownMinutes: number;
    allowedSourceIds?: string[];
};
type NewsEventSignal = {
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
type NewsPropositionSignal = {
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
type NewsEventSignalRequest = {
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
type NewsPropositionSignalRequest = {
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
type NewsSignalClientConfig = {
    gatewayBase?: string | null;
    fetchImplementation?: typeof fetch;
};
type NewsEventContinuationGate = {
    mode: "event";
    minConfidence?: number;
    maxDataAgeMs?: number;
    minIndependentSources?: number;
    minTierASources?: number;
    requireTriggerPassed?: boolean;
    onBlocked?: Exclude<NewsContinuationAction, "continue">;
};
type NewsPropositionContinuationGate = {
    mode: "proposition";
    expectedAnswer?: NewsPropositionAnswer;
    minConfidence?: number;
    maxDataAgeMs?: number;
    requireResolvedEvent?: boolean;
    onBlocked?: Exclude<NewsContinuationAction, "continue">;
};
type NewsContinuationGate = NewsEventContinuationGate | NewsPropositionContinuationGate;
type NewsContinuationGateResult = {
    allowed: boolean;
    action: NewsContinuationAction;
    reason: string;
    matchedRule: NewsContinuationGate["mode"];
    blockingFactors: string[];
};
declare function resolveNewsGatewayBase(override?: string | null): string;
declare function fetchNewsEventSignal(params: NewsEventSignalRequest): Promise<NewsEventSignal>;
declare function fetchNewsPropositionSignal(params: NewsPropositionSignalRequest): Promise<NewsPropositionSignal>;
declare function evaluateNewsContinuationGate(signal: NewsEventSignal | NewsPropositionSignal, gate: NewsContinuationGate): NewsContinuationGateResult;
declare class NewsSignalClient {
    private readonly gatewayBase;
    private readonly fetchImplementation;
    constructor(config?: NewsSignalClientConfig);
    eventSignal(params: Omit<NewsEventSignalRequest, "gatewayBase" | "fetchImplementation">): Promise<NewsEventSignal>;
    propositionSignal(params: Omit<NewsPropositionSignalRequest, "gatewayBase" | "fetchImplementation">): Promise<NewsPropositionSignal>;
}

export { DEFAULT_OPENPOND_GATEWAY_URL, type NewsContinuationAction, type NewsContinuationGate, type NewsContinuationGateResult, type NewsEventContinuationGate, type NewsEventSignal, type NewsEventSignalPolicy, type NewsEventSignalRequest, type NewsEventState, type NewsPredictionMarketContext, type NewsPredictionMarketMatchedMarket, type NewsPropositionAnswer, type NewsPropositionContinuationGate, type NewsPropositionSignal, type NewsPropositionSignalRequest, type NewsPropositionStatus, NewsSignalClient, type NewsSignalConfidenceBreakdown, type NewsSignalEvidence, type NewsSignalValue, evaluateNewsContinuationGate, fetchNewsEventSignal, fetchNewsPropositionSignal, resolveNewsGatewayBase };

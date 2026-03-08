export type {
  NewsContinuationAction,
  NewsContinuationGate,
  NewsContinuationGateResult,
  NewsEventContinuationGate,
  NewsEventSignal,
  NewsEventSignalPolicy,
  NewsEventSignalRequest,
  NewsEventState,
  NewsPredictionMarketContext,
  NewsPredictionMarketMatchedMarket,
  NewsPropositionAnswer,
  NewsPropositionContinuationGate,
  NewsPropositionSignal,
  NewsPropositionSignalRequest,
  NewsPropositionStatus,
  NewsSignalConfidenceBreakdown,
  NewsSignalEvidence,
  NewsSignalValue,
} from "./signals";

export {
  DEFAULT_OPENPOND_GATEWAY_URL,
  NewsSignalClient,
  evaluateNewsContinuationGate,
  fetchNewsEventSignal,
  fetchNewsPropositionSignal,
  resolveNewsGatewayBase,
} from "./signals";

import type { QuantBar, QuantTestRequestV1 } from "./schemas";

export function buildQuantDataLineage(params: {
  bars: QuantBar[];
  request: QuantTestRequestV1;
  warnings?: string[];
}) {
  const symbol =
    params.request.idea.market.symbol ??
    params.request.idea.market.universe?.[0] ??
    "UNKNOWN";
  return {
    venue: params.request.idea.market.venue,
    symbols: params.request.idea.market.universe ?? [symbol],
    resolution: params.request.window.resolution,
    timeframeStart: params.request.window.timeframeStart,
    timeframeEnd: params.request.window.timeframeEnd,
    sourceIds: params.request.idea.requiredSources,
    warnings: params.warnings ?? [],
  };
}

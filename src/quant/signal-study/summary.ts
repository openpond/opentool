export function signalStudySummary(params: {
  conditionedCount: number;
  conditionedMean: number | null;
  unconditionalMean: number | null;
}): string {
  if (params.conditionedCount === 0) {
    return "No signal events were available in the supplied window.";
  }
  const conditioned = params.conditionedMean == null ? "n/a" : `${(params.conditionedMean * 100).toFixed(2)}%`;
  const unconditional =
    params.unconditionalMean == null ? "n/a" : `${(params.unconditionalMean * 100).toFixed(2)}%`;
  return `Signal events=${params.conditionedCount}; conditioned forward return=${conditioned}; unconditional=${unconditional}.`;
}

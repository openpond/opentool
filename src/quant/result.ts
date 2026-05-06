export type QuantMetricSummary = {
  count: number;
  max: number | null;
  mean: number | null;
  median: number | null;
  min: number | null;
  positiveRate: number | null;
  standardDeviation: number | null;
};

export function summarizeNumbers(values: number[]): QuantMetricSummary {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) {
    return {
      count: 0,
      max: null,
      mean: null,
      median: null,
      min: null,
      positiveRate: null,
      standardDeviation: null,
    };
  }
  const sorted = finite.slice().sort((a, b) => a - b);
  const mean = finite.reduce((total, value) => total + value, 0) / finite.length;
  const variance =
    finite.reduce((total, value) => total + (value - mean) ** 2, 0) / finite.length;
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];
  return {
    count: finite.length,
    max: sorted[sorted.length - 1],
    mean,
    median,
    min: sorted[0],
    positiveRate:
      finite.filter((value) => value > 0).length / Math.max(1, finite.length),
    standardDeviation: Math.sqrt(variance),
  };
}

import { sma } from "./sma";

export type BollingerPoint = {
  lower: number | null;
  middle: number | null;
  upper: number | null;
  width: number | null;
};

export function bollinger(values: number[], period = 20, standardDeviations = 2): BollingerPoint[] {
  const middle = sma(values, period);
  return values.map((_, index) => {
    const average = middle[index];
    if (average == null || index < period - 1) {
      return { lower: null, middle: null, upper: null, width: null };
    }
    const window = values.slice(index - period + 1, index + 1);
    const variance =
      window.reduce((total, value) => total + (value - average) ** 2, 0) / period;
    const deviation = Math.sqrt(variance);
    const lower = average - deviation * standardDeviations;
    const upper = average + deviation * standardDeviations;
    return {
      lower,
      middle: average,
      upper,
      width: average === 0 ? null : (upper - lower) / average,
    };
  });
}

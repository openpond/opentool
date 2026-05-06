import { ema } from "./ema";

export type MacdPoint = {
  histogram: number | null;
  macd: number | null;
  signal: number | null;
};

export function macd(values: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): MacdPoint[] {
  if (fastPeriod >= slowPeriod) {
    throw new Error("MACD fast period must be less than slow period");
  }
  const fast = ema(values, fastPeriod);
  const slow = ema(values, slowPeriod);
  const macdLine = values.map((_, index) =>
    fast[index] == null || slow[index] == null ? null : fast[index] - slow[index],
  );
  const signalInput = macdLine.map((value) => value ?? 0);
  const signalLine = ema(signalInput, signalPeriod);
  return values.map((_, index) => {
    const macdValue = macdLine[index];
    const signalValue = macdValue == null ? null : signalLine[index];
    return {
      macd: macdValue,
      signal: signalValue,
      histogram:
        macdValue == null || signalValue == null ? null : macdValue - signalValue,
    };
  });
}

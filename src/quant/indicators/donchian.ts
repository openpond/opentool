export type DonchianPoint = {
  lower: number | null;
  upper: number | null;
};

export function donchian(
  highs: number[],
  lows: number[],
  period = 20,
): DonchianPoint[] {
  if (highs.length !== lows.length) {
    throw new Error("Donchian high/low arrays must have the same length");
  }
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error("Donchian period must be a positive integer");
  }
  return highs.map((_, index) => {
    if (index < period - 1) return { lower: null, upper: null };
    const highWindow = highs.slice(index - period + 1, index + 1);
    const lowWindow = lows.slice(index - period + 1, index + 1);
    return {
      lower: Math.min(...lowWindow),
      upper: Math.max(...highWindow),
    };
  });
}

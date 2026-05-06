export function rollingZScore(values: number[], period = 20): Array<number | null> {
  if (!Number.isInteger(period) || period <= 1) {
    throw new Error("Z-score period must be an integer greater than 1");
  }
  return values.map((value, index) => {
    if (index < period - 1) return null;
    const window = values.slice(index - period + 1, index + 1);
    const mean = window.reduce((total, current) => total + current, 0) / period;
    const variance =
      window.reduce((total, current) => total + (current - mean) ** 2, 0) / period;
    const deviation = Math.sqrt(variance);
    return deviation === 0 ? 0 : (value - mean) / deviation;
  });
}

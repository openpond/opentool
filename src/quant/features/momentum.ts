export function momentum(values: number[], lookbackBars: number): Array<number | null> {
  if (!Number.isInteger(lookbackBars) || lookbackBars <= 0) {
    throw new Error("Momentum lookback must be a positive integer");
  }
  return values.map((value, index) => {
    const prior = values[index - lookbackBars];
    return prior == null || prior === 0 ? null : value / prior - 1;
  });
}

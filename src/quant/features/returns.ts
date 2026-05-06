export function simpleReturns(values: number[]): number[] {
  return values.map((value, index) => {
    if (index === 0) return 0;
    const previous = values[index - 1];
    return previous === 0 ? 0 : value / previous - 1;
  });
}

export function logReturns(values: number[]): number[] {
  return values.map((value, index) => {
    if (index === 0) return 0;
    const previous = values[index - 1];
    return previous <= 0 || value <= 0 ? 0 : Math.log(value / previous);
  });
}

export function forwardReturns(values: number[], horizonBars: number): Array<number | null> {
  if (!Number.isInteger(horizonBars) || horizonBars <= 0) {
    throw new Error("Forward return horizon must be a positive integer");
  }
  return values.map((value, index) => {
    const future = values[index + horizonBars];
    return future == null || value === 0 ? null : future / value - 1;
  });
}

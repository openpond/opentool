export function correlation(a: number[], b: number[]): number | null {
  const length = Math.min(a.length, b.length);
  if (length < 2) return null;
  const left = a.slice(a.length - length);
  const right = b.slice(b.length - length);
  const meanA = left.reduce((total, value) => total + value, 0) / length;
  const meanB = right.reduce((total, value) => total + value, 0) / length;
  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (let index = 0; index < length; index += 1) {
    const da = left[index] - meanA;
    const db = right[index] - meanB;
    covariance += da * db;
    varianceA += da * da;
    varianceB += db * db;
  }
  if (varianceA === 0 || varianceB === 0) return null;
  return covariance / Math.sqrt(varianceA * varianceB);
}

export function rollingCorrelation(
  a: number[],
  b: number[],
  period = 20,
): Array<number | null> {
  return a.map((_, index) => {
    if (index < period - 1) return null;
    return correlation(
      a.slice(index - period + 1, index + 1),
      b.slice(index - period + 1, index + 1),
    );
  });
}

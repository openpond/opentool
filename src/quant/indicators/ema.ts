export function ema(values: number[], period: number): Array<number | null> {
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error("EMA period must be a positive integer");
  }
  const output: Array<number | null> = [];
  const multiplier = 2 / (period + 1);
  let previous: number | null = null;
  let seedSum = 0;

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (index < period) {
      seedSum += value;
      if (index === period - 1) {
        previous = seedSum / period;
        output.push(previous);
      } else {
        output.push(null);
      }
      continue;
    }
    previous = previous == null ? value : (value - previous) * multiplier + previous;
    output.push(previous);
  }
  return output;
}

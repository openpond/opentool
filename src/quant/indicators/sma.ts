export function sma(values: number[], period: number): Array<number | null> {
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error("SMA period must be a positive integer");
  }
  const output: Array<number | null> = [];
  let sum = 0;
  for (let index = 0; index < values.length; index += 1) {
    sum += values[index];
    if (index >= period) sum -= values[index - period];
    output.push(index >= period - 1 ? sum / period : null);
  }
  return output;
}

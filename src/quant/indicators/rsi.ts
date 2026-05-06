export function rsi(values: number[], period = 14): Array<number | null> {
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error("RSI period must be a positive integer");
  }
  const output: Array<number | null> = Array.from({ length: values.length }, () => null);
  if (values.length <= period) return output;

  let gainSum = 0;
  let lossSum = 0;
  for (let index = 1; index <= period; index += 1) {
    const delta = values[index] - values[index - 1];
    if (delta >= 0) gainSum += delta;
    else lossSum += Math.abs(delta);
  }

  let averageGain = gainSum / period;
  let averageLoss = lossSum / period;
  output[period] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);

  for (let index = period + 1; index < values.length; index += 1) {
    const delta = values[index] - values[index - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? Math.abs(delta) : 0;
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
    output[index] = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);
  }

  return output;
}

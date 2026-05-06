import { momentum } from "./momentum";

export function relativeStrength(
  assetPrices: number[],
  benchmarkPrices: number[],
  lookbackBars: number,
): Array<number | null> {
  const assetMomentum = momentum(assetPrices, lookbackBars);
  const benchmarkMomentum = momentum(benchmarkPrices, lookbackBars);
  return assetMomentum.map((value, index) =>
    value == null || benchmarkMomentum[index] == null
      ? null
      : value - benchmarkMomentum[index],
  );
}

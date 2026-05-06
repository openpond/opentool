export function beta(assetReturns: number[], benchmarkReturns: number[]): number | null {
  const length = Math.min(assetReturns.length, benchmarkReturns.length);
  if (length < 2) return null;
  const asset = assetReturns.slice(assetReturns.length - length);
  const benchmark = benchmarkReturns.slice(benchmarkReturns.length - length);
  const meanAsset = asset.reduce((total, value) => total + value, 0) / length;
  const meanBenchmark =
    benchmark.reduce((total, value) => total + value, 0) / length;
  let covariance = 0;
  let benchmarkVariance = 0;
  for (let index = 0; index < length; index += 1) {
    covariance += (asset[index] - meanAsset) * (benchmark[index] - meanBenchmark);
    benchmarkVariance += (benchmark[index] - meanBenchmark) ** 2;
  }
  return benchmarkVariance === 0 ? null : covariance / benchmarkVariance;
}

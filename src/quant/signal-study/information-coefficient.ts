export function informationCoefficient(params: {
  forwardReturns: Array<number | null>;
  signal: Array<number | null>;
}): number | null {
  const pairs: Array<{ x: number; y: number }> = [];
  const length = Math.min(params.signal.length, params.forwardReturns.length);
  for (let index = 0; index < length; index += 1) {
    const x = params.signal[index];
    const y = params.forwardReturns[index];
    if (x != null && y != null && Number.isFinite(x) && Number.isFinite(y)) {
      pairs.push({ x, y });
    }
  }
  if (pairs.length < 3) return null;
  const meanX = pairs.reduce((total, pair) => total + pair.x, 0) / pairs.length;
  const meanY = pairs.reduce((total, pair) => total + pair.y, 0) / pairs.length;
  let covariance = 0;
  let varianceX = 0;
  let varianceY = 0;
  for (const pair of pairs) {
    const dx = pair.x - meanX;
    const dy = pair.y - meanY;
    covariance += dx * dy;
    varianceX += dx * dx;
    varianceY += dy * dy;
  }
  if (varianceX === 0 || varianceY === 0) return null;
  return covariance / Math.sqrt(varianceX * varianceY);
}

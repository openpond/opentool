export function rollingVolatility(returns: number[], period = 20, annualization = 365): Array<number | null> {
  if (!Number.isInteger(period) || period <= 1) {
    throw new Error("Volatility period must be an integer greater than 1");
  }
  return returns.map((_, index) => {
    if (index < period - 1) return null;
    const window = returns.slice(index - period + 1, index + 1);
    const mean = window.reduce((total, value) => total + value, 0) / period;
    const variance =
      window.reduce((total, value) => total + (value - mean) ** 2, 0) / (period - 1);
    return Math.sqrt(variance) * Math.sqrt(annualization);
  });
}

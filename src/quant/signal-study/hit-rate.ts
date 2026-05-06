export function hitRate(values: number[]): number | null {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  return finite.filter((value) => value > 0).length / finite.length;
}

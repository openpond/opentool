import type { QuantBar } from "../schemas";

export type ExcursionSummary = {
  averageAdverse: number | null;
  averageFavorable: number | null;
  count: number;
};

export function summarizeExcursions(params: {
  bars: QuantBar[];
  condition: boolean[];
  horizonBars: number;
}): ExcursionSummary {
  const adverse: number[] = [];
  const favorable: number[] = [];
  for (let index = 0; index < params.bars.length; index += 1) {
    if (!params.condition[index]) continue;
    const entry = params.bars[index].close;
    const window = params.bars.slice(index + 1, index + params.horizonBars + 1);
    if (window.length === 0) continue;
    adverse.push(Math.min(...window.map((bar) => bar.low / entry - 1)));
    favorable.push(Math.max(...window.map((bar) => bar.high / entry - 1)));
  }
  return {
    averageAdverse:
      adverse.length === 0
        ? null
        : adverse.reduce((total, value) => total + value, 0) / adverse.length,
    averageFavorable:
      favorable.length === 0
        ? null
        : favorable.reduce((total, value) => total + value, 0) / favorable.length,
    count: adverse.length,
  };
}

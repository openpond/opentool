import type { QuantBar, QuantTestRequestV1 } from "../schemas";

export function quantDataWarnings(params: {
  bars: QuantBar[];
  request: QuantTestRequestV1;
}): string[] {
  const warnings: string[] = [];
  if (params.bars.length < 50) {
    warnings.push("Sample has fewer than 50 bars; treat metrics as unstable.");
  }
  if (params.bars.length > 1) {
    const gaps: number[] = [];
    for (let index = 1; index < params.bars.length; index += 1) {
      gaps.push(params.bars[index].time - params.bars[index - 1].time);
    }
    const medianGap = gaps.slice().sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
    if (gaps.some((gap) => gap > medianGap * 2)) {
      warnings.push("Bars contain time gaps larger than twice the median interval.");
    }
  }
  if (params.request.variantSpace && Object.keys(params.request.variantSpace).length > 20) {
    warnings.push("Variant space is broad; use multiple-comparison controls before promotion.");
  }
  return warnings;
}

export function quantCostBps(request: QuantTestRequestV1): number {
  return (
    (request.assumptions.takerFeeBps ?? request.assumptions.makerFeeBps ?? 0) +
    (request.assumptions.slippageBps ?? 0)
  );
}

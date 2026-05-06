import type { QuantBar } from "../schemas";

export function fundingRates(bars: QuantBar[]): number[] {
  return bars.map((bar) => bar.fundingRate ?? 0);
}

export function cumulativeFunding(bars: QuantBar[]): number[] {
  let running = 0;
  return fundingRates(bars).map((rate) => {
    running += rate;
    return running;
  });
}

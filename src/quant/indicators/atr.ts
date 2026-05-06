import type { QuantBar } from "../schemas";
import { sma } from "./sma";

export function trueRanges(bars: QuantBar[]): number[] {
  return bars.map((bar, index) => {
    const previousClose = index > 0 ? bars[index - 1].close : bar.close;
    return Math.max(
      bar.high - bar.low,
      Math.abs(bar.high - previousClose),
      Math.abs(bar.low - previousClose),
    );
  });
}

export function atr(bars: QuantBar[], period = 14): Array<number | null> {
  return sma(trueRanges(bars), period);
}

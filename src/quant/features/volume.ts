import { sma } from "../indicators/sma";
import type { QuantBar } from "../schemas";

export function volumes(bars: QuantBar[]): number[] {
  return bars.map((bar) => bar.volume ?? 0);
}

export function relativeVolume(bars: QuantBar[], period = 20): Array<number | null> {
  const raw = volumes(bars);
  const average = sma(raw, period);
  return raw.map((value, index) => {
    const baseline = average[index];
    return baseline == null || baseline === 0 ? null : value / baseline;
  });
}

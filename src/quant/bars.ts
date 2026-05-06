import { quantBarSchema, type QuantBar } from "./schemas";

export function normalizeQuantBars(input: unknown): QuantBar[] {
  const bars = quantBarSchema.array().parse(input).slice();
  bars.sort((a, b) => a.time - b.time);
  for (let index = 0; index < bars.length; index += 1) {
    const bar = bars[index];
    if (bar.high < Math.max(bar.open, bar.close) || bar.low > Math.min(bar.open, bar.close)) {
      throw new Error(`Invalid OHLC relationship at bar ${index}`);
    }
    if (index > 0 && bar.time <= bars[index - 1].time) {
      throw new Error(`Duplicate or non-increasing bar time at index ${index}`);
    }
  }
  return bars;
}

export function closePrices(bars: QuantBar[]): number[] {
  return bars.map((bar) => bar.close);
}

export function typicalPrices(bars: QuantBar[]): number[] {
  return bars.map((bar) => (bar.high + bar.low + bar.close) / 3);
}

export function sliceBarsToWindow(params: {
  bars: QuantBar[];
  endSeconds: number;
  startSeconds: number;
  warmupBars?: number;
}): QuantBar[] {
  const startIndex = params.bars.findIndex((bar) => bar.time >= params.startSeconds);
  const fromIndex = startIndex < 0 ? params.bars.length : Math.max(0, startIndex - (params.warmupBars ?? 0));
  return params.bars
    .slice(fromIndex)
    .filter((bar) => bar.time <= params.endSeconds);
}

import type { QuantBar } from "../schemas";

export type EventWindow = {
  endTime: number;
  eventTime: number;
  startTime: number;
};

export function buildEventWindows(params: {
  bars: QuantBar[];
  condition: boolean[];
  postBars: number;
  preBars: number;
}): EventWindow[] {
  const windows: EventWindow[] = [];
  for (let index = 0; index < params.bars.length; index += 1) {
    if (!params.condition[index]) continue;
    const start = params.bars[Math.max(0, index - params.preBars)];
    const end = params.bars[Math.min(params.bars.length - 1, index + params.postBars)];
    windows.push({
      endTime: end.time,
      eventTime: params.bars[index].time,
      startTime: start.time,
    });
  }
  return windows;
}

import type { QuantResolution } from "./schemas";

export const QUANT_RESOLUTION_SECONDS: Record<QuantResolution, number> = {
  "1": 60,
  "5": 300,
  "15": 900,
  "30": 1800,
  "60": 3600,
  "240": 14400,
  "1D": 86400,
  "1W": 604800,
};

export function quantResolutionToSeconds(resolution: QuantResolution): number {
  return QUANT_RESOLUTION_SECONDS[resolution];
}

export function parseQuantTimeToSeconds(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const trimmed = value.trim();
    if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
      return Math.max(0, Math.trunc(Number.parseFloat(trimmed)));
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return Math.max(0, Math.trunc(parsed.getTime() / 1000));
    }
  }
  return null;
}

export function assertQuantWindow(params: {
  timeframeEnd: string;
  timeframeStart: string;
}): { endSeconds: number; startSeconds: number } {
  const startSeconds = parseQuantTimeToSeconds(params.timeframeStart);
  const endSeconds = parseQuantTimeToSeconds(params.timeframeEnd);
  if (startSeconds == null || endSeconds == null) {
    throw new Error("Quant test window must use parseable start and end times");
  }
  if (endSeconds <= startSeconds) {
    throw new Error("Quant test window end must be after start");
  }
  return { endSeconds, startSeconds };
}

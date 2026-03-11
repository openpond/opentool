import { HyperliquidApiError } from "./base";

export type HyperliquidTickSize = {
  tickSizeInt: bigint;
  tickDecimals: number;
};

export type HyperliquidMarketType = "perp" | "spot";
type HyperliquidDirectionalMode = "down" | "up";

type HyperliquidOrderResponseLike = {
  response?: {
    data?: {
      statuses?: Array<Record<string, unknown>>;
    };
  };
};

function countDecimalPlaces(value: string): number {
  const [, dec = ""] = value.split(".");
  return dec.length;
}

function assertNumberString(value: string): void {
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)) {
    throw new TypeError("Invalid decimal number string.");
  }
}

function normalizeDecimalString(value: string): string {
  return value
    .trim()
    .replace(/^(-?)0+(?=\d)/, "$1")
    .replace(/\.0*$|(\.\d+?)0+$/, "$1")
    .replace(/^(-?)\./, "$10.")
    .replace(/^-?$/, "0")
    .replace(/^-0$/, "0");
}

const StringMath = {
  log10Floor(value: string): number {
    const abs = value.startsWith("-") ? value.slice(1) : value;
    const num = Number(abs);
    if (!Number.isFinite(num) || num === 0) return -Infinity;

    const [intPart, fracPart = ""] = abs.split(".");
    if (Number(intPart) !== 0) {
      return intPart.replace(/^0+/, "").length - 1;
    }
    const leadingZeros = fracPart.match(/^0*/)?.[0]?.length ?? 0;
    return -(leadingZeros + 1);
  },
  multiplyByPow10(value: string, exp: number): string {
    if (!Number.isInteger(exp)) {
      throw new RangeError("Exponent must be an integer.");
    }
    if (exp === 0) return normalizeDecimalString(value);

    const negative = value.startsWith("-");
    const abs = negative ? value.slice(1) : value;
    const [intRaw, fracRaw = ""] = abs.split(".");
    const intPart = intRaw || "0";
    let output: string;

    if (exp > 0) {
      if (exp >= fracRaw.length) {
        output = intPart + fracRaw + "0".repeat(exp - fracRaw.length);
      } else {
        output = `${intPart}${fracRaw.slice(0, exp)}.${fracRaw.slice(exp)}`;
      }
    } else {
      const absExp = -exp;
      if (absExp >= intPart.length) {
        output = `0.${"0".repeat(absExp - intPart.length)}${intPart}${fracRaw}`;
      } else {
        output = `${intPart.slice(0, -absExp)}.${intPart.slice(-absExp)}${fracRaw}`;
      }
    }

    return normalizeDecimalString((negative ? "-" : "") + output);
  },
  trunc(value: string): string {
    const index = value.indexOf(".");
    return index === -1 ? value : value.slice(0, index) || "0";
  },
  roundInteger(value: string, mode: HyperliquidDirectionalMode): string {
    const normalized = normalizeDecimalString(value);
    const negative = normalized.startsWith("-");
    if (negative) {
      throw new RangeError("Directional rounding only supports positive values.");
    }
    const [intPartRaw, fracPart = ""] = normalized.split(".");
    const intPart = intPartRaw.replace(/^0+(?=\d)/, "") || "0";
    const hasFraction = /[1-9]/.test(fracPart);
    if (!hasFraction) return intPart;
    if (mode === "down") return intPart;

    const digits = intPart.split("");
    let carry = 1;
    for (let idx = digits.length - 1; idx >= 0 && carry > 0; idx -= 1) {
      const next = Number(digits[idx] ?? "0") + carry;
      digits[idx] = String(next % 10);
      carry = next >= 10 ? 1 : 0;
    }
    if (carry > 0) {
      digits.unshift("1");
    }
    return digits.join("").replace(/^0+(?=\d)/, "") || "0";
  },
  toPrecisionTruncate(value: string, precision: number): string {
    if (!Number.isInteger(precision) || precision < 1) {
      throw new RangeError("Precision must be a positive integer.");
    }
    if (/^-?0+(\.0*)?$/.test(value)) return "0";

    const negative = value.startsWith("-");
    const abs = negative ? value.slice(1) : value;
    const magnitude = StringMath.log10Floor(abs);
    const shiftAmount = precision - magnitude - 1;
    const shifted = StringMath.multiplyByPow10(abs, shiftAmount);
    const truncated = StringMath.trunc(shifted);
    const shiftedBack = StringMath.multiplyByPow10(truncated, -shiftAmount);
    return normalizeDecimalString(negative ? `-${shiftedBack}` : shiftedBack);
  },
  toFixedTruncate(value: string, decimals: number): string {
    if (!Number.isInteger(decimals) || decimals < 0) {
      throw new RangeError("Decimals must be a non-negative integer.");
    }
    const matcher = new RegExp(`^-?(?:\\d+)?(?:\\.\\d{0,${decimals}})?`);
    const result = value.match(matcher)?.[0];
    if (!result) {
      throw new TypeError("Invalid number format.");
    }
    return normalizeDecimalString(result);
  },
};

function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new RangeError("Denominator must be positive.");
  }
  return (numerator + denominator - 1n) / denominator;
}

function scaleDecimalToInt(
  value: string,
  decimals: number,
  mode: HyperliquidDirectionalMode,
): bigint {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new RangeError("Decimals must be a non-negative integer.");
  }
  const normalized = normalizeDecimalString(value);
  assertNumberString(normalized);
  const negative = normalized.startsWith("-");
  if (negative) {
    throw new RangeError("Only positive values are supported.");
  }
  const shifted = StringMath.multiplyByPow10(normalized, decimals);
  const rounded = StringMath.roundInteger(shifted, mode);
  return BigInt(rounded);
}

function formatScaledDecimal(value: bigint, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new RangeError("Decimals must be a non-negative integer.");
  }
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const raw = abs.toString();
  if (decimals === 0) {
    return `${negative ? "-" : ""}${raw}`;
  }
  const padded = raw.padStart(decimals + 1, "0");
  const intPart = padded.slice(0, -decimals) || "0";
  const fracPart = padded.slice(-decimals);
  return normalizeDecimalString(`${negative ? "-" : ""}${intPart}.${fracPart}`);
}

export function formatHyperliquidPrice(
  price: string | number,
  szDecimals: number,
  marketType: HyperliquidMarketType = "perp",
): string {
  const normalized = price.toString().trim();
  assertNumberString(normalized);
  if (/^-?\d+$/.test(normalized)) {
    return normalizeDecimalString(normalized);
  }

  const maxDecimals = Math.max((marketType === "perp" ? 6 : 8) - szDecimals, 0);
  const decimalsTrimmed = StringMath.toFixedTruncate(normalized, maxDecimals);
  const sigFigTrimmed = StringMath.toPrecisionTruncate(decimalsTrimmed, 5);
  if (sigFigTrimmed === "0") {
    throw new RangeError("Price is too small and was truncated to 0.");
  }
  return sigFigTrimmed;
}

export function formatHyperliquidSize(size: string | number, szDecimals: number): string {
  const normalized = size.toString().trim();
  assertNumberString(normalized);
  const truncated = StringMath.toFixedTruncate(normalized, szDecimals);
  if (truncated === "0") {
    throw new RangeError("Size is too small and was truncated to 0.");
  }
  return truncated;
}

export function formatHyperliquidOrderSize(value: number, szDecimals: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  try {
    return formatHyperliquidSize(value, szDecimals);
  } catch {
    return "0";
  }
}

export function roundHyperliquidPriceToTick(
  price: string | number,
  tick: HyperliquidTickSize,
  side: "buy" | "sell",
): string {
  if (!Number.isFinite(tick.tickDecimals) || tick.tickDecimals < 0) {
    throw new Error("tick.tickDecimals must be a non-negative number.");
  }
  if (tick.tickSizeInt <= 0n) {
    throw new Error("tick.tickSizeInt must be positive.");
  }

  const normalized = normalizeDecimalString(price.toString());
  assertNumberString(normalized);
  if (Number.parseFloat(normalized) <= 0) {
    throw new Error("Price must be positive.");
  }

  const scaled = scaleDecimalToInt(
    normalized,
    tick.tickDecimals,
    side === "buy" ? "up" : "down",
  );
  const tickSize = tick.tickSizeInt;
  const rounded =
    side === "sell"
      ? (scaled / tickSize) * tickSize
      : ((scaled + tickSize - 1n) / tickSize) * tickSize;
  return formatScaledDecimal(rounded, tick.tickDecimals);
}

export function formatHyperliquidMarketablePrice(params: {
  mid: number;
  side: "buy" | "sell";
  slippageBps: number;
  tick?: HyperliquidTickSize | null;
}): string {
  const { mid, side, slippageBps, tick } = params;
  if (!Number.isFinite(mid) || mid <= 0) {
    throw new Error("mid must be a positive number.");
  }
  if (!Number.isFinite(slippageBps) || slippageBps < 0) {
    throw new Error("slippageBps must be a non-negative number.");
  }

  const midString = normalizeDecimalString(mid.toString());
  const baseDecimals = countDecimalPlaces(midString);
  const workDecimals = Math.max(baseDecimals + 4, tick?.tickDecimals ?? 0, 8);
  const scaledMid = scaleDecimalToInt(midString, workDecimals, "down");
  const slippageNumerator = BigInt(
    side === "buy" ? 10_000 + slippageBps : 10_000 - slippageBps,
  );
  const adjustedScaled =
    side === "buy"
      ? ceilDiv(scaledMid * slippageNumerator, 10_000n)
      : (scaledMid * slippageNumerator) / 10_000n;
  const adjusted = formatScaledDecimal(adjustedScaled, workDecimals);

  if (tick) {
    return roundHyperliquidPriceToTick(adjusted, tick, side);
  }

  const roundedScaled = scaleDecimalToInt(
    adjusted,
    baseDecimals,
    side === "buy" ? "up" : "down",
  );
  return formatScaledDecimal(roundedScaled, baseDecimals);
}

export function extractHyperliquidOrderIds(responses: HyperliquidOrderResponseLike[]): {
  cloids: string[];
  oids: string[];
} {
  const cloids = new Set<string>();
  const oids = new Set<string>();
  const push = (val: unknown, target: Set<string>) => {
    if (val === null || val === undefined) return;
    const str = String(val);
    if (str.length) target.add(str);
  };

  for (const res of responses) {
    const statuses = res?.response?.data?.statuses;
    if (!Array.isArray(statuses)) continue;

    for (const status of statuses) {
      const resting = (status as any).resting as Record<string, unknown> | undefined;
      const filled = (status as any).filled as Record<string, unknown> | undefined;
      push(resting?.cloid, cloids);
      push(resting?.oid, oids);
      push(filled?.cloid, cloids);
      push(filled?.oid, oids);
    }
  }

  return {
    cloids: Array.from(cloids),
    oids: Array.from(oids),
  };
}

export function resolveHyperliquidOrderRef(params: {
  response?: HyperliquidOrderResponseLike | null;
  fallbackCloid?: string | null;
  fallbackOid?: string | null;
  prefix?: string;
  index?: number;
}): string {
  const { response, fallbackCloid, fallbackOid, prefix = "hl-order", index = 0 } = params;

  const statuses = response?.response?.data?.statuses ?? [];
  if (Array.isArray(statuses)) {
    for (const status of statuses) {
      const filled =
        status && typeof (status as any).filled === "object"
          ? ((status as any).filled as Record<string, unknown>)
          : null;
      if (filled) {
        if (typeof filled.cloid === "string" && filled.cloid.trim().length > 0) {
          return filled.cloid;
        }
        if (
          typeof filled.oid === "number" ||
          (typeof filled.oid === "string" && filled.oid.trim().length > 0)
        ) {
          return String(filled.oid);
        }
      }

      const resting =
        status && typeof (status as any).resting === "object"
          ? ((status as any).resting as Record<string, unknown>)
          : null;
      if (resting) {
        if (typeof resting.cloid === "string" && resting.cloid.trim().length > 0) {
          return resting.cloid;
        }
        if (
          typeof resting.oid === "number" ||
          (typeof resting.oid === "string" && resting.oid.trim().length > 0)
        ) {
          return String(resting.oid);
        }
      }
    }
  }

  if (fallbackCloid && fallbackCloid.trim().length > 0) {
    return fallbackCloid;
  }
  if (fallbackOid && fallbackOid.trim().length > 0) {
    return fallbackOid;
  }
  return `${prefix}-${Date.now()}-${index}`;
}

export function resolveHyperliquidErrorDetail(error: unknown): unknown | null {
  if (error instanceof HyperliquidApiError) {
    return error.response ?? null;
  }
  if (error && typeof error === "object" && "response" in error) {
    return (error as { response?: unknown }).response ?? null;
  }
  return null;
}

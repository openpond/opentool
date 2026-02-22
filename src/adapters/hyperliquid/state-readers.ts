function unwrapData(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  if ("data" in payload) {
    const data = (payload as { data?: unknown }).data;
    if (data && typeof data === "object") {
      return data as Record<string, unknown>;
    }
  }
  return payload as Record<string, unknown>;
}

export function readHyperliquidNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function readHyperliquidAccountValue(payload: unknown): number | null {
  const data = unwrapData(payload);
  if (!data) return null;
  const candidates = [
    (data as any)?.marginSummary?.accountValue,
    (data as any)?.crossMarginSummary?.accountValue,
    (data as any)?.accountValue,
    (data as any)?.equity,
    (data as any)?.totalAccountValue,
    (data as any)?.marginSummary?.totalAccountValue,
  ];
  for (const value of candidates) {
    const parsed = readHyperliquidNumber(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function matchPerpCoin(params: {
  coin: string;
  target: string;
  prefixMatch: boolean;
}): boolean {
  const coin = params.coin.toUpperCase();
  const target = params.target.toUpperCase();
  if (params.prefixMatch) return coin.startsWith(target);
  return coin === target;
}

export function readHyperliquidPerpPositionSize(
  payload: unknown,
  symbol: string,
  options?: { prefixMatch?: boolean }
): number {
  const data = unwrapData(payload);
  const rows = Array.isArray((data as any)?.assetPositions)
    ? ((data as any).assetPositions as Array<Record<string, unknown>>)
    : [];
  const base = symbol.split("-")[0]?.toUpperCase() ?? symbol.toUpperCase();
  const prefixMatch = options?.prefixMatch ?? false;

  for (const row of rows) {
    const position = (row as any).position ?? row;
    const coin =
      typeof position?.coin === "string"
        ? position.coin
        : typeof (row as any).coin === "string"
          ? (row as any).coin
          : "";

    if (!matchPerpCoin({ coin, target: base, prefixMatch })) continue;
    const size = (position as any).szi ?? (row as any).szi;
    const parsed = readHyperliquidNumber(size);
    return parsed ?? 0;
  }

  return 0;
}

export function readHyperliquidPerpPosition(
  payload: unknown,
  symbol: string,
  options?: { prefixMatch?: boolean }
): { size: number; positionValue: number; unrealizedPnl: number | null } {
  const data = unwrapData(payload);
  const rows = Array.isArray((data as any)?.assetPositions)
    ? ((data as any).assetPositions as Array<Record<string, unknown>>)
    : [];
  const target = symbol.split("-")[0]?.toUpperCase() ?? symbol.toUpperCase();
  const prefixMatch = options?.prefixMatch ?? false;

  for (const row of rows) {
    const position = (row as any)?.position ?? row;
    const coin =
      typeof position?.coin === "string"
        ? position.coin
        : typeof (row as any)?.coin === "string"
          ? (row as any).coin
          : "";
    if (!matchPerpCoin({ coin, target, prefixMatch })) continue;

    const size = readHyperliquidNumber(position?.szi ?? (row as any).szi) ?? 0;
    const positionValue = Math.abs(
      readHyperliquidNumber(position?.positionValue ?? (row as any).positionValue) ??
        0
    );
    const unrealizedPnl = readHyperliquidNumber(
      position?.unrealizedPnl ?? (row as any).unrealizedPnl
    );
    return { size, positionValue, unrealizedPnl };
  }

  return { size: 0, positionValue: 0, unrealizedPnl: null };
}

export function readHyperliquidSpotBalanceSize(
  payload: unknown,
  symbol: string
): number {
  const data = unwrapData(payload);
  const rows = Array.isArray((data as any)?.balances)
    ? ((data as any).balances as Array<Record<string, unknown>>)
    : [];
  const base =
    symbol.split("/")[0]?.split("-")[0]?.toUpperCase() ?? symbol.toUpperCase();

  for (const row of rows) {
    const coin =
      typeof row?.coin === "string"
        ? row.coin
        : typeof (row as any)?.asset === "string"
          ? (row as any).asset
          : "";
    if (coin.toUpperCase() !== base) continue;

    const total = (row as any).total ?? (row as any).balance ?? (row as any).szi;
    const parsed = readHyperliquidNumber(total);
    return parsed ?? 0;
  }

  return 0;
}

export function readHyperliquidSpotBalance(
  payload: unknown,
  base: string
): { total: number; entryNtl: number | null } {
  const data = unwrapData(payload);
  const balances = Array.isArray((data as any)?.balances)
    ? ((data as any).balances as Array<Record<string, unknown>>)
    : [];
  const target = base.toUpperCase();

  for (const row of balances) {
    const coin = typeof row?.coin === "string" ? row.coin : "";
    if (coin.toUpperCase() !== target) continue;
    const total = readHyperliquidNumber(row?.total) ?? 0;
    const entryNtl = readHyperliquidNumber(row?.entryNtl);
    return { total, entryNtl };
  }

  return { total: 0, entryNtl: null };
}

export function readHyperliquidSpotAccountValue(params: {
  balances: unknown;
  pricesUsd: Map<string, number>;
}): number | null {
  const rows = Array.isArray(params.balances)
    ? (params.balances as Array<Record<string, unknown>>)
    : [];
  if (rows.length === 0) return null;

  let total = 0;
  let hasValue = false;

  for (const row of rows) {
    const coin =
      typeof row?.coin === "string"
        ? row.coin
        : typeof (row as any)?.asset === "string"
          ? (row as any).asset
          : "";
    if (!coin) continue;

    const amount = readHyperliquidNumber(
      (row as any).total ?? (row as any).balance ?? (row as any).szi
    );
    if (amount == null || amount === 0) continue;

    const price = params.pricesUsd.get(coin.toUpperCase());
    if (price == null || !Number.isFinite(price) || price <= 0) continue;

    total += amount * price;
    hasValue = true;
  }

  return hasValue ? total : null;
}

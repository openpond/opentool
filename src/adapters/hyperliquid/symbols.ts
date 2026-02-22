import type { HyperliquidEnvironment } from "./base";

const UNKNOWN_SYMBOL = "UNKNOWN";

export function extractHyperliquidDex(symbol: string): string | null {
  const idx = symbol.indexOf(":");
  if (idx <= 0) return null;
  const dex = symbol.slice(0, idx).trim().toLowerCase();
  return dex || null;
}

export function normalizeSpotTokenName(value?: string | null): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (raw.endsWith("0") && raw.length > 1) {
    return raw.slice(0, -1);
  }
  return raw;
}

export function normalizeHyperliquidBaseSymbol(
  value?: string | null
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutDex = trimmed.includes(":")
    ? trimmed.split(":").slice(1).join(":")
    : trimmed;
  const base = withoutDex.split("-")[0] ?? withoutDex;
  const baseNoPair = base.split("/")[0] ?? base;
  const normalized = baseNoPair.trim().toUpperCase();
  if (!normalized || normalized === UNKNOWN_SYMBOL) return null;
  return normalized;
}

export function normalizeHyperliquidMetaSymbol(symbol: string): string {
  const trimmed = symbol.trim();
  const noDex = trimmed.includes(":")
    ? trimmed.split(":").slice(1).join(":")
    : trimmed;
  const noPair = noDex.split("-")[0] ?? noDex;
  return (noPair.split("/")[0] ?? noPair).trim();
}

export function resolveHyperliquidPair(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutDex = trimmed.includes(":")
    ? trimmed.split(":").slice(1).join(":")
    : trimmed;
  if (withoutDex.includes("/")) {
    return withoutDex.toUpperCase();
  }
  if (withoutDex.includes("-")) {
    const [base, ...rest] = withoutDex.split("-");
    const quote = rest.join("-").trim();
    if (!base || !quote) return null;
    return `${base.toUpperCase()}/${quote.toUpperCase()}`;
  }
  return null;
}

export type HyperliquidProfileChain = "hyperliquid" | "hyperliquid-testnet";

export type HyperliquidProfileAssetInput = {
  assetSymbols: string[];
  pair?: string | null;
  leverage?: number | null;
  walletAddress?: string | null;
};

export type HyperliquidProfileAsset = {
  venue: "hyperliquid";
  chain: HyperliquidProfileChain;
  assetSymbols: string[];
  pair?: string;
  leverage?: number;
  walletAddress?: string;
};

export function resolveHyperliquidProfileChain(
  environment: HyperliquidEnvironment
): HyperliquidProfileChain {
  return environment === "testnet" ? "hyperliquid-testnet" : "hyperliquid";
}

export function buildHyperliquidProfileAssets(params: {
  environment: HyperliquidEnvironment;
  assets: HyperliquidProfileAssetInput[];
}): HyperliquidProfileAsset[] {
  const chain = resolveHyperliquidProfileChain(params.environment);

  return params.assets
    .map((asset) => {
      const symbols = asset.assetSymbols
        .map((symbol) => normalizeHyperliquidBaseSymbol(symbol))
        .filter((symbol): symbol is string => Boolean(symbol));
      if (symbols.length === 0) return null;

      const explicitPair =
        typeof asset.pair === "string" ? resolveHyperliquidPair(asset.pair) : null;
      const derivedPair =
        symbols.length === 1
          ? resolveHyperliquidPair(asset.assetSymbols[0] ?? symbols[0])
          : null;
      const pair = explicitPair ?? derivedPair ?? undefined;
      const leverage =
        typeof asset.leverage === "number" && Number.isFinite(asset.leverage) && asset.leverage > 0
          ? asset.leverage
          : undefined;
      const walletAddress =
        typeof asset.walletAddress === "string" && asset.walletAddress.trim().length > 0
          ? asset.walletAddress.trim()
          : undefined;

      return {
        venue: "hyperliquid" as const,
        chain,
        assetSymbols: symbols,
        ...(pair ? { pair } : {}),
        ...(leverage ? { leverage } : {}),
        ...(walletAddress ? { walletAddress } : {}),
      };
    })
    .filter((asset): asset is HyperliquidProfileAsset => asset !== null);
}

export function parseSpotPairSymbol(
  symbol: string
): { base: string; quote: string } | null {
  const trimmed = symbol.trim();
  if (!trimmed.includes("/")) return null;
  const [rawBase, rawQuote] = trimmed.split("/");
  const base = rawBase?.trim().toUpperCase() ?? "";
  const quote = rawQuote?.trim().toUpperCase() ?? "";
  if (!base || !quote) return null;
  return { base, quote };
}

export function isHyperliquidSpotSymbol(symbol: string): boolean {
  return symbol.startsWith("@") || symbol.includes("/");
}

export function resolveSpotMidCandidates(baseSymbol: string): string[] {
  const base = baseSymbol.trim().toUpperCase();
  if (!base) return [];
  const candidates = [base];
  if (base.startsWith("U") && base.length > 1) {
    candidates.push(base.slice(1));
  }
  return Array.from(new Set(candidates));
}

export function resolveSpotTokenCandidates(value: string): string[] {
  const normalized = normalizeSpotTokenName(value).toUpperCase();
  if (!normalized) return [];
  const candidates = [normalized];
  if (normalized.startsWith("U") && normalized.length > 1) {
    candidates.push(normalized.slice(1));
  }
  return Array.from(new Set(candidates));
}

export function resolveHyperliquidOrderSymbol(
  value?: string | null
): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("@")) return trimmed;
  if (trimmed.includes(":")) {
    const [rawDex, ...restParts] = trimmed.split(":");
    const dex = rawDex.trim().toLowerCase();
    const rest = restParts.join(":");
    const base = rest.split("/")[0]?.split("-")[0] ?? rest;
    const normalizedBase = base.trim().toUpperCase();
    if (!dex || !normalizedBase || normalizedBase === UNKNOWN_SYMBOL) {
      return null;
    }
    return `${dex}:${normalizedBase}`;
  }
  const pair = resolveHyperliquidPair(trimmed);
  if (pair) return pair;
  return normalizeHyperliquidBaseSymbol(trimmed);
}

export function resolveHyperliquidSymbol(
  asset: string,
  override?: string
): string {
  const raw =
    override && override.trim().length > 0 ? override.trim() : asset.trim();
  if (!raw) return raw;
  if (raw.startsWith("@")) return raw;
  if (raw.includes(":")) {
    const [dexRaw, ...restParts] = raw.split(":");
    const dex = dexRaw.trim().toLowerCase();
    const rest = restParts.join(":");
    const base = rest.split("/")[0]?.split("-")[0] ?? rest;
    const normalizedBase = base.trim().toUpperCase();
    if (!dex) return normalizedBase;
    return `${dex}:${normalizedBase}`;
  }
  if (raw.includes("/")) {
    return raw.toUpperCase();
  }
  if (raw.includes("-")) {
    const [base, ...rest] = raw.split("-");
    const quote = rest.join("-").trim();
    if (base && quote) {
      return `${base.toUpperCase()}/${quote.toUpperCase()}`;
    }
  }
  const base = raw.split("-")[0] ?? raw;
  const baseNoPair = base.split("/")[0] ?? base;
  return baseNoPair.trim().toUpperCase();
}

import {
  fetchHyperliquidAssetCtxs,
  fetchHyperliquidMeta,
} from "opentool/adapters/hyperliquid";
import { fetchPolymarketMarket } from "opentool/adapters/polymarket";

export async function fetchHyperliquidMarkPrice(symbol: string): Promise<number> {
  const meta = await fetchHyperliquidMeta("mainnet");
  const ctxs = await fetchHyperliquidAssetCtxs("mainnet");
  const index = meta?.universe?.findIndex(
    (asset: { name?: string }) =>
      asset?.name?.toUpperCase() === symbol.toUpperCase()
  );
  if (index == null || index < 0 || !Array.isArray(ctxs)) {
    throw new Error(`Unable to resolve Hyperliquid symbol: ${symbol}`);
  }
  const ctx = ctxs[index] as Record<string, unknown> | undefined;
  const mark = Number(ctx?.markPx ?? ctx?.markPrice ?? ctx?.midPx);
  if (!Number.isFinite(mark) || mark <= 0) {
    throw new Error(`Hyperliquid mark price unavailable for ${symbol}`);
  }
  return mark;
}

export function computeSma(values: number[], window: number): number | null {
  if (values.length < window) return null;
  const slice = values.slice(-window);
  const sum = slice.reduce((acc, v) => acc + v, 0);
  return sum / slice.length;
}

export function computeRsi(values: number[], period: number): number | null {
  if (values.length <= period) return null;
  const slice = values.slice(-period - 1);
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < slice.length; i += 1) {
    const delta = slice[i] - slice[i - 1];
    if (delta >= 0) gains += delta;
    else losses += Math.abs(delta);
  }
  if (gains + losses === 0) return 50;
  const rs = gains / (losses || 1);
  return 100 - 100 / (1 + rs);
}

export async function resolveYesNoTokenIds(params: {
  marketSlug?: string | null;
  marketId?: string | null;
}) {
  const marketSlug = params.marketSlug?.trim() || undefined;
  const marketId = params.marketId?.trim() || undefined;
  if (!marketSlug && !marketId) {
    throw new Error("marketSlug or marketId is required.");
  }

  const market = await fetchPolymarketMarket({
    slug: marketSlug,
    id: marketId,
  });
  if (!market) {
    throw new Error("Unable to resolve Polymarket market.");
  }

  const outcomes = market.outcomes ?? [];
  const tokenIds = market.clobTokenIds ?? [];
  if (outcomes.length !== 2 || tokenIds.length !== 2) {
    throw new Error("Market must have exactly 2 outcomes.");
  }

  const normalizedOutcomes = outcomes.map((o) => o.trim().toLowerCase());
  const yesIndex = normalizedOutcomes.indexOf("yes");
  const noIndex = normalizedOutcomes.indexOf("no");
  const upIndex = normalizedOutcomes.indexOf("up");
  const downIndex = normalizedOutcomes.indexOf("down");

  if (yesIndex !== -1 && noIndex !== -1) {
    return {
      yesTokenId: tokenIds[yesIndex],
      noTokenId: tokenIds[noIndex],
      yesLabel: outcomes[yesIndex],
      noLabel: outcomes[noIndex],
      market,
    };
  }

  if (upIndex !== -1 && downIndex !== -1) {
    return {
      yesTokenId: tokenIds[upIndex],
      noTokenId: tokenIds[downIndex],
      yesLabel: outcomes[upIndex],
      noLabel: outcomes[downIndex],
      market,
    };
  }

  throw new Error("Market outcomes must include Yes/No or Up/Down.");
}

export async function resolveOutcomeTokenId(params: {
  marketSlug?: string | null;
  marketId?: string | null;
  outcome: string;
}) {
  const marketSlug = params.marketSlug?.trim() || undefined;
  const marketId = params.marketId?.trim() || undefined;
  const outcome = params.outcome.trim();
  if (!marketSlug && !marketId) {
    throw new Error("marketSlug or marketId is required.");
  }
  if (!outcome) {
    throw new Error("outcome is required.");
  }

  const market = await fetchPolymarketMarket({
    slug: marketSlug,
    id: marketId,
  });
  if (!market) {
    throw new Error("Unable to resolve Polymarket market.");
  }

  const outcomes = market.outcomes ?? [];
  const tokenIds = market.clobTokenIds ?? [];
  if (!outcomes.length || outcomes.length !== tokenIds.length) {
    throw new Error("Market outcomes and token IDs do not match.");
  }

  const normalized = outcomes.map((label) => label.trim().toLowerCase());
  const target = outcome.trim().toLowerCase();
  const index = normalized.findIndex((label) => label === target);
  if (index === -1) {
    throw new Error(`Outcome '${outcome}' not found in market.`);
  }

  return {
    tokenId: tokenIds[index],
    outcomeLabel: outcomes[index],
    market,
  };
}

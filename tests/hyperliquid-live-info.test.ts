import assert from "node:assert/strict";
import { test } from "node:test";

import {
  fetchHyperliquidAllMids,
  fetchHyperliquidMeta,
  fetchHyperliquidSpotMeta,
  normalizeHyperliquidBaseSymbol,
  parseSpotPairSymbol,
  resolveHyperliquidPair,
} from "../src/adapters/hyperliquid";

test("live hyperliquid /info meta returns canonical perp symbols", async () => {
  const meta = (await fetchHyperliquidMeta("mainnet")) as {
    universe?: Array<{ name?: string }>;
  };
  const universe = Array.isArray(meta?.universe) ? meta.universe : [];

  assert.ok(universe.length > 0, "expected perp universe from hyperliquid /info meta");

  const names = universe
    .map((asset) => (typeof asset?.name === "string" ? asset.name.trim() : ""))
    .filter((name) => name.length > 0)
    .slice(0, 50);

  assert.ok(names.includes("BTC"), "expected BTC in perp universe");

  for (const name of names) {
    const base = normalizeHyperliquidBaseSymbol(name);
    assert.ok(base && base.length > 0, `expected normalized base for ${name}`);
    assert.equal(base?.includes(":"), false);
    assert.equal(base?.includes("/"), false);
  }
});

test("live hyperliquid /info spotMeta includes spot pairs that parse as base/quote", async () => {
  const spotMeta = (await fetchHyperliquidSpotMeta("mainnet")) as {
    universe?: Array<{ name?: string }>;
    tokens?: Array<{ name?: string }>;
  };
  const universe = Array.isArray(spotMeta?.universe) ? spotMeta.universe : [];
  const tokens = Array.isArray(spotMeta?.tokens) ? spotMeta.tokens : [];

  assert.ok(universe.length > 0, "expected spot universe from hyperliquid /info spotMeta");
  assert.ok(tokens.length > 0, "expected spot token registry from hyperliquid /info spotMeta");

  const spotPairName = universe
    .map((entry) => (typeof entry?.name === "string" ? entry.name.trim() : ""))
    .find((name) => name.includes("/"));

  assert.ok(spotPairName, "expected at least one explicit spot pair symbol");

  const pair = resolveHyperliquidPair(spotPairName);
  assert.ok(pair, `expected pair normalization for ${spotPairName}`);
  const parsed = parseSpotPairSymbol(pair ?? "");
  assert.ok(parsed, `expected base/quote parse for ${pair}`);
  assert.equal(pair?.startsWith("hl:"), false);
});

test("live hyperliquid /info allMids returns non-empty mid map", async () => {
  const mids = await fetchHyperliquidAllMids("mainnet");
  const keys = Object.keys(mids ?? {});
  assert.ok(keys.length > 0, "expected mids map from hyperliquid /info allMids");

  const btcMid = mids?.BTC;
  assert.ok(
    typeof btcMid === "string" || typeof btcMid === "number",
    "expected BTC mid in allMids payload",
  );
});

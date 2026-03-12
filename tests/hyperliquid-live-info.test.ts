import assert from "node:assert/strict";
import { test } from "node:test";

import {
  fetchHyperliquidResolvedMarketDescriptor,
  fetchHyperliquidDexMeta,
  fetchHyperliquidMeta,
  fetchHyperliquidSpotMeta,
  parseHyperliquidSymbol,
  resolveHyperliquidMarketDataCoin,
  resolveHyperliquidOrderSymbol,
  resolveHyperliquidPair,
} from "../src/adapters/hyperliquid";

const LIVE_DEXES = ["xyz", "flx", "vntl", "hyna", "km", "cash"] as const;

type MetaUniverseEntry = { name?: string };
type SpotMetaUniverseEntry = { name?: string };

test("live hyperliquid market universe round-trips through shared symbol helpers", async () => {
  const [meta, spotMeta, ...dexMetas] = await Promise.all([
    fetchHyperliquidMeta("mainnet") as Promise<{ universe?: MetaUniverseEntry[] }>,
    fetchHyperliquidSpotMeta("mainnet") as Promise<{ universe?: SpotMetaUniverseEntry[] }>,
    ...LIVE_DEXES.map((dex) =>
      fetchHyperliquidDexMeta("mainnet", dex) as Promise<{ universe?: MetaUniverseEntry[] }>,
    ),
  ]);

  const perpNames = (meta.universe ?? [])
    .map((entry) => (typeof entry?.name === "string" ? entry.name.trim() : ""))
    .filter((name) => name.length > 0);
  const spotNames = (spotMeta.universe ?? [])
    .map((entry) => (typeof entry?.name === "string" ? entry.name.trim() : ""))
    .filter((name) => name.length > 0);
  const dexNames = dexMetas.flatMap((dexMeta) =>
    (dexMeta.universe ?? [])
      .map((entry) => (typeof entry?.name === "string" ? entry.name.trim() : ""))
      .filter((name) => name.length > 0),
  );

  assert.ok(perpNames.length > 0, "expected live perp universe");
  assert.ok(spotNames.length > 0, "expected live spot universe");
  assert.ok(dexNames.length > 0, "expected live dex universes");

  for (const name of perpNames) {
    const parsed = parseHyperliquidSymbol(name);
    assert.ok(parsed, `expected parsed perp symbol for ${name}`);
    assert.equal(parsed?.kind, "perp", `expected perp kind for ${name}`);
    assert.equal(parsed?.normalized, name, `expected canonical perp symbol for ${name}`);
    assert.equal(resolveHyperliquidOrderSymbol(name), name, `expected order symbol for ${name}`);
    assert.equal(
      resolveHyperliquidMarketDataCoin(name),
      name,
      `expected market-data coin for ${name}`,
    );
  }

  for (const name of spotNames) {
    const expectedPair = name.startsWith("@") ? name : resolveHyperliquidPair(name);
    assert.ok(expectedPair, `expected canonical spot form for ${name}`);
    const parsed = parseHyperliquidSymbol(name);
    assert.ok(parsed, `expected parsed spot symbol for ${name}`);
    if (name.startsWith("@")) {
      assert.equal(parsed?.kind, "spotIndex", `expected spot index kind for ${name}`);
      assert.equal(parsed?.normalized, name, `expected spot index normalized for ${name}`);
    } else {
      assert.equal(parsed?.kind, "spot", `expected spot kind for ${name}`);
      assert.equal(parsed?.normalized, expectedPair, `expected canonical spot pair for ${name}`);
    }
    assert.equal(
      resolveHyperliquidOrderSymbol(name),
      expectedPair,
      `expected order symbol for ${name}`,
    );
    assert.equal(
      resolveHyperliquidMarketDataCoin(name),
      expectedPair,
      `expected market-data coin for ${name}`,
    );
  }

  for (const name of dexNames) {
    const parsed = parseHyperliquidSymbol(name);
    assert.ok(parsed, `expected parsed dex symbol for ${name}`);
    assert.equal(parsed?.kind, "perp", `expected perp kind for ${name}`);
    assert.equal(parsed?.normalized, name, `expected canonical dex symbol for ${name}`);
    assert.equal(resolveHyperliquidOrderSymbol(name), name, `expected order symbol for ${name}`);
    assert.equal(
      resolveHyperliquidMarketDataCoin(name),
      name,
      `expected market-data coin for ${name}`,
    );
  }
});

test("live hyperliquid spot universe resolves to metadata-backed order and market-data symbols", async () => {
  const spotMeta = (await fetchHyperliquidSpotMeta("mainnet")) as { universe?: SpotMetaUniverseEntry[] };
  const spotNames = (spotMeta.universe ?? [])
    .map((entry) => (typeof entry?.name === "string" ? entry.name.trim() : ""))
    .filter((name) => name.length > 0 && !name.startsWith("@"));

  assert.ok(spotNames.length > 0, "expected live spot universe");

  for (const name of spotNames) {
    const descriptor = await fetchHyperliquidResolvedMarketDescriptor({
      environment: "mainnet",
      symbol: name,
    });
    assert.equal(descriptor.kind, "spot", `expected spot descriptor for ${name}`);
    assert.ok(descriptor.orderSymbol.includes("/"), `expected pair order symbol for ${name}`);
    assert.ok(descriptor.marketDataCoin.startsWith("@"), `expected spot index market-data coin for ${name}`);
    assert.ok(
      typeof descriptor.spotIndex === "number" && Number.isFinite(descriptor.spotIndex),
      `expected spot index for ${name}`,
    );
  }
});

test("live HIP-3 descriptor resolves collateral-backed quote assets", async () => {
  const descriptor = await fetchHyperliquidResolvedMarketDescriptor({
    environment: "mainnet",
    symbol: "hyna:BTC",
  });

  assert.equal(descriptor.kind, "perp");
  assert.equal(descriptor.normalized, "hyna:BTC");
  assert.equal(descriptor.orderSymbol, "hyna:BTC");
  assert.equal(descriptor.marketDataCoin, "hyna:BTC");
  assert.equal(descriptor.quote, "USDE");
  assert.equal(descriptor.displaySymbol, "BTC-USDE");
  assert.equal(descriptor.canonicalPair, "BTC/USDE");
});

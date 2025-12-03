import { retrieve } from "opentool/store";
import { wallet } from "opentool/wallet";

function resolveChainConfig(environment: "mainnet" | "testnet") {
  return environment === "mainnet"
    ? { chain: "arbitrum", rpcUrl: process.env.ARBITRUM_RPC_URL }
    : {
        chain: "arbitrum-sepolia",
        rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL,
      };
}

export const profile = {
  description:
    "Example strategy stub: every 10 minutes compute a 200 SMA on 1m candles and place a buy/sell. Replace the SMA fetch stub with real market data.",
  schedule: { cron: "*/10 * * * *", enabled: true },
  limits: { concurrency: 1 },
  symbol: "BTC-USDC",
  size: "100",
  environment: "testnet",
};

export async function GET(req: Request): Promise<Response> {
  const { symbol, size } = profile;
  const chainConfig = resolveChainConfig("testnet");
  const context = await wallet({
    chain: chainConfig.chain,
  });

  // Read last recorded action to keep a single-position regime.
  const history = await retrieve({
    source: "hyperliquid-sma",
    walletAddress: context.address,
    symbol,
    limit: 50,
  });
  const lastEntry = history.items?.[0];
  const lastState =
    (
      lastEntry?.metadata as
        | { positionState?: "long" | "short" | "flat" | undefined }
        | undefined
    )?.positionState ?? "flat";

  const { sma, latestPrice } = await computeSmaFromGateway(symbol);
  console.log("sma", sma);
  console.log("latestPrice", latestPrice);
  if (!sma || !latestPrice) {
    throw new Error("Unable to compute SMA or latest price (stub).");
  }

  const side = latestPrice > sma ? "buy" : "sell";
  const desiredState = side === "buy" ? "long" : "short";
  console.log("side calculated", side);

  return Response.json({
    ok: true,
    side,
    sma200_1m: sma,
    latestPrice,
    position: {
      lastState,
      desiredState,
    },
    note: "Dry run: order/store disabled; logging only.",
  });
}

async function computeSmaFromGateway(
  symbol: string
): Promise<{ sma: number; latestPrice: number }> {
  const gatewayBase = process.env.OPENPOND_GATEWAY_URL?.replace(/\/$/, "");

  const coin = symbol.split("-")[0] || symbol;

  const params = new URLSearchParams({
    symbol: coin,
    resolution: "1", // 1m bars
    countBack: "240", // a bit more than 200
    to: Math.floor(Date.now() / 1000).toString(),
  });

  const url = `${gatewayBase}/v1/hyperliquid/bars?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch bars (${res.status}) from gateway (${url})`
    );
  }

  const json = (await res.json().catch(() => null)) as {
    bars?: Array<{ close?: number; c?: number }>;
  } | null;

  const closes = (json?.bars ?? [])
    .map((b) => b.close ?? b.c ?? 0)
    .filter((v) => Number.isFinite(v));

  if (closes.length < 200) {
    throw new Error("Not enough bars to compute SMA200");
  }

  const window = closes.slice(-200);
  const latestPrice = window[window.length - 1];
  const sma = window.reduce((acc, v) => acc + v, 0) / window.length;
  return { sma, latestPrice };
}

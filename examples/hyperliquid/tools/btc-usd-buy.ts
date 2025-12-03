import { store } from "opentool/store";
import { wallet } from "opentool/wallet";
import { placeHyperliquidOrder } from "opentool/adapters/hyperliquid";
import type { HyperliquidEnvironment } from "opentool/adapters/hyperliquid";
import { z } from "zod";

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
    "Place a one-off BTC-USD limit buy (defaults: size 1000, price 85,000).",
};

const decimalString = z
  .string()
  .min(1, "value is required")
  .refine((v) => /^\d+(?:\.\d+)?$/.test(v), "must be a decimal string");

export const schema = z.object({
  symbol: z.string().default("BTC-USD"),
  size: decimalString.default("1000"),
  price: decimalString.default("85000"),
  tif: z
    .enum(["Gtc", "Ioc", "Alo", "FrontendMarket", "LiquidationMarket"])
    .default("Gtc"),
  environment: z.enum(["mainnet", "testnet"]).default("testnet"),
});

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const { symbol, size, price, tif, environment } = schema.parse(body);
  const chainConfig = resolveChainConfig(environment);

  const context = await wallet({
    chain: chainConfig.chain,
    apiKey: process.env.ALCHEMY_API_KEY,
    rpcUrl: chainConfig.rpcUrl,
    turnkey: {
      organizationId: process.env.TURNKEY_SUBORG_ID!,
      apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
      apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
      signWith: process.env.TURNKEY_WALLET_ADDRESS!,
      apiBaseUrl: process.env.TURNKEY_API_BASE_URL,
    },
  });

  const orderResponse = await placeHyperliquidOrder({
    wallet: context,
    environment: environment as HyperliquidEnvironment,
    orders: [
      {
        symbol,
        side: "buy",
        price,
        size,
        tif,
      },
    ],
  });

  const statuses = orderResponse.response?.data?.statuses ?? [];
  const firstStatus = statuses[0];
  const orderId =
    firstStatus && "resting" in firstStatus
      ? firstStatus.resting.oid
      : firstStatus && "filled" in firstStatus
      ? firstStatus.filled.oid
      : null;

  await store({
    source: "hyperliquid-btc-usd-buy",
    ref: orderId ? orderId.toString() : `${symbol}-${Date.now()}`,
    status: "submitted",
    walletAddress: context.address,
    action: "order",
    notional: size,
    metadata: {
      symbol,
      side: "buy",
      price,
      tif,
      environment,
    },
  });

  return Response.json({
    ok: true,
    orderId,
    symbol,
    side: "buy",
    price,
    size,
    tif,
    environment,
  });
}

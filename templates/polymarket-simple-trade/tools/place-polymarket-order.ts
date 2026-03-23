import {
  createOrDerivePolymarketApiKey,
  placePolymarketOrder,
  type PolymarketApiCredentials,
  type PolymarketEnvironment,
} from "opentool/adapters/polymarket";
import { store } from "opentool/store";
import { wallet, type WalletContext, type WalletFullContext } from "opentool/wallet";
import { z } from "zod";

const tradeRequestSchema = z
  .object({
    conditionId: z.string().min(1),
    tokenId: z.string().min(1),
    side: z.enum(["BUY", "SELL"]),
    price: z.coerce.string().min(1),
    size: z.coerce.string().min(1),
    orderType: z.enum(["GTC", "FOK", "FAK", "GTD"]).default("GTC"),
    environment: z.enum(["mainnet", "testnet"]).optional(),
    expiration: z.coerce.number().int().nonnegative().optional(),
    nonce: z.coerce.number().int().nonnegative().optional(),
    feeRateBps: z.coerce.number().int().nonnegative().optional(),
    tickSize: z.coerce.string().min(1).optional(),
  })
  .strict();

export const profile = {
  description: "Place one Polymarket order with the operating wallet signer",
  category: "trade",
};

function assertSignerContext(ctx: WalletContext): asserts ctx is WalletFullContext {
  if (!("walletClient" in ctx) || !ctx.walletClient || !("account" in ctx) || !ctx.account) {
    throw new Error("Configure a signer (PRIVATE_KEY or Turnkey env vars) before trading.");
  }
}

function readCredentialsFromEnv(): PolymarketApiCredentials | undefined {
  const apiKey = process.env.POLYMARKET_API_KEY?.trim();
  const secret = process.env.POLYMARKET_API_SECRET?.trim();
  const passphrase = process.env.POLYMARKET_API_PASSPHRASE?.trim();
  if (!apiKey || !secret || !passphrase) {
    return undefined;
  }
  return {
    apiKey,
    secret,
    passphrase,
  };
}

function resolveEnvironment(): PolymarketEnvironment {
  return process.env.POLYMARKET_ENVIRONMENT === "testnet" ? "testnet" : "mainnet";
}

export async function POST(req: Request) {
  const payload = tradeRequestSchema.parse(await req.json());
  const environment: PolymarketEnvironment = payload.environment ?? resolveEnvironment();
  const ctx = await wallet({
    chain: process.env.OPENTOOL_SIGNER_CHAIN ?? "base",
    apiKey: process.env.ALCHEMY_API_KEY,
    rpcUrl: process.env.RPC_URL,
  });
  assertSignerContext(ctx);

  // Polymarket only needs EIP-712 signing here, so the signer can come from the shared operating wallet.
  const credentials =
    readCredentialsFromEnv() ??
    (await createOrDerivePolymarketApiKey({
      wallet: ctx,
      environment,
    }));

  const result = await placePolymarketOrder({
    wallet: ctx,
    credentials,
    environment,
    orderType: payload.orderType,
    order: {
      tokenId: payload.tokenId,
      side: payload.side,
      price: payload.price,
      size: payload.size,
      ...(payload.expiration !== undefined ? { expiration: payload.expiration } : {}),
      ...(payload.nonce !== undefined ? { nonce: payload.nonce } : {}),
      ...(payload.feeRateBps !== undefined ? { feeRateBps: payload.feeRateBps } : {}),
      ...(payload.tickSize ? { tickSize: payload.tickSize } : {}),
    },
  });

  const ref = result.orderId ?? `${payload.conditionId}:${payload.tokenId}:${Date.now()}`;
  await store({
    source: "polymarket",
    ref,
    status: "submitted",
    walletAddress: ctx.address,
    action: "trade",
    notional: payload.size,
    market: {
      market_type: "prediction",
      venue: "polymarket",
      environment,
      canonical_symbol: `${payload.conditionId}:${payload.tokenId}`,
    },
    metadata: {
      tool: "place-polymarket-order",
      orderId: result.orderId ?? null,
      conditionId: payload.conditionId,
      tokenId: payload.tokenId,
      side: payload.side,
      price: payload.price,
      size: payload.size,
      orderType: payload.orderType,
    },
  });

  return Response.json({
    ok: true,
    environment,
    order: result,
  });
}

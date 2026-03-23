import {
  createOrDerivePolymarketApiKey,
  placePolymarketOrder,
  type PolymarketApiCredentials,
} from "opentool/adapters/polymarket";
import { store } from "opentool/store";
import {
  wallet,
  type WalletContext,
  type WalletFullContext,
} from "opentool/wallet";
import { z } from "zod";

const POLYMARKET_ENVIRONMENT = "mainnet" as const;
const POLYMARKET_SIGNATURE_TYPE = 2 as const;

const tradeRequestSchema = z
  .object({
    conditionId: z.string().min(1),
    tokenId: z.string().min(1),
    side: z.enum(["BUY", "SELL"]),
    price: z.coerce.string().min(1),
    size: z.coerce.string().min(1),
    orderType: z.enum(["GTC", "FOK", "FAK", "GTD"]).default("GTC"),
    expiration: z.coerce.number().int().nonnegative().optional(),
    nonce: z.coerce.number().int().nonnegative().optional(),
    feeRateBps: z.coerce.number().int().nonnegative().optional(),
    tickSize: z.coerce.string().min(1).optional(),
  })
  .strict();

export const profile = {
  description:
    "Place one Polymarket order with the operating wallet signer and canonical funder account",
  category: "trade",
};

function assertSignerContext(
  ctx: WalletContext,
): asserts ctx is WalletFullContext {
  if (
    !("walletClient" in ctx) ||
    !ctx.walletClient ||
    !("account" in ctx) ||
    !ctx.account
  ) {
    throw new Error(
      "Configure a signer (PRIVATE_KEY or Turnkey env vars) before trading.",
    );
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

function readFunderAddress(): `0x${string}` {
  const funderAddress = process.env.POLYMARKET_FUNDER_ADDRESS?.trim();
  if (!funderAddress || !/^0x[a-fA-F0-9]{40}$/.test(funderAddress)) {
    throw new Error(
      "POLYMARKET_FUNDER_ADDRESS must be set to the user's Polymarket funder wallet.",
    );
  }
  return funderAddress as `0x${string}`;
}

function readApiKeyNonce(): number {
  const rawNonce = process.env.POLYMARKET_API_NONCE?.trim();
  if (!rawNonce) {
    throw new Error("POLYMARKET_API_NONCE must be set for Polymarket trading.");
  }
  if (!/^\d+$/.test(rawNonce)) {
    throw new Error("POLYMARKET_API_NONCE must be a non-negative integer.");
  }
  const nonce = Number(rawNonce);
  if (!Number.isSafeInteger(nonce) || nonce < 0) {
    throw new Error("POLYMARKET_API_NONCE must be a non-negative integer.");
  }
  return nonce;
}

export async function POST(req: Request) {
  const payload = tradeRequestSchema.parse(await req.json());
  const environment = POLYMARKET_ENVIRONMENT;
  const ctx = await wallet({
    chain: process.env.OPENTOOL_SIGNER_CHAIN ?? "base",
    apiKey: process.env.ALCHEMY_API_KEY,
    rpcUrl: process.env.RPC_URL,
  });
  assertSignerContext(ctx);
  const funderAddress = readFunderAddress();
  const apiKeyNonce = readApiKeyNonce();

  const credentials =
    readCredentialsFromEnv() ??
    (await createOrDerivePolymarketApiKey({
      wallet: ctx,
      environment,
      nonce: apiKeyNonce,
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
      maker: funderAddress,
      signer: ctx.address as `0x${string}`,
      signatureType: POLYMARKET_SIGNATURE_TYPE,
      ...(payload.expiration !== undefined
        ? { expiration: payload.expiration }
        : {}),
      ...(payload.nonce !== undefined ? { nonce: payload.nonce } : {}),
      ...(payload.feeRateBps !== undefined
        ? { feeRateBps: payload.feeRateBps }
        : {}),
      ...(payload.tickSize ? { tickSize: payload.tickSize } : {}),
    },
  });

  const ref =
    result.orderId ?? `${payload.conditionId}:${payload.tokenId}:${Date.now()}`;
  await store({
    source: "polymarket",
    ref,
    status: "submitted",
    walletAddress: funderAddress,
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
      signerAddress: ctx.address,
      funderAddress,
      signatureType: POLYMARKET_SIGNATURE_TYPE,
    },
  });

  return Response.json({
    ok: true,
    environment,
    funderAddress,
    order: result,
  });
}

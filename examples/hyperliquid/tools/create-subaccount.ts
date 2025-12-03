import { wallet, WalletFullContext } from "opentool/wallet";
import { createHyperliquidSubAccount } from "opentool/adapters/hyperliquid";
import { z } from "zod";

export const profile = {
  description: "Create a Hyperliquid sub-account for the configured wallet.",
};

export async function GET(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const name = "test-subaccount";
  const environment = "testnet";

  const ctx = await wallet({
    chain: "arbitrum-sepolia",
  });

  const result = await createHyperliquidSubAccount({
    wallet: ctx as WalletFullContext,
    environment,
    name,
  });

  return Response.json({ ok: true, environment, name, result });
}

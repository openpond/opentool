import { SwapSdk } from "@0x/swap-ts-sdk";
import { wallet } from "opentool/wallet";

export async function POST(request: Request): Promise<Response> {
  await request.body?.cancel();

  const apiKey = process.env.ZEROX_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ZEROX_API_KEY environment variable is required for the swap example"
    );
  }

  const context = await wallet({
    chain: "base",
    rpcUrl: process.env.RPC_URL,
    privateKey: process.env.PRIVATE_KEY!,
  });

  const sdk = new SwapSdk({
    apiKey,
    chainId: 8453, // Base mainnet
  });

  const { transaction, quote } = await sdk.quote({
    sellToken: "USDC",
    buyToken: "WETH",
    sellAmount: "1000000",
    takerAddress: context.address,
  });

  const txHash = await context.transfer({
    to: transaction.to as `0x${string}`,
    amount: BigInt(transaction.value ?? "0"),
    data: transaction.data as `0x${string}`,
  });

  return new Response(
    JSON.stringify(
      {
        quote,
        transferHash: txHash,
      },
      null,
      2
    ),
    {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    }
  );
}

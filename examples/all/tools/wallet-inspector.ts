import { wallet } from "opentool/wallet";

export async function POST(): Promise<Response> {
  const context = await wallet({
    chain: "base-sepolia",
    apiKey: process.env.ALCHEMY_API_KEY,
    turnkey: {
      organizationId: process.env.TURNKEY_ORGANIZATION_ID!,
      apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY!,
      apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY!,
      signWith: process.env.TURNKEY_SIGN_WITH as `0x${string}`,
    },
  });

  const balance = await context.getNativeBalance();
  const transferAmount = balance / 2n;
  const recipient = "0x0000000000000000000000000000000000000000";

  console.log(balance.toString());

  let txHash: string | null = null;

  if (transferAmount > 0n) {
    txHash = await context.transfer({
      to: recipient,
      amount: transferAmount,
    });
  }

  /*  const sdk = createClientV2({
    apiKey: zeroXApiKey,
  });

  const quote = await sdk.swap.allowanceHolder.getQuote.query({
    sellToken: "USDC",
    buyToken: "WETH",
    sellAmount: "1000000",
    taker: context.address,
    chainId: 8453,
  });

  if (!quote.liquidityAvailable) {
    throw new Error("0x quote did not return a transaction");
  }

  const { transaction } = quote;

  const txHash = await context.transfer({
    to: transaction.to as `0x${string}`,
    amount: BigInt(transaction.value ?? "0"),
    ...(transaction.data ? { data: transaction.data as `0x${string}` } : {}),
  }); */

  return new Response(
    JSON.stringify(
      {
        balance: balance.toString(),
        transfer:
          transferAmount > 0n
            ? {
                to: recipient,
                amount: transferAmount.toString(),
                txHash,
              }
            : {
                to: recipient,
                amount: transferAmount.toString(),
                message: "Insufficient balance to transfer",
              },
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

// GET-only scheduled staking example
export const profile = {
  description: "Stake 100 USDC daily at 12:00 UTC",
  fixedAmount: "100",
  tokenSymbol: "USDC",
  schedule: { cron: "0 12 * * *", enabled: true },
  limits: { concurrency: 1, dailyCap: 1 },
};

export async function GET(_req: Request) {
  return Response.json({ ok: true, action: "stake", amount: profile.fixedAmount, token: profile.tokenSymbol });
}


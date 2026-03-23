import {
  decodeFunctionData,
  encodeFunctionData,
  erc20Abi,
  maxUint256,
  type PublicClient,
} from "viem";

import { PolymarketApiError, PolymarketEnvironment, POLYMARKET_EXCHANGE_ADDRESSES } from "./base";

export interface PolymarketBootstrapContracts {
  usdc: `0x${string}`;
  ctf: `0x${string}`;
  negRiskAdapter: `0x${string}`;
  safeFactory: `0x${string}`;
  safeMultisend: `0x${string}`;
  relayerUrl: string;
  bridgeUrl: string;
}

export interface PolymarketBootstrapTransaction {
  to: `0x${string}`;
  data: `0x${string}`;
  value: string;
  description: string;
}

export interface PolymarketDepositAddressSet {
  evm?: string | null;
  svm?: string | null;
  btc?: string | null;
  sol?: string | null;
  [key: string]: unknown;
}

export interface PolymarketDepositAddressesResponse {
  address?: PolymarketDepositAddressSet | null;
  note?: string | null;
  [key: string]: unknown;
}

export interface PolymarketApprovalState {
  funder: `0x${string}`;
  usdcAllowance: bigint;
  usdcApproved: boolean;
  ctfExchangeApproved: boolean;
  negRiskExchangeApproved: boolean;
  approvalsReady: boolean;
}

const POLYMARKET_SET_APPROVAL_FOR_ALL_ABI = [
  {
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "account", type: "address" },
      { name: "operator", type: "address" },
    ],
    name: "isApprovedForAll",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const POLYMARKET_BOOTSTRAP_CONTRACTS_BY_ENV: Partial<
  Record<PolymarketEnvironment, PolymarketBootstrapContracts>
> = {
  mainnet: {
    usdc: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    ctf: "0x4D97DCd97eC945f40cF65F87097ACe5EA0476045",
    negRiskAdapter: "0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296",
    safeFactory: "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b",
    safeMultisend: "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761",
    relayerUrl: "https://relayer-v2.polymarket.com",
    bridgeUrl: "https://bridge.polymarket.com",
  },
};

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text().catch(() => "");
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new PolymarketApiError(
      `Polymarket request failed (${response.status}).`,
      data ?? { status: response.status },
    );
  }
  return data;
}

export function resolvePolymarketBootstrapContracts(
  environment: PolymarketEnvironment,
): PolymarketBootstrapContracts {
  const contracts = POLYMARKET_BOOTSTRAP_CONTRACTS_BY_ENV[environment];
  if (!contracts) {
    throw new Error(
      `Polymarket bootstrap contracts are not configured for ${environment}.`,
    );
  }
  return contracts;
}

export function buildPolymarketUsdcApprovalTransaction(args?: {
  environment?: PolymarketEnvironment;
  amount?: bigint;
}): PolymarketBootstrapTransaction {
  const environment = args?.environment ?? "mainnet";
  const contracts = resolvePolymarketBootstrapContracts(environment);
  return {
    to: contracts.usdc,
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: "approve",
      args: [contracts.ctf, args?.amount ?? maxUint256],
    }),
    value: "0",
    description: "Approve USDC.e for CTF",
  };
}

export function buildPolymarketOutcomeTokenApprovalTransactions(args?: {
  environment?: PolymarketEnvironment;
  includeNegRisk?: boolean;
}): PolymarketBootstrapTransaction[] {
  const environment = args?.environment ?? "mainnet";
  const includeNegRisk = args?.includeNegRisk ?? true;
  const contracts = resolvePolymarketBootstrapContracts(environment);

  const transactions: PolymarketBootstrapTransaction[] = [
    {
      to: contracts.ctf,
      data: encodeFunctionData({
        abi: POLYMARKET_SET_APPROVAL_FOR_ALL_ABI,
        functionName: "setApprovalForAll",
        args: [POLYMARKET_EXCHANGE_ADDRESSES[environment].ctf, true],
      }),
      value: "0",
      description: "Approve outcome tokens for CTF Exchange",
    },
  ];

  if (includeNegRisk) {
    transactions.push({
      to: contracts.ctf,
      data: encodeFunctionData({
        abi: POLYMARKET_SET_APPROVAL_FOR_ALL_ABI,
        functionName: "setApprovalForAll",
        args: [POLYMARKET_EXCHANGE_ADDRESSES[environment].negRisk, true],
      }),
      value: "0",
      description: "Approve outcome tokens for Neg Risk Exchange",
    });
  }

  return transactions;
}

export function buildPolymarketApprovalTransactions(args?: {
  environment?: PolymarketEnvironment;
  amount?: bigint;
  includeNegRisk?: boolean;
}): PolymarketBootstrapTransaction[] {
  return [
    buildPolymarketUsdcApprovalTransaction(args),
    ...buildPolymarketOutcomeTokenApprovalTransactions(args),
  ];
}

export async function fetchPolymarketApprovalState(args: {
  publicClient: Pick<PublicClient, "readContract">;
  funder: `0x${string}`;
  environment?: PolymarketEnvironment;
  includeNegRisk?: boolean;
}): Promise<PolymarketApprovalState> {
  const environment = args.environment ?? "mainnet";
  const includeNegRisk = args.includeNegRisk ?? true;
  const contracts = resolvePolymarketBootstrapContracts(environment);
  const ctfExchange = POLYMARKET_EXCHANGE_ADDRESSES[environment].ctf;
  const negRiskExchange = POLYMARKET_EXCHANGE_ADDRESSES[environment].negRisk;

  const [allowance, ctfExchangeApproved, negRiskExchangeApproved] = await Promise.all([
    args.publicClient.readContract({
      address: contracts.usdc,
      abi: erc20Abi,
      functionName: "allowance",
      args: [args.funder, contracts.ctf],
    }) as Promise<bigint>,
    args.publicClient.readContract({
      address: contracts.ctf,
      abi: POLYMARKET_SET_APPROVAL_FOR_ALL_ABI,
      functionName: "isApprovedForAll",
      args: [args.funder, ctfExchange],
    }) as Promise<boolean>,
    includeNegRisk
      ? (args.publicClient.readContract({
          address: contracts.ctf,
          abi: POLYMARKET_SET_APPROVAL_FOR_ALL_ABI,
          functionName: "isApprovedForAll",
          args: [args.funder, negRiskExchange],
        }) as Promise<boolean>)
      : Promise.resolve(true),
  ]);

  return {
    funder: args.funder,
    usdcAllowance: allowance,
    usdcApproved: allowance > 0n,
    ctfExchangeApproved,
    negRiskExchangeApproved,
    approvalsReady: allowance > 0n && ctfExchangeApproved && negRiskExchangeApproved,
  };
}

export async function fetchPolymarketDepositAddresses(args: {
  address: string;
  environment?: PolymarketEnvironment;
}): Promise<PolymarketDepositAddressesResponse> {
  const environment = args.environment ?? "mainnet";
  const contracts = resolvePolymarketBootstrapContracts(environment);
  return (await requestJson(`${contracts.bridgeUrl}/deposit`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      address: args.address,
    }),
  })) as PolymarketDepositAddressesResponse;
}

export function decodePolymarketBootstrapTransaction(
  transaction: PolymarketBootstrapTransaction,
): {
  to: `0x${string}`;
  functionName: string;
  args: readonly unknown[];
} {
  const abi =
    transaction.to.toLowerCase() ===
    resolvePolymarketBootstrapContracts("mainnet").usdc.toLowerCase()
      ? erc20Abi
      : POLYMARKET_SET_APPROVAL_FOR_ALL_ABI;
  const decoded = decodeFunctionData({
    abi,
    data: transaction.data,
  });
  return {
    to: transaction.to,
    functionName: decoded.functionName,
    args: decoded.args ?? [],
  };
}

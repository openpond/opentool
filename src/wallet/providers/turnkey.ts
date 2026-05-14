import { Turnkey } from "@turnkey/sdk-server";
import { createAccount } from "@turnkey/viem";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Chain,
  type PublicClient,
  type Transport,
} from "viem";
import type { Account } from "viem/accounts";

import { createMonotonicNonceSource } from "../nonces";
import type {
  ChainMetadata,
  HexAddress,
  TurnkeyActivityOperation,
  TurnkeyActivityTrace,
  TurnkeySignWith,
  WalletSignerContext,
  WalletSendTransactionParams,
  WalletTransferParams,
} from "../types";

export interface TurnkeyProviderConfig {
  chain: ChainMetadata;
  rpcUrl: string;
  organizationId: string;
  apiPublicKey: string;
  apiPrivateKey: string;
  signWith: TurnkeySignWith;
  apiBaseUrl?: string;
  captureActivities?: boolean;
}

export interface TurnkeyProviderResult extends WalletSignerContext {
  publicClient: PublicClient<Transport, Chain>;
}

type TurnkeyApiClient = ReturnType<InstanceType<typeof Turnkey>["apiClient"]>;

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function extractActivity(response: unknown): Record<string, unknown> | null {
  const record = toRecord(response);
  return toRecord(record?.activity);
}

function recordActivityTrace(params: {
  traces: TurnkeyActivityTrace[];
  operation: TurnkeyActivityOperation;
  organizationId: string;
  response?: unknown;
  error?: unknown;
}) {
  const activity = extractActivity(params.response);
  const errorRecord = toRecord(params.error);
  const activityId = toString(activity?.id) ?? toString(errorRecord?.activityId);
  if (!activityId) return;

  const type = toString(activity?.type) ?? toString(errorRecord?.activityType);
  const status = toString(activity?.status) ?? toString(errorRecord?.activityStatus);

  params.traces.push({
    activityId,
    organizationId: toString(activity?.organizationId) ?? params.organizationId,
    operation: params.operation,
    capturedAt: new Date().toISOString(),
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
  });
}

function createActivityCaptureClient(
  client: TurnkeyApiClient,
  traces: TurnkeyActivityTrace[],
  organizationId: string,
): TurnkeyApiClient {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop !== "signRawPayload" && prop !== "signTransaction") {
        return typeof value === "function" ? value.bind(target) : value;
      }

      return async (...args: unknown[]) => {
        try {
          const response = await (value as (...args: unknown[]) => Promise<unknown>).apply(target, args);
          recordActivityTrace({
            traces,
            operation: prop,
            organizationId,
            response,
          });
          return response;
        } catch (error) {
          recordActivityTrace({
            traces,
            operation: prop,
            organizationId,
            error,
          });
          throw error;
        }
      };
    },
  });
}

export async function createTurnkeyProvider(
  config: TurnkeyProviderConfig,
): Promise<TurnkeyProviderResult> {
  const turnkey = new Turnkey({
    apiBaseUrl: config.apiBaseUrl ?? "https://api.turnkey.com",
    // The delegated sub-organization the API key pair belongs to.
    defaultOrganizationId: config.organizationId,
    apiPublicKey: config.apiPublicKey,
    apiPrivateKey: config.apiPrivateKey,
  });
  const activityTraces: TurnkeyActivityTrace[] = [];
  const apiClient = turnkey.apiClient();
  const accountClient = config.captureActivities
    ? createActivityCaptureClient(apiClient, activityTraces, config.organizationId)
    : apiClient;

  const account = (await createAccount({
    client: accountClient,
    organizationId: config.organizationId,
    signWith: config.signWith,
  })) as Account;

  const transport = http(config.rpcUrl);
  const publicClient = createPublicClient<Transport, Chain>({
    chain: config.chain.chain,
    transport,
  });

  const walletClient = createWalletClient<Transport, Chain, Account>({
    account,
    chain: config.chain.chain,
    transport,
  });

  async function sendTransaction(params: WalletSendTransactionParams) {
    const tx: any = {
      account,
    };
    if (params.to) {
      tx.to = params.to;
    }
    if (params.value !== undefined) {
      tx.value = params.value;
    }
    if (params.data !== undefined) {
      tx.data = params.data;
    }

    return walletClient.sendTransaction(tx);
  }

  async function getNativeBalance() {
    return publicClient.getBalance({ address: account.address });
  }

  async function transfer(params: WalletTransferParams) {
    return sendTransaction({
      to: params.to,
      value: params.amount,
      ...(params.data !== undefined ? { data: params.data } : {}),
    });
  }

  return {
    address: account.address as HexAddress,
    account,
    walletClient,
    publicClient,
    sendTransaction,
    getNativeBalance,
    transfer,
    nonceSource: createMonotonicNonceSource(),
    ...(config.captureActivities
      ? {
          getTurnkeyActivities: () => activityTraces.map((trace) => ({ ...trace })),
          clearTurnkeyActivities: () => {
            activityTraces.length = 0;
          },
        }
      : {}),
  };
}

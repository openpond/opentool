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

import type {
  ChainMetadata,
  HexAddress,
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
}

export interface TurnkeyProviderResult extends WalletSignerContext {
  publicClient: PublicClient<Transport, Chain>;
}

function createNonceSource(start: number = Date.now()) {
  let last = start;
  return () => {
    const now = Date.now();
    if (now > last) {
      last = now;
    } else {
      last += 1;
    }
    return last;
  };
}

export async function createTurnkeyProvider(
  config: TurnkeyProviderConfig
): Promise<TurnkeyProviderResult> {
  const turnkey = new Turnkey({
    apiBaseUrl: config.apiBaseUrl ?? "https://api.turnkey.com",
    // The delegated sub-organization the API key pair belongs to.
    defaultOrganizationId: config.organizationId,
    apiPublicKey: config.apiPublicKey,
    apiPrivateKey: config.apiPrivateKey,
  });

  const account = (await createAccount({
    client: turnkey.apiClient(),
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
    nonceSource: createNonceSource(),
  };
}

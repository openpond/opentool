import { Turnkey } from "@turnkey/sdk-server";
import { createAccount } from "@turnkey/viem";
import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient } from "viem";

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
  publicClient: PublicClient;
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

  const account = await createAccount({
    client: turnkey.apiClient(),
    organizationId: config.organizationId,
    signWith: config.signWith,
  });

  const transport = http(config.rpcUrl);
  const publicClient = createPublicClient({
    chain: config.chain.chain,
    transport,
  });

  const walletClient = createWalletClient({
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
    walletClient: walletClient as WalletClient,
    publicClient,
    sendTransaction,
    getNativeBalance,
    transfer,
  };
}

import { createPublicClient, createWalletClient, http, type Chain, type PublicClient, type Transport } from "viem";
import { privateKeyToAccount, type Account } from "viem/accounts";

import type {
  ChainMetadata,
  HexAddress,
  WalletSignerContext,
  WalletSendTransactionParams,
  WalletTransferParams,
} from "../types";

function normalizePrivateKey(raw: string): `0x${string}` {
  const trimmed = raw.trim();
  const withPrefix = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(withPrefix)) {
    throw new Error("wallet() privateKey must be a 32-byte hex string");
  }
  return withPrefix as `0x${string}`;
}

export interface PrivateKeyProviderConfig {
  chain: ChainMetadata;
  rpcUrl: string;
  privateKey: string;
}

export interface PrivateKeyProviderResult extends WalletSignerContext {
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

export function createPrivateKeyProvider(
  config: PrivateKeyProviderConfig
): PrivateKeyProviderResult {
  const privateKey = normalizePrivateKey(config.privateKey);
  const account = privateKeyToAccount(privateKey);

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

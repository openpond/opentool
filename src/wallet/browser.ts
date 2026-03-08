import { createAccount } from "@turnkey/viem";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Chain,
  type PublicClient,
  type Transport,
  type WalletClient,
} from "viem";
import type { Account } from "viem/accounts";

import {
  chains as chainRegistry,
  tokens as tokenRegistry,
  DEFAULT_CHAIN,
  DEFAULT_TOKENS,
} from "./constants";
import { createMonotonicNonceSource, type NonceSource } from "./nonces";
import type {
  ChainMetadata,
  ChainReference,
  HexAddress,
  RpcProviderOptions,
  TurnkeySignWith,
  WalletFullContext,
  WalletProviderType,
  WalletSendTransactionParams,
  WalletTransferParams,
} from "./types";

type ChainSlug = keyof typeof chainRegistry;
type TurnkeyBrowserClientLike = Parameters<typeof createAccount>[0]["client"];

function resolveChainSlug(reference?: ChainReference): ChainSlug {
  if (reference === undefined) {
    return (Object.entries(chainRegistry).find(([, meta]) => meta.id === DEFAULT_CHAIN.id)?.[0] ||
      DEFAULT_CHAIN.slug) as ChainSlug;
  }

  if (typeof reference === "number") {
    const match = Object.entries(chainRegistry).find(([, meta]) => meta.id === reference);
    if (match) {
      return match[0] as ChainSlug;
    }
  } else if (typeof reference === "string") {
    const sanitize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (reference in chainRegistry) {
      return reference as ChainSlug;
    }

    const normalized = sanitize(reference);

    const keyMatch = Object.entries(chainRegistry).find(([key]) => sanitize(key) === normalized);
    if (keyMatch) {
      return keyMatch[0] as ChainSlug;
    }

    const slugMatch = Object.entries(chainRegistry).find(([, meta]) => {
      return meta.slug && sanitize(meta.slug) === normalized;
    });
    if (slugMatch) {
      return slugMatch[0] as ChainSlug;
    }

    const asNumber = Number.parseInt(normalized, 10);
    if (!Number.isNaN(asNumber)) {
      const match = Object.entries(chainRegistry).find(([, meta]) => meta.id === asNumber);
      if (match) {
        return match[0] as ChainSlug;
      }
    }
  }

  throw new Error(`Unknown chain reference: ${reference}`);
}

function getRpcUrl(chain: ChainSlug | number, options?: RpcProviderOptions): string {
  const slug = resolveChainSlug(chain);
  const entry = chainRegistry[slug];
  return entry.rpcUrl(options);
}

function createWalletHelpers(params: {
  account: Account;
  publicClient: PublicClient<Transport, Chain>;
  walletClient: WalletClient<Transport, Chain, Account>;
}) {
  async function sendTransaction(options: WalletSendTransactionParams) {
    const tx: {
      account: Account;
      to?: HexAddress;
      value?: bigint;
      data?: `0x${string}`;
    } = {
      account: params.account,
    };

    if (options.to) {
      tx.to = options.to;
    }
    if (options.value !== undefined) {
      tx.value = options.value;
    }
    if (options.data !== undefined) {
      tx.data = options.data;
    }

    return params.walletClient.sendTransaction(tx);
  }

  async function getNativeBalance() {
    return params.publicClient.getBalance({ address: params.account.address });
  }

  async function transfer(options: WalletTransferParams) {
    return sendTransaction({
      to: options.to,
      value: options.amount,
      ...(options.data !== undefined ? { data: options.data } : {}),
    });
  }

  return {
    sendTransaction,
    getNativeBalance,
    transfer,
  };
}

export interface BrowserWalletContextOptions {
  chain?: ChainReference;
  apiKey?: string;
  rpcUrl?: string;
  address: HexAddress;
  account: Account;
  walletClient: WalletClient<Transport, Chain, Account>;
  publicClient?: PublicClient<Transport, Chain> | undefined;
  nonceSource?: NonceSource | undefined;
  providerType?: WalletProviderType | undefined;
}

export function createBrowserWalletContext(
  options: BrowserWalletContextOptions,
): WalletFullContext {
  const slug = resolveChainSlug(options.chain);
  const chain = chainRegistry[slug];
  const tokens = tokenRegistry[slug] ?? DEFAULT_TOKENS;
  const overrides: RpcProviderOptions = {};

  if (options.rpcUrl) {
    overrides.url = options.rpcUrl;
  }
  if (options.apiKey) {
    overrides.apiKey = options.apiKey;
  }

  const rpcUrl = getRpcUrl(slug, overrides);
  const publicClient =
    options.publicClient ??
    createPublicClient<Transport, Chain>({
      chain: chain.chain,
      transport: http(rpcUrl),
    });
  const walletClient = options.walletClient;
  const helperNonceSource = options.nonceSource ?? createMonotonicNonceSource();
  const helpers = createWalletHelpers({
    account: options.account,
    publicClient,
    walletClient,
  });

  return {
    chain,
    tokens,
    rpcUrl,
    providerType: options.providerType ?? "turnkey",
    publicClient,
    address: options.address,
    account: options.account,
    walletClient,
    nonceSource: helperNonceSource,
    getRpcUrl: (override?: RpcProviderOptions) => getRpcUrl(slug, override),
    ...helpers,
  };
}

export interface TurnkeyBrowserProviderConfig {
  chain: ChainMetadata;
  rpcUrl: string;
  organizationId: string;
  signWith: TurnkeySignWith;
  client: TurnkeyBrowserClientLike;
  ethereumAddress?: HexAddress | undefined;
  nonceSource?: NonceSource | undefined;
}

export async function createTurnkeyBrowserProvider(
  config: TurnkeyBrowserProviderConfig,
): Promise<WalletFullContext> {
  const account = (await createAccount({
    client: config.client,
    organizationId: config.organizationId,
    signWith: config.signWith,
    ...(config.ethereumAddress ? { ethereumAddress: config.ethereumAddress } : {}),
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

  return createBrowserWalletContext({
    chain: config.chain.slug,
    rpcUrl: config.rpcUrl,
    address: account.address as HexAddress,
    account,
    walletClient,
    publicClient,
    ...(config.nonceSource ? { nonceSource: config.nonceSource } : {}),
    providerType: "turnkey",
  });
}

export { createMonotonicNonceSource };
export type { NonceSource };

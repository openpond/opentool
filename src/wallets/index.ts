export * from "./types";
export { chains, tokens, registry, DEFAULT_CHAIN, DEFAULT_TOKENS } from "./constants";

import { createPublicClient, http } from "viem";

import type {
  RpcProviderOptions,
  WalletContext,
  WalletFullContext,
  WalletReadonlyContext,
  WalletOptions,
  WalletProviderType,
  WalletPrivateKeyOptions,
  WalletTurnkeyOptions,
  WalletReadonlyOptions,
} from "./types";
import {
  chains as chainRegistry,
  tokens as tokenRegistry,
  registry as walletRegistry,
  DEFAULT_CHAIN,
  DEFAULT_TOKENS,
} from "./constants";
import { createPrivateKeyProvider } from "./providers/private-key";
import { createTurnkeyProvider } from "./providers/turnkey";

type ChainSlug = keyof typeof chainRegistry;

function resolveChainSlug(reference?: string | number): ChainSlug {
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

export function getRpcUrl(chain: ChainSlug | number, options?: RpcProviderOptions): string {
  const slug = resolveChainSlug(chain);
  const entry = chainRegistry[slug];
  return entry.rpcUrl(options);
}

export function wallet(options: WalletPrivateKeyOptions): Promise<WalletFullContext>;
export function wallet(options: WalletTurnkeyOptions): Promise<WalletFullContext>;
export function wallet(options?: WalletReadonlyOptions): Promise<WalletReadonlyContext>;
export async function wallet(options: WalletOptions = {}): Promise<WalletContext> {
  if (options.privateKey && options.turnkey) {
    throw new Error("wallet() cannot be initialized with both privateKey and turnkey credentials");
  }

  const slug = resolveChainSlug(options.chain);
  const chain = chainRegistry[slug];
  const tokens = tokenRegistry[slug] ?? {};
  const overrides: RpcProviderOptions = {};
  if (options.rpcUrl) {
    overrides.url = options.rpcUrl;
  }
  if (options.apiKey) {
    overrides.apiKey = options.apiKey;
  }

  const rpcUrl = getRpcUrl(slug, overrides);

  let providerType: WalletProviderType = "readonly";
  let signerProvider:
    | ReturnType<typeof createPrivateKeyProvider>
    | (Awaited<ReturnType<typeof createTurnkeyProvider>>)
    | undefined;

  if (options.privateKey) {
    signerProvider = createPrivateKeyProvider({
      chain,
      rpcUrl,
      privateKey: options.privateKey,
    });
    providerType = "privateKey";
  } else if (options.turnkey) {
    const turnkeyConfig = {
      chain,
      rpcUrl,
      organizationId: options.turnkey.organizationId,
      apiPublicKey: options.turnkey.apiPublicKey,
      apiPrivateKey: options.turnkey.apiPrivateKey,
      signWith: options.turnkey.signWith,
    } as Parameters<typeof createTurnkeyProvider>[0];

    if (options.turnkey.apiBaseUrl) {
      turnkeyConfig.apiBaseUrl = options.turnkey.apiBaseUrl;
    }

    signerProvider = await createTurnkeyProvider(turnkeyConfig);
    providerType = "turnkey";
  }

  const publicClient = signerProvider?.publicClient ??
    createPublicClient({
      chain: chain.chain,
      transport: http(rpcUrl),
    });

  const baseContext: WalletReadonlyContext = {
    chain,
    tokens,
    rpcUrl,
    providerType,
    publicClient,
    getRpcUrl: (override?: RpcProviderOptions) => getRpcUrl(slug, override),
  };

  if (signerProvider) {
    const { publicClient: _ignored, ...rest } = signerProvider;
    return {
      ...baseContext,
      ...rest,
    } as WalletFullContext;
  }

  return baseContext;
}

export const walletToolkit = {
  chains: chainRegistry,
  tokens: tokenRegistry,
  registry: walletRegistry,
  defaults: {
    chain: DEFAULT_CHAIN,
    tokens: DEFAULT_TOKENS,
  },
  getRpcUrl,
  wallet,
} as const;

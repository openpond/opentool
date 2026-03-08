import { createAccount } from '@turnkey/viem';
import { zeroAddress, createPublicClient, http, createWalletClient } from 'viem';
import { arbitrumSepolia, arbitrum, baseSepolia, mainnet, base } from 'viem/chains';

// src/wallet/browser.ts
var BASE_ALCHEMY_HOST = "https://base-mainnet.g.alchemy.com/v2/";
var ETHEREUM_ALCHEMY_HOST = "https://eth-mainnet.g.alchemy.com/v2/";
var BASE_SEPOLIA_ALCHEMY_HOST = "https://base-sepolia.g.alchemy.com/v2/";
var ARBITRUM_ALCHEMY_HOST = "https://arb-mainnet.g.alchemy.com/v2/";
var ARBITRUM_SEPOLIA_ALCHEMY_HOST = "https://arb-sepolia.g.alchemy.com/v2/";
function buildRpcResolver(host, fallbackUrls) {
  return (options) => {
    if (options?.url) {
      return options.url;
    }
    if (options?.apiKey) {
      return `${host}${options.apiKey}`;
    }
    if (fallbackUrls.length > 0) {
      return fallbackUrls[0];
    }
    throw new Error(
      "No RPC URL available: supply a full url via options or an apiKey for the default host"
    );
  };
}
var chains = {
  base: {
    id: base.id,
    slug: "base",
    name: "Base",
    chain: base,
    rpcUrl: buildRpcResolver(BASE_ALCHEMY_HOST, base.rpcUrls.default.http),
    publicRpcUrls: base.rpcUrls.default.http
  },
  ethereum: {
    id: mainnet.id,
    slug: "ethereum",
    name: "Ethereum",
    chain: mainnet,
    rpcUrl: buildRpcResolver(ETHEREUM_ALCHEMY_HOST, mainnet.rpcUrls.default.http),
    publicRpcUrls: mainnet.rpcUrls.default.http
  },
  baseSepolia: {
    id: baseSepolia.id,
    slug: "base-sepolia",
    name: "Base Sepolia",
    chain: baseSepolia,
    rpcUrl: buildRpcResolver(BASE_SEPOLIA_ALCHEMY_HOST, baseSepolia.rpcUrls.default.http)
  },
  arbitrum: {
    id: arbitrum.id,
    slug: "arbitrum",
    name: "Arbitrum One",
    chain: arbitrum,
    rpcUrl: buildRpcResolver(ARBITRUM_ALCHEMY_HOST, arbitrum.rpcUrls.default.http),
    publicRpcUrls: arbitrum.rpcUrls.default.http
  },
  arbitrumSepolia: {
    id: arbitrumSepolia.id,
    slug: "arbitrum-sepolia",
    name: "Arbitrum Sepolia",
    chain: arbitrumSepolia,
    rpcUrl: buildRpcResolver(ARBITRUM_SEPOLIA_ALCHEMY_HOST, arbitrumSepolia.rpcUrls.default.http),
    publicRpcUrls: arbitrumSepolia.rpcUrls.default.http
  }
};
function createNativeToken(chainId, symbol, name) {
  return {
    [symbol]: {
      symbol,
      name,
      decimals: 18,
      address: zeroAddress,
      chainId,
      isNative: true
    }
  };
}
function token(chainId, symbol, name, address, decimals) {
  return {
    symbol,
    name,
    decimals,
    address,
    chainId
  };
}
var tokens = {
  base: {
    ...createNativeToken(base.id, "ETH", "Ether"),
    USDC: token(base.id, "USDC", "USD Coin", "0x833589fCD6eDb6E08f4c7C31c9A8Ba32D74b86B2", 6)
  },
  ethereum: {
    ...createNativeToken(mainnet.id, "ETH", "Ether"),
    USDC: token(mainnet.id, "USDC", "USD Coin", "0xA0b86991c6218b36c1d19d4a2e9Eb0cE3606eB48", 6)
  },
  arbitrum: {
    ...createNativeToken(arbitrum.id, "ETH", "Ether"),
    USDC: token(arbitrum.id, "USDC", "USD Coin", "0xaf88d065e77c8cc2239327c5edb3a432268e5831", 6)
  },
  arbitrumSepolia: {
    ...createNativeToken(arbitrumSepolia.id, "ETH", "Ether"),
    USDC: token(
      arbitrumSepolia.id,
      "USDC",
      "USD Coin",
      "0x1baAbB04529D43a73232B713C0FE471f7c7334d5",
      6
    )
  }
};
var DEFAULT_CHAIN = chains.base;
var DEFAULT_TOKENS = tokens.base;

// src/wallet/nonces.ts
function createMonotonicNonceSource(start = Date.now()) {
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

// src/wallet/browser.ts
function resolveChainSlug(reference) {
  if (reference === void 0) {
    return Object.entries(chains).find(([, meta]) => meta.id === DEFAULT_CHAIN.id)?.[0] || DEFAULT_CHAIN.slug;
  }
  if (typeof reference === "number") {
    const match = Object.entries(chains).find(([, meta]) => meta.id === reference);
    if (match) {
      return match[0];
    }
  } else if (typeof reference === "string") {
    const sanitize = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (reference in chains) {
      return reference;
    }
    const normalized = sanitize(reference);
    const keyMatch = Object.entries(chains).find(([key]) => sanitize(key) === normalized);
    if (keyMatch) {
      return keyMatch[0];
    }
    const slugMatch = Object.entries(chains).find(([, meta]) => {
      return meta.slug && sanitize(meta.slug) === normalized;
    });
    if (slugMatch) {
      return slugMatch[0];
    }
    const asNumber = Number.parseInt(normalized, 10);
    if (!Number.isNaN(asNumber)) {
      const match = Object.entries(chains).find(([, meta]) => meta.id === asNumber);
      if (match) {
        return match[0];
      }
    }
  }
  throw new Error(`Unknown chain reference: ${reference}`);
}
function getRpcUrl(chain, options) {
  const slug = resolveChainSlug(chain);
  const entry = chains[slug];
  return entry.rpcUrl(options);
}
function createWalletHelpers(params) {
  async function sendTransaction(options) {
    const tx = {
      account: params.account
    };
    if (options.to) {
      tx.to = options.to;
    }
    if (options.value !== void 0) {
      tx.value = options.value;
    }
    if (options.data !== void 0) {
      tx.data = options.data;
    }
    return params.walletClient.sendTransaction(tx);
  }
  async function getNativeBalance() {
    return params.publicClient.getBalance({ address: params.account.address });
  }
  async function transfer(options) {
    return sendTransaction({
      to: options.to,
      value: options.amount,
      ...options.data !== void 0 ? { data: options.data } : {}
    });
  }
  return {
    sendTransaction,
    getNativeBalance,
    transfer
  };
}
function createBrowserWalletContext(options) {
  const slug = resolveChainSlug(options.chain);
  const chain = chains[slug];
  const tokens2 = tokens[slug] ?? DEFAULT_TOKENS;
  const overrides = {};
  if (options.rpcUrl) {
    overrides.url = options.rpcUrl;
  }
  if (options.apiKey) {
    overrides.apiKey = options.apiKey;
  }
  const rpcUrl = getRpcUrl(slug, overrides);
  const publicClient = options.publicClient ?? createPublicClient({
    chain: chain.chain,
    transport: http(rpcUrl)
  });
  const walletClient = options.walletClient;
  const helperNonceSource = options.nonceSource ?? createMonotonicNonceSource();
  const helpers = createWalletHelpers({
    account: options.account,
    publicClient,
    walletClient
  });
  return {
    chain,
    tokens: tokens2,
    rpcUrl,
    providerType: options.providerType ?? "turnkey",
    publicClient,
    address: options.address,
    account: options.account,
    walletClient,
    nonceSource: helperNonceSource,
    getRpcUrl: (override) => getRpcUrl(slug, override),
    ...helpers
  };
}
async function createTurnkeyBrowserProvider(config) {
  const account = await createAccount({
    client: config.client,
    organizationId: config.organizationId,
    signWith: config.signWith,
    ...config.ethereumAddress ? { ethereumAddress: config.ethereumAddress } : {}
  });
  const transport = http(config.rpcUrl);
  const publicClient = createPublicClient({
    chain: config.chain.chain,
    transport
  });
  const walletClient = createWalletClient({
    account,
    chain: config.chain.chain,
    transport
  });
  return createBrowserWalletContext({
    chain: config.chain.slug,
    rpcUrl: config.rpcUrl,
    address: account.address,
    account,
    walletClient,
    publicClient,
    ...config.nonceSource ? { nonceSource: config.nonceSource } : {},
    providerType: "turnkey"
  });
}

export { createBrowserWalletContext, createMonotonicNonceSource, createTurnkeyBrowserProvider };
//# sourceMappingURL=browser.js.map
//# sourceMappingURL=browser.js.map
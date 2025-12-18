import { zeroAddress, createPublicClient, http, createWalletClient } from 'viem';
import { arbitrumSepolia, arbitrum, baseSepolia, mainnet, base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { Turnkey } from '@turnkey/sdk-server';
import { createAccount } from '@turnkey/viem';

// src/wallet/constants.ts
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
    rpcUrl: buildRpcResolver(
      ETHEREUM_ALCHEMY_HOST,
      mainnet.rpcUrls.default.http
    ),
    publicRpcUrls: mainnet.rpcUrls.default.http
  },
  baseSepolia: {
    id: baseSepolia.id,
    slug: "base-sepolia",
    name: "Base Sepolia",
    chain: baseSepolia,
    rpcUrl: buildRpcResolver(
      BASE_SEPOLIA_ALCHEMY_HOST,
      baseSepolia.rpcUrls.default.http
    )
  },
  arbitrum: {
    id: arbitrum.id,
    slug: "arbitrum",
    name: "Arbitrum One",
    chain: arbitrum,
    rpcUrl: buildRpcResolver(
      ARBITRUM_ALCHEMY_HOST,
      arbitrum.rpcUrls.default.http
    ),
    publicRpcUrls: arbitrum.rpcUrls.default.http
  },
  arbitrumSepolia: {
    id: arbitrumSepolia.id,
    slug: "arbitrum-sepolia",
    name: "Arbitrum Sepolia",
    chain: arbitrumSepolia,
    rpcUrl: buildRpcResolver(
      ARBITRUM_SEPOLIA_ALCHEMY_HOST,
      arbitrumSepolia.rpcUrls.default.http
    ),
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
    USDC: token(
      base.id,
      "USDC",
      "USD Coin",
      "0x833589fCD6eDb6E08f4c7C31c9A8Ba32D74b86B2",
      6
    )
  },
  ethereum: {
    ...createNativeToken(mainnet.id, "ETH", "Ether"),
    USDC: token(
      mainnet.id,
      "USDC",
      "USD Coin",
      "0xA0b86991c6218b36c1d19d4a2e9Eb0cE3606eB48",
      6
    )
  },
  arbitrum: {
    ...createNativeToken(arbitrum.id, "ETH", "Ether"),
    USDC: token(
      arbitrum.id,
      "USDC",
      "USD Coin",
      "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
      6
    )
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
var registry = {
  chains,
  tokens
};
function normalizePrivateKey(raw) {
  const trimmed = raw.trim();
  const withPrefix = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(withPrefix)) {
    throw new Error("wallet() privateKey must be a 32-byte hex string");
  }
  return withPrefix;
}
function createNonceSource(start = Date.now()) {
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
function createPrivateKeyProvider(config) {
  const privateKey = normalizePrivateKey(config.privateKey);
  const account = privateKeyToAccount(privateKey);
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
  async function sendTransaction(params) {
    const tx = {
      account
    };
    if (params.to) {
      tx.to = params.to;
    }
    if (params.value !== void 0) {
      tx.value = params.value;
    }
    if (params.data !== void 0) {
      tx.data = params.data;
    }
    return walletClient.sendTransaction(tx);
  }
  async function getNativeBalance() {
    return publicClient.getBalance({ address: account.address });
  }
  async function transfer(params) {
    return sendTransaction({
      to: params.to,
      value: params.amount,
      ...params.data !== void 0 ? { data: params.data } : {}
    });
  }
  return {
    address: account.address,
    account,
    walletClient,
    publicClient,
    sendTransaction,
    getNativeBalance,
    transfer,
    nonceSource: createNonceSource()
  };
}
function createNonceSource2(start = Date.now()) {
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
async function createTurnkeyProvider(config) {
  const turnkey = new Turnkey({
    apiBaseUrl: config.apiBaseUrl ?? "https://api.turnkey.com",
    // The delegated sub-organization the API key pair belongs to.
    defaultOrganizationId: config.organizationId,
    apiPublicKey: config.apiPublicKey,
    apiPrivateKey: config.apiPrivateKey
  });
  const account = await createAccount({
    client: turnkey.apiClient(),
    organizationId: config.organizationId,
    signWith: config.signWith
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
  async function sendTransaction(params) {
    const tx = {
      account
    };
    if (params.to) {
      tx.to = params.to;
    }
    if (params.value !== void 0) {
      tx.value = params.value;
    }
    if (params.data !== void 0) {
      tx.data = params.data;
    }
    return walletClient.sendTransaction(tx);
  }
  async function getNativeBalance() {
    return publicClient.getBalance({ address: account.address });
  }
  async function transfer(params) {
    return sendTransaction({
      to: params.to,
      value: params.amount,
      ...params.data !== void 0 ? { data: params.data } : {}
    });
  }
  return {
    address: account.address,
    account,
    walletClient,
    publicClient,
    sendTransaction,
    getNativeBalance,
    transfer,
    nonceSource: createNonceSource2()
  };
}

// src/wallet/env.ts
function readTrimmed(name) {
  const value = process.env[name];
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length ? trimmed : void 0;
}
function readTurnkeyEnv() {
  const suborgId = readTrimmed("TURNKEY_SUBORG_ID");
  if (!suborgId) return void 0;
  const apiPublicKey = readTrimmed("TURNKEY_API_PUBLIC_KEY");
  const apiPrivateKey = readTrimmed("TURNKEY_API_PRIVATE_KEY");
  const signWith = readTrimmed("TURNKEY_WALLET_ADDRESS");
  if (!apiPublicKey || !apiPrivateKey || !signWith) return void 0;
  const apiBaseUrl = readTrimmed("TURNKEY_API_BASE_URL");
  return {
    organizationId: suborgId,
    apiPublicKey,
    apiPrivateKey,
    signWith,
    ...apiBaseUrl ? { apiBaseUrl } : {}
  };
}

// src/wallet/index.ts
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
async function wallet(options = {}) {
  const envPrivateKey = process.env.PRIVATE_KEY?.trim();
  const envTurnkey = readTurnkeyEnv();
  const effectivePrivateKey = options.privateKey ?? envPrivateKey;
  const effectiveTurnkey = options.turnkey ?? envTurnkey;
  if (effectivePrivateKey && effectiveTurnkey) {
    throw new Error("wallet() cannot be initialized with both privateKey and turnkey credentials");
  }
  const slug = resolveChainSlug(options.chain);
  const chain = chains[slug];
  const tokens2 = tokens[slug] ?? {};
  const overrides = {};
  const envRpcUrl = process.env.RPC_URL?.trim();
  const envApiKey = process.env.ALCHEMY_API_KEY?.trim();
  if (options.rpcUrl ?? envRpcUrl) {
    overrides.url = options.rpcUrl ?? envRpcUrl;
  }
  if (options.apiKey ?? envApiKey) {
    overrides.apiKey = options.apiKey ?? envApiKey;
  }
  const rpcUrl = getRpcUrl(slug, overrides);
  let providerType = "readonly";
  let signerProvider;
  if (effectivePrivateKey) {
    signerProvider = createPrivateKeyProvider({
      chain,
      rpcUrl,
      privateKey: effectivePrivateKey
    });
    providerType = "privateKey";
  } else if (effectiveTurnkey) {
    const turnkeyConfig = {
      chain,
      rpcUrl,
      organizationId: effectiveTurnkey.organizationId,
      apiPublicKey: effectiveTurnkey.apiPublicKey,
      apiPrivateKey: effectiveTurnkey.apiPrivateKey,
      signWith: effectiveTurnkey.signWith
    };
    if (effectiveTurnkey.apiBaseUrl) {
      turnkeyConfig.apiBaseUrl = effectiveTurnkey.apiBaseUrl;
    }
    signerProvider = await createTurnkeyProvider(turnkeyConfig);
    providerType = "turnkey";
  }
  const publicClient = signerProvider?.publicClient ?? createPublicClient({
    chain: chain.chain,
    transport: http(rpcUrl)
  });
  const baseContext = {
    chain,
    tokens: tokens2,
    rpcUrl,
    providerType,
    publicClient,
    getRpcUrl: (override) => getRpcUrl(slug, override),
    ...signerProvider ? { address: signerProvider.address } : {}
  };
  if (signerProvider) {
    const { publicClient: _ignored, ...rest } = signerProvider;
    return {
      ...baseContext,
      ...rest
    };
  }
  return baseContext;
}
var walletToolkit = {
  chains,
  tokens,
  registry,
  defaults: {
    chain: DEFAULT_CHAIN,
    tokens: DEFAULT_TOKENS
  },
  getRpcUrl,
  wallet
};

export { DEFAULT_CHAIN, DEFAULT_TOKENS, chains, getRpcUrl, registry, tokens, wallet, walletToolkit };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
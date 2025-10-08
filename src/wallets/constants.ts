import { zeroAddress } from "viem";
import { base, baseSepolia, mainnet } from "viem/chains";

import type {
  ChainMetadata,
  ChainTokenMap,
  HexAddress,
  RpcUrlResolver,
  WalletRegistry,
} from "./types";

const BASE_ALCHEMY_HOST = "https://base-mainnet.g.alchemy.com/v2/";
const ETHEREUM_ALCHEMY_HOST = "https://eth-mainnet.g.alchemy.com/v2/";
const BASE_SEPOLIA_ALCHEMY_HOST = "https://base-sepolia.g.alchemy.com/v2/";

function buildRpcResolver(
  host: string,
  fallbackUrls: readonly string[]
): RpcUrlResolver {
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

const chains: Record<string, ChainMetadata> = {
  base: {
    id: base.id,
    slug: "base",
    name: "Base",
    chain: base,
    rpcUrl: buildRpcResolver(BASE_ALCHEMY_HOST, base.rpcUrls.default.http),
    publicRpcUrls: base.rpcUrls.default.http,
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
    publicRpcUrls: mainnet.rpcUrls.default.http,
  },
  baseSepolia: {
    id: baseSepolia.id,
    slug: "base-sepolia",
    name: "Base Sepolia",
    chain: baseSepolia,
    rpcUrl: buildRpcResolver(
      BASE_SEPOLIA_ALCHEMY_HOST,
      baseSepolia.rpcUrls.default.http
    ),
  },
};

function createNativeToken(
  chainId: number,
  symbol: string,
  name: string
): ChainTokenMap {
  return {
    [symbol]: {
      symbol,
      name,
      decimals: 18,
      address: zeroAddress,
      chainId,
      isNative: true,
    },
  };
}

function token(
  chainId: number,
  symbol: string,
  name: string,
  address: HexAddress,
  decimals: number
) {
  return {
    symbol,
    name,
    decimals,
    address,
    chainId,
  };
}

const tokens: Record<string, ChainTokenMap> = {
  base: {
    ...createNativeToken(base.id, "ETH", "Ether"),
    USDC: token(
      base.id,
      "USDC",
      "USD Coin",
      "0x833589fCD6eDb6E08f4c7C31c9A8Ba32D74b86B2",
      6
    ),
  },
  ethereum: {
    ...createNativeToken(mainnet.id, "ETH", "Ether"),
    USDC: token(
      mainnet.id,
      "USDC",
      "USD Coin",
      "0xA0b86991c6218b36c1d19d4a2e9Eb0cE3606eB48",
      6
    ),
  },
};

export const DEFAULT_CHAIN = chains.base;
export const DEFAULT_TOKENS = tokens.base;

export const registry: WalletRegistry = {
  chains,
  tokens,
};

export { chains, tokens };

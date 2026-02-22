import type { HyperliquidEnvironment } from "./base";

export type HyperliquidChain = "arbitrum" | "arbitrum-sepolia";
export type HyperliquidStoreNetwork = "hyperliquid" | "hyperliquid-testnet";

export function resolveHyperliquidChain(
  environment: HyperliquidEnvironment
): HyperliquidChain {
  return environment === "mainnet" ? "arbitrum" : "arbitrum-sepolia";
}

export function resolveHyperliquidRpcEnvVar(
  environment: HyperliquidEnvironment
): "ARBITRUM_RPC_URL" | "ARBITRUM_SEPOLIA_RPC_URL" {
  return environment === "mainnet"
    ? "ARBITRUM_RPC_URL"
    : "ARBITRUM_SEPOLIA_RPC_URL";
}

export function resolveHyperliquidChainConfig(
  environment: HyperliquidEnvironment,
  env: Record<string, string | undefined> = process.env
): { chain: HyperliquidChain; rpcUrl?: string } {
  const rpcVar = resolveHyperliquidRpcEnvVar(environment);
  const rpcUrl = env[rpcVar];
  return {
    chain: resolveHyperliquidChain(environment),
    ...(rpcUrl ? { rpcUrl } : {}),
  };
}

export function resolveHyperliquidStoreNetwork(
  environment: HyperliquidEnvironment
): HyperliquidStoreNetwork {
  return environment === "mainnet" ? "hyperliquid" : "hyperliquid-testnet";
}

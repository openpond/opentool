import type { Chain, PublicClient, Transport, WalletClient } from "viem";
import type { Account } from "viem/accounts";

export type Hex = `0x${string}`;
export type HexAddress = `0x${string}`;

export interface RpcProviderOptions {
  /** Optional fully-qualified RPC URL override. */
  url?: string;
  /** Provider API key to interpolate into hosted RPC templates. */
  apiKey?: string;
}

export type RpcUrlResolver = (options?: RpcProviderOptions) => string;

export interface ChainMetadata {
  id: number;
  slug: string;
  name: string;
  chain: Chain;
  rpcUrl: RpcUrlResolver;
  publicRpcUrls?: readonly string[];
}

export interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  address: HexAddress;
  chainId: number;
  isNative?: boolean;
}

export type ChainTokenMap = Record<string, TokenMetadata>;

export interface WalletRegistry {
  chains: Record<string, ChainMetadata>;
  tokens: Record<string, ChainTokenMap>;
}

export type ChainReference = string | number;

export type WalletProviderType = "readonly" | "privateKey" | "turnkey";

export type TurnkeySignWith = string;

export interface TurnkeyOptions {
  organizationId: string;
  apiPublicKey: string;
  apiPrivateKey: string;
  /** Identifier of the delegated signer (Turnkey address or private key ID). */
  signWith: TurnkeySignWith;
  apiBaseUrl?: string;
}

export interface WalletOptionsBase {
  chain?: ChainReference;
  apiKey?: string;
  rpcUrl?: string;
}

export interface WalletPrivateKeyOptions extends WalletOptionsBase {
  privateKey: string;
  turnkey?: undefined;
}

export interface WalletTurnkeyOptions extends WalletOptionsBase {
  privateKey?: undefined;
  turnkey: TurnkeyOptions;
}

export type WalletReadonlyOptions = WalletOptionsBase & {
  privateKey?: undefined;
  turnkey?: undefined;
};

export type WalletOptions =
  | WalletReadonlyOptions
  | WalletPrivateKeyOptions
  | WalletTurnkeyOptions;

export interface WalletSendTransactionParams {
  to?: HexAddress;
  value?: bigint;
  data?: Hex;
}

export interface WalletTransferParams {
  to: HexAddress;
  amount: bigint;
  data?: Hex;
}

export interface WalletSignerContext {
  address: HexAddress;
  account: Account;
  walletClient: WalletClient<Transport, Chain, Account>;
  publicClient: PublicClient<Transport, Chain>;
  sendTransaction(params: WalletSendTransactionParams): Promise<Hex>;
  getNativeBalance(): Promise<bigint>;
  transfer(params: WalletTransferParams): Promise<Hex>;
  /**
   * Optional monotonic nonce provider for systems that require client-side nonces.
   */
  nonceSource?: () => number;
}

export interface WalletBaseContext {
  chain: ChainMetadata;
  rpcUrl: string;
  tokens: ChainTokenMap;
  providerType: WalletProviderType;
  publicClient: PublicClient;
  getRpcUrl(options?: RpcProviderOptions): string;
  /** Address is present when a signer is configured; undefined for read-only wallets. */
  address?: HexAddress;
}

export type WalletReadonlyContext = WalletBaseContext;
export type WalletFullContext = WalletBaseContext & WalletSignerContext;
export type WalletContext = WalletReadonlyContext | WalletFullContext;

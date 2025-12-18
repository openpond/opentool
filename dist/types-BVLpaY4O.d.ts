import { Chain, WalletClient, Transport, PublicClient } from 'viem';
import { Account } from 'viem/accounts';

type Hex = `0x${string}`;
type HexAddress = `0x${string}`;
interface RpcProviderOptions {
    /** Optional fully-qualified RPC URL override. */
    url?: string;
    /** Provider API key to interpolate into hosted RPC templates. */
    apiKey?: string;
}
type RpcUrlResolver = (options?: RpcProviderOptions) => string;
interface ChainMetadata {
    id: number;
    slug: string;
    name: string;
    chain: Chain;
    rpcUrl: RpcUrlResolver;
    publicRpcUrls?: readonly string[];
}
interface TokenMetadata {
    symbol: string;
    name: string;
    decimals: number;
    address: HexAddress;
    chainId: number;
    isNative?: boolean;
}
type ChainTokenMap = Record<string, TokenMetadata>;
interface WalletRegistry {
    chains: Record<string, ChainMetadata>;
    tokens: Record<string, ChainTokenMap>;
}
type ChainReference = string | number;
type WalletProviderType = "readonly" | "privateKey" | "turnkey";
type TurnkeySignWith = string;
interface TurnkeyOptions {
    organizationId: string;
    apiPublicKey: string;
    apiPrivateKey: string;
    /** Identifier of the delegated signer (Turnkey address or private key ID). */
    signWith: TurnkeySignWith;
    apiBaseUrl?: string;
}
interface WalletOptionsBase {
    chain?: ChainReference;
    apiKey?: string;
    rpcUrl?: string;
}
interface WalletPrivateKeyOptions extends WalletOptionsBase {
    privateKey: string;
    turnkey?: undefined;
}
interface WalletTurnkeyOptions extends WalletOptionsBase {
    privateKey?: undefined;
    turnkey: TurnkeyOptions;
}
type WalletReadonlyOptions = WalletOptionsBase & {
    privateKey?: undefined;
    turnkey?: undefined;
};
type WalletOptions = WalletReadonlyOptions | WalletPrivateKeyOptions | WalletTurnkeyOptions;
interface WalletSendTransactionParams {
    to?: HexAddress;
    value?: bigint;
    data?: Hex;
}
interface WalletTransferParams {
    to: HexAddress;
    amount: bigint;
    data?: Hex;
}
interface WalletSignerContext {
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
interface WalletBaseContext {
    chain: ChainMetadata;
    rpcUrl: string;
    tokens: ChainTokenMap;
    providerType: WalletProviderType;
    publicClient: PublicClient;
    getRpcUrl(options?: RpcProviderOptions): string;
    /** Address is present when a signer is configured; undefined for read-only wallets. */
    address?: HexAddress;
}
type WalletReadonlyContext = WalletBaseContext;
type WalletFullContext = WalletBaseContext & WalletSignerContext;
type WalletContext = WalletReadonlyContext | WalletFullContext;

export type { ChainMetadata as C, Hex as H, RpcProviderOptions as R, TokenMetadata as T, WalletRegistry as W, ChainTokenMap as a, WalletPrivateKeyOptions as b, WalletFullContext as c, WalletTurnkeyOptions as d, WalletReadonlyOptions as e, WalletReadonlyContext as f, HexAddress as g, RpcUrlResolver as h, ChainReference as i, WalletProviderType as j, TurnkeySignWith as k, TurnkeyOptions as l, WalletOptionsBase as m, WalletOptions as n, WalletSendTransactionParams as o, WalletTransferParams as p, WalletSignerContext as q, WalletBaseContext as r, WalletContext as s };

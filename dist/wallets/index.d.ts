import { Chain, WalletClient, PublicClient } from 'viem';
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
    walletClient: WalletClient;
    publicClient: PublicClient;
    sendTransaction(params: WalletSendTransactionParams): Promise<Hex>;
    getNativeBalance(): Promise<bigint>;
    transfer(params: WalletTransferParams): Promise<Hex>;
}
interface WalletBaseContext {
    chain: ChainMetadata;
    rpcUrl: string;
    tokens: ChainTokenMap;
    providerType: WalletProviderType;
    publicClient: PublicClient;
    getRpcUrl(options?: RpcProviderOptions): string;
}
type WalletReadonlyContext = WalletBaseContext;
type WalletFullContext = WalletBaseContext & WalletSignerContext;
type WalletContext = WalletReadonlyContext | WalletFullContext;

declare const chains: Record<string, ChainMetadata>;
declare const tokens: Record<string, ChainTokenMap>;
declare const DEFAULT_CHAIN: ChainMetadata;
declare const DEFAULT_TOKENS: ChainTokenMap;
declare const registry: WalletRegistry;

type ChainSlug = keyof typeof chains;
declare function getRpcUrl(chain: ChainSlug | number, options?: RpcProviderOptions): string;
declare function wallet(options: WalletPrivateKeyOptions): Promise<WalletFullContext>;
declare function wallet(options: WalletTurnkeyOptions): Promise<WalletFullContext>;
declare function wallet(options?: WalletReadonlyOptions): Promise<WalletReadonlyContext>;
declare const walletToolkit: {
    readonly chains: Record<string, ChainMetadata>;
    readonly tokens: Record<string, ChainTokenMap>;
    readonly registry: WalletRegistry;
    readonly defaults: {
        readonly chain: ChainMetadata;
        readonly tokens: ChainTokenMap;
    };
    readonly getRpcUrl: typeof getRpcUrl;
    readonly wallet: typeof wallet;
};

export { type ChainMetadata, type ChainReference, type ChainTokenMap, DEFAULT_CHAIN, DEFAULT_TOKENS, type Hex, type HexAddress, type RpcProviderOptions, type RpcUrlResolver, type TokenMetadata, type TurnkeyOptions, type TurnkeySignWith, type WalletBaseContext, type WalletContext, type WalletFullContext, type WalletOptions, type WalletOptionsBase, type WalletPrivateKeyOptions, type WalletProviderType, type WalletReadonlyContext, type WalletReadonlyOptions, type WalletRegistry, type WalletSendTransactionParams, type WalletSignerContext, type WalletTransferParams, type WalletTurnkeyOptions, chains, getRpcUrl, registry, tokens, wallet, walletToolkit };

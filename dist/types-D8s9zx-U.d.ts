import { Chain, PublicClient, WalletClient, Transport } from 'viem';
import { Account } from 'viem/accounts';

type Hex = `0x${string}`;
type HexAddress = `0x${string}`;
type NonceSource = () => number;
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
type TurnkeyActivityOperation = "signRawPayload" | "signTransaction";
interface TurnkeyActivityTrace {
    activityId: string;
    organizationId?: string;
    operation: TurnkeyActivityOperation;
    type?: string;
    status?: string;
    capturedAt: string;
}
interface TurnkeyOptions {
    organizationId: string;
    apiPublicKey: string;
    apiPrivateKey: string;
    /** Identifier of the delegated signer (Turnkey address or private key ID). */
    signWith: TurnkeySignWith;
    apiBaseUrl?: string;
    /** Capture Turnkey signing activity IDs for debugging/audit responses. */
    captureActivities?: boolean;
}
interface WalletOptionsBase {
    chain?: ChainReference;
    apiKey?: string;
    rpcUrl?: string;
    /** Capture Turnkey signing activity IDs when env-based Turnkey credentials are used. */
    captureTurnkeyActivities?: boolean;
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
    nonceSource?: NonceSource;
    /** Returns captured Turnkey signing activities when captureActivities is enabled. */
    getTurnkeyActivities?: () => TurnkeyActivityTrace[];
    /** Clears captured Turnkey signing activities when captureActivities is enabled. */
    clearTurnkeyActivities?: () => void;
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

export type { ChainMetadata as C, Hex as H, NonceSource as N, RpcProviderOptions as R, TokenMetadata as T, WalletBaseContext as W, ChainReference as a, ChainTokenMap as b, HexAddress as c, RpcUrlResolver as d, TurnkeyActivityOperation as e, TurnkeyActivityTrace as f, TurnkeyOptions as g, TurnkeySignWith as h, WalletContext as i, WalletFullContext as j, WalletOptions as k, WalletOptionsBase as l, WalletPrivateKeyOptions as m, WalletProviderType as n, WalletReadonlyContext as o, WalletReadonlyOptions as p, WalletRegistry as q, WalletSendTransactionParams as r, WalletSignerContext as s, WalletTransferParams as t, WalletTurnkeyOptions as u };

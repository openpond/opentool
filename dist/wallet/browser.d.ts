import { createAccount } from '@turnkey/viem';
import { WalletClient, Transport, Chain, PublicClient } from 'viem';
import { Account } from 'viem/accounts';
import { a as ChainReference, c as HexAddress, l as WalletProviderType, C as ChainMetadata, f as TurnkeySignWith, W as WalletFullContext } from '../types-DKohXZes.js';

type NonceSource = () => number;
declare function createMonotonicNonceSource(start?: number): NonceSource;

type TurnkeyBrowserClientLike = Parameters<typeof createAccount>[0]["client"];
interface BrowserWalletContextOptions {
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
declare function createBrowserWalletContext(options: BrowserWalletContextOptions): WalletFullContext;
interface TurnkeyBrowserProviderConfig {
    chain: ChainMetadata;
    rpcUrl: string;
    organizationId: string;
    signWith: TurnkeySignWith;
    client: TurnkeyBrowserClientLike;
    ethereumAddress?: HexAddress | undefined;
    nonceSource?: NonceSource | undefined;
}
declare function createTurnkeyBrowserProvider(config: TurnkeyBrowserProviderConfig): Promise<WalletFullContext>;

export { type BrowserWalletContextOptions, type NonceSource, type TurnkeyBrowserProviderConfig, createBrowserWalletContext, createMonotonicNonceSource, createTurnkeyBrowserProvider };

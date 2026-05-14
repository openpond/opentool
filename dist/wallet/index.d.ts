import { C as ChainMetadata, b as ChainTokenMap, q as WalletRegistry, R as RpcProviderOptions, m as WalletPrivateKeyOptions, j as WalletFullContext, u as WalletTurnkeyOptions, p as WalletReadonlyOptions, o as WalletReadonlyContext } from '../types-D8s9zx-U.js';
export { a as ChainReference, H as Hex, c as HexAddress, N as NonceSource, d as RpcUrlResolver, T as TokenMetadata, e as TurnkeyActivityOperation, f as TurnkeyActivityTrace, g as TurnkeyOptions, h as TurnkeySignWith, W as WalletBaseContext, i as WalletContext, k as WalletOptions, l as WalletOptionsBase, n as WalletProviderType, r as WalletSendTransactionParams, s as WalletSignerContext, t as WalletTransferParams } from '../types-D8s9zx-U.js';
import 'viem';
import 'viem/accounts';

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

export { ChainMetadata, ChainTokenMap, DEFAULT_CHAIN, DEFAULT_TOKENS, RpcProviderOptions, WalletFullContext, WalletPrivateKeyOptions, WalletReadonlyContext, WalletReadonlyOptions, WalletRegistry, WalletTurnkeyOptions, chains, getRpcUrl, registry, tokens, wallet, walletToolkit };

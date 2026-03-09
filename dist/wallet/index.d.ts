import { C as ChainMetadata, b as ChainTokenMap, o as WalletRegistry, R as RpcProviderOptions, k as WalletPrivateKeyOptions, h as WalletFullContext, s as WalletTurnkeyOptions, n as WalletReadonlyOptions, m as WalletReadonlyContext } from '../types-BaTmu0gS.js';
export { a as ChainReference, H as Hex, c as HexAddress, N as NonceSource, d as RpcUrlResolver, T as TokenMetadata, e as TurnkeyOptions, f as TurnkeySignWith, W as WalletBaseContext, g as WalletContext, i as WalletOptions, j as WalletOptionsBase, l as WalletProviderType, p as WalletSendTransactionParams, q as WalletSignerContext, r as WalletTransferParams } from '../types-BaTmu0gS.js';
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

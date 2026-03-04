import { C as ChainMetadata, a as ChainTokenMap, W as WalletRegistry, R as RpcProviderOptions, b as WalletPrivateKeyOptions, c as WalletFullContext, d as WalletTurnkeyOptions, e as WalletReadonlyOptions, f as WalletReadonlyContext } from '../types-3w880w_t.js';
export { g as ChainReference, H as Hex, h as HexAddress, i as RpcUrlResolver, T as TokenMetadata, j as TurnkeyOptions, k as TurnkeySignWith, l as WalletBaseContext, m as WalletContext, n as WalletOptions, o as WalletOptionsBase, p as WalletProviderType, q as WalletSendTransactionParams, r as WalletSignerContext, s as WalletTransferParams } from '../types-3w880w_t.js';
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

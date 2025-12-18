import { C as ChainMetadata, a as ChainTokenMap, W as WalletRegistry, R as RpcProviderOptions, b as WalletPrivateKeyOptions, c as WalletFullContext, d as WalletTurnkeyOptions, e as WalletReadonlyOptions, f as WalletReadonlyContext } from '../types-BVLpaY4O.js';
export { i as ChainReference, H as Hex, g as HexAddress, h as RpcUrlResolver, T as TokenMetadata, l as TurnkeyOptions, k as TurnkeySignWith, r as WalletBaseContext, s as WalletContext, n as WalletOptions, m as WalletOptionsBase, j as WalletProviderType, o as WalletSendTransactionParams, q as WalletSignerContext, p as WalletTransferParams } from '../types-BVLpaY4O.js';
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

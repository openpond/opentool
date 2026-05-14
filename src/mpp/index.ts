import { Receipt } from "mppx";
import { Mppx, tempo } from "mppx/client";
import type { Account, Client } from "viem";

import type { HexAddress, WalletFullContext } from "../wallet/types";

export const MPP_TEMPO_MAINNET_CHAIN_ID = 4217;
export const MPP_TEMPO_USDCE_ADDRESS =
  "0x20C000000000000000000000b9537d11c60E8b50" as const;
export const MPP_TEMPO_PATHUSD_ADDRESS =
  "0x20c0000000000000000000000000000000000000" as const;
export const MPP_DEFAULT_TEMPO_CURRENCY = MPP_TEMPO_USDCE_ADDRESS;

export type MppTempoChargeMode = "push" | "pull";
export type MppAcceptPaymentPolicy =
  | "always"
  | "same-origin"
  | "never"
  | { origins: readonly string[] };

export interface MppTempoOptions {
  /** Automatically swap through the Tempo DEX when the wallet lacks the challenged currency. */
  autoSwap?: boolean | { tokenIn?: HexAddress[]; slippage?: number };
  /** Initial channel deposit for automatic Tempo session handling. */
  deposit?: string;
  /** Maximum channel deposit for automatic Tempo session handling. */
  maxDeposit?: string;
  /** Preferred one-time charge mode. Defaults are chosen by mppx per account type. */
  mode?: MppTempoChargeMode;
}

export interface MppClientOptions {
  wallet: WalletFullContext;
  fetch?: typeof globalThis.fetch;
  /**
   * mppx polyfills global fetch by default. OpenTool keeps this opt-in so callers
   * can scope paid requests to a single lambda run or tool call.
   */
  polyfill?: boolean;
  acceptPaymentPolicy?: MppAcceptPaymentPolicy;
  tempo?: MppTempoOptions;
}

export type MppFetch = (
  input: RequestInfo | URL,
  init?: RequestInit & { context?: unknown },
) => Promise<Response>;

export interface MppClient {
  fetch: MppFetch;
  rawFetch: typeof globalThis.fetch;
  createCredential(response: Response, context?: unknown): Promise<string>;
}

export interface MppFetchRequest {
  input: RequestInfo | URL;
  init?: RequestInit;
  context?: unknown;
}

export interface MppFetchResult {
  response: Response;
  receipt: Receipt.Receipt | null;
}

export interface MppCredentialResult {
  authorization: string;
}

export function createMppClient(options: MppClientOptions): MppClient {
  assertMppWallet(options.wallet);

  const methods = [
    tempo({
      account: options.wallet.account as Account,
      getClient: ({ chainId }) => resolveWalletClient(options.wallet, chainId),
      ...(options.tempo?.autoSwap !== undefined ? { autoSwap: options.tempo.autoSwap } : {}),
      ...(options.tempo?.deposit !== undefined ? { deposit: options.tempo.deposit } : {}),
      ...(options.tempo?.maxDeposit !== undefined ? { maxDeposit: options.tempo.maxDeposit } : {}),
      ...(options.tempo?.mode !== undefined ? { mode: options.tempo.mode } : {}),
    }),
  ] as const;

  const client = Mppx.create({
    methods,
    polyfill: options.polyfill ?? false,
    ...(options.fetch ? { fetch: options.fetch } : {}),
    ...(options.acceptPaymentPolicy ? { acceptPaymentPolicy: options.acceptPaymentPolicy } : {}),
  });

  return {
    fetch: client.fetch as MppFetch,
    rawFetch: client.rawFetch,
    createCredential: (response, context) => client.createCredential(response, context as never),
  };
}

export function createMppFetch(options: MppClientOptions): MppFetch {
  return createMppClient(options).fetch;
}

export async function createMppCredential(
  response: Response,
  options: MppClientOptions,
  context?: unknown,
): Promise<MppCredentialResult> {
  const client = createMppClient(options);
  const authorization = await client.createCredential(response, context as never);
  return { authorization };
}

export async function fetchWithMpp(
  request: MppFetchRequest,
  options: MppClientOptions,
): Promise<MppFetchResult> {
  const client = createMppClient(options);
  const init =
    request.context === undefined
      ? request.init
      : ({
          ...request.init,
          context: request.context,
        } as RequestInit & { context: unknown });
  const response = await client.fetch(request.input, init);
  return {
    response,
    receipt: readMppReceipt(response),
  };
}

export function readMppReceipt(response: Response): Receipt.Receipt | null {
  if (!response.headers.has("Payment-Receipt")) {
    return null;
  }
  return Receipt.fromResponse(response);
}

function assertMppWallet(wallet: WalletFullContext): void {
  if (!wallet.account || !wallet.walletClient) {
    throw new Error("MPP payments require a signing wallet context");
  }
}

function resolveWalletClient(wallet: WalletFullContext, chainId?: number): Client {
  if (chainId !== undefined && wallet.chain.id !== chainId) {
    throw new Error(
      `MPP challenge requires chain ${chainId}, but wallet is configured for chain ${wallet.chain.id}`,
    );
  }
  return wallet.walletClient as unknown as Client;
}

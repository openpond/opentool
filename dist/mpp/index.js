import { Receipt } from 'mppx';
import { tempo, Mppx } from 'mppx/client';

// src/mpp/index.ts
var MPP_TEMPO_MAINNET_CHAIN_ID = 4217;
var MPP_TEMPO_USDCE_ADDRESS = "0x20C000000000000000000000b9537d11c60E8b50";
var MPP_TEMPO_PATHUSD_ADDRESS = "0x20c0000000000000000000000000000000000000";
var MPP_DEFAULT_TEMPO_CURRENCY = MPP_TEMPO_USDCE_ADDRESS;
function createMppClient(options) {
  assertMppWallet(options.wallet);
  const methods = [
    tempo({
      account: options.wallet.account,
      getClient: ({ chainId }) => resolveWalletClient(options.wallet, chainId),
      ...options.tempo?.autoSwap !== void 0 ? { autoSwap: options.tempo.autoSwap } : {},
      ...options.tempo?.deposit !== void 0 ? { deposit: options.tempo.deposit } : {},
      ...options.tempo?.maxDeposit !== void 0 ? { maxDeposit: options.tempo.maxDeposit } : {},
      ...options.tempo?.mode !== void 0 ? { mode: options.tempo.mode } : {}
    })
  ];
  const client = Mppx.create({
    methods,
    polyfill: options.polyfill ?? false,
    ...options.fetch ? { fetch: options.fetch } : {},
    ...options.acceptPaymentPolicy ? { acceptPaymentPolicy: options.acceptPaymentPolicy } : {}
  });
  return {
    fetch: client.fetch,
    rawFetch: client.rawFetch,
    createCredential: (response, context) => client.createCredential(response, context)
  };
}
function createMppFetch(options) {
  return createMppClient(options).fetch;
}
async function createMppCredential(response, options, context) {
  const client = createMppClient(options);
  const authorization = await client.createCredential(response, context);
  return { authorization };
}
async function fetchWithMpp(request, options) {
  const client = createMppClient(options);
  const init = request.context === void 0 ? request.init : {
    ...request.init,
    context: request.context
  };
  const response = await client.fetch(request.input, init);
  return {
    response,
    receipt: readMppReceipt(response)
  };
}
function readMppReceipt(response) {
  if (!response.headers.has("Payment-Receipt")) {
    return null;
  }
  return Receipt.fromResponse(response);
}
function assertMppWallet(wallet) {
  if (!wallet.account || !wallet.walletClient) {
    throw new Error("MPP payments require a signing wallet context");
  }
}
function resolveWalletClient(wallet, chainId) {
  if (chainId !== void 0 && wallet.chain.id !== chainId) {
    throw new Error(
      `MPP challenge requires chain ${chainId}, but wallet is configured for chain ${wallet.chain.id}`
    );
  }
  return wallet.walletClient;
}

export { MPP_DEFAULT_TEMPO_CURRENCY, MPP_TEMPO_MAINNET_CHAIN_ID, MPP_TEMPO_PATHUSD_ADDRESS, MPP_TEMPO_USDCE_ADDRESS, createMppClient, createMppCredential, createMppFetch, fetchWithMpp, readMppReceipt };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
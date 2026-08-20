import { Receipt, Challenge } from 'mppx';
import { tempo as tempo$1, Mppx } from 'mppx/client';
import { zeroAddress, createPublicClient, http, createWalletClient } from 'viem';
import { tempo, arbitrumSepolia, arbitrum, baseSepolia, mainnet, base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { Turnkey } from '@turnkey/sdk-server';
import { createAccount } from '@turnkey/viem';

// src/payments/index.ts
function createMppClient(options) {
  assertMppWallet(options.wallet);
  const methods = [
    tempo$1({
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
    ...options.acceptPaymentPolicy ? { acceptPaymentPolicy: options.acceptPaymentPolicy } : {},
    ...options.onChallenge ? { onChallenge: options.onChallenge } : {}
  });
  return {
    fetch: client.fetch,
    rawFetch: client.rawFetch,
    createCredential: (response, context) => client.createCredential(response, context)
  };
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
function assertMppWallet(wallet2) {
  if (!wallet2.account || !wallet2.walletClient) {
    throw new Error("MPP payments require a signing wallet context");
  }
}
function resolveWalletClient(wallet2, chainId) {
  if (chainId !== void 0 && wallet2.chain.id !== chainId) {
    throw new Error(
      `MPP challenge requires chain ${chainId}, but wallet is configured for chain ${wallet2.chain.id}`
    );
  }
  return wallet2.walletClient;
}
var BASE_ALCHEMY_HOST = "https://base-mainnet.g.alchemy.com/v2/";
var ETHEREUM_ALCHEMY_HOST = "https://eth-mainnet.g.alchemy.com/v2/";
var BASE_SEPOLIA_ALCHEMY_HOST = "https://base-sepolia.g.alchemy.com/v2/";
var ARBITRUM_ALCHEMY_HOST = "https://arb-mainnet.g.alchemy.com/v2/";
var ARBITRUM_SEPOLIA_ALCHEMY_HOST = "https://arb-sepolia.g.alchemy.com/v2/";
var TEMPO_RPC_URL = "https://rpc.tempo.xyz";
function buildRpcResolver(host, fallbackUrls) {
  return (options) => {
    if (options?.url) {
      return options.url;
    }
    if (options?.apiKey) {
      return `${host}${options.apiKey}`;
    }
    if (fallbackUrls.length > 0) {
      return fallbackUrls[0];
    }
    throw new Error(
      "No RPC URL available: supply a full url via options or an apiKey for the default host"
    );
  };
}
var chains = {
  base: {
    id: base.id,
    slug: "base",
    name: "Base",
    chain: base,
    rpcUrl: buildRpcResolver(BASE_ALCHEMY_HOST, base.rpcUrls.default.http),
    publicRpcUrls: base.rpcUrls.default.http
  },
  ethereum: {
    id: mainnet.id,
    slug: "ethereum",
    name: "Ethereum",
    chain: mainnet,
    rpcUrl: buildRpcResolver(ETHEREUM_ALCHEMY_HOST, mainnet.rpcUrls.default.http),
    publicRpcUrls: mainnet.rpcUrls.default.http
  },
  baseSepolia: {
    id: baseSepolia.id,
    slug: "base-sepolia",
    name: "Base Sepolia",
    chain: baseSepolia,
    rpcUrl: buildRpcResolver(BASE_SEPOLIA_ALCHEMY_HOST, baseSepolia.rpcUrls.default.http)
  },
  arbitrum: {
    id: arbitrum.id,
    slug: "arbitrum",
    name: "Arbitrum One",
    chain: arbitrum,
    rpcUrl: buildRpcResolver(ARBITRUM_ALCHEMY_HOST, arbitrum.rpcUrls.default.http),
    publicRpcUrls: arbitrum.rpcUrls.default.http
  },
  arbitrumSepolia: {
    id: arbitrumSepolia.id,
    slug: "arbitrum-sepolia",
    name: "Arbitrum Sepolia",
    chain: arbitrumSepolia,
    rpcUrl: buildRpcResolver(ARBITRUM_SEPOLIA_ALCHEMY_HOST, arbitrumSepolia.rpcUrls.default.http),
    publicRpcUrls: arbitrumSepolia.rpcUrls.default.http
  },
  tempo: {
    id: tempo.id,
    slug: "tempo",
    name: "Tempo",
    chain: tempo,
    rpcUrl: buildRpcResolver(TEMPO_RPC_URL, [TEMPO_RPC_URL]),
    publicRpcUrls: [TEMPO_RPC_URL]
  }
};
function createNativeToken(chainId, symbol, name) {
  return {
    [symbol]: {
      symbol,
      name,
      decimals: 18,
      address: zeroAddress,
      chainId,
      isNative: true
    }
  };
}
function token(chainId, symbol, name, address, decimals) {
  return {
    symbol,
    name,
    decimals,
    address,
    chainId
  };
}
var tokens = {
  base: {
    ...createNativeToken(base.id, "ETH", "Ether"),
    USDC: token(base.id, "USDC", "USD Coin", "0x833589fCD6eDb6E08f4c7C31c9A8Ba32D74b86B2", 6)
  },
  ethereum: {
    ...createNativeToken(mainnet.id, "ETH", "Ether"),
    USDC: token(mainnet.id, "USDC", "USD Coin", "0xA0b86991c6218b36c1d19d4a2e9Eb0cE3606eB48", 6)
  },
  arbitrum: {
    ...createNativeToken(arbitrum.id, "ETH", "Ether"),
    USDC: token(arbitrum.id, "USDC", "USD Coin", "0xaf88d065e77c8cc2239327c5edb3a432268e5831", 6)
  },
  arbitrumSepolia: {
    ...createNativeToken(arbitrumSepolia.id, "ETH", "Ether"),
    USDC: token(
      arbitrumSepolia.id,
      "USDC",
      "USD Coin",
      "0x1baAbB04529D43a73232B713C0FE471f7c7334d5",
      6
    )
  },
  tempo: {
    ...createNativeToken(tempo.id, "USD", "USD"),
    USDC: token(
      tempo.id,
      "USDC",
      "Tempo USDC (USDC.e)",
      "0x20C000000000000000000000b9537d11c60E8b50",
      6
    ),
    PathUSD: token(tempo.id, "PathUSD", "PathUSD", "0x20c0000000000000000000000000000000000000", 6)
  }
};
var DEFAULT_CHAIN = chains.base;

// src/wallet/nonces.ts
function createMonotonicNonceSource(start = Date.now()) {
  let last = start;
  return () => {
    const now = Date.now();
    if (now > last) {
      last = now;
    } else {
      last += 1;
    }
    return last;
  };
}

// src/wallet/providers/private-key.ts
function normalizePrivateKey(raw) {
  const trimmed = raw.trim();
  const withPrefix = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(withPrefix)) {
    throw new Error("wallet() privateKey must be a 32-byte hex string");
  }
  return withPrefix;
}
function createPrivateKeyProvider(config) {
  const privateKey = normalizePrivateKey(config.privateKey);
  const account = privateKeyToAccount(privateKey);
  const transport = http(config.rpcUrl);
  const publicClient = createPublicClient({
    chain: config.chain.chain,
    transport
  });
  const walletClient = createWalletClient({
    account,
    chain: config.chain.chain,
    transport
  });
  async function sendTransaction(params) {
    const tx = {
      account
    };
    if (params.to) {
      tx.to = params.to;
    }
    if (params.value !== void 0) {
      tx.value = params.value;
    }
    if (params.data !== void 0) {
      tx.data = params.data;
    }
    return walletClient.sendTransaction(tx);
  }
  async function getNativeBalance() {
    return publicClient.getBalance({ address: account.address });
  }
  async function transfer(params) {
    return sendTransaction({
      to: params.to,
      value: params.amount,
      ...params.data !== void 0 ? { data: params.data } : {}
    });
  }
  return {
    address: account.address,
    account,
    walletClient,
    publicClient,
    sendTransaction,
    getNativeBalance,
    transfer,
    nonceSource: createMonotonicNonceSource()
  };
}
function toRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function toString(value) {
  return typeof value === "string" && value.length > 0 ? value : void 0;
}
function extractActivity(response) {
  const record = toRecord(response);
  return toRecord(record?.activity);
}
function recordActivityTrace(params) {
  const activity = extractActivity(params.response);
  const errorRecord = toRecord(params.error);
  const activityId = toString(activity?.id) ?? toString(errorRecord?.activityId);
  if (!activityId) return;
  const type = toString(activity?.type) ?? toString(errorRecord?.activityType);
  const status = toString(activity?.status) ?? toString(errorRecord?.activityStatus);
  params.traces.push({
    activityId,
    organizationId: toString(activity?.organizationId) ?? params.organizationId,
    operation: params.operation,
    capturedAt: (/* @__PURE__ */ new Date()).toISOString(),
    ...type ? { type } : {},
    ...status ? { status } : {}
  });
}
function createActivityCaptureClient(client, traces, organizationId) {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop !== "signRawPayload" && prop !== "signTransaction") {
        return typeof value === "function" ? value.bind(target) : value;
      }
      return async (...args) => {
        try {
          const response = await value.apply(
            target,
            args
          );
          recordActivityTrace({
            traces,
            operation: prop,
            organizationId,
            response
          });
          return response;
        } catch (error) {
          recordActivityTrace({
            traces,
            operation: prop,
            organizationId,
            error
          });
          throw error;
        }
      };
    }
  });
}
async function createTurnkeyProvider(config) {
  const turnkey = new Turnkey({
    apiBaseUrl: config.apiBaseUrl ?? "https://api.turnkey.com",
    // The delegated sub-organization the API key pair belongs to.
    defaultOrganizationId: config.organizationId,
    apiPublicKey: config.apiPublicKey,
    apiPrivateKey: config.apiPrivateKey
  });
  const activityTraces = [];
  const apiClient = turnkey.apiClient();
  const accountClient = config.captureActivities ? createActivityCaptureClient(apiClient, activityTraces, config.organizationId) : apiClient;
  const account = await createAccount({
    client: accountClient,
    organizationId: config.organizationId,
    signWith: config.signWith
  });
  const transport = http(config.rpcUrl);
  const publicClient = createPublicClient({
    chain: config.chain.chain,
    transport
  });
  const walletClient = createWalletClient({
    account,
    chain: config.chain.chain,
    transport
  });
  async function sendTransaction(params) {
    const tx = {
      account
    };
    if (params.to) {
      tx.to = params.to;
    }
    if (params.value !== void 0) {
      tx.value = params.value;
    }
    if (params.data !== void 0) {
      tx.data = params.data;
    }
    return walletClient.sendTransaction(tx);
  }
  async function getNativeBalance() {
    return publicClient.getBalance({ address: account.address });
  }
  async function transfer(params) {
    return sendTransaction({
      to: params.to,
      value: params.amount,
      ...params.data !== void 0 ? { data: params.data } : {}
    });
  }
  return {
    address: account.address,
    account,
    walletClient,
    publicClient,
    sendTransaction,
    getNativeBalance,
    transfer,
    nonceSource: createMonotonicNonceSource(),
    ...config.captureActivities ? {
      getTurnkeyActivities: () => activityTraces.map((trace) => ({ ...trace })),
      clearTurnkeyActivities: () => {
        activityTraces.length = 0;
      }
    } : {}
  };
}

// src/wallet/env.ts
function readTrimmed(name) {
  const value = process.env[name];
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length ? trimmed : void 0;
}
function readTurnkeyEnv() {
  const suborgId = readTrimmed("TURNKEY_SUBORG_ID");
  if (!suborgId) return void 0;
  const apiPublicKey = readTrimmed("TURNKEY_API_PUBLIC_KEY");
  const apiPrivateKey = readTrimmed("TURNKEY_API_PRIVATE_KEY");
  const signWith = readTrimmed("TURNKEY_WALLET_ADDRESS");
  if (!apiPublicKey || !apiPrivateKey || !signWith) return void 0;
  const apiBaseUrl = readTrimmed("TURNKEY_API_BASE_URL");
  return {
    organizationId: suborgId,
    apiPublicKey,
    apiPrivateKey,
    signWith,
    ...apiBaseUrl ? { apiBaseUrl } : {}
  };
}

// src/wallet/index.ts
function resolveChainSlug(reference) {
  if (reference === void 0) {
    return Object.entries(chains).find(([, meta]) => meta.id === DEFAULT_CHAIN.id)?.[0] || DEFAULT_CHAIN.slug;
  }
  if (typeof reference === "number") {
    const match = Object.entries(chains).find(([, meta]) => meta.id === reference);
    if (match) {
      return match[0];
    }
  } else if (typeof reference === "string") {
    const sanitize = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (reference in chains) {
      return reference;
    }
    const normalized = sanitize(reference);
    const keyMatch = Object.entries(chains).find(([key]) => sanitize(key) === normalized);
    if (keyMatch) {
      return keyMatch[0];
    }
    const slugMatch = Object.entries(chains).find(([, meta]) => {
      return meta.slug && sanitize(meta.slug) === normalized;
    });
    if (slugMatch) {
      return slugMatch[0];
    }
    const asNumber = Number.parseInt(normalized, 10);
    if (!Number.isNaN(asNumber)) {
      const match = Object.entries(chains).find(([, meta]) => meta.id === asNumber);
      if (match) {
        return match[0];
      }
    }
  }
  throw new Error(`Unknown chain reference: ${reference}`);
}
function getRpcUrl(chain, options) {
  const slug = resolveChainSlug(chain);
  const entry = chains[slug];
  return entry.rpcUrl(options);
}
async function wallet(options = {}) {
  const envPrivateKey = process.env.PRIVATE_KEY?.trim();
  const envTurnkey = readTurnkeyEnv();
  const effectivePrivateKey = options.privateKey ?? envPrivateKey;
  const effectiveTurnkey = options.turnkey ?? envTurnkey;
  if (effectivePrivateKey && effectiveTurnkey) {
    throw new Error("wallet() cannot be initialized with both privateKey and turnkey credentials");
  }
  const slug = resolveChainSlug(options.chain);
  const chain = chains[slug];
  const tokens2 = tokens[slug] ?? {};
  const overrides = {};
  const envRpcUrl = process.env.RPC_URL?.trim();
  const envApiKey = process.env.ALCHEMY_API_KEY?.trim();
  if (options.rpcUrl ?? envRpcUrl) {
    overrides.url = options.rpcUrl ?? envRpcUrl;
  }
  if (options.apiKey ?? envApiKey) {
    overrides.apiKey = options.apiKey ?? envApiKey;
  }
  const rpcUrl = getRpcUrl(slug, overrides);
  let providerType = "readonly";
  let signerProvider;
  if (effectivePrivateKey) {
    signerProvider = createPrivateKeyProvider({
      chain,
      rpcUrl,
      privateKey: effectivePrivateKey
    });
    providerType = "privateKey";
  } else if (effectiveTurnkey) {
    const turnkeyConfig = {
      chain,
      rpcUrl,
      organizationId: effectiveTurnkey.organizationId,
      apiPublicKey: effectiveTurnkey.apiPublicKey,
      apiPrivateKey: effectiveTurnkey.apiPrivateKey,
      signWith: effectiveTurnkey.signWith,
      captureActivities: options.captureTurnkeyActivities ?? effectiveTurnkey.captureActivities
    };
    if (effectiveTurnkey.apiBaseUrl) {
      turnkeyConfig.apiBaseUrl = effectiveTurnkey.apiBaseUrl;
    }
    signerProvider = await createTurnkeyProvider(turnkeyConfig);
    providerType = "turnkey";
  }
  const publicClient = signerProvider?.publicClient ?? createPublicClient({
    chain: chain.chain,
    transport: http(rpcUrl)
  });
  const baseContext = {
    chain,
    tokens: tokens2,
    rpcUrl,
    providerType,
    publicClient,
    getRpcUrl: (override) => getRpcUrl(slug, override),
    ...signerProvider ? { address: signerProvider.address } : {}
  };
  if (signerProvider) {
    const { publicClient: _ignored, ...rest } = signerProvider;
    return {
      ...baseContext,
      ...rest
    };
  }
  return baseContext;
}

// src/payments/index.ts
function withTempoPaymentOptions(payment, tempo3, mppTempo) {
  return {
    ...payment?.sessionDepositMaxUsd ? { deposit: payment.sessionDepositMaxUsd } : {},
    ...tempo3,
    ...mppTempo
  };
}
async function resolvePaymentWallet(wallet2, walletOptions) {
  if (wallet2) return wallet2;
  return await wallet({
    chain: "tempo",
    ...walletOptions
  });
}
async function paidFetch(input, init = {}) {
  const { payment, wallet: wallet2, walletOptions, mpp, tempo: tempo3, context, ...requestInit } = init;
  validatePaymentPolicy(payment);
  const signer = await resolvePaymentWallet(wallet2, walletOptions);
  const result = await fetchWithMpp(
    {
      input,
      init: requestInit,
      ...context !== void 0 ? { context } : {}
    },
    {
      ...mpp,
      wallet: signer,
      tempo: withTempoPaymentOptions(payment, tempo3, mpp?.tempo)
    }
  );
  return result.response;
}
function challengeResponse(challenge) {
  return new Response(null, {
    status: 402,
    headers: {
      "WWW-Authenticate": Challenge.serialize(challenge)
    }
  });
}
async function createVoucherCredential(client, response, event) {
  if (typeof event.channelId !== "string") return null;
  if (typeof event.requiredCumulative !== "string") return null;
  return client.createCredential(response, {
    action: "voucher",
    channelId: event.channelId,
    cumulativeAmountRaw: event.requiredCumulative
  });
}
async function postVoucherCredential(fetchImpl, input, client, session, event, credential, signal) {
  const response = await fetchImpl(input, {
    method: "POST",
    headers: { Authorization: credential },
    ...signal ? { signal } : {}
  });
  if (!response.ok && response.status === 402) {
    const retryCredential = await createVoucherCredential(client, response.clone(), event);
    if (retryCredential) {
      const retryResponse = await fetchImpl(input, {
        method: "POST",
        headers: { Authorization: retryCredential },
        ...signal ? { signal } : {}
      });
      const retryDetail = await retryResponse.text().catch(() => "");
      if (retryResponse.ok) return;
      const retryMessage = retryDetail.trim().slice(0, 500);
      throw new Error(
        `MPP voucher POST failed with status ${retryResponse.status}${retryMessage ? `: ${retryMessage}` : ""}`
      );
    }
  }
  if (!session) {
    await response.text().catch(() => "");
    return;
  }
  const detail = await response.text().catch(() => "");
  if (!response.ok) {
    const message = detail.trim().slice(0, 500);
    throw new Error(
      `MPP voucher POST failed with status ${response.status}${message ? `: ${message}` : ""}`
    );
  }
}
function parseSseFrame(frame) {
  let event = "";
  const data = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      data.push(line.slice(5).trimStart());
    }
  }
  return { event, data: data.join("\n") };
}
function wrapMppSessionSse(params) {
  if (!params.response.body || !params.session) return params.response;
  const session = params.session;
  const contentType = params.response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("text/event-stream")) {
    return params.response;
  }
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  const stream = params.response.body.pipeThrough(
    new TransformStream({
      async transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, "\n");
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const parsed = parseSseFrame(frame);
          if (parsed.event === "payment-need-voucher") {
            try {
              const event = JSON.parse(parsed.data);
              const credential = await createVoucherCredential(
                params.client,
                challengeResponse(session.challenge),
                event
              );
              if (credential) {
                await postVoucherCredential(
                  params.fetch,
                  params.input,
                  params.client,
                  session,
                  event,
                  credential,
                  params.signal
                );
              }
            } catch (error) {
              console.error("OpenTool MPP stream voucher failed", error);
              throw error;
            }
            continue;
          }
          controller.enqueue(encoder.encode(`${frame}

`));
        }
      },
      async flush(controller) {
        const remaining = buffer.trim();
        if (!remaining) return;
        const parsed = parseSseFrame(remaining);
        if (parsed.event === "payment-need-voucher") {
          try {
            const event = JSON.parse(parsed.data);
            const credential = await createVoucherCredential(
              params.client,
              challengeResponse(session.challenge),
              event
            );
            if (credential) {
              await postVoucherCredential(
                params.fetch,
                params.input,
                params.client,
                session,
                event,
                credential,
                params.signal
              );
            }
          } catch (error) {
            console.error("OpenTool MPP stream voucher failed", error);
            throw error;
          }
          return;
        }
        controller.enqueue(encoder.encode(`${remaining}

`));
      }
    })
  );
  return new Response(stream, {
    status: params.response.status,
    statusText: params.response.statusText,
    headers: params.response.headers
  });
}
async function streamPaidFetch(input, init = {}) {
  const { payment, wallet: wallet2, walletOptions, mpp, tempo: tempo3, context, signal, ...requestInit } = init;
  validatePaymentPolicy(payment);
  const signer = await resolvePaymentWallet(wallet2, walletOptions);
  let session = null;
  const client = createMppClient({
    ...mpp,
    wallet: signer,
    tempo: withTempoPaymentOptions(payment, tempo3, mpp?.tempo),
    onChallenge: async (challenge, helpers) => {
      if (challenge.method === "tempo" && challenge.intent === "session") {
        session = { challenge };
      }
      return mpp?.onChallenge?.(challenge, helpers);
    }
  });
  const response = await client.fetch(input, {
    ...requestInit,
    ...signal ? { signal } : {},
    ...context !== void 0 ? { context } : {}
  });
  return wrapMppSessionSse({
    response,
    client,
    session,
    input,
    fetch: mpp?.fetch ?? globalThis.fetch,
    signal: signal ?? null
  });
}
async function streamPaidOpenAI(options) {
  const endpoint = options.endpoint ?? (options.input !== void 0 ? "https://openai.mpp.tempo.xyz/v1/responses" : "https://openai.mpp.tempo.xyz/v1/chat/completions");
  const payload = options.body ?? (options.input !== void 0 ? {
    model: options.model,
    input: options.input,
    stream: true,
    ...options.maxTokens !== void 0 ? { max_output_tokens: options.maxTokens } : {},
    ...options.temperature !== void 0 ? { temperature: options.temperature } : {}
  } : {
    model: options.model,
    messages: options.messages ?? [],
    stream: true,
    stream_options: { include_usage: true },
    ...options.maxTokens !== void 0 ? { max_tokens: options.maxTokens } : {},
    ...options.temperature !== void 0 ? { temperature: options.temperature } : {}
  });
  const upstream = await streamPaidFetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...options.headers
    },
    body: JSON.stringify(payload),
    ...options.signal ? { signal: options.signal } : {},
    ...options.payment ? { payment: options.payment } : {},
    ...options.wallet ? { wallet: options.wallet } : {},
    ...options.walletOptions ? { walletOptions: options.walletOptions } : {},
    ...options.mpp ? { mpp: options.mpp } : {},
    ...options.tempo ? { tempo: options.tempo } : {}
  });
  const headers = new Headers(upstream.headers);
  headers.set("Content-Type", "text/event-stream");
  headers.set("Cache-Control", headers.get("Cache-Control") ?? "no-cache");
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers
  });
}
function validatePaymentPolicy(policy) {
  if (!policy) return;
  if (policy.allowedMethods && !policy.allowedMethods.some((method) => method === "tempo" || method === "mpp")) {
    throw new Error("Payment policy does not allow MPP/Tempo payments");
  }
  if (policy.allowedIntents && !policy.allowedIntents.some((intent) => intent === "charge" || intent === "session")) {
    throw new Error("Payment policy does not allow charge or session payments");
  }
}

export { paidFetch, streamPaidFetch, streamPaidOpenAI };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
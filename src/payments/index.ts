import { Challenge } from "mppx";

import {
  createMppClient,
  fetchWithMpp,
  type MppClient,
  type MppClientOptions,
  type MppTempoOptions,
} from "../mpp/index";
import type { ChatMessage } from "../ai/types";
import type { WalletFullContext, WalletOptions } from "../wallet/types";
import { wallet as createWallet } from "../wallet/index";

export type PaymentMethod = "tempo" | "mpp";
export type PaymentIntent = "charge" | "session";

export interface PaymentPolicy {
  allowedMethods?: PaymentMethod[];
  allowedIntents?: PaymentIntent[];
  maxAmountUsd?: string;
  maxAmountUsdPerStream?: string;
  sessionDepositMaxUsd?: string;
  sessionDurationMaxMinutes?: number;
  sessionIdleCloseMinutes?: number;
  allowedProviders?: string[];
  allowedModels?: string[];
}

export type PaidFetchInit = RequestInit & {
  payment?: PaymentPolicy;
  wallet?: WalletFullContext;
  walletOptions?: WalletOptions;
  mpp?: Omit<MppClientOptions, "wallet">;
  tempo?: MppTempoOptions;
  context?: unknown;
};

type CapturedChallenge = Parameters<NonNullable<MppClientOptions["onChallenge"]>>[0];

type CapturedSessionChallenge = { challenge: CapturedChallenge } | null;

type PaymentNeedVoucherEvent = {
  channelId?: unknown;
  requiredCumulative?: unknown;
};

function withTempoPaymentOptions(
  payment: PaymentPolicy | undefined,
  tempo: MppTempoOptions | undefined,
  mppTempo: MppTempoOptions | undefined,
): MppTempoOptions {
  return {
    ...(payment?.sessionDepositMaxUsd ? { deposit: payment.sessionDepositMaxUsd } : {}),
    ...tempo,
    ...mppTempo,
  };
}

async function resolvePaymentWallet(
  wallet: WalletFullContext | undefined,
  walletOptions: WalletOptions | undefined,
): Promise<WalletFullContext> {
  if (wallet) return wallet;
  return (await createWallet({
    chain: "tempo",
    ...walletOptions,
  } as never)) as WalletFullContext;
}

export async function paidFetch(
  input: RequestInfo | URL,
  init: PaidFetchInit = {},
): Promise<Response> {
  const { payment, wallet, walletOptions, mpp, tempo, context, ...requestInit } = init;

  validatePaymentPolicy(payment);

  const signer = await resolvePaymentWallet(wallet, walletOptions);

  const result = await fetchWithMpp(
    {
      input,
      init: requestInit,
      ...(context !== undefined ? { context } : {}),
    },
    {
      ...mpp,
      wallet: signer,
      tempo: withTempoPaymentOptions(payment, tempo, mpp?.tempo),
    },
  );

  return result.response;
}

function challengeResponse(challenge: CapturedChallenge): Response {
  return new Response(null, {
    status: 402,
    headers: {
      "WWW-Authenticate": Challenge.serialize(challenge),
    },
  });
}

async function createVoucherCredential(
  client: MppClient,
  response: Response,
  event: PaymentNeedVoucherEvent,
): Promise<string | null> {
  if (typeof event.channelId !== "string") return null;
  if (typeof event.requiredCumulative !== "string") return null;

  return client.createCredential(response, {
    action: "voucher",
    channelId: event.channelId,
    cumulativeAmountRaw: event.requiredCumulative,
  });
}

async function postVoucherCredential(
  fetchImpl: typeof globalThis.fetch,
  input: RequestInfo | URL,
  client: MppClient,
  session: CapturedSessionChallenge,
  event: PaymentNeedVoucherEvent,
  credential: string,
  signal: AbortSignal | null,
): Promise<void> {
  const response = await fetchImpl(input, {
    method: "POST",
    headers: { Authorization: credential },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok && response.status === 402) {
    const retryCredential = await createVoucherCredential(client, response.clone(), event);
    if (retryCredential) {
      const retryResponse = await fetchImpl(input, {
        method: "POST",
        headers: { Authorization: retryCredential },
        ...(signal ? { signal } : {}),
      });
      const retryDetail = await retryResponse.text().catch(() => "");
      if (retryResponse.ok) return;
      const retryMessage = retryDetail.trim().slice(0, 500);
      throw new Error(
        `MPP voucher POST failed with status ${retryResponse.status}${
          retryMessage ? `: ${retryMessage}` : ""
        }`,
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
      `MPP voucher POST failed with status ${response.status}${message ? `: ${message}` : ""}`,
    );
  }
}

function parseSseFrame(frame: string): { event: string; data: string } {
  let event = "";
  const data: string[] = [];
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

function wrapMppSessionSse(params: {
  response: Response;
  client: MppClient;
  session: CapturedSessionChallenge;
  input: RequestInfo | URL;
  fetch: typeof globalThis.fetch;
  signal: AbortSignal | null;
}): Response {
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
    new TransformStream<Uint8Array, Uint8Array>({
      async transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, "\n");
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const parsed = parseSseFrame(frame);
          if (parsed.event === "payment-need-voucher") {
            try {
              const event = JSON.parse(parsed.data) as PaymentNeedVoucherEvent;
              const credential = await createVoucherCredential(
                params.client,
                challengeResponse(session.challenge),
                event,
              );
              if (credential) {
                await postVoucherCredential(
                  params.fetch,
                  params.input,
                  params.client,
                  session,
                  event,
                  credential,
                  params.signal,
                );
              }
            } catch (error) {
              console.error("OpenTool MPP stream voucher failed", error);
              throw error;
            }
            continue;
          }

          controller.enqueue(encoder.encode(`${frame}\n\n`));
        }
      },
      async flush(controller) {
        const remaining = buffer.trim();
        if (!remaining) return;
        const parsed = parseSseFrame(remaining);
        if (parsed.event === "payment-need-voucher") {
          try {
            const event = JSON.parse(parsed.data) as PaymentNeedVoucherEvent;
            const credential = await createVoucherCredential(
              params.client,
              challengeResponse(session.challenge),
              event,
            );
            if (credential) {
              await postVoucherCredential(
                params.fetch,
                params.input,
                params.client,
                session,
                event,
                credential,
                params.signal,
              );
            }
          } catch (error) {
            console.error("OpenTool MPP stream voucher failed", error);
            throw error;
          }
          return;
        }
        controller.enqueue(encoder.encode(`${remaining}\n\n`));
      },
    }),
  );

  return new Response(stream, {
    status: params.response.status,
    statusText: params.response.statusText,
    headers: params.response.headers,
  });
}

export async function streamPaidFetch(
  input: RequestInfo | URL,
  init: PaidFetchInit = {},
): Promise<Response> {
  const { payment, wallet, walletOptions, mpp, tempo, context, signal, ...requestInit } = init;

  validatePaymentPolicy(payment);

  const signer = await resolvePaymentWallet(wallet, walletOptions);
  let session: CapturedSessionChallenge = null;
  const client = createMppClient({
    ...mpp,
    wallet: signer,
    tempo: withTempoPaymentOptions(payment, tempo, mpp?.tempo),
    onChallenge: async (challenge, helpers) => {
      if (challenge.method === "tempo" && challenge.intent === "session") {
        session = { challenge };
      }
      return mpp?.onChallenge?.(challenge, helpers);
    },
  });

  const response = await client.fetch(input, {
    ...requestInit,
    ...(signal ? { signal } : {}),
    ...(context !== undefined ? { context } : {}),
  });

  return wrapMppSessionSse({
    response,
    client,
    session,
    input,
    fetch: mpp?.fetch ?? globalThis.fetch,
    signal: signal ?? null,
  });
}

export interface StreamPaidOpenAIOptions {
  endpoint?: string;
  model: string;
  messages?: ChatMessage[];
  input?: unknown;
  maxTokens?: number;
  temperature?: number;
  headers?: Record<string, string>;
  payment?: PaymentPolicy;
  wallet?: WalletFullContext;
  walletOptions?: WalletOptions;
  mpp?: Omit<MppClientOptions, "wallet">;
  tempo?: MppTempoOptions;
  signal?: AbortSignal;
  body?: Record<string, unknown>;
}

export async function streamPaidOpenAI(options: StreamPaidOpenAIOptions): Promise<Response> {
  const endpoint =
    options.endpoint ??
    (options.input !== undefined
      ? "https://openai.mpp.tempo.xyz/v1/responses"
      : "https://openai.mpp.tempo.xyz/v1/chat/completions");

  const payload =
    options.body ??
    (options.input !== undefined
      ? {
          model: options.model,
          input: options.input,
          stream: true,
          ...(options.maxTokens !== undefined ? { max_output_tokens: options.maxTokens } : {}),
          ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        }
      : {
          model: options.model,
          messages: options.messages ?? [],
          stream: true,
          stream_options: { include_usage: true },
          ...(options.maxTokens !== undefined ? { max_tokens: options.maxTokens } : {}),
          ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        });

  const upstream = await streamPaidFetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...options.headers,
    },
    body: JSON.stringify(payload),
    ...(options.signal ? { signal: options.signal } : {}),
    ...(options.payment ? { payment: options.payment } : {}),
    ...(options.wallet ? { wallet: options.wallet } : {}),
    ...(options.walletOptions ? { walletOptions: options.walletOptions } : {}),
    ...(options.mpp ? { mpp: options.mpp } : {}),
    ...(options.tempo ? { tempo: options.tempo } : {}),
  });

  const headers = new Headers(upstream.headers);
  headers.set("Content-Type", "text/event-stream");
  headers.set("Cache-Control", headers.get("Cache-Control") ?? "no-cache");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

function validatePaymentPolicy(policy: PaymentPolicy | undefined): void {
  if (!policy) return;

  if (
    policy.allowedMethods &&
    !policy.allowedMethods.some((method) => method === "tempo" || method === "mpp")
  ) {
    throw new Error("Payment policy does not allow MPP/Tempo payments");
  }

  if (
    policy.allowedIntents &&
    !policy.allowedIntents.some((intent) => intent === "charge" || intent === "session")
  ) {
    throw new Error("Payment policy does not allow charge or session payments");
  }
}

import { resolveConfig, mergeHeaders } from "./config";
import {
  GenerateTextOptions,
  GenerateTextResult,
  AIClientConfig,
  ChatCompletionResponse,
  ChatCompletionChoice,
  ChatCompletionUsage,
  ResolvedAIClientConfig,
  StreamTextOptions,
  StreamTextResult,
  GenerationParameters,
  AIRequestMetadata,
  ChatMessage,
  StreamingEventHandlers,
} from "./types";
import {
  normalizeModelName,
  isToolCallingSupported,
  listModels,
} from "./models";
import { resolveToolset } from "./tools";
import { flattenMessageContent } from "./messages";
import { AIFetchError, AIResponseError, AIAbortError, AIError } from "./errors";

const CHAT_COMPLETIONS_PATH = "/v1/chat/completions";

export interface AIClient {
  readonly config: ResolvedAIClientConfig;
  generateText(options: GenerateTextOptions): Promise<GenerateTextResult>;
  streamText(options: StreamTextOptions): Promise<StreamTextResult>;
  listModels: typeof listModels;
}

interface ChatCompletionRequestPayload {
  model: string;
  messages: GenerateTextOptions["messages"];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  tool_choice?: GenerateTextOptions["toolChoice"];
  tools?: GenerateTextOptions["tools"];
  stream?: boolean;
  response_format?: GenerationParameters["responseFormat"];
  metadata?: Record<string, unknown>;
  stream_options?: {
    include_usage?: boolean;
  };
}

interface AbortBundle {
  signal: AbortSignal;
  abort: () => void;
  cleanup: () => void;
}

export function createAIClient(config: AIClientConfig = {}): AIClient {
  const resolved = resolveConfig(config);

  return {
    get config() {
      return resolved;
    },
    async generateText(options) {
      return generateText(options, config);
    },
    async streamText(options) {
      return streamText(options, config);
    },
    listModels,
  };
}

export async function generateText(
  options: GenerateTextOptions,
  clientConfig: AIClientConfig = {}
): Promise<GenerateTextResult> {
  const resolved = resolveConfig(clientConfig);
  const model = normalizeModelName(options.model ?? resolved.defaultModel);

  const payload = buildRequestPayload(options, model, {
    allowTools: isToolCallingSupported(model),
  });

  const headers = mergeHeaders(resolved.defaultHeaders, options.headers);
  if (resolved.apiKey) {
    headers.Authorization = `Bearer ${resolved.apiKey}`;
  }

  const endpoint = buildUrl(resolved.baseUrl, CHAT_COMPLETIONS_PATH);
  const abortBundle = createAbortBundle(
    options.abortSignal,
    options.timeoutMs ?? resolved.timeoutMs
  );

  let response: Response;
  try {
    response = await resolved.fetchImplementation(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: abortBundle.signal,
    });
  } catch (error) {
    if (abortBundle.signal.aborted) {
      throw toAbortError(abortBundle.signal.reason ?? error);
    }

    throw new AIFetchError("Failed to reach AI gateway", { cause: error });
  } finally {
    abortBundle.cleanup();
  }

  if (!response.ok) {
    const errorBody = await safeParseJson(response);
    throw new AIResponseError({
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
      headers: collectHeaders(response.headers),
    });
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const primaryChoice = data.choices.find(isPrimaryChoice);

  if (!primaryChoice) {
    throw new AIResponseError(
      {
        status: response.status,
        statusText: response.statusText,
        body: data,
      },
      "Gateway response did not contain a valid choice"
    );
  }

  const result: GenerateTextResult = {
    id: data.id,
    model: data.model,
    message: primaryChoice.message,
    raw: data,
  };

  if (primaryChoice.finish_reason !== undefined) {
    result.finishReason = primaryChoice.finish_reason;
  }

  if (data.usage) {
    result.usage = data.usage;
  }

  return result;
}

export async function streamText(
  options: StreamTextOptions,
  clientConfig: AIClientConfig = {}
): Promise<StreamTextResult> {
  const resolved = resolveConfig(clientConfig);
  const model = normalizeModelName(options.model ?? resolved.defaultModel);

  const streamExtras = buildStreamMetadataExtras(options);
  const payload = buildRequestPayload(
    options,
    model,
    {
      allowTools: isToolCallingSupported(model),
    },
    streamExtras
  );

  payload.stream = true;
  if (options.includeUsage) {
    payload.stream_options = { include_usage: true };
  }

  const headers = mergeHeaders(resolved.defaultHeaders, options.headers);
  if (resolved.apiKey) {
    headers.Authorization = `Bearer ${resolved.apiKey}`;
  }

  const endpoint = buildUrl(resolved.baseUrl, CHAT_COMPLETIONS_PATH);
  const abortBundle = createAbortBundle(
    options.abortSignal,
    options.timeoutMs ?? resolved.timeoutMs
  );

  let response: Response;
  try {
    response = await resolved.fetchImplementation(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: abortBundle.signal,
    });
  } catch (error) {
    if (abortBundle.signal.aborted) {
      throw toAbortError(abortBundle.signal.reason ?? error);
    }

    throw new AIFetchError("Failed to reach AI gateway", { cause: error });
  }

  if (!response.ok) {
    const errorBody = await safeParseJson(response);
    abortBundle.cleanup();
    throw new AIResponseError({
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
      headers: collectHeaders(response.headers),
    });
  }

  if (!response.body) {
    abortBundle.cleanup();
    throw new AIFetchError("Streaming response did not include a readable body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const handlers = options.handlers ?? {};

  let finishedResolve: () => void;
  let finishedReject: (reason?: unknown) => void;
  const finished = new Promise<void>((resolve, reject) => {
    finishedResolve = resolve;
    finishedReject = reject;
  });

  let settled = false;

  const resolveStream = () => {
    if (settled) {
      return;
    }
    settled = true;
    try {
      handlers.onDone?.();
      finishedResolve();
    } catch (error) {
      settled = false; // allow rejectError to run with handler error
      rejectStream(error);
    }
  };

  const rejectStream = (reason: unknown) => {
    if (settled) {
      return;
    }
    settled = true;
    try {
      handlers.onError?.(reason);
    } catch (handlerError) {
      reason = handlerError;
    }
    finishedReject(reason);
  };

  const abort = () => abortBundle.abort();

  (async () => {
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          buffer += decoder.decode();
          buffer = buffer.replace(/\r\n/g, "\n");
          if (buffer.trim().length > 0) {
            if (processStreamEventChunk(buffer, handlers)) {
              break;
            }
          }
          resolveStream();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, "\n");

        let boundaryIndex: number;
        while ((boundaryIndex = buffer.indexOf("\n\n")) !== -1) {
          const chunk = buffer.slice(0, boundaryIndex);
          buffer = buffer.slice(boundaryIndex + 2);
          if (!chunk) {
            continue;
          }
          if (processStreamEventChunk(chunk, handlers)) {
            await reader.cancel().catch(() => undefined);
            resolveStream();
            return;
          }
        }
      }
    } catch (error) {
      if (abortBundle.signal.aborted) {
        rejectStream(toAbortError(abortBundle.signal.reason ?? error));
      } else {
        rejectStream(error);
      }
    } finally {
      try {
        reader.releaseLock();
      } catch (error) {
        // ignore release errors
      }
      abortBundle.cleanup();
    }
  })().catch((error) => {
    rejectStream(error);
  });

  return {
    abort,
    finished,
  };

  function processStreamEventChunk(
    chunk: string,
    eventHandlers: StreamingEventHandlers
  ): boolean {
    const dataString = extractSseData(chunk);
    if (dataString == null) {
      return false;
    }

    const trimmed = dataString.trim();
    if (trimmed === "[DONE]") {
      return true;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(dataString);
    } catch (error) {
      rejectStream(new AIError("Failed to parse streaming payload", { cause: error }));
      return true;
    }

    try {
      handleStreamPayload(payload, eventHandlers);
    } catch (error) {
      rejectStream(error);
      return true;
    }

    return false;
  }

  function handleStreamPayload(
    payload: unknown,
    eventHandlers: StreamingEventHandlers
  ): void {
    if (!payload || typeof payload !== "object") {
      return;
    }

    if ("error" in payload && payload.error) {
      const message =
        typeof payload.error === "string"
          ? payload.error
          : (payload.error as { message?: string }).message;
      throw new AIError(message ?? "AI stream returned an error payload");
    }

    const structured = payload as {
      choices?: Array<{ delta?: unknown }>;
      usage?: ChatCompletionUsage;
    };

    if (Array.isArray(structured.choices)) {
      for (const choice of structured.choices) {
        if (!choice || typeof choice !== "object") {
          continue;
        }
        const delta = (choice as { delta?: unknown }).delta;
        if (!delta || typeof delta !== "object") {
          continue;
        }
        const deltaObject = delta as Record<string, unknown>;

        const textDelta = extractDeltaText(deltaObject.content);
        if (textDelta) {
          eventHandlers.onTextDelta?.(textDelta);
        }

        const reasoningDelta = extractDeltaText(deltaObject.reasoning);
        if (reasoningDelta) {
          eventHandlers.onReasoningDelta?.(reasoningDelta);
        }

        if (deltaObject.tool_calls !== undefined) {
          eventHandlers.onToolCallDelta?.(deltaObject.tool_calls);
        }
      }
    }

    if (structured.usage) {
      eventHandlers.onUsage?.(structured.usage);
    }
  }

  function extractDeltaText(value: unknown): string | undefined {
    if (!value) {
      return undefined;
    }

    if (typeof value === "string") {
      return value;
    }

    if (Array.isArray(value)) {
      return flattenMessageContent(value as ChatMessage["content"]);
    }

    if (
      typeof value === "object" &&
      value !== null &&
      "content" in value &&
      Array.isArray((value as { content?: unknown }).content)
    ) {
      return flattenMessageContent(
        ((value as { content?: ChatMessage["content"] }).content ?? []) as ChatMessage["content"]
      );
    }

    return undefined;
  }

  function extractSseData(chunk: string): string | null {
    const lines = chunk.split("\n");
    const dataLines: string[] = [];
    for (const rawLine of lines) {
      if (!rawLine) {
        continue;
      }
      const match = /^data:(.*)$/.exec(rawLine);
      if (!match) {
        continue;
      }

      const value = match[1];
      dataLines.push(value.startsWith(" ") ? value.slice(1) : value);
    }

    if (dataLines.length === 0) {
      return null;
    }

    return dataLines.join("\n");
  }
}

function buildStreamMetadataExtras(
  options: StreamTextOptions
): Record<string, unknown> | undefined {
  const streamConfig: Record<string, unknown> = {};

  if (options.sendReasoning !== undefined) {
    streamConfig.sendReasoning = options.sendReasoning;
  }

  if (options.includeUsage !== undefined) {
    streamConfig.includeUsage = options.includeUsage;
  }

  if (Object.keys(streamConfig).length === 0) {
    return undefined;
  }

  return {
    openpond: {
      stream: streamConfig,
    },
  } satisfies Record<string, unknown>;
}

function buildRequestPayload(
  options: GenerateTextOptions,
  model: string,
  capabilities: { allowTools: boolean },
  metadataExtras?: Record<string, unknown>
): ChatCompletionRequestPayload {
  const payload: ChatCompletionRequestPayload = {
    model,
    messages: options.messages,
  };

  const generation: GenerationParameters = options.generation ?? {};

  assignIfDefined(payload, "temperature", generation.temperature);
  assignIfDefined(payload, "top_p", generation.topP);
  assignIfDefined(payload, "max_tokens", generation.maxTokens);
  assignIfDefined(payload, "stop", generation.stop);
  assignIfDefined(
    payload,
    "frequency_penalty",
    generation.frequencyPenalty
  );
  assignIfDefined(payload, "presence_penalty", generation.presencePenalty);
  assignIfDefined(payload, "response_format", generation.responseFormat);

  const toolExecution = options.toolExecution;
  const enableTools = toolExecution?.enableTools ?? true;
  if (enableTools && capabilities.allowTools) {
    const resolvedTools = resolveToolset(options.tools, toolExecution);
    assignIfDefined(payload, "tools", resolvedTools);
    assignIfDefined(payload, "tool_choice", options.toolChoice);
  } else if (options.toolChoice && options.toolChoice !== "none") {
    payload.tool_choice = "none";
  }

  const metadataPayload = buildMetadataPayload(
    options.metadata,
    toolExecution,
    metadataExtras
  );
  if (metadataPayload) {
    payload.metadata = metadataPayload;
  }

  return payload;
}

function assignIfDefined<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function buildUrl(baseUrl: string, path: string): string {
  const sanitizedBase = baseUrl.endsWith("/")
    ? baseUrl.slice(0, -1)
    : baseUrl;
  return `${sanitizedBase}${path}`;
}

function createAbortBundle(
  upstreamSignal: AbortSignal | undefined,
  timeoutMs: number | undefined
): AbortBundle {
  const controller = new AbortController();
  const cleanupCallbacks: Array<() => void> = [];

  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      controller.abort(upstreamSignal.reason);
    } else {
      const onAbort = () => controller.abort(upstreamSignal.reason);
      upstreamSignal.addEventListener("abort", onAbort, { once: true });
      cleanupCallbacks.push(() =>
        upstreamSignal.removeEventListener("abort", onAbort)
      );
    }
  }

  if (timeoutMs && timeoutMs > 0) {
    const timeoutId = setTimeout(() => {
      controller.abort(new Error("AI request timed out"));
    }, timeoutMs);
    cleanupCallbacks.push(() => clearTimeout(timeoutId));
  }

  return {
    signal: controller.signal,
    abort: () => controller.abort(),
    cleanup: () => {
      cleanupCallbacks.forEach((fn) => fn());
    },
  };
}

function collectHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function buildMetadataPayload(
  base: AIRequestMetadata | undefined,
  toolExecution: GenerateTextOptions["toolExecution"] | undefined,
  extras?: Record<string, unknown>
): Record<string, unknown> | undefined {
  const metadata: Record<string, unknown> = base ? { ...base } : {};

  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      if (value === undefined) {
        continue;
      }

      if (key === "openpond" && typeof value === "object" && value !== null) {
        const existing = {
          ...((metadata.openpond as Record<string, unknown> | undefined) ?? {}),
        };
        metadata.openpond = {
          ...existing,
          ...(value as Record<string, unknown>),
        };
      } else {
        metadata[key] = value;
      }
    }
  }

  if (toolExecution) {
    const openpond = {
      ...((metadata.openpond as Record<string, unknown> | undefined) ?? {}),
      toolExecution,
    };
    metadata.openpond = openpond;
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

async function safeParseJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return undefined;
  }

  try {
    return await response.json();
  } catch (error) {
    return { error: "Failed to parse error body", cause: String(error) };
  }
}

function isPrimaryChoice(choice: ChatCompletionChoice): boolean {
  return choice.index === 0 || choice.message !== undefined;
}

function toAbortError(reason: unknown): AIAbortError {
  if (reason instanceof AIAbortError) {
    return reason;
  }

  if (reason instanceof Error) {
    if (reason.name === "AbortError") {
      return new AIAbortError(reason.message || "AI request aborted");
    }
    return new AIAbortError(reason.message);
  }

  return new AIAbortError(String(reason ?? "AI request aborted"));
}

export { listModels };

// src/ai/errors.ts
var AIError = class extends Error {
  constructor(message, options) {
    super(message);
    this.name = "AIError";
    if (options && "cause" in options) {
      this.cause = options.cause;
    }
  }
};
var AIFetchError = class extends AIError {
  constructor(message, options) {
    super(message, options);
    this.name = "AIFetchError";
  }
};
var AIResponseError = class extends AIError {
  constructor(details, message) {
    super(message ?? `AI response error: ${details.status} ${details.statusText}`);
    this.name = "AIResponseError";
    this.status = details.status;
    this.statusText = details.statusText;
    this.body = details.body;
    this.headers = details.headers ?? {};
  }
};
var AIAbortError = class extends AIError {
  constructor(message = "AI request aborted") {
    super(message);
    this.name = "AIAbortError";
  }
};

// src/ai/config.ts
var DEFAULT_BASE_URL = "https://gateway.openpond.dev";
var DEFAULT_TIMEOUT_MS = 6e4;
var DEFAULT_MODEL = "fireworks:accounts/fireworks/models/glm-4p7";
function assertFetchAvailable(fetchImplementation) {
  if (!fetchImplementation) {
    throw new Error(
      "No fetch implementation available. Provide one via AIClientConfig.fetchImplementation."
    );
  }
}
function resolveConfig(config = {}) {
  const fetchImplementation = config.fetchImplementation ?? globalThis.fetch;
  assertFetchAvailable(fetchImplementation);
  const resolved = {
    baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
    defaultModel: config.defaultModel ?? DEFAULT_MODEL,
    defaultHeaders: {
      "Content-Type": "application/json",
      ...config.defaultHeaders
    },
    fetchImplementation,
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  };
  if (config.apiKey !== void 0) {
    resolved.apiKey = config.apiKey;
  }
  return resolved;
}
function mergeHeaders(base, overrides) {
  if (!overrides) {
    return { ...base };
  }
  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === void 0) {
      continue;
    }
    merged[key] = value;
  }
  return merged;
}

// src/ai/models.ts
var MODEL_REGISTRY = [
  {
    name: "fireworks:accounts/fireworks/models/glm-4p7",
    label: "GLM-4P7 (Fireworks)",
    provider: "fireworks",
    supportsStreaming: true,
    supportsTools: true,
    aliases: ["glm-4p7", "glm"],
    default: true
  },
  {
    name: "openai/gpt-5-mini",
    label: "OpenAI GPT-5 Mini",
    provider: "openai",
    supportsStreaming: true,
    supportsTools: true,
    reasoning: true,
    aliases: ["gpt-5-mini", "gpt5-mini", "gpt-5.0-mini"]
  },
  {
    name: "anthropic/claude-4-sonnet-20250514",
    label: "Claude 4 Sonnet (20250514)",
    provider: "anthropic",
    supportsStreaming: true,
    supportsTools: true,
    aliases: ["claude-4-sonnet", "claude-sonnet"]
  },
  {
    name: "google/gemini-2.0-flash-001",
    label: "Gemini 2.0 Flash",
    provider: "google",
    supportsStreaming: true,
    supportsTools: true,
    aliases: ["gemini-2.0-flash", "gemini-flash"]
  },
  {
    name: "deepseek/deepseek-chat",
    label: "DeepSeek Chat",
    provider: "deepseek",
    supportsStreaming: true,
    supportsTools: true,
    aliases: ["deepseek-chat", "deepseek"]
  }
];
var ALIAS_LOOKUP = MODEL_REGISTRY.reduce(
  (accumulator, model) => {
    accumulator[model.name.toLowerCase()] = model.name;
    if (model.aliases) {
      for (const alias of model.aliases) {
        accumulator[alias.toLowerCase()] = model.name;
      }
    }
    return accumulator;
  },
  {}
);
var DEFAULT_MODEL_NAME = MODEL_REGISTRY.find((model) => model.default)?.name ?? MODEL_REGISTRY[0].name;
function listModels() {
  return [...MODEL_REGISTRY];
}
function getModelConfig(modelName) {
  if (!modelName) {
    return MODEL_REGISTRY.find((model) => model.default) ?? MODEL_REGISTRY[0];
  }
  const normalized = normalizeModelName(modelName);
  return MODEL_REGISTRY.find((model) => model.name === normalized);
}
function normalizeModelName(modelName) {
  if (!modelName) {
    return DEFAULT_MODEL_NAME;
  }
  const trimmed = modelName.trim();
  if (!trimmed) {
    return DEFAULT_MODEL_NAME;
  }
  const directMatch = ALIAS_LOOKUP[trimmed.toLowerCase()];
  if (directMatch) {
    return directMatch;
  }
  if (trimmed.includes("/")) {
    return trimmed;
  }
  return `openai/${trimmed}`;
}
function isStreamingSupported(modelName) {
  const config = getModelConfig(modelName);
  return config ? config.supportsStreaming : true;
}
function isToolCallingSupported(modelName) {
  const config = getModelConfig(modelName);
  return config ? config.supportsTools : true;
}

// src/ai/tools.ts
var WEBSEARCH_TOOL_NAME = "websearch";
var WEBSEARCH_TOOL_DEFINITION = {
  type: "function",
  function: {
    name: WEBSEARCH_TOOL_NAME,
    description: "Search the web using the OpenPond search engine. Returns relevant results with titles, URLs, and text content.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query"
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 5)"
        }
      },
      required: ["query"]
    }
  }
};
function resolveToolset(tools, policy) {
  if (!policy) {
    return tools;
  }
  const resolved = tools ? [...tools] : [];
  if (policy.webSearch) {
    const alreadyIncluded = resolved.some(
      (tool) => tool.type === "function" && tool.function?.name === WEBSEARCH_TOOL_NAME
    );
    if (!alreadyIncluded) {
      resolved.push(materializeWebSearchTool(policy.webSearch));
    }
  }
  return resolved.length > 0 ? resolved : void 0;
}
function materializeWebSearchTool(options) {
  if (!options || Object.keys(options).length === 0) {
    return WEBSEARCH_TOOL_DEFINITION;
  }
  const baseParameters = WEBSEARCH_TOOL_DEFINITION.function.parameters ?? {};
  const baseProperties = baseParameters.properties ?? {};
  const properties = { ...baseProperties };
  if (options.limit !== void 0) {
    const existingLimit = baseProperties["limit"];
    const limitSchema = typeof existingLimit === "object" && existingLimit !== null ? { ...existingLimit } : {
      type: "number",
      description: "Maximum number of results to return (default: 5)"
    };
    limitSchema.default = options.limit;
    properties.limit = limitSchema;
  }
  if (options.includeImages) {
    properties.includeImages = {
      type: "boolean",
      description: "Whether to include representative images in results.",
      default: true
    };
  }
  return {
    ...WEBSEARCH_TOOL_DEFINITION,
    function: {
      ...WEBSEARCH_TOOL_DEFINITION.function,
      parameters: {
        ...WEBSEARCH_TOOL_DEFINITION.function.parameters,
        properties
      }
    }
  };
}

// src/ai/messages.ts
function flattenMessageContent(content, options = {}) {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return void 0;
  }
  const separator = options.separator ?? "";
  const collected = [];
  for (const part of content) {
    const text = extractTextPart(part, options);
    if (text) {
      collected.push(text);
    }
  }
  if (collected.length === 0) {
    return void 0;
  }
  return collected.join(separator);
}
function ensureTextContent(message, options) {
  const flattened = flattenMessageContent(message.content, options);
  if (flattened !== void 0) {
    return flattened;
  }
  throw new AIError(
    options?.errorMessage ?? "Assistant response did not contain textual content."
  );
}
function extractTextPart(part, options) {
  if (!part || typeof part !== "object") {
    return void 0;
  }
  if ("text" in part && typeof part.text === "string") {
    return part.text;
  }
  if (options.includeUnknown) {
    try {
      return JSON.stringify(part);
    } catch (error) {
      return `[unserializable_part: ${String(error)}]`;
    }
  }
  return void 0;
}

// src/ai/client.ts
var CHAT_COMPLETIONS_PATH = "/v1/chat/completions";
function createAIClient(config = {}) {
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
    listModels
  };
}
async function generateText(options, clientConfig = {}) {
  const resolved = resolveConfig(clientConfig);
  const model = normalizeModelName(options.model ?? resolved.defaultModel);
  const payload = buildRequestPayload(options, model, {
    allowTools: isToolCallingSupported(model)
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
  let response;
  try {
    response = await resolved.fetchImplementation(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: abortBundle.signal
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
      headers: collectHeaders(response.headers)
    });
  }
  const data = await response.json();
  const primaryChoice = data.choices.find(isPrimaryChoice);
  if (!primaryChoice) {
    throw new AIResponseError(
      {
        status: response.status,
        statusText: response.statusText,
        body: data
      },
      "Gateway response did not contain a valid choice"
    );
  }
  const result = {
    id: data.id,
    model: data.model,
    message: primaryChoice.message,
    raw: data
  };
  if (primaryChoice.finish_reason !== void 0) {
    result.finishReason = primaryChoice.finish_reason;
  }
  if (data.usage) {
    result.usage = data.usage;
  }
  return result;
}
async function streamText(options, clientConfig = {}) {
  const resolved = resolveConfig(clientConfig);
  const model = normalizeModelName(options.model ?? resolved.defaultModel);
  const streamExtras = buildStreamMetadataExtras(options);
  const payload = buildRequestPayload(
    options,
    model,
    {
      allowTools: isToolCallingSupported(model)
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
  let response;
  try {
    response = await resolved.fetchImplementation(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: abortBundle.signal
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
      headers: collectHeaders(response.headers)
    });
  }
  if (!response.body) {
    abortBundle.cleanup();
    throw new AIFetchError("Streaming response did not include a readable body");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const handlers = options.handlers ?? {};
  let finishedResolve;
  let finishedReject;
  const finished = new Promise((resolve, reject) => {
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
      settled = false;
      rejectStream(error);
    }
  };
  const rejectStream = (reason) => {
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
        let boundaryIndex;
        while ((boundaryIndex = buffer.indexOf("\n\n")) !== -1) {
          const chunk = buffer.slice(0, boundaryIndex);
          buffer = buffer.slice(boundaryIndex + 2);
          if (!chunk) {
            continue;
          }
          if (processStreamEventChunk(chunk, handlers)) {
            await reader.cancel().catch(() => void 0);
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
      }
      abortBundle.cleanup();
    }
  })().catch((error) => {
    rejectStream(error);
  });
  return {
    abort,
    finished
  };
  function processStreamEventChunk(chunk, eventHandlers) {
    const dataString = extractSseData(chunk);
    if (dataString == null) {
      return false;
    }
    const trimmed = dataString.trim();
    if (trimmed === "[DONE]") {
      return true;
    }
    let payload2;
    try {
      payload2 = JSON.parse(dataString);
    } catch (error) {
      rejectStream(new AIError("Failed to parse streaming payload", { cause: error }));
      return true;
    }
    try {
      handleStreamPayload(payload2, eventHandlers);
    } catch (error) {
      rejectStream(error);
      return true;
    }
    return false;
  }
  function handleStreamPayload(payload2, eventHandlers) {
    if (!payload2 || typeof payload2 !== "object") {
      return;
    }
    if ("error" in payload2 && payload2.error) {
      const message = typeof payload2.error === "string" ? payload2.error : payload2.error.message;
      throw new AIError(message ?? "AI stream returned an error payload");
    }
    const structured = payload2;
    if (Array.isArray(structured.choices)) {
      for (const choice of structured.choices) {
        if (!choice || typeof choice !== "object") {
          continue;
        }
        const delta = choice.delta;
        if (!delta || typeof delta !== "object") {
          continue;
        }
        const deltaObject = delta;
        const textDelta = extractDeltaText(deltaObject.content);
        if (textDelta) {
          eventHandlers.onTextDelta?.(textDelta);
        }
        const reasoningDelta = extractDeltaText(deltaObject.reasoning);
        if (reasoningDelta) {
          eventHandlers.onReasoningDelta?.(reasoningDelta);
        }
        if (deltaObject.tool_calls !== void 0) {
          eventHandlers.onToolCallDelta?.(deltaObject.tool_calls);
        }
      }
    }
    if (structured.usage) {
      eventHandlers.onUsage?.(structured.usage);
    }
  }
  function extractDeltaText(value) {
    if (!value) {
      return void 0;
    }
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value)) {
      return flattenMessageContent(value);
    }
    if (typeof value === "object" && value !== null && "content" in value && Array.isArray(value.content)) {
      return flattenMessageContent(
        value.content ?? []
      );
    }
    return void 0;
  }
  function extractSseData(chunk) {
    const lines = chunk.split("\n");
    const dataLines = [];
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
function buildStreamMetadataExtras(options) {
  const streamConfig = {};
  if (options.sendReasoning !== void 0) {
    streamConfig.sendReasoning = options.sendReasoning;
  }
  if (options.includeUsage !== void 0) {
    streamConfig.includeUsage = options.includeUsage;
  }
  if (Object.keys(streamConfig).length === 0) {
    return void 0;
  }
  return {
    openpond: {
      stream: streamConfig
    }
  };
}
function buildRequestPayload(options, model, capabilities, metadataExtras) {
  const payload = {
    model,
    messages: options.messages
  };
  const generation = options.generation ?? {};
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
function assignIfDefined(target, key, value) {
  if (value !== void 0) {
    target[key] = value;
  }
}
function buildUrl(baseUrl, path) {
  const sanitizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${sanitizedBase}${path}`;
}
function createAbortBundle(upstreamSignal, timeoutMs) {
  const controller = new AbortController();
  const cleanupCallbacks = [];
  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      controller.abort(upstreamSignal.reason);
    } else {
      const onAbort = () => controller.abort(upstreamSignal.reason);
      upstreamSignal.addEventListener("abort", onAbort, { once: true });
      cleanupCallbacks.push(
        () => upstreamSignal.removeEventListener("abort", onAbort)
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
    }
  };
}
function collectHeaders(headers) {
  const result = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}
function buildMetadataPayload(base, toolExecution, extras) {
  const metadata = base ? { ...base } : {};
  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      if (value === void 0) {
        continue;
      }
      if (key === "openpond" && typeof value === "object" && value !== null) {
        const existing = {
          ...metadata.openpond ?? {}
        };
        metadata.openpond = {
          ...existing,
          ...value
        };
      } else {
        metadata[key] = value;
      }
    }
  }
  if (toolExecution) {
    const openpond = {
      ...metadata.openpond ?? {},
      toolExecution
    };
    metadata.openpond = openpond;
  }
  return Object.keys(metadata).length > 0 ? metadata : void 0;
}
async function safeParseJson(response) {
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return void 0;
  }
  try {
    return await response.json();
  } catch (error) {
    return { error: "Failed to parse error body", cause: String(error) };
  }
}
function isPrimaryChoice(choice) {
  return choice.index === 0 || choice.message !== void 0;
}
function toAbortError(reason) {
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

export { AIAbortError, AIError, AIFetchError, AIResponseError, DEFAULT_BASE_URL, DEFAULT_MODEL, DEFAULT_TIMEOUT_MS, WEBSEARCH_TOOL_DEFINITION, WEBSEARCH_TOOL_NAME, createAIClient, ensureTextContent, flattenMessageContent, generateText, getModelConfig, isStreamingSupported, isToolCallingSupported, listModels, normalizeModelName, resolveConfig, resolveToolset, streamText };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
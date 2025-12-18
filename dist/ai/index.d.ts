type ChatMessageRole = "system" | "user" | "assistant" | "tool";
interface ChatMessageContentPartText {
    type: "text";
    text: string;
}
interface ChatMessageContentPartImageUrl {
    type: "image_url";
    image_url: {
        url: string;
        detail?: "auto" | "high" | "low";
    };
}
type ChatMessageContentPart = ChatMessageContentPartText | ChatMessageContentPartImageUrl | Record<string, unknown>;
interface ChatMessage {
    role: ChatMessageRole;
    content: string | ChatMessageContentPart[];
    name?: string;
    tool_call_id?: string;
}
interface JsonSchema {
    type?: string;
    title?: string;
    description?: string;
    properties?: Record<string, JsonSchema>;
    required?: string[];
    items?: JsonSchema | JsonSchema[];
    enum?: Array<string | number | boolean | null>;
    additionalProperties?: boolean | JsonSchema;
    [key: string]: unknown;
}
interface FunctionToolDefinition {
    type: "function";
    function: {
        name: string;
        description?: string;
        parameters?: JsonSchema;
    };
}
type ToolDefinition = FunctionToolDefinition;
type ToolChoice = "auto" | "required" | "none" | {
    type: "function";
    function: {
        name: string;
    };
};
interface GenerationParameters {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    stop?: string | string[];
    frequencyPenalty?: number;
    presencePenalty?: number;
    responseFormat?: "json_object" | "text" | {
        type: "json_schema";
        json_schema: JsonSchema;
    };
}
interface ToolExecutionPolicy {
    enableTools?: boolean;
    maxSteps?: number;
    toolSources?: "internal" | "public" | "both";
    webSearch?: WebSearchOptions | false;
}
interface WebSearchOptions {
    limit?: number;
    includeImages?: boolean;
}
interface AIRequestMetadata {
    requestId?: string;
    sessionId?: string;
    tags?: string[];
    openpond?: Record<string, unknown>;
    [key: string]: unknown;
}
interface GenerateTextOptions {
    messages: ChatMessage[];
    model?: string;
    generation?: GenerationParameters;
    tools?: ToolDefinition[];
    toolChoice?: ToolChoice;
    toolExecution?: ToolExecutionPolicy;
    metadata?: AIRequestMetadata;
    timeoutMs?: number;
    abortSignal?: AbortSignal;
    headers?: Record<string, string>;
}
interface AIClientConfig {
    baseUrl?: string;
    apiKey?: string;
    defaultModel?: string;
    defaultHeaders?: Record<string, string>;
    fetchImplementation?: typeof fetch;
    timeoutMs?: number;
}
interface ResolvedAIClientConfig {
    baseUrl: string;
    apiKey?: string;
    defaultModel: string;
    defaultHeaders: Record<string, string>;
    fetchImplementation: typeof fetch;
    timeoutMs: number;
}
interface ChatCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: ChatCompletionChoice[];
    usage?: ChatCompletionUsage;
    system_fingerprint?: string;
}
interface ChatCompletionChoice {
    index: number;
    message: ChatMessage;
    finish_reason?: string;
    logprobs?: ChatCompletionLogProbs;
}
interface ChatCompletionUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    [key: string]: unknown;
}
interface ChatCompletionLogProbs {
    content?: Array<{
        token: string;
        logprob: number;
        bytes?: number[];
    }>;
}
interface GenerateTextResult {
    id: string;
    model: string;
    message: ChatMessage;
    finishReason?: string;
    usage?: ChatCompletionUsage;
    raw: ChatCompletionResponse;
}
interface StreamingEventHandlers {
    onTextDelta?: (delta: string) => void;
    onToolCallDelta?: (toolCall: unknown) => void;
    onReasoningDelta?: (delta: string) => void;
    onUsage?: (usage: ChatCompletionUsage) => void;
    onError?: (error: unknown) => void;
    onDone?: () => void;
}
interface StreamTextOptions extends GenerateTextOptions {
    handlers?: StreamingEventHandlers;
    sendReasoning?: boolean;
    includeUsage?: boolean;
}
interface StreamTextResult {
    abort: () => void;
    finished: Promise<void>;
}

interface ErrorInit {
    cause?: unknown;
}
declare class AIError extends Error {
    constructor(message: string, options?: ErrorInit);
}
interface ResponseErrorDetails {
    status: number;
    statusText: string;
    body?: unknown;
    headers?: Record<string, string>;
}
declare class AIFetchError extends AIError {
    constructor(message: string, options?: ErrorInit);
}
declare class AIResponseError extends AIError {
    readonly status: number;
    readonly statusText: string;
    readonly body?: unknown;
    readonly headers: Record<string, string>;
    constructor(details: ResponseErrorDetails, message?: string);
}
declare class AIAbortError extends AIError {
    constructor(message?: string);
}

type ModelProvider = "openai" | "anthropic" | "google" | "deepseek" | "custom";
interface ModelConfig {
    name: string;
    label: string;
    provider: ModelProvider;
    supportsStreaming: boolean;
    supportsTools: boolean;
    reasoning?: boolean;
    aliases?: string[];
    default?: boolean;
}
declare function listModels(): ModelConfig[];
declare function getModelConfig(modelName?: string): ModelConfig | undefined;
declare function normalizeModelName(modelName?: string): string;
declare function isStreamingSupported(modelName?: string): boolean;
declare function isToolCallingSupported(modelName?: string): boolean;

interface AIClient {
    readonly config: ResolvedAIClientConfig;
    generateText(options: GenerateTextOptions): Promise<GenerateTextResult>;
    streamText(options: StreamTextOptions): Promise<StreamTextResult>;
    listModels: typeof listModels;
}
declare function createAIClient(config?: AIClientConfig): AIClient;
declare function generateText(options: GenerateTextOptions, clientConfig?: AIClientConfig): Promise<GenerateTextResult>;
declare function streamText(options: StreamTextOptions, clientConfig?: AIClientConfig): Promise<StreamTextResult>;

declare const DEFAULT_BASE_URL = "https://gateway.openpond.dev";
declare const DEFAULT_TIMEOUT_MS = 60000;
declare const DEFAULT_MODEL = "openai/gpt-5-mini";
declare function resolveConfig(config?: AIClientConfig): ResolvedAIClientConfig;

declare const WEBSEARCH_TOOL_NAME = "websearch";
declare const WEBSEARCH_TOOL_DEFINITION: ToolDefinition;
declare function resolveToolset(tools: ToolDefinition[] | undefined, policy: ToolExecutionPolicy | undefined): ToolDefinition[] | undefined;

interface FlattenMessageContentOptions {
    /**
     * String used to join individual text segments when the content array contains multiple text parts.
     * Defaults to an empty string.
     */
    separator?: string;
    /**
     * When true, JSON stringifies non-text segments instead of discarding them.
     * Defaults to false (skip non-text parts).
     */
    includeUnknown?: boolean;
}
declare function flattenMessageContent(content: ChatMessage["content"], options?: FlattenMessageContentOptions): string | undefined;
interface EnsureTextContentOptions extends FlattenMessageContentOptions {
    errorMessage?: string;
}
declare function ensureTextContent(message: ChatMessage, options?: EnsureTextContentOptions): string;

export { AIAbortError, type AIClientConfig, AIError, AIFetchError, type AIRequestMetadata, AIResponseError, type ChatCompletionChoice, type ChatCompletionLogProbs, type ChatCompletionResponse, type ChatCompletionUsage, type ChatMessage, type ChatMessageContentPart, type ChatMessageContentPartImageUrl, type ChatMessageContentPartText, type ChatMessageRole, DEFAULT_BASE_URL, DEFAULT_MODEL, DEFAULT_TIMEOUT_MS, type FunctionToolDefinition, type GenerateTextOptions, type GenerateTextResult, type GenerationParameters, type JsonSchema, type ResolvedAIClientConfig, type ResponseErrorDetails, type StreamTextOptions, type StreamTextResult, type StreamingEventHandlers, type ToolChoice, type ToolDefinition, type ToolExecutionPolicy, WEBSEARCH_TOOL_DEFINITION, WEBSEARCH_TOOL_NAME, type WebSearchOptions, createAIClient, ensureTextContent, flattenMessageContent, generateText, getModelConfig, isStreamingSupported, isToolCallingSupported, listModels, normalizeModelName, resolveConfig, resolveToolset, streamText };

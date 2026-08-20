import { A as AIClientConfig, R as ResolvedAIClientConfig, G as GenerateTextOptions, j as GenerateTextResult, S as StreamTextOptions, l as StreamTextResult, n as ToolDefinition, o as ToolExecutionPolicy, e as ChatMessage } from '../types-Dc90GEv1.js';
export { a as AIRequestMetadata, C as ChatCompletionChoice, b as ChatCompletionLogProbs, c as ChatCompletionResponse, d as ChatCompletionUsage, f as ChatMessageContentPart, g as ChatMessageContentPartImageUrl, h as ChatMessageContentPartText, i as ChatMessageRole, F as FunctionToolDefinition, k as GenerationParameters, J as JsonSchema, m as StreamingEventHandlers, T as ToolChoice, W as WebSearchOptions } from '../types-Dc90GEv1.js';

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

type ModelProvider = "openai" | "anthropic" | "google" | "deepseek" | "fireworks" | "custom";
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
declare const DEFAULT_MODEL = "fireworks:accounts/fireworks/models/glm-4p7";
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

export { AIAbortError, AIClientConfig, AIError, AIFetchError, AIResponseError, ChatMessage, DEFAULT_BASE_URL, DEFAULT_MODEL, DEFAULT_TIMEOUT_MS, GenerateTextOptions, GenerateTextResult, ResolvedAIClientConfig, type ResponseErrorDetails, StreamTextOptions, StreamTextResult, ToolDefinition, ToolExecutionPolicy, WEBSEARCH_TOOL_DEFINITION, WEBSEARCH_TOOL_NAME, createAIClient, ensureTextContent, flattenMessageContent, generateText, getModelConfig, isStreamingSupported, isToolCallingSupported, listModels, normalizeModelName, resolveConfig, resolveToolset, streamText };

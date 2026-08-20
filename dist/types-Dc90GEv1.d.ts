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

export type { AIClientConfig as A, ChatCompletionChoice as C, FunctionToolDefinition as F, GenerateTextOptions as G, JsonSchema as J, ResolvedAIClientConfig as R, StreamTextOptions as S, ToolChoice as T, WebSearchOptions as W, AIRequestMetadata as a, ChatCompletionLogProbs as b, ChatCompletionResponse as c, ChatCompletionUsage as d, ChatMessage as e, ChatMessageContentPart as f, ChatMessageContentPartImageUrl as g, ChatMessageContentPartText as h, ChatMessageRole as i, GenerateTextResult as j, GenerationParameters as k, StreamTextResult as l, StreamingEventHandlers as m, ToolDefinition as n, ToolExecutionPolicy as o };

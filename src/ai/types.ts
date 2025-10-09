export type ChatMessageRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessageContentPartText {
  type: "text";
  text: string;
}

export interface ChatMessageContentPartImageUrl {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "high" | "low";
  };
}

export type ChatMessageContentPart =
  | ChatMessageContentPartText
  | ChatMessageContentPartImageUrl
  | Record<string, unknown>;

export interface ChatMessage {
  role: ChatMessageRole;
  content: string | ChatMessageContentPart[];
  name?: string;
  tool_call_id?: string;
}

export interface JsonSchema {
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

export interface FunctionToolDefinition {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: JsonSchema;
  };
}

export type ToolDefinition = FunctionToolDefinition;

export type ToolChoice =
  | "auto"
  | "required"
  | "none"
  | {
      type: "function";
      function: {
        name: string;
      };
    };

export interface GenerationParameters {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stop?: string | string[];
  frequencyPenalty?: number;
  presencePenalty?: number;
  responseFormat?:
    | "json_object"
    | "text"
    | {
        type: "json_schema";
        json_schema: JsonSchema;
      };
}

export interface ToolExecutionPolicy {
  enableTools?: boolean;
  maxSteps?: number;
  toolSources?: "internal" | "public" | "both";
  webSearch?: WebSearchOptions | false;
}

export interface WebSearchOptions {
  limit?: number;
  includeImages?: boolean;
}

export interface AIRequestMetadata {
  requestId?: string;
  sessionId?: string;
  tags?: string[];
  openpond?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GenerateTextOptions {
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

export interface AIClientConfig {
  baseUrl?: string;
  apiKey?: string;
  defaultModel?: string;
  defaultHeaders?: Record<string, string>;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
}

export interface ResolvedAIClientConfig {
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  defaultHeaders: Record<string, string>;
  fetchImplementation: typeof fetch;
  timeoutMs: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: ChatCompletionUsage;
  system_fingerprint?: string;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason?: string;
  logprobs?: ChatCompletionLogProbs;
}

export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  [key: string]: unknown;
}

export interface ChatCompletionLogProbs {
  content?: Array<{
    token: string;
    logprob: number;
    bytes?: number[];
  }>;
}

export interface GenerateTextResult {
  id: string;
  model: string;
  message: ChatMessage;
  finishReason?: string;
  usage?: ChatCompletionUsage;
  raw: ChatCompletionResponse;
}

export interface StreamingEventHandlers {
  onTextDelta?: (delta: string) => void;
  onToolCallDelta?: (toolCall: unknown) => void;
  onReasoningDelta?: (delta: string) => void;
  onUsage?: (usage: ChatCompletionUsage) => void;
  onError?: (error: unknown) => void;
  onDone?: () => void;
}

export interface StreamTextOptions extends GenerateTextOptions {
  handlers?: StreamingEventHandlers;
  sendReasoning?: boolean;
  includeUsage?: boolean;
}

export interface StreamTextResult {
  abort: () => void;
  finished: Promise<void>;
}

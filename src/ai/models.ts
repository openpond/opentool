export type ModelProvider = "openai" | "anthropic" | "google" | "deepseek" | "custom";

export interface ModelConfig {
  name: string;
  label: string;
  provider: ModelProvider;
  supportsStreaming: boolean;
  supportsTools: boolean;
  reasoning?: boolean;
  aliases?: string[];
  default?: boolean;
}

const MODEL_REGISTRY: ModelConfig[] = [
  {
    name: "openai/gpt-5-mini",
    label: "OpenAI GPT-5 Mini",
    provider: "openai",
    supportsStreaming: true,
    supportsTools: true,
    reasoning: true,
    aliases: ["gpt-5-mini", "gpt5-mini", "gpt-5.0-mini"],
    default: true,
  },
  {
    name: "anthropic/claude-4-sonnet-20250514",
    label: "Claude 4 Sonnet (20250514)",
    provider: "anthropic",
    supportsStreaming: true,
    supportsTools: true,
    aliases: ["claude-4-sonnet", "claude-sonnet"],
  },
  {
    name: "google/gemini-2.0-flash-001",
    label: "Gemini 2.0 Flash",
    provider: "google",
    supportsStreaming: true,
    supportsTools: true,
    aliases: ["gemini-2.0-flash", "gemini-flash"],
  },
  {
    name: "deepseek/deepseek-chat",
    label: "DeepSeek Chat",
    provider: "deepseek",
    supportsStreaming: true,
    supportsTools: true,
    aliases: ["deepseek-chat", "deepseek"],
  },
];

const ALIAS_LOOKUP: Record<string, string> = MODEL_REGISTRY.reduce(
  (accumulator, model) => {
    accumulator[model.name.toLowerCase()] = model.name;
    if (model.aliases) {
      for (const alias of model.aliases) {
        accumulator[alias.toLowerCase()] = model.name;
      }
    }
    return accumulator;
  },
  {} as Record<string, string>
);

const DEFAULT_MODEL_NAME =
  MODEL_REGISTRY.find((model) => model.default)?.name ?? MODEL_REGISTRY[0].name;

export function listModels(): ModelConfig[] {
  return [...MODEL_REGISTRY];
}

export function getModelConfig(modelName?: string): ModelConfig | undefined {
  if (!modelName) {
    return MODEL_REGISTRY.find((model) => model.default) ?? MODEL_REGISTRY[0];
  }

  const normalized = normalizeModelName(modelName);
  return MODEL_REGISTRY.find((model) => model.name === normalized);
}

export function normalizeModelName(modelName?: string): string {
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

export function isStreamingSupported(modelName?: string): boolean {
  const config = getModelConfig(modelName);
  return config ? config.supportsStreaming : true;
}

export function isToolCallingSupported(modelName?: string): boolean {
  const config = getModelConfig(modelName);
  return config ? config.supportsTools : true;
}


import { AIClientConfig, ResolvedAIClientConfig } from "./types";

export const DEFAULT_BASE_URL = "https://gateway.openpond.dev";
export const DEFAULT_TIMEOUT_MS = 60_000;
export const DEFAULT_MODEL = "openai/gpt-5-mini";

function assertFetchAvailable(fetchImplementation?: typeof fetch): asserts fetchImplementation {
  if (!fetchImplementation) {
    throw new Error(
      "No fetch implementation available. Provide one via AIClientConfig.fetchImplementation."
    );
  }
}

export function resolveConfig(
  config: AIClientConfig = {}
): ResolvedAIClientConfig {
  const fetchImplementation = config.fetchImplementation ?? globalThis.fetch;
  assertFetchAvailable(fetchImplementation);

  const resolved: ResolvedAIClientConfig = {
    baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
    defaultModel: config.defaultModel ?? DEFAULT_MODEL,
    defaultHeaders: {
      "Content-Type": "application/json",
      ...config.defaultHeaders,
    },
    fetchImplementation,
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };

  if (config.apiKey !== undefined) {
    resolved.apiKey = config.apiKey;
  }

  return resolved;
}

export function mergeHeaders(
  base: Record<string, string>,
  overrides?: Record<string, string>
): Record<string, string> {
  if (!overrides) {
    return { ...base };
  }

  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      continue;
    }

    merged[key] = value;
  }
  return merged;
}

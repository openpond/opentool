import { AIError } from "./errors";
import { ChatMessage, ChatMessageContentPart } from "./types";

export interface FlattenMessageContentOptions {
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

export function flattenMessageContent(
  content: ChatMessage["content"],
  options: FlattenMessageContentOptions = {}
): string | undefined {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return undefined;
  }

  const separator = options.separator ?? "";
  const collected: string[] = [];

  for (const part of content) {
    const text = extractTextPart(part, options);
    if (text) {
      collected.push(text);
    }
  }

  if (collected.length === 0) {
    return undefined;
  }

  return collected.join(separator);
}

export interface EnsureTextContentOptions extends FlattenMessageContentOptions {
  errorMessage?: string;
}

export function ensureTextContent(
  message: ChatMessage,
  options?: EnsureTextContentOptions
): string {
  const flattened = flattenMessageContent(message.content, options);
  if (flattened !== undefined) {
    return flattened;
  }

  throw new AIError(
    options?.errorMessage ??
      "Assistant response did not contain textual content."
  );
}

function extractTextPart(
  part: ChatMessageContentPart,
  options: FlattenMessageContentOptions
): string | undefined {
  if (!part || typeof part !== "object") {
    return undefined;
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

  return undefined;
}

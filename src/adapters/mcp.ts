import { z, type ZodSchema } from "zod";
import { PaymentRequiredError } from "../payment/index";
import type { ToolResponse } from "../types/index";

export const HTTP_METHODS = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OPTIONS",
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface CreateMcpAdapterOptions {
  name: string;
  schema?: ZodSchema;
  httpHandlers: Record<string, ((request: Request) => Promise<Response> | Response) | undefined>;
  legacyTool?: (params: unknown) => Promise<ToolResponse> | ToolResponse;
  defaultMethod?: string;
}

/**
 * Create an adapter that bridges MCP `call_tool` invocations to Web Standard handlers.
 */
export function createMcpAdapter(options: CreateMcpAdapterOptions) {
  const normalizedSchema = ensureSchema(options.schema);
  const defaultMethod = resolveDefaultMethod(options);
  const httpHandler = options.httpHandlers[defaultMethod];
  const legacyTool = options.legacyTool;

  if (!httpHandler && !legacyTool) {
    throw new Error(
      `Tool "${options.name}" does not export an HTTP handler for ${defaultMethod} or a legacy TOOL()`
    );
  }

  return async function invoke(rawArguments: unknown): Promise<ToolResponse> {
    const validated = normalizedSchema ? normalizedSchema.parse(rawArguments ?? {}) : rawArguments;

    if (httpHandler) {
      const request = buildRequest(options.name, defaultMethod, validated);
      try {
        const response = await Promise.resolve(httpHandler(request));
        return await responseToToolResponse(response);
      } catch (error) {
        if (error instanceof PaymentRequiredError) {
          return await responseToToolResponse(error.response);
        }
        throw error;
      }
    }

    if (!legacyTool) {
      throw new Error(`Tool "${options.name}" cannot handle MCP invocation`);
    }

    return await Promise.resolve(legacyTool(validated));
  };
}

function resolveDefaultMethod(options: CreateMcpAdapterOptions): HttpMethod {
  const explicit = options.defaultMethod?.toUpperCase();
  if (explicit && typeof options.httpHandlers[explicit] === "function") {
    return explicit as HttpMethod;
  }

  const preferredOrder: HttpMethod[] = ["POST", "PUT", "PATCH", "GET", "DELETE", "OPTIONS", "HEAD"];
  for (const method of preferredOrder) {
    if (typeof options.httpHandlers[method] === "function") {
      return method;
    }
  }

  if (options.legacyTool) {
    return "POST";
  }

  const available = Object.keys(options.httpHandlers).filter(
    (method) => typeof options.httpHandlers[method] === "function"
  );
  if (available.length > 0) {
    return available[0] as HttpMethod;
  }

  throw new Error(`No HTTP handlers available for tool "${options.name}"`);
}

function ensureSchema(schema: ZodSchema | undefined): ZodSchema | undefined {
  if (!schema) {
    return undefined;
  }

  if (schema instanceof z.ZodType) {
    return schema;
  }

  if (typeof (schema as any)?.parse === "function") {
    return schema;
  }

  throw new Error("MCP adapter requires a valid Zod schema to validate arguments");
}

function buildRequest(name: string, method: string, params: unknown): Request {
  const url = new URL(`https://opentool.local/${encodeURIComponent(name)}`);

  const headers = new Headers({
    "x-opentool-invocation": "mcp",
    "x-opentool-tool": name,
  });

  if (method === "GET" || method === "HEAD") {
    if (params && typeof params === "object") {
      Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
        if (value == null) {
          return;
        }
        url.searchParams.set(key, String(value));
      });
    }
    return new Request(url, { method, headers });
  }

  headers.set("Content-Type", "application/json");
  const init: RequestInit = { method, headers };
  if (params != null) {
    init.body = JSON.stringify(params);
  }
  return new Request(url, init);
}

export async function responseToToolResponse(response: Response): Promise<ToolResponse> {
  const statusIsError = response.status >= 400;
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (contentType.includes("application/json")) {
    try {
      const payload = text ? JSON.parse(text) : {};
      if (payload && typeof payload === "object" && Array.isArray(payload.content)) {
        return {
          content: payload.content,
          isError: payload.isError ?? statusIsError,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        isError: statusIsError,
      };
    } catch {
      return {
        content: [{ type: "text", text }],
        isError: statusIsError,
      };
    }
  }

  if (!text) {
    return {
      content: [],
      isError: statusIsError,
    };
  }

  return {
    content: [{ type: "text", text }],
    isError: statusIsError,
  };
}

export type { ToolResponse };

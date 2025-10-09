import { z } from "zod";
import type { ToolMetadataOverrides } from "./metadata";
import type { DefinedPayment } from "../payment/index";

export interface ToolContent {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface ToolResponse {
  content: ToolContent[];
  isError?: boolean;
}

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

export interface HttpHandlerDefinition {
  method: HttpMethod;
  handler: (request: Request) => Promise<Response> | Response;
}

export interface McpConfig {
  enabled: boolean;
  mode?: "stdio" | "lambda" | "dual";
  defaultMethod?: string;
  metadataOverrides?: Partial<ToolMetadataOverrides>;
}

export interface InternalToolDefinition<
  TSchema extends z.ZodSchema | undefined = z.ZodSchema | undefined
> {
  filename: string;
  schema?: TSchema;
  inputSchema?: unknown;
  metadata: ToolMetadataOverrides | null;
  httpHandlers: HttpHandlerDefinition[];
  mcpConfig?: McpConfig | null;
  sourcePath?: string;
  handler?: (params: any) => Promise<ToolResponse>;
  payment?: DefinedPayment | null;
}

export interface ServerConfig {
  name: string;
  version: string;
  tools: InternalToolDefinition[];
}

export interface BuildConfig {
  toolsDir: string;
  outputDir: string;
  serverName?: string;
  serverVersion?: string;
}

export type { Tool, ToolMetadataOverrides, Metadata } from "./metadata";
export * from "./payment";

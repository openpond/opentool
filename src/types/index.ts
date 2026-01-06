import { z } from "zod";
import type { ToolMetadataOverrides } from "./metadata";
import type { X402Payment } from "../x402/index";

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

export type ScheduleType = "cron" | "rate";

export interface NormalizedSchedule {
  type: ScheduleType;
  expression: string;
  authoredEnabled?: boolean;
  notifyEmail?: boolean;
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
  payment?: X402Payment | null;
  schedule?: NormalizedSchedule | null;
  notifyEmail?: boolean;
  profileDescription?: string | null;
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

export type { Tool, ToolMetadataOverrides, Metadata, BuildMetadata, PaymentConfig } from "./metadata";

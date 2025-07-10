import { z } from "zod";
import { Tool } from "./metadata";

// Tool content response
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

// Internal tool definition for build process
export interface InternalToolDefinition<
  TSchema extends z.ZodSchema = z.ZodSchema
> {
  schema: TSchema;
  inputSchema: any; // JSON Schema representation of the Zod schema
  metadata: Partial<Tool> | null;
  handler: (params: z.infer<TSchema>) => Promise<ToolResponse>;
  filename: string; // Source filename (without extension) - source of truth for tool name
}

// MCP Server configuration
export interface ServerConfig {
  name: string;
  version: string;
  tools: InternalToolDefinition[];
}

// Lambda handler event types
export interface LambdaEvent {
  httpMethod: string;
  path: string;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded: boolean;
}

export interface LambdaContext {
  requestId: string;
  functionName: string;
  functionVersion: string;
  remainingTimeInMillis: number;
}

export interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

// Build configuration
export interface BuildConfig {
  toolsDir: string;
  outputDir: string;
  serverName?: string;
  serverVersion?: string;
}

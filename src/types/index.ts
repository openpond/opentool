import { z } from "zod";
import type { ToolMetadataOverrides } from "./metadata";

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
  inputSchema: unknown; // JSON Schema representation of the Zod schema
  metadata: ToolMetadataOverrides | null;
  handler: (params: z.infer<TSchema>) => Promise<ToolResponse>;
  filename: string; // Source filename (without extension) - source of truth for tool name
  sourcePath?: string; // Absolute path to the user-authored tool module
}

// MCP Server configuration
export interface ServerConfig {
  name: string;
  version: string;
  tools: InternalToolDefinition[];
}

// Build configuration
export interface BuildConfig {
  toolsDir: string;
  outputDir: string;
  serverName?: string;
  serverVersion?: string;
}

export type { Tool, ToolMetadataOverrides, Metadata } from "./metadata";

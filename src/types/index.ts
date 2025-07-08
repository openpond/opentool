import { z } from 'zod';

// MCP Tool Annotations (Model Context Protocol specification)
export interface McpAnnotations {
  /** Human-readable title for the tool */
  title?: string;
  /** Whether the tool only reads data (doesn't modify state) */
  readOnlyHint?: boolean;
  /** Whether the tool has destructive effects */
  destructiveHint?: boolean;
  /** Whether the tool is idempotent (same result for same input) */
  idempotentHint?: boolean;
  /** Whether the tool interacts with external systems */
  openWorldHint?: boolean;
}

// Tool metadata interface
export interface ToolMetadata {
  /** Tool name (must be unique) */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** MCP protocol annotations for tool behavior */
  annotations?: McpAnnotations;
}

// Partial metadata for when user doesn't provide complete metadata
export type PartialToolMetadata = {
  /** Tool name (optional - will be inferred from filename if not provided) */
  name?: string;
  /** Human-readable description (optional - will be generated if not provided) */
  description?: string;
  /** MCP protocol annotations for tool behavior */
  annotations?: McpAnnotations;
};

// Tool content response
export interface ToolContent {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface ToolResponse {
  content: ToolContent[];
  isError?: boolean;
}

// Tool definition interface
export interface ToolDefinition<TSchema extends z.ZodSchema = z.ZodSchema> {
  schema: TSchema;
  metadata: ToolMetadata | null;
  handler: (params: z.infer<TSchema>) => Promise<ToolResponse>;
  filename: string; // Source filename (without extension) - source of truth for tool name
}

// Tool definition with optional metadata (for user-defined tools)
export interface UserToolDefinition<TSchema extends z.ZodSchema = z.ZodSchema> {
  schema: TSchema;
  metadata?: PartialToolMetadata;
  handler: (params: z.infer<TSchema>) => Promise<string | ToolResponse>;
}

// MCP Server configuration
export interface ServerConfig {
  name: string;
  version: string;
  tools: ToolDefinition[];
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

// Helper function to create complete metadata from partial metadata
export function createToolMetadata(
  partial: PartialToolMetadata,
  toolFilename: string
): ToolMetadata {
  const toolName = partial.name || toolFilename.replace(/\.(ts|js)$/, '');
  
  return {
    name: toolName,
    description: partial.description || `${toolName} tool`,
    annotations: {
      title: partial.annotations?.title || toolName.charAt(0).toUpperCase() + toolName.slice(1),
      readOnlyHint: partial.annotations?.readOnlyHint ?? true,
      destructiveHint: partial.annotations?.destructiveHint ?? false,
      idempotentHint: partial.annotations?.idempotentHint ?? true,
      openWorldHint: partial.annotations?.openWorldHint ?? false,
      ...partial.annotations,
    },
  };
}


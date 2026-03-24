import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { I as InternalToolDefinition } from '../index-9Z3wo28l.js';
import 'zod';
import '../payment-BLm1ltur.js';

/**
 * Create local development server for MCP tooling.
 */
declare function createDevServer(tools: InternalToolDefinition[]): Server;
/**
 * Create stdio server for use with AWS Lambda MCP Adapter
 */
declare function createStdioServer(tools?: InternalToolDefinition[]): Promise<void>;
declare function resolveRuntimePath(value: string): string;

export { createDevServer, createStdioServer, resolveRuntimePath };

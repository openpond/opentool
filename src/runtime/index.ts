import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs';
import * as path from 'path';
import { InternalToolDefinition } from '../types';

// Legacy createLambdaHandler removed - now using AWS MCP Adapter approach
// See createStdioServer() function below for the new implementation

/**
 * Create local development server
 */
export function createDevServer(tools: InternalToolDefinition[]): Server {
  const server = new Server({
    name: 'opentool-dev',
    version: '1.0.0',
  }, {
    capabilities: {
      tools: {},
    },
  });

  // Register list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(tool => ({
      name: tool.metadata?.name || tool.filename,
      description: tool.metadata?.description || `${tool.filename} tool`,
      inputSchema: tool.schema,
    })),
  }));

  // Register call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find(t => {
      const toolName = t.metadata?.name || t.filename;
      return toolName === request.params.name;
    });
    if (!tool) {
      throw new Error(`Tool ${request.params.name} not found`);
    }

    try {
      const validatedParams = tool.schema.parse(request.params.arguments);
      const result = await tool.handler(validatedParams);
      return {
        content: result.content,
        isError: result.isError || false,
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error}` }],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Load tools from tools directory
 */
async function loadToolsFromDirectory(): Promise<InternalToolDefinition[]> {
  const tools: InternalToolDefinition[] = [];
  
  const toolsDir = path.join(process.cwd(), 'tools');
  if (!fs.existsSync(toolsDir)) {
    return tools;
  }

  const files = fs.readdirSync(toolsDir);
  for (const file of files) {
    if (file.endsWith('.js') || file.endsWith('.ts')) {
      const toolPath = path.join(toolsDir, file);
      try {
        const toolModule = require(toolPath);
        
        // Check for required exports (schema and TOOL function, metadata is optional)
        if (toolModule.TOOL && toolModule.schema) {
          const baseName = file.replace(/\.(ts|js)$/, '');
          const tool: InternalToolDefinition = {
            schema: toolModule.schema,
            inputSchema: { type: 'object' }, // Placeholder for runtime
            metadata: toolModule.metadata || null,
            filename: baseName,
            handler: async (params) => {
              const result = await toolModule.TOOL(params);
              // Handle both string and object returns
              if (typeof result === 'string') {
                return {
                  content: [{ type: 'text', text: result }],
                  isError: false,
                };
              }
              return result;
            }
          };
          tools.push(tool);
        }
      } catch (error) {
        console.warn(`Failed to load tool from ${file}: ${error}`);
      }
    }
  }

  return tools;
}

// Legacy HTTP handler removed - now using AWS MCP Adapter for Lambda deployment

/**
 * Create stdio server for use with AWS Lambda MCP Adapter
 */
export async function createStdioServer(tools?: InternalToolDefinition[]): Promise<void> {
  // Load tools if not provided
  const toolDefinitions = tools || await loadToolsFromDirectory();
  
  // Create MCP server
  const server = new Server({
    name: 'opentool-runtime',
    version: '1.0.0',
  }, {
    capabilities: {
      tools: {},
    },
  });

  // Register all tools at once
  const toolsList = toolDefinitions.map(tool => ({
    name: tool.metadata?.name || tool.filename,
    description: tool.metadata?.description || `${tool.filename} tool`,
    inputSchema: tool.schema,
  }));

  // Register list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolsList,
  }));

  // Register call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = toolDefinitions.find(t => {
      const toolName = t.metadata?.name || t.filename;
      return toolName === request.params.name;
    });
    
    if (!tool) {
      throw new Error(`Tool ${request.params.name} not found`);
    }

    try {
      const validatedParams = tool.schema.parse(request.params.arguments);
      const result = await tool.handler(validatedParams);
      return {
        content: result.content,
        isError: result.isError || false,
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error: ${error}` }],
        isError: true,
      };
    }
  });

  // Create stdio transport
  const transport = new StdioServerTransport();
  
  // Connect server to transport
  await server.connect(transport);
  
  console.error('MCP stdio server started');
}
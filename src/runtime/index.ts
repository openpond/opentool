import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ToolDefinition, LambdaEvent, LambdaResponse } from '../types';

/**
 * Create Lambda handler for OpenPond tools
 */
export function createLambdaHandler(tools?: ToolDefinition[]): (_event: LambdaEvent) => Promise<LambdaResponse> {
  return async (_event: LambdaEvent): Promise<LambdaResponse> => {
    try {
      // Load tools if not provided
      const toolDefinitions = tools || await loadToolsFromDirectory();
      
      // Handle MCP protocol over HTTP
      const server = new Server({
        name: 'opentool-runtime',
        version: '1.0.0',
      }, {
        capabilities: {
          tools: {},
        },
      });

      // Register tools
      toolDefinitions.forEach(tool => {
        const toolName = tool.metadata?.name || tool.filename;
        const toolDescription = tool.metadata?.description || `${tool.filename} tool`;
        
        server.setRequestHandler(ListToolsRequestSchema, async () => ({
          tools: [{
            name: toolName,
            description: toolDescription,
            inputSchema: tool.schema,
          }],
        }));

        server.setRequestHandler(CallToolRequestSchema, async (request) => {
          if (request.params.name === toolName) {
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
          }
          throw new Error(`Tool ${request.params.name} not found`);
        });
      });

      // Handle HTTP request
      const response = await handleHttpRequest(_event);
      
      return {
        statusCode: response.statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: response.body,
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Internal server error: ${error}` }),
      };
    }
  };
}

/**
 * Create local development server
 */
export function createDevServer(tools: ToolDefinition[]): Server {
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
async function loadToolsFromDirectory(): Promise<ToolDefinition[]> {
  const tools: ToolDefinition[] = [];
  const fs = require('fs');
  const path = require('path');
  
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
          const tool: ToolDefinition = {
            schema: toolModule.schema,
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

/**
 * Handle HTTP request for Lambda
 */
async function handleHttpRequest(event: LambdaEvent): Promise<{ statusCode: number; body: string }> {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, body: '' };
  }

  if (event.httpMethod === 'POST' && event.path === '/mcp') {
    try {
      const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body;
      const request = JSON.parse(body);
      
      // Process MCP request through server
      // This is a simplified implementation - in a real scenario you'd need proper MCP protocol handling
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, request }),
      };
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid request' }),
      };
    }
  }

  // Health check endpoint
  if (event.httpMethod === 'GET' && event.path === '/health') {
    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }),
    };
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' }),
  };
}
import * as fs from 'fs';
import * as path from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { InternalToolDefinition } from '../types';

export interface DevOptions {
  input: string;
  watch: boolean;
}

export async function devCommand(options: DevOptions): Promise<void> {
  console.log('🚀 Starting OpenTool MCP server...');
  
  const toolsDir = path.resolve(options.input);

  try {
    // Validate tools directory exists
    if (!fs.existsSync(toolsDir)) {
      throw new Error(`Tools directory not found: ${toolsDir}`);
    }

    // Load tools
    const tools = await loadTools(toolsDir);
    console.log(`📦 Loaded ${tools.length} tools:`);
    tools.forEach(tool => {
      const name = tool.metadata?.name || tool.filename;
      const desc = tool.metadata?.description || 'no description';
      console.log(`  ✓ ${name} - ${desc}`);
    });

    // Create MCP server
    const server = createMcpServer(tools);
    
    console.log(`\n🎉 MCP server running!`);
    console.log(`📡 Transport: stdio`);
    console.log(`📁 Tools directory: ${toolsDir}`);
    console.log(`\nTo test the server:`);
    console.log(`  echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/mcp-server.js`);
    console.log(`\nOr use an MCP client to connect via stdio`);
    console.log(`Press Ctrl+C to stop the server`);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down MCP server...');
      server.close();
      process.exit(0);
    });

    // Start stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
  } catch (error) {
    console.error('❌ MCP server failed:', error);
    process.exit(1);
  }
}

function createMcpServer(tools: InternalToolDefinition[]): Server {
  const server = new Server(
    {
      name: 'opentool-dev',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

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

async function loadTools(toolsDir: string): Promise<InternalToolDefinition[]> {
  const tools: InternalToolDefinition[] = [];
  const files = fs.readdirSync(toolsDir);

  for (const file of files) {
    if (file.endsWith('.ts') || file.endsWith('.js')) {
      const toolPath = path.join(toolsDir, file);
      try {
        // Clear require cache for hot reloading
        delete require.cache[require.resolve(toolPath)];
        
        const toolModule = require(toolPath);
        // Check for required exports (schema and TOOL function, metadata is optional)
        if (toolModule.TOOL && toolModule.schema) {
          const baseName = file.replace(/\.(ts|js)$/, '');
          const tool: InternalToolDefinition = {
            schema: toolModule.schema,
            inputSchema: { type: 'object' }, // Placeholder for dev mode
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
        } else {
          console.warn(`  ⚠ ${file} - Invalid tool format. Must export: schema and TOOL function (metadata is optional)`);
        }
      } catch (error) {
        console.warn(`  ❌ ${file} - Failed to load: ${error}`);
      }
    }
  }

  return tools;
}
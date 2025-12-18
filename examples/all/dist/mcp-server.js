#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const metadata = require('./metadata.json');
const { createMcpAdapter, HTTP_METHODS } = require('opentool/dist/adapters/mcp.js');

const tool0 = require('./tools/ai-code-suggestion.js');
const tool1 = require('./tools/ai-research.js');
const tool2 = require('./tools/ai-streaming-outline.js');
const tool3 = require('./tools/ai-summarize.js');
const tool4 = require('./tools/calculate.js');
const tool5 = require('./tools/hello.js');
const tool6 = require('./tools/mcp-ping.js');
const tool7 = require('./tools/premium-report.js');
const tool8 = require('./tools/wallet-inspector.js');

const toolRegistry = [
  { meta: metadata.tools[0], module: tool0, config: {"enabled":false,"defaultMethod":null,"httpMethods":["POST"],"filename":"ai-code-suggestion"} },
  { meta: metadata.tools[1], module: tool1, config: {"enabled":false,"defaultMethod":null,"httpMethods":["POST"],"filename":"ai-research"} },
  { meta: metadata.tools[2], module: tool2, config: {"enabled":false,"defaultMethod":null,"httpMethods":["POST"],"filename":"ai-streaming-outline"} },
  { meta: metadata.tools[3], module: tool3, config: {"enabled":false,"defaultMethod":null,"httpMethods":["POST"],"filename":"ai-summarize"} },
  { meta: metadata.tools[4], module: tool4, config: {"enabled":false,"defaultMethod":null,"httpMethods":["POST"],"filename":"calculate"} },
  { meta: metadata.tools[5], module: tool5, config: {"enabled":false,"defaultMethod":null,"httpMethods":["POST"],"filename":"hello"} },
  { meta: metadata.tools[6], module: tool6, config: {"enabled":true,"defaultMethod":null,"httpMethods":["POST"],"filename":"mcp-ping"} },
  { meta: metadata.tools[7], module: tool7, config: {"enabled":true,"defaultMethod":null,"httpMethods":["POST"],"filename":"premium-report"} },
  { meta: metadata.tools[8], module: tool8, config: {"enabled":false,"defaultMethod":null,"httpMethods":["POST"],"filename":"wallet-inspector"} }
];

const adapters = toolRegistry.map((entry) => {
  if (!entry.config.enabled) {
    return null;
  }

  const httpHandlers = Object.fromEntries(
    HTTP_METHODS
      .map((method) => [method, entry.module[method]])
      .filter(([, handler]) => typeof handler === 'function')
  );

  return {
    meta: entry.meta,
    invoke: createMcpAdapter({
      name: entry.meta.name,
      schema: entry.module.schema,
      httpHandlers,
      defaultMethod: entry.config.defaultMethod || undefined,
    }),
  };
});

const server = new Server(
  {
    name: 'opentool-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: adapters
    .filter((entry) => entry !== null)
    .map((entry) => entry.meta),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const adapter = adapters.find((entry) => entry && entry.meta.name === request.params.name);
  if (!adapter) {
    throw new Error('Tool ' + request.params.name + ' is not registered for MCP');
  }

  try {
    return await adapter.invoke(request.params.arguments);
  } catch (error) {
    const message = (error && error.message) || String(error);
    return {
      content: [{ type: 'text', text: 'Error: ' + message }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { server };

import * as fs from "fs";
import * as path from "path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { InternalToolDefinition } from "../types";
import { loadAndValidateTools } from "./validate";

export interface DevOptions {
  input: string;
  watch: boolean;
}

export async function devCommand(options: DevOptions): Promise<void> {
  console.log("🚀 Starting OpenTool MCP server...");

  try {
    const toolsDir = path.resolve(options.input);
    if (!fs.existsSync(toolsDir)) {
      throw new Error(`Tools directory not found: ${toolsDir}`);
    }

    const projectRoot = path.dirname(toolsDir);
    const tools = await loadAndValidateTools(toolsDir, { projectRoot });
    if (tools.length === 0) {
      throw new Error("No tools found in the target directory");
    }

    console.log(`📦 Loaded ${tools.length} tools:`);
    tools.forEach((tool) => {
      const name = tool.metadata?.name ?? tool.filename;
      const desc = tool.metadata?.description ?? "no description";
      console.log(`  • ${name} — ${desc}`);
    });

    const server = createMcpServer(tools);
    console.log("\n🎉 MCP server running!");
    console.log(`📁 Tools directory: ${toolsDir}`);
    console.log("📡 Transport: stdio");
    console.log("Press Ctrl+C to stop the server\n");

    process.on("SIGINT", () => {
      console.log("\n🛑 Shutting down MCP server...");
      server.close();
      process.exit(0);
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);
  } catch (error) {
    console.error("❌ MCP server failed:", error);
    process.exit(1);
  }
}

function createMcpServer(tools: InternalToolDefinition[]): Server {
  const server = new Server(
    {
      name: "opentool-dev",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((tool) => ({
      name: tool.metadata?.name ?? tool.filename,
      description: tool.metadata?.description ?? `${tool.filename} tool`,
      inputSchema: tool.inputSchema,
      annotations: tool.metadata?.annotations,
      payment: tool.metadata?.payment,
      discovery: tool.metadata?.discovery,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((entry) => {
      const toolName = entry.metadata?.name ?? entry.filename;
      return toolName === request.params.name;
    });

    if (!tool) {
      throw new Error(`Tool ${request.params.name} not found`);
    }

    try {
      const validatedParams = (tool.schema as any).parse(request.params.arguments);
      const result = await tool.handler(validatedParams);
      return {
        content: result.content,
        isError: result.isError ?? false,
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error}` }],
        isError: true,
      };
    }
  });

  return server;
}

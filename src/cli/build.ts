import * as fs from "fs";
import * as path from "path";
import { InternalToolDefinition } from "../types/index";
import { Metadata } from "../types/metadata";
import { transpileWithEsbuild } from "../utils/esbuild";
import { buildMetadataArtifact } from "./shared/metadata";
import { loadAndValidateTools } from "./validate";

export interface BuildOptions {
  input: string;
  output: string;
  name?: string;
  version?: string;
}

interface BuildArtifacts {
  metadata: Metadata;
  defaultsApplied: string[];
  tools: InternalToolDefinition[];
  compiledTools: CompiledToolArtifact[];
}

interface CompiledToolArtifact {
  name: string;
  filename: string;
  modulePath: string;
  httpMethods: string[];
  mcpEnabled: boolean;
  defaultMcpMethod?: string;
  hasWallet: boolean;
}

export async function buildCommand(options: BuildOptions): Promise<void> {
  const start = timestamp();
  console.log(`[${start}] Building OpenTool project...`);

  try {
    const artifacts = await buildProject(options);
    logBuildSummary(artifacts, options);
  } catch (error) {
    const end = timestamp();
    console.error(`[${end}] Build failed:`, error);
    process.exit(1);
  }
}

export async function buildProject(options: BuildOptions): Promise<BuildArtifacts> {
  const toolsDir = path.resolve(options.input);
  if (!fs.existsSync(toolsDir)) {
    throw new Error(`Tools directory not found: ${toolsDir}`);
  }

  const projectRoot = path.dirname(toolsDir);
  const outputDir = path.resolve(options.output);
  fs.mkdirSync(outputDir, { recursive: true });

  const serverName = options.name ?? "opentool-server";
  const serverVersion = options.version ?? "1.0.0";

  const tools = await loadAndValidateTools(toolsDir, { projectRoot });
  if (tools.length === 0) {
    throw new Error("No valid tools found - build aborted");
  }

  const { metadata, defaultsApplied } = await buildMetadataArtifact({
    projectRoot,
    tools,
  });

  const metadataPath = path.join(outputDir, "metadata.json");
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  const compiledTools = await emitTools(tools, {
    projectRoot,
    outputDir,
  });

  const shouldBuildMcpServer = compiledTools.some((artifact) => artifact.mcpEnabled);

  if (shouldBuildMcpServer) {
    await writeMcpServer({
      outputDir,
      serverName,
      serverVersion,
      metadata,
      compiledTools,
      tools,
    });
  } else {
    const serverPath = path.join(outputDir, "mcp-server.js");
    if (fs.existsSync(serverPath)) {
      fs.rmSync(serverPath);
    }
  }

  return {
    metadata,
    defaultsApplied,
    tools,
    compiledTools,
  };
}

interface EmitToolsConfig {
  projectRoot: string;
  outputDir: string;
}

async function emitTools(
  tools: InternalToolDefinition[],
  config: EmitToolsConfig
): Promise<CompiledToolArtifact[]> {
  const toolsOutDir = path.join(config.outputDir, "tools");
  if (fs.existsSync(toolsOutDir)) {
    fs.rmSync(toolsOutDir, { recursive: true, force: true });
  }
  fs.mkdirSync(toolsOutDir, { recursive: true });

  const entryPoints = tools.map((tool) => {
    if (!tool.sourcePath) {
      throw new Error(`Missing sourcePath for tool ${tool.filename}`);
    }
    return tool.sourcePath;
  });

  await transpileWithEsbuild({
    entryPoints,
    projectRoot: config.projectRoot,
    format: "cjs",
    outDir: toolsOutDir,
    bundle: true,
  });

  const compiled: CompiledToolArtifact[] = tools.map((tool) => {
    if (!tool.sourcePath) {
      throw new Error(`Missing sourcePath for tool ${tool.filename}`);
    }

    const base = path.basename(tool.sourcePath).replace(/\.[^.]+$/, "");
    const modulePath = path.join("tools", `${base}.js`);

    if (!fs.existsSync(path.join(config.outputDir, modulePath))) {
      throw new Error(`Expected compiled output missing: ${modulePath}`);
    }

    const defaultMcpMethod = tool.mcpConfig?.defaultMethod;
    return {
      name: tool.metadata?.name ?? tool.filename,
      filename: base,
      modulePath,
      httpMethods: tool.httpHandlers.map((handler) => handler.method),
      mcpEnabled: tool.mcpConfig?.enabled ?? false,
      ...(defaultMcpMethod ? { defaultMcpMethod } : {}),
      hasWallet: Boolean(tool.payment),
    };
  });

  return compiled;
}

interface ServerOptions {
  outputDir: string;
  serverName: string;
  serverVersion: string;
  metadata: Metadata;
  compiledTools: CompiledToolArtifact[];
  tools: InternalToolDefinition[];
}

function renderMcpServer(options: ServerOptions): string {
  const toolImports = options.compiledTools
    .map((tool, index) => `const tool${index} = require('./${tool.modulePath}');`)
    .join("\n");

  const registry = options.compiledTools
    .map((artifact, index) => {
      const config = {
        enabled: artifact.mcpEnabled,
        defaultMethod: artifact.defaultMcpMethod ?? null,
        httpMethods: artifact.httpMethods,
        filename: artifact.filename,
      };
      return `  { meta: metadata.tools[${index}], module: tool${index}, config: ${JSON.stringify(config)} }`;
    })
    .join(",\n");

  return `#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const metadata = require('./metadata.json');
const { createMcpAdapter, HTTP_METHODS } = require('opentool/dist/adapters/mcp.js');

${toolImports}

const toolRegistry = [
${registry}
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
    name: '${escapeForJs(options.serverName)}',
    version: '${escapeForJs(options.serverVersion)}',
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
`;
}

async function writeMcpServer(options: ServerOptions): Promise<void> {
  const serverCode = renderMcpServer(options);
  const serverPath = path.join(options.outputDir, 'mcp-server.js');
  fs.writeFileSync(serverPath, serverCode);
  fs.chmodSync(serverPath, 0o755);
}

function logBuildSummary(artifacts: BuildArtifacts, options: BuildOptions): void {
  const end = timestamp();
  console.log(`[${end}] Build completed successfully!`);
  console.log(`Output directory: ${path.resolve(options.output)}`);
  console.log("Generated files:");
  const hasMcp = artifacts.compiledTools.some((tool) => tool.mcpEnabled);
  if (hasMcp) {
    console.log("  • mcp-server.js (stdio server)");
  }
  console.log(`  • tools/ (${artifacts.compiledTools.length} compiled tools)`);
  artifacts.compiledTools.forEach((tool) => {
    const methods = tool.httpMethods.join(", ");
    const walletBadge = tool.hasWallet ? " [wallet]" : "";
    console.log(`     - ${tool.name} [${methods}]${walletBadge}`);
  });
  console.log("  • metadata.json (registry artifact)");
  if (artifacts.defaultsApplied.length > 0) {
    console.log("\nDefaults applied during metadata synthesis:");
    artifacts.defaultsApplied.forEach((entry) => console.log(`  • ${entry}`));
  }

  if (!hasMcp) {
    console.log("\nℹ️ MCP adapter skipped (no tools opted in)");
  }
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function escapeForJs(value: string): string {
  return value.replace(/'/g, "\\'");
}

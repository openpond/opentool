import * as fs from "fs";
import * as path from "path";
import { InternalToolDefinition } from "../types";
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

  await writeServer({
    outputDir,
    serverName,
    serverVersion,
    metadata,
    compiledTools,
  });

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

    return {
      name: tool.metadata?.name ?? tool.filename,
      filename: base,
      modulePath,
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
}

function renderServer(options: ServerOptions): string {
  const toolImports = options.compiledTools
    .map((tool, index) => `const tool${index} = require('./${tool.modulePath}');`)
    .join("\n");

  const registry = options.compiledTools
    .map((_, index) => `  { meta: metadata.tools[${index}], module: tool${index} },`)
    .join("\n");

  return `#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const metadata = require('./metadata.json');

${toolImports}

const toolRegistry = [
${registry}
];

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
  tools: toolRegistry.map(({ meta }) => meta),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const entry = toolRegistry.find(({ meta }) => meta.name === request.params.name);
  if (!entry) {
    throw new Error('Tool ' + request.params.name + ' not found');
  }

  try {
    const validated = entry.module.schema.parse(request.params.arguments);
    const result = await entry.module.TOOL(validated);
    if (typeof result === 'string') {
      return { content: [{ type: 'text', text: result }], isError: false };
    }
    return { content: result.content, isError: result.isError || false };
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

async function writeServer(options: ServerOptions): Promise<void> {
  const serverCode = renderServer(options);
  const serverPath = path.join(options.outputDir, "mcp-server.js");
  fs.writeFileSync(serverPath, serverCode);
  fs.chmodSync(serverPath, 0o755);
}

function logBuildSummary(artifacts: BuildArtifacts, options: BuildOptions): void {
  const end = timestamp();
  console.log(`[${end}] Build completed successfully!`);
  console.log(`Output directory: ${path.resolve(options.output)}`);
  console.log("Generated files:");
  console.log("  • mcp-server.js (stdio server)");
  console.log(`  • tools/ (${artifacts.compiledTools.length} compiled tools)`);
  console.log("  • metadata.json (registry artifact)");
  if (artifacts.defaultsApplied.length > 0) {
    console.log("\nDefaults applied during metadata synthesis:");
    artifacts.defaultsApplied.forEach((entry) => console.log(`  • ${entry}`));
  }
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function escapeForJs(value: string): string {
  return value.replace(/'/g, "\\'");
}

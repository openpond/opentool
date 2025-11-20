import * as fs from "fs";
import * as path from "path";
import { InternalToolDefinition, ScheduleType } from "../types/index";
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
  workflowBundles: WorkflowBundleArtifact | null;
  cronManifestPath: string | null;
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

interface WorkflowBundleArtifact {
  sourceDir: string;
  outputDir: string;
  stepsBundlePath: string;
  workflowsBundlePath: string;
  webhookBundlePath: string;
  clientBundlePath?: string;
  manifestPath?: string;
}

interface CronManifestEntry {
  toolName: string;
  description?: string;
  scheduleType: ScheduleType;
  scheduleExpression: string;
  enabledDefault: boolean;
  authoredEnabled?: boolean;
  payload: {
    toolPath: string;
    httpMethod: "GET";
  };
}

interface CronManifest {
  version: number;
  generatedAt: string;
  entries: CronManifestEntry[];
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

  const cronManifestPath = await writeCronManifest({
    tools,
    compiledTools,
    outputDir,
  });

  const workflowBundles = await buildWorkflowsIfPresent({
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
    workflowBundles,
    cronManifestPath,
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

function writeCronManifest(options: {
  tools: InternalToolDefinition[];
  compiledTools: CompiledToolArtifact[];
  outputDir: string;
}): string | null {
  const scheduledTools = options.tools.filter((tool) => tool.schedule?.expression);
  const manifestDir = path.join(options.outputDir, ".well-known", "opentool");
  const manifestPath = path.join(manifestDir, "cron.json");

  if (scheduledTools.length === 0) {
    if (fs.existsSync(manifestPath)) {
      fs.rmSync(manifestPath);
    }
    return null;
  }

  const entries: CronManifestEntry[] = scheduledTools.map((tool) => {
    const schedule = tool.schedule;
    if (!schedule) {
      throw new Error(`Internal error: missing schedule for tool ${tool.filename}`);
    }

    const compiled = options.compiledTools.find(
      (artifact) => artifact.filename === tool.filename
    );
    if (!compiled) {
      throw new Error(`Internal error: missing compiled artifact for ${tool.filename}`);
    }

    const toolName = tool.metadata?.name ?? tool.filename;
    const description = tool.metadata?.description ?? tool.profileDescription ?? undefined;
    const payloadPath = compiled.modulePath.replace(/\\/g, "/");

    const entry: CronManifestEntry = {
      toolName,
      scheduleType: schedule.type,
      scheduleExpression: schedule.expression,
      enabledDefault: false,
      ...(schedule.authoredEnabled !== undefined
        ? { authoredEnabled: schedule.authoredEnabled }
        : {}),
      payload: {
        toolPath: payloadPath,
        httpMethod: "GET",
      },
    };

    if (description !== undefined) {
      entry.description = description;
    }

    return entry;
  });

  const manifest: CronManifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    entries,
  };

  fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  return manifestPath;
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
  if (artifacts.cronManifestPath) {
    console.log("  • .well-known/opentool/cron.json (cron manifest)");
  }
  if (artifacts.workflowBundles) {
    console.log("  • .well-known/workflow/v1/ (workflow bundles)");
    console.log("     - flow.js");
    console.log("     - step.js");
    console.log("     - webhook.js");
    if (artifacts.workflowBundles.clientBundlePath) {
      console.log("     - client.js");
    }
    if (artifacts.workflowBundles.manifestPath) {
      console.log("     - manifest.json");
    }
  }
  if (artifacts.defaultsApplied.length > 0) {
    console.log("\nDefaults applied during metadata synthesis:");
    artifacts.defaultsApplied.forEach((entry) => console.log(`  • ${entry}`));
  }

  if (!hasMcp) {
    console.log("\nℹ️ MCP adapter skipped (no tools opted in)");
  }
}

interface WorkflowBuildOptions {
  projectRoot: string;
  outputDir: string;
  workflowsDir?: string;
}

async function buildWorkflowsIfPresent(
  options: WorkflowBuildOptions
): Promise<WorkflowBundleArtifact | null> {
  const workflowsDir =
    options.workflowsDir ?? path.join(options.projectRoot, "workflows");

  if (!fs.existsSync(workflowsDir)) {
    return null;
  }

  if (!hasWorkflowSourceFiles(workflowsDir)) {
    return null;
  }

  const nodeVersion = process.versions?.node ?? "0.0.0";
  const nodeMajor = Number(nodeVersion.split(".")[0] ?? 0);

  if (!Number.isFinite(nodeMajor) || nodeMajor < 22) {
    console.warn(
      `[${timestamp()}] Workflow bundles skipped (requires Node >= 22, current ${nodeVersion})`
    );
    return null;
  }

  type WorkflowBaseBuilderCtor = new (config: any) => {
    config: any;
    getInputFiles(): Promise<string[]>;
    getTsConfigOptions(): Promise<{
      baseUrl?: string;
      paths?: Record<string, string[]>;
    }>;
    createStepsBundle(options: any): Promise<void>;
    createWorkflowsBundle(options: any): Promise<void>;
    createWebhookBundle(options: any): Promise<void>;
  };

  let BaseBuilder: WorkflowBaseBuilderCtor;
  try {
    ({ BaseBuilder } = (await import(
      "@workflow/cli/dist/lib/builders/base-builder.js"
    )) as { BaseBuilder: WorkflowBaseBuilderCtor });
  } catch (error) {
    const details =
      error instanceof Error ? `\nReason: ${error.message}` : "";
    throw new Error(
      `[${timestamp()}] Workflow sources detected, but optional dependency ` +
        "'@workflow/cli' is not installed. Install it with \"npm install " +
        "@workflow/cli\" (or add it to devDependencies) and rerun the build." +
        details
    );
  }

  class OpenToolWorkflowBuilder extends BaseBuilder {
    constructor(config: ConstructorParameters<WorkflowBaseBuilderCtor>[0]) {
      super(config);
    }

    async build(): Promise<void> {
      const inputFiles = await this.getInputFiles();
      const tsConfig = await this.getTsConfigOptions();
      const shared: {
        inputFiles: string[];
        tsBaseUrl?: string;
        tsPaths?: Record<string, string[]>;
      } = {
        inputFiles,
        ...(tsConfig.baseUrl ? { tsBaseUrl: tsConfig.baseUrl } : {}),
        ...(tsConfig.paths ? { tsPaths: tsConfig.paths } : {}),
      };

      await this.buildStepsBundle(shared);
      await this.buildWorkflowsBundle(shared);
      await this.buildWebhookRoute();
      await this.buildClientLibrary();
    }

    private async buildStepsBundle(
      options: {
        inputFiles: string[];
        tsBaseUrl?: string;
        tsPaths?: Record<string, string[]>;
      }
    ): Promise<void> {
      console.log(
        "Creating OpenTool workflow steps bundle at",
        this.config.stepsBundlePath
      );
      const stepsBundlePath = path.resolve(
        this.config.workingDir,
        this.config.stepsBundlePath
      );
      await fs.promises.mkdir(path.dirname(stepsBundlePath), { recursive: true });
      await this.createStepsBundle({
        outfile: stepsBundlePath,
        ...options,
      });
    }

    private async buildWorkflowsBundle(
      options: {
        inputFiles: string[];
        tsBaseUrl?: string;
        tsPaths?: Record<string, string[]>;
      }
    ): Promise<void> {
      console.log(
        "Creating OpenTool workflow bundle at",
        this.config.workflowsBundlePath
      );
      const workflowBundlePath = path.resolve(
        this.config.workingDir,
        this.config.workflowsBundlePath
      );
      await fs.promises.mkdir(path.dirname(workflowBundlePath), {
        recursive: true,
      });
      await this.createWorkflowsBundle({
        outfile: workflowBundlePath,
        bundleFinalOutput: false,
        ...options,
      });
    }

    private async buildWebhookRoute(): Promise<void> {
      console.log(
        "Creating OpenTool workflow webhook bundle at",
        this.config.webhookBundlePath
      );
      const webhookBundlePath = path.resolve(
        this.config.workingDir,
        this.config.webhookBundlePath
      );
      await fs.promises.mkdir(path.dirname(webhookBundlePath), {
        recursive: true,
      });
      await this.createWebhookBundle({ outfile: webhookBundlePath });
    }

    private async buildClientLibrary(): Promise<void> {
      if (!this.config?.clientBundlePath) {
        return;
      }

      // Workflow CLI normally emits a client bundle for UI tooling. OpenTool
      // currently doesn't surface it, but we keep the hook to remain compatible
      // with future versions.
      const clientBundlePath = path.resolve(
        this.config.workingDir,
        this.config.clientBundlePath
      );
      await fs.promises.mkdir(path.dirname(clientBundlePath), {
        recursive: true,
      });
      await this.createWorkflowsBundle({
        outfile: clientBundlePath,
        bundleFinalOutput: true,
      });
    }
  }

  const relativeSourceDir = path.relative(options.projectRoot, workflowsDir) || ".";
  const outputBase = path.join(
    options.outputDir,
    ".well-known",
    "workflow",
    "v1"
  );

  const stepsBundlePath = path.join(outputBase, "step.js");
  const workflowsBundlePath = path.join(outputBase, "flow.js");
  const webhookBundlePath = path.join(outputBase, "webhook.js");
  const clientBundlePath: string | undefined = undefined;
  const manifestPath = path.join(outputBase, "manifest.json");

  const builder = new OpenToolWorkflowBuilder({
    workingDir: options.projectRoot,
    dirs: [relativeSourceDir],
    buildTarget: "standalone",
    stepsBundlePath,
    workflowsBundlePath,
    webhookBundlePath,
    ...(clientBundlePath ? { clientBundlePath } : {}),
    workflowManifestPath: manifestPath,
    externalPackages: [
      "workflow",
      "workflow/internal/builtins",
      "workflow/internal/private",
      "workflow/runtime",
      "workflow/api",
    ],
  });

  console.log(
    `[${timestamp()}] Building workflows from ${workflowsDir} -> ${outputBase}`
  );

  await builder.build();

  return {
    sourceDir: workflowsDir,
    outputDir: outputBase,
    stepsBundlePath,
    workflowsBundlePath,
    webhookBundlePath,
    ...(clientBundlePath ? { clientBundlePath } : {}),
    manifestPath,
  };
}

function hasWorkflowSourceFiles(directory: string): boolean {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (hasWorkflowSourceFiles(path.join(directory, entry.name))) {
        return true;
      }
      continue;
    }

    if (entry.isFile()) {
      const extension = path.extname(entry.name).toLowerCase();
      if (WORKFLOW_SOURCE_EXTENSIONS.has(extension)) {
        return true;
      }
    }
  }

  return false;
}

const WORKFLOW_SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
]);

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function escapeForJs(value: string): string {
  return value.replace(/'/g, "\\'");
}

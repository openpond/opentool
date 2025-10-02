import * as fs from "fs";
import * as path from "path";
import { ZodSchema } from "zod";
import { zodToJsonSchema, type JsonSchema7Type } from "zod-to-json-schema";
import { InternalToolDefinition } from "../types";
import { Metadata } from "../types/metadata";
import { transpileWithEsbuild } from "../utils/esbuild";
import { requireFresh, resolveCompiledPath } from "../utils/module-loader";
import { buildMetadataArtifact } from "./shared/metadata";

export interface ValidateOptions {
  input: string;
}

interface LoadToolsOptions {
  projectRoot?: string;
}

const SUPPORTED_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
];

export async function validateCommand(options: ValidateOptions): Promise<void> {
  console.log("🔍 Validating OpenTool metadata...");
  try {
    const toolsDir = path.resolve(options.input);
    if (!fs.existsSync(toolsDir)) {
      throw new Error(`Tools directory not found: ${toolsDir}`);
    }
    const projectRoot = path.dirname(toolsDir);
    const tools = await loadAndValidateTools(toolsDir, { projectRoot });
    if (tools.length === 0) {
      throw new Error("No valid tools found - metadata validation aborted");
    }

    const { metadata, defaultsApplied, sourceMetadataPath } = await buildMetadataArtifact({
      projectRoot,
      tools,
    });

    logMetadataSummary(metadata, defaultsApplied, sourceMetadataPath);
    console.log("\n✅ Metadata validation passed!\n");
  } catch (error) {
    console.error("❌ Metadata validation failed:", error);
    process.exit(1);
  }
}

export async function validateFullCommand(options: ValidateOptions): Promise<void> {
  console.log("🔍 Running full OpenTool validation...\n");
  try {
    const toolsDir = path.resolve(options.input);
    if (!fs.existsSync(toolsDir)) {
      throw new Error(`Tools directory not found: ${toolsDir}`);
    }
    const projectRoot = path.dirname(toolsDir);
    const tools = await loadAndValidateTools(toolsDir, { projectRoot });
    if (tools.length === 0) {
      throw new Error("No tools discovered in the target directory");
    }

    const names = tools.map((tool) => tool.metadata?.name ?? tool.filename);
    const duplicates = findDuplicates(names);
    if (duplicates.length > 0) {
      throw new Error(`Duplicate tool names found: ${duplicates.join(", ")}`);
    }

    const { metadata, defaultsApplied, sourceMetadataPath } = await buildMetadataArtifact({
      projectRoot,
      tools,
    });

    console.log(`📦 Tools loaded: ${tools.length}`);
    tools.forEach((tool) => {
      const toolName = tool.metadata?.name ?? tool.filename;
      const description = tool.metadata?.description ?? `${toolName} tool`;
      console.log(`  • ${toolName} — ${description}`);
    });

    logMetadataSummary(metadata, defaultsApplied, sourceMetadataPath);
    console.log("\n✅ Full validation completed successfully\n");
  } catch (error) {
    console.error("❌ Full validation failed:", error);
    process.exit(1);
  }
}

export async function loadAndValidateTools(
  toolsDir: string,
  options: LoadToolsOptions = {}
): Promise<InternalToolDefinition[]> {
  const files = fs
    .readdirSync(toolsDir)
    .filter((file) => SUPPORTED_EXTENSIONS.includes(path.extname(file)));

  if (files.length === 0) {
    return [];
  }

  const projectRoot = options.projectRoot ?? path.dirname(toolsDir);
  const tempDir = path.join(toolsDir, ".opentool-temp");
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  const entryPoints = files.map((file) => path.join(toolsDir, file));

  const { outDir, cleanup } = await transpileWithEsbuild({
    entryPoints,
    projectRoot,
    format: "cjs",
    outDir: tempDir,
  });
  renameTempOutputs(outDir, files, ".cjs");

  const tools: InternalToolDefinition[] = [];

  try {
    for (const file of files) {
      const compiledPath = resolveCompiledPath(outDir, file, ".cjs");
      if (!fs.existsSync(compiledPath)) {
        throw new Error(`Failed to compile ${file}`);
      }

      const moduleExports = requireFresh(compiledPath);
      const toolModule = extractToolModule(moduleExports, file);

      const schema: ZodSchema = toolModule.schema;
      const toolName = toolModule.metadata?.name ?? toolModule.metadata?.title ?? toBaseName(file);
      const inputSchema = toJsonSchema(toolName, schema);

      const handler = async (params: unknown) => {
        const result = await toolModule.TOOL(params);
        if (typeof result === "string") {
          return {
            content: [{ type: "text", text: result }],
            isError: false,
          };
        }
        return result;
      };

      const tool: InternalToolDefinition = {
        schema,
        inputSchema,
        metadata: toolModule.metadata ?? null,
        handler,
        filename: toBaseName(file),
        sourcePath: path.join(toolsDir, file),
      };

      tools.push(tool);
    }
  } finally {
    cleanup();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  return tools;
}

function extractToolModule(exportsObject: any, filename: string): any {
  const candidates = [exportsObject, exportsObject?.default];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && candidate.schema && candidate.TOOL) {
      return candidate;
    }
  }
  throw new Error(
    `${filename} must export both a Zod schema and a TOOL handler. Export with either named exports or a default object.`
  );
}

function toJsonSchema(name: string, schema: ZodSchema): JsonSchema7Type {
  try {
    return zodToJsonSchema(schema, {
      name: `${name}Schema`,
      target: "jsonSchema7",
      $refStrategy: "none",
    });
  } catch (error) {
    throw new Error(`Failed to convert Zod schema for ${name}: ${error}`);
  }
}

function toBaseName(file: string): string {
  return file.replace(/\.[^.]+$/, "");
}

function findDuplicates(values: string[]): string[] {
  const seen = new Map<string, number>();
  const duplicates = new Set<string>();
  values.forEach((value) => {
    const count = seen.get(value) ?? 0;
    seen.set(value, count + 1);
    if (count >= 1) {
      duplicates.add(value);
    }
  });
  return Array.from(duplicates.values());
}

function renameTempOutputs(outDir: string, files: string[], newExtension: string): void {
  for (const file of files) {
    const baseName = path.basename(file).replace(/\.[^.]+$/, "");
    const fromPath = path.join(outDir, `${baseName}.js`);
    if (!fs.existsSync(fromPath)) {
      continue;
    }
    const toPath = path.join(outDir, `${baseName}${newExtension}`);
    fs.renameSync(fromPath, toPath);
  }
}

function logMetadataSummary(
  metadata: Metadata,
  defaultsApplied: string[],
  sourceMetadataPath: string
): void {
  console.log(`📄 metadata loaded from ${sourceMetadataPath}`);
  console.log("\n📊 Metadata Summary:");
  console.log(`  • Name: ${metadata.name}`);
  console.log(`  • Display Name: ${metadata.displayName}`);
  console.log(`  • Version: ${metadata.version}`);
  console.log(`  • Category: ${metadata.category}`);
  console.log(`  • Tools: ${metadata.tools.length}`);
  console.log(`  • Spec Version: ${metadata.metadataSpecVersion}`);
  if (metadata.payment) {
    console.log(`  • Payment: $${metadata.payment.amountUSDC} USDC`);
  }
  if (defaultsApplied.length > 0) {
    console.log("\nDefaults applied during metadata synthesis:");
    defaultsApplied.forEach((entry) => console.log(`  • ${entry}`));
  }
}

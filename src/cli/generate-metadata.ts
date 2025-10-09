import * as fs from "fs";
import * as path from "path";
import { InternalToolDefinition } from "../types/index";
import { Metadata } from "../types/metadata";
import { buildMetadataArtifact } from "./shared/metadata";
import { loadAndValidateTools } from "./validate";

export interface GenerateMetadataOptions {
  input: string;
  output?: string;
}

export interface GenerateMetadataResult {
  metadata: Metadata;
  defaultsApplied: string[];
  tools: InternalToolDefinition[];
  outputPath: string;
}

export async function generateMetadataCommand(options: GenerateMetadataOptions): Promise<void> {
  const startTimestamp = timestamp();
  console.log(`[${startTimestamp}] Generating OpenTool metadata...`);

  try {
    const result = await generateMetadata(options);
    const endTimestamp = timestamp();
    console.log(`[${endTimestamp}] Metadata generation completed successfully!`);
    console.log(`Output file: ${result.outputPath}`);
    console.log(`Spec version: ${result.metadata.metadataSpecVersion}`);
    console.log(`Tools included: ${result.tools.length}`);
    if (result.defaultsApplied.length > 0) {
      console.log("Applied defaults:");
      for (const entry of result.defaultsApplied) {
        console.log(`  • ${entry}`);
      }
    }
  } catch (error) {
    const endTimestamp = timestamp();
    console.error(`[${endTimestamp}] Metadata generation failed:`, error);
    process.exit(1);
  }
}

export async function generateMetadata(options: GenerateMetadataOptions): Promise<GenerateMetadataResult> {
  const toolsDir = path.resolve(options.input);
  if (!fs.existsSync(toolsDir)) {
    throw new Error(`Tools directory not found: ${toolsDir}`);
  }

  const projectRoot = path.dirname(toolsDir);
  const tools = await loadAndValidateTools(toolsDir, { projectRoot });

  const { metadata, defaultsApplied } = await buildMetadataArtifact({
    projectRoot,
    tools,
  });

  const outputPath = options.output
    ? path.resolve(options.output)
    : path.join(projectRoot, "metadata.json");
  fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));

  return {
    metadata,
    defaultsApplied,
    tools,
    outputPath,
  };
}

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

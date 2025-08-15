import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";
import { zodToJsonSchema, type JsonSchema7Type } from "zod-to-json-schema";
import { InternalToolDefinition } from "../types";

const execAsync = promisify(exec);

export interface ValidateOptions {
  input: string;
}

export async function validateCommand(options: ValidateOptions): Promise<void> {
  console.log("🔍 Validating OpenTool metadata...");

  const toolsDir = path.resolve(options.input);
  const metadataPath = path.join(path.dirname(toolsDir), "metadata.ts");

  try {
    // Check if metadata.ts exists
    if (!fs.existsSync(metadataPath)) {
      throw new Error(`metadata.ts not found at: ${metadataPath}`);
    }

    console.log(`📄 Found metadata.ts`);

    // Read and validate metadata structure
    const metadataContent = fs.readFileSync(metadataPath, "utf-8");

    // Basic syntax validation
    if (!metadataContent.includes("export const metadata")) {
      throw new Error("metadata.ts must export a metadata constant");
    }

    // Try to compile and load metadata for validation
    const tempDir = path.join(path.dirname(metadataPath), ".opentool-temp");
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      // Copy metadata to temp directory
      fs.copyFileSync(metadataPath, path.join(tempDir, "metadata.ts"));

      // Compile metadata

      await execAsync(
        `npx tsc --target es2020 --module commonjs --esModuleInterop --skipLibCheck --moduleResolution node --outDir ${tempDir} ${path.join(
          tempDir,
          "metadata.ts"
        )}`
      );

      // Load compiled metadata
      const compiledMetadataPath = path.join(tempDir, "metadata.js");
      if (!fs.existsSync(compiledMetadataPath)) {
        throw new Error("Failed to compile metadata.ts");
      }

      delete require.cache[require.resolve(compiledMetadataPath)];
      const { metadata } = require(compiledMetadataPath);

      // Validate metadata structure
      console.log(`✅ Metadata compilation successful`);
      validateMetadataStructure(metadata);

      console.log(`\n📊 Metadata Summary:`);
      console.log(`  ✓ Name: ${metadata.name}`);
      console.log(`  ✓ Display Name: ${metadata.displayName || metadata.name}`);
      console.log(`  ✓ Description: ${metadata.description}`);
      console.log(`  ✓ Version: ${metadata.version}`);
      console.log(`  ✓ Category: ${metadata.category}`);

      if (metadata.payment) {
        console.log(`  ✓ Payment: $${metadata.payment.amountUSDC} USDC`);
      }

      if (metadata.keywords && metadata.keywords.length > 0) {
        console.log(`  ✓ Keywords: ${metadata.keywords.join(", ")}`);
      }

      console.log("\n✅ Metadata validation passed!");
    } finally {
      // Clean up temp directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    }
  } catch (error) {
    console.error("❌ Metadata validation failed:", error);
    process.exit(1);
  }
}

export async function validateFullCommand(
  options: ValidateOptions
): Promise<void> {
  console.log("🔍 Running full OpenTool validation...");

  const toolsDir = path.resolve(options.input);
  let hasErrors = false;

  try {
    // Validate tools directory exists
    if (!fs.existsSync(toolsDir)) {
      throw new Error(`Tools directory not found: ${toolsDir}`);
    }

    // Load and validate tools
    const tools = await loadAndValidateTools(toolsDir);

    if (tools.length === 0) {
      console.log("⚠️  No tools found in directory");
      return;
    }

    console.log(`\n📊 Validation Summary:`);
    console.log(`  ✓ ${tools.length} valid tools found`);

    // Check for duplicate tool names
    const names = tools.map((t) => t.metadata?.name || t.filename);
    const duplicates = names.filter(
      (name, index) => names.indexOf(name) !== index
    );
    if (duplicates.length > 0) {
      console.log(`  ❌ Duplicate tool names: ${duplicates.join(", ")}`);
      hasErrors = true;
    }

    // Validate each tool
    for (const tool of tools) {
      const name = tool.metadata?.name || tool.filename;
      const description = tool.metadata?.description || "no description";
      console.log(`\n🔧 Tool: ${name}`);
      console.log(`   Description: ${description}`);
      console.log(
        `   Schema: ${(tool.schema as any)._def?.typeName || "unknown"}`
      );

      // Check annotations
      if (tool.metadata?.annotations) {
        console.log(`   Annotations:`);
        Object.entries(tool.metadata.annotations).forEach(([key, value]) => {
          console.log(`     ${key}: ${value}`);
        });
      }
    }

    if (hasErrors) {
      console.log("\n❌ Full validation failed with errors");
      process.exit(1);
    } else {
      console.log("\n✅ All tools are valid!");
    }
  } catch (error) {
    console.error("❌ Full validation failed:", error);
    process.exit(1);
  }
}

export async function loadAndValidateTools(
  toolsDir: string
): Promise<InternalToolDefinition[]> {
  const tools: InternalToolDefinition[] = [];
  const files = fs.readdirSync(toolsDir);

  // First, compile any TypeScript files to a temp directory
  const tempDir = path.join(toolsDir, ".opentool-temp");
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Compile TypeScript files if any exist
    const tsFiles = files.filter((file) => file.endsWith(".ts"));
    if (tsFiles.length > 0) {
      console.log(
        `[${new Date()
          .toISOString()
          .replace("T", " ")
          .slice(0, 19)}] Compiling ${tsFiles.length} TypeScript files...`
      );

      // Copy all files to temp directory
      for (const file of files) {
        if (file.endsWith(".ts") || file.endsWith(".js")) {
          fs.copyFileSync(path.join(toolsDir, file), path.join(tempDir, file));
        }
      }

      // Compile TypeScript files
      try {
        await execAsync(
          `npx tsc --target es2020 --module commonjs --esModuleInterop --skipLibCheck --moduleResolution node --outDir ${tempDir} ${tsFiles
            .map((f) => path.join(tempDir, f))
            .join(" ")}`
        );
      } catch (tscError) {
        console.warn(
          "TypeScript compilation failed, trying with relaxed settings..."
        );
        // Fallback with more permissive settings
        await execAsync(
          `npx tsc --target es2020 --module commonjs --esModuleInterop --skipLibCheck --moduleResolution node --noImplicitAny false --strict false --outDir ${tempDir} ${tsFiles
            .map((f) => path.join(tempDir, f))
            .join(" ")}`
        );
      }
    }

    // Load tools from temp directory (compiled JS) or original directory (for JS files)
    for (const file of files) {
      if (file.endsWith(".ts") || file.endsWith(".js")) {
        try {
          let toolPath: string;
          let toolModule: any;

          if (file.endsWith(".ts")) {
            // Use compiled JavaScript version
            const jsFile = file.replace(".ts", ".js");
            toolPath = path.join(tempDir, jsFile);
            if (!fs.existsSync(toolPath)) {
              throw new Error("TypeScript compilation failed - no output file");
            }
          } else {
            // Use original JavaScript file
            toolPath = path.join(toolsDir, file);
          }

          // Clear require cache and load module
          delete require.cache[require.resolve(toolPath)];
          toolModule = require(toolPath);

          // Check for required exports (schema and TOOL function, metadata is optional)
          if (toolModule.TOOL && toolModule.schema) {
            let completeMetadata: any = null;
            const baseName = file.replace(/\.(ts|js)$/, "");

            // Use metadata directly if provided
            if (toolModule.metadata) {
              completeMetadata = toolModule.metadata;
            }

            // Convert Zod schema to JSON Schema format
            let inputSchema: JsonSchema7Type = { type: "object" };
            const toolName = completeMetadata?.name || baseName;

            try {
              inputSchema = zodToJsonSchema(toolModule.schema, {
                name: `${toolName}Schema`,
                target: "jsonSchema7",
                definitions: {},
              });
            } catch (error) {
              console.warn(
                `Failed to convert schema for tool ${toolName}:`,
                error
              );
              // Fallback to basic object schema
              inputSchema = { type: "object" };
            }

            const tool: InternalToolDefinition = {
              schema: toolModule.schema,
              inputSchema,
              metadata: completeMetadata,
              filename: baseName,
              handler: async (params) => {
                const result = await toolModule.TOOL(params);
                // Handle both string and object returns
                if (typeof result === "string") {
                  return {
                    content: [{ type: "text", text: result }],
                    isError: false,
                  };
                }
                return result;
              },
            };
            tools.push(tool);

            const displayName =
              completeMetadata?.name || file.replace(/\.(ts|js)$/, "");
            const toolDesc =
              completeMetadata?.description || `${displayName} tool`;
            console.log(`  ${displayName} - ${toolDesc}`);
          } else {
            console.warn(
              `  ${file} - Invalid tool format. Must export: schema and TOOL function (metadata is optional)`
            );
          }
        } catch (error) {
          console.warn(`  ${file} - Failed to load: ${error}`);
        }
      }
    }
  } finally {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  return tools;
}

function validateMetadataStructure(metadata: any): void {
  // Required fields
  if (!metadata.name || typeof metadata.name !== "string") {
    throw new Error("metadata.name is required and must be a string");
  }

  if (!metadata.description || typeof metadata.description !== "string") {
    throw new Error("metadata.description is required and must be a string");
  }

  if (!metadata.version) {
    throw new Error("metadata.version is required");
  }

  if (!metadata.category || typeof metadata.category !== "string") {
    throw new Error("metadata.category is required and must be a string");
  }

  // Optional but validated fields
  if (metadata.displayName && typeof metadata.displayName !== "string") {
    throw new Error("metadata.displayName must be a string if provided");
  }

  if (metadata.author && typeof metadata.author !== "string") {
    throw new Error("metadata.author must be a string if provided");
  }

  if (metadata.keywords && !Array.isArray(metadata.keywords)) {
    throw new Error("metadata.keywords must be an array if provided");
  }

  if (metadata.useCases && !Array.isArray(metadata.useCases)) {
    throw new Error("metadata.useCases must be an array if provided");
  }

  // Payment validation
  if (metadata.payment) {
    if (typeof metadata.payment !== "object") {
      throw new Error("metadata.payment must be an object if provided");
    }

    if (
      typeof metadata.payment.amountUSDC !== "number" ||
      metadata.payment.amountUSDC < 0
    ) {
      throw new Error(
        "metadata.payment.amountUSDC must be a non-negative number"
      );
    }

    if (
      metadata.payment.description &&
      typeof metadata.payment.description !== "string"
    ) {
      throw new Error(
        "metadata.payment.description must be a string if provided"
      );
    }
  }

  // Capabilities validation
  if (metadata.capabilities && !Array.isArray(metadata.capabilities)) {
    throw new Error("metadata.capabilities must be an array if provided");
  }

  console.log(`  ✅ All required fields present and valid`);
}

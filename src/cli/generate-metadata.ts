import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { InternalToolDefinition } from "../types";
import { Metadata, Tool } from "../types/metadata";
import { loadAndValidateTools } from "./validate";

const execAsync = promisify(exec);

export interface GenerateMetadataOptions {
  input: string;
  output?: string;
  name?: string;
  version?: string;
}

export async function generateMetadataCommand(options: GenerateMetadataOptions): Promise<void> {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${timestamp}] Generating OpenTool metadata...`);

  const toolsDir = path.resolve(options.input);
  const outputPath = options.output ? path.resolve(options.output) : path.join(process.cwd(), "metadata.json");

  try {
    // Validate tools directory exists
    if (!fs.existsSync(toolsDir)) {
      throw new Error(`Tools directory not found: ${toolsDir}`);
    }

    // Load and validate tools
    console.log(
      `[${new Date()
        .toISOString()
        .replace("T", " ")
        .slice(0, 19)}] 🔍 Validating tools...`
    );
    const tools = await loadAndValidateTools(toolsDir);

    if (tools.length === 0) {
      throw new Error("No valid tools found - metadata generation aborted");
    }

    console.log(
      `[${new Date().toISOString().replace("T", " ").slice(0, 19)}] ✅ Found ${
        tools.length
      } valid tools`
    );

    // Generate metadata JSON
    const metadata = await generateMetadata(tools, {
      toolsDir,
      serverName: options.name || "opentool-server",
      serverVersion: options.version || "1.0.0",
    });

    // Write metadata to output file
    fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));

    const endTimestamp = new Date()
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);
    console.log(`[${endTimestamp}] Metadata generation completed successfully!`);
    console.log(`Output file: ${outputPath}`);
    console.log(`Generated metadata for ${tools.length} tools`);
  } catch (error) {
    console.error(
      `[${new Date()
        .toISOString()
        .replace("T", " ")
        .slice(0, 19)}] Metadata generation failed:`,
      error
    );
    process.exit(1);
  }
}

// Helper function to read package.json for fallback values
function readPackageJson(projectRoot: string): any {
  try {
    const packagePath = path.join(projectRoot, "package.json");
    if (fs.existsSync(packagePath)) {
      const packageContent = fs.readFileSync(packagePath, "utf8");
      return JSON.parse(packageContent);
    }
  } catch (error) {
    console.warn("  Failed to read package.json:", error);
  }
  return {};
}

export async function generateMetadata(
  tools: InternalToolDefinition[],
  config: { toolsDir: string; serverName: string; serverVersion: string }
): Promise<Metadata> {
  console.log(
    `[${new Date()
      .toISOString()
      .replace("T", " ")
      .slice(0, 19)}] Generating metadata...`
  );

  const projectRoot = path.dirname(config.toolsDir);

  // Try to load metadata from metadata.ts (or fall back to discovery.ts for backwards compatibility)
  let rootMetadata: any = {};
  const metadataTsPath = path.join(projectRoot, "metadata.ts");
  const metadataJsPath = path.join(projectRoot, "metadata.js");
  const discoveryPath = path.join(projectRoot, "discovery.ts"); // backwards compatibility
  const discoveryJsPath = path.join(projectRoot, "discovery.js");

  // Check for metadata.ts first, then discovery.ts for backwards compatibility
  const metadataFilePath = fs.existsSync(metadataTsPath)
    ? metadataTsPath
    : fs.existsSync(discoveryPath)
    ? discoveryPath
    : null;
  const metadataJsFilePath = fs.existsSync(metadataJsPath)
    ? metadataJsPath
    : fs.existsSync(discoveryJsPath)
    ? discoveryJsPath
    : null;

  if (metadataFilePath) {
    try {
      // Use the same temp compilation approach as tools
      const tempDir = path.join(projectRoot, ".opentool-temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }


      // Copy metadata file to temp directory
      const tempFileName = path.basename(metadataFilePath);
      const tempFilePath = path.join(tempDir, tempFileName);
      fs.copyFileSync(metadataFilePath, tempFilePath);

      // Compile TypeScript file
      try {
        await execAsync(
          `npx tsc --target es2020 --module commonjs --esModuleInterop --skipLibCheck --moduleResolution node --outDir ${tempDir} ${tempFilePath}`
        );
      } catch (tscError) {
        console.warn(
          `TypeScript compilation failed for ${tempFileName}, trying with relaxed settings...`
        );
        await execAsync(
          `npx tsc --target es2020 --module commonjs --esModuleInterop --skipLibCheck --moduleResolution node --noImplicitAny false --strict false --outDir ${tempDir} ${tempFilePath}`
        );
      }

      // Load the compiled JS file
      const compiledFileName = tempFileName.replace(".ts", ".js");
      const compiledPath = path.join(tempDir, compiledFileName);
      if (fs.existsSync(compiledPath)) {
        delete require.cache[require.resolve(compiledPath)];
        const metadataModule = require(compiledPath);
        // Support both 'metadata' and 'discovery' exports for backwards compatibility
        rootMetadata =
          metadataModule.metadata || metadataModule.discovery || {};
        console.log(`  Loaded metadata from ${tempFileName}`);
      }

      // Clean up temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(
        `  Failed to load ${path.basename(metadataFilePath)}:`,
        error
      );
    }
  } else if (metadataJsFilePath) {
    try {
      // For JavaScript files, use require directly
      delete require.cache[require.resolve(metadataJsFilePath)];
      const metadataModule = require(metadataJsFilePath);
      // Support both 'metadata' and 'discovery' exports for backwards compatibility
      rootMetadata = metadataModule.metadata || metadataModule.discovery || {};
      console.log(
        `  Loaded metadata from ${path.basename(metadataJsFilePath)}`
      );
    } catch (error) {
      console.warn(
        `  Failed to load ${path.basename(metadataJsFilePath)}:`,
        error
      );
    }
  } else {
    console.log("  No metadata.ts found, using smart defaults");
  }

  // Read package.json for fallback values
  const packageInfo = readPackageJson(projectRoot);

  // Generate smart defaults from folder name and package.json
  const folderName = path.basename(projectRoot);
  const smartDefaults = {
    name: rootMetadata.name || packageInfo.name || folderName,
    displayName:
      rootMetadata.displayName ||
      (packageInfo.name
        ? packageInfo.name
            .split("-")
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        : folderName
            .split("-")
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")),
    version: rootMetadata.version || parseFloat(packageInfo.version || "1.0"),
    description:
      rootMetadata.description ||
      packageInfo.description ||
      `OpenTool agent built from ${folderName}`,
    author: rootMetadata.author || packageInfo.author || "Unknown",
    repository:
      rootMetadata.repository ||
      packageInfo.repository?.url ||
      packageInfo.repository ||
      "",
    website: rootMetadata.website || packageInfo.homepage || "",
    category:
      rootMetadata.category || rootMetadata.categories?.[0] || "utility",
    termsOfService:
      rootMetadata.termsOfService || "Please review terms before use.",
  };

  // Convert tools to metadata format
  const metadataTools: Tool[] = tools.map((tool) => {
    // Use tool metadata name, fallback to filename without extension
    const toolName =
      tool.metadata?.name || tool.filename.replace(/\.(ts|js)$/, "");
    const toolDescription = tool.metadata?.description || `${toolName} tool`;

    // Build metadata tool object
    const metadataTool: Tool = {
      name: toolName,
      description: toolDescription,
      inputSchema: tool.inputSchema,
    };

    // Add annotations if they exist
    if (tool.metadata?.annotations) {
      metadataTool.annotations = tool.metadata.annotations;
    }

    // Add payment config (tool-level overrides agent-level)
    if (tool.metadata?.payment) {
      metadataTool.payment = tool.metadata.payment;
    } else if (rootMetadata.payment) {
      // Use agent-level payment as default
      metadataTool.payment = rootMetadata.payment;
    }

    // Add discovery metadata if it exists
    if (tool.metadata?.discovery) {
      metadataTool.discovery = tool.metadata.discovery;
    }

    return metadataTool;
  });

  // Build complete metadata JSON with new structure
  const metadataJson: Metadata = {
    // Core fields using smart defaults
    name: smartDefaults.name,
    displayName: smartDefaults.displayName,
    version: smartDefaults.version,
    description: smartDefaults.description,
    author: smartDefaults.author,
    repository: smartDefaults.repository,
    website: smartDefaults.website,
    category: smartDefaults.category,
    termsOfService: smartDefaults.termsOfService,

    // Tools array (always populated by build process)
    tools: metadataTools,

    // UI Enhancement fields
    ...(rootMetadata.promptExamples && {
      promptExamples: rootMetadata.promptExamples,
    }),
    ...(rootMetadata.iconPath && { iconPath: rootMetadata.iconPath }),
    ...(rootMetadata.videoPath && { videoPath: rootMetadata.videoPath }),

    // Agent-level payment defaults (create from pricing if exists)
    ...(rootMetadata.pricing && {
      payment: {
        amountUSDC: rootMetadata.pricing.defaultAmount || 0.01,
        description: rootMetadata.pricing.description || "",
        x402: true,
        openpondDirect: true,
        acceptedMethods: ["ETH", "USDC"],
        chainIds: [8453], // Base
      },
    }),

    // Discovery section (only include if metadata has discovery fields)
    ...((rootMetadata.keywords ||
      rootMetadata.categories ||
      rootMetadata.useCases ||
      rootMetadata.capabilities ||
      rootMetadata.requirements ||
      rootMetadata.pricing ||
      rootMetadata.compatibility ||
      rootMetadata.discovery) && {
      discovery: {
        keywords: rootMetadata.keywords || [],
        category: rootMetadata.categories?.[0] || smartDefaults.category,
        useCases: rootMetadata.useCases || [],
        capabilities: rootMetadata.capabilities || [],
        requirements: rootMetadata.requirements || {},
        pricing: rootMetadata.pricing || {},
        compatibility: rootMetadata.compatibility || {},
        ...(rootMetadata.discovery || {}), // Include any nested discovery fields too
      },
    }),
  };

  console.log(`  Generated metadata with ${metadataTools.length} tools`);
  return metadataJson;
}
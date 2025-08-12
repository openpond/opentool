import * as fs from "fs";
import * as path from "path";
import { BuildConfig, InternalToolDefinition } from "../types";
import { Metadata, Tool } from "../types/metadata";
import { loadAndValidateTools } from "./validate";

// TypeScript compilation is handled directly in the build process

export interface BuildOptions {
  input: string;
  output: string;
  name?: string;
  version?: string;
}

export async function buildCommand(options: BuildOptions): Promise<void> {
  const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`[${timestamp}] Building OpenTool project...`);

  const config: BuildConfig = {
    toolsDir: path.resolve(options.input),
    outputDir: path.resolve(options.output),
    serverName: options.name || "opentool-server",
    serverVersion: options.version || "1.0.0",
  };

  try {
    // Validate tools directory exists
    if (!fs.existsSync(config.toolsDir)) {
      throw new Error(`Tools directory not found: ${config.toolsDir}`);
    }

    // Load and validate tools (validation integrated into build)
    console.log(
      `[${new Date()
        .toISOString()
        .replace("T", " ")
        .slice(0, 19)}] 🔍 Validating tools...`
    );
    const tools = await loadAndValidateTools(config.toolsDir);

    if (tools.length === 0) {
      throw new Error("No valid tools found - build aborted");
    }

    console.log(
      `[${new Date().toISOString().replace("T", " ").slice(0, 19)}] ✅ Found ${
        tools.length
      } valid tools`
    );

    // Create output directory
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }

    // Generate JavaScript MCP server
    await generateJavaScriptMcpServer(tools, config);

    // Copy and compile tools to output directory
    await copyAndCompileTools(config.toolsDir, config.outputDir, tools);

    // Generate metadata JSON
    await generateMetadataJson(tools, config);

    const endTimestamp = new Date()
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);
    console.log(`[${endTimestamp}] Build completed successfully!`);
    console.log(`Output directory: ${config.outputDir}`);
    console.log("Generated files:");
    console.log("  mcp-server.js - JavaScript MCP server");
    console.log(`  tools/ - ${tools.length} compiled JavaScript tool files`);
    console.log("  metadata.json - Metadata for on-chain registration");
    console.log("\\nTest your MCP server:");
    console.log(
      `  echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node ${config.outputDir}/mcp-server.js`
    );
  } catch (error) {
    console.error(
      `[${new Date()
        .toISOString()
        .replace("T", " ")
        .slice(0, 19)}] Build failed:`,
      error
    );
    process.exit(1);
  }
}

async function generateJavaScriptMcpServer(
  tools: InternalToolDefinition[],
  config: BuildConfig
): Promise<void> {
  // Generate JavaScript MCP server for stdio transport
  await generateJavaScriptMcpServerFile(tools, config);
}

async function generateJavaScriptMcpServerFile(
  tools: InternalToolDefinition[],
  config: BuildConfig
): Promise<void> {
  const mcpServerCode = `#!/usr/bin/env node
// Auto-generated JavaScript MCP server with stdio transport
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { zodToJsonSchema } = require('zod-to-json-schema');

// Import tools
${tools
  .map(
    (tool, index) =>
      `const tool${index} = require('./tools/${tool.filename}.js');`
  )
  .join("\n")}

const tools = [
${tools
  .map(
    (tool, index) => `  {
    schema: tool${index}.schema,
    metadata: tool${index}.metadata,
    handler: tool${index}.TOOL,
    filename: '${tool.filename}'
  },`
  )
  .join("\n")}
];

// Create MCP server
const server = new Server(
  {
    name: '${config.serverName}',
    version: '${config.serverVersion}',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register list tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((tool, index) => {
    // Convert Zod schema to JSON Schema format
    let inputSchema = { type: 'object' };
    const toolName = tool.metadata?.name || tool.filename;
    
    try {
      const fullSchema = zodToJsonSchema(tool.schema, {
        name: \`\${toolName}Schema\`,
        target: 'jsonSchema7',
        definitions: {}
      });
      
      // Extract the actual schema from definitions if it uses $ref
      if (fullSchema.$ref && fullSchema.definitions) {
        const refKey = fullSchema.$ref.replace('#/definitions/', '');
        inputSchema = fullSchema.definitions[refKey] || { type: 'object' };
      } else {
        inputSchema = fullSchema;
      }
    } catch (error) {
      console.warn(\`Failed to convert schema for tool \${toolName}:\`, error);
      inputSchema = { type: 'object' };
    }

    const toolDef = {
      name: toolName,
      description: tool.metadata?.description || \`Tool \${index}\`,
      inputSchema
    };

    // Add annotations if they exist
    if (tool.metadata?.annotations) {
      toolDef.annotations = tool.metadata.annotations;
    }

    return toolDef;
  }),
}));

// Register call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find(t => {
    const toolName = t.metadata?.name || t.filename;
    return toolName === request.params.name;
  });
  if (!tool) {
    throw new Error(\`Tool \${request.params.name} not found\`);
  }

  try {
    const validatedParams = tool.schema.parse(request.params.arguments);
    const result = await tool.handler(validatedParams);
    
    // Handle both string and object responses
    if (typeof result === 'string') {
      return {
        content: [{ type: 'text', text: result }],
        isError: false,
      };
    } else if (result && typeof result === 'object' && result.content) {
      return {
        content: result.content,
        isError: result.isError || false,
      };
    } else {
      return {
        content: [{ type: 'text', text: String(result) }],
        isError: false,
      };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: \`Error: \${error.message || error}\` }],
      isError: true,
    };
  }
});

// Start server with stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { server, tools };
`;

  const mcpServerPath = path.join(config.outputDir, "mcp-server.js");
  fs.writeFileSync(mcpServerPath, mcpServerCode);

  // Make executable
  fs.chmodSync(mcpServerPath, 0o755);
}

async function copyAndCompileTools(
  sourceDir: string,
  outputDir: string,
  _tools: InternalToolDefinition[]
): Promise<void> {
  const toolsOutputDir = path.join(outputDir, "tools");
  if (!fs.existsSync(toolsOutputDir)) {
    fs.mkdirSync(toolsOutputDir, { recursive: true });
  }

  // Use the same temp compilation approach as in loadTools
  const tempDir = path.join(sourceDir, ".opentool-temp");
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  const { exec } = require("child_process");
  const { promisify } = require("util");
  const execAsync = promisify(exec);

  try {
    const files = fs.readdirSync(sourceDir);
    const tsFiles = files.filter((file) => file.endsWith(".ts"));

    if (tsFiles.length > 0) {
      console.log(
        `  Compiling ${tsFiles.length} TypeScript files to JavaScript...`
      );

      // Copy all files to temp directory
      for (const file of files) {
        if (file.endsWith(".ts") || file.endsWith(".js")) {
          fs.copyFileSync(path.join(sourceDir, file), path.join(tempDir, file));
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
        await execAsync(
          `npx tsc --target es2020 --module commonjs --esModuleInterop --skipLibCheck --moduleResolution node --noImplicitAny false --strict false --outDir ${tempDir} ${tsFiles
            .map((f) => path.join(tempDir, f))
            .join(" ")}`
        );
      }
    }

    // Copy compiled JavaScript files to output
    for (const file of files) {
      if (file.endsWith(".ts")) {
        const jsFile = file.replace(".ts", ".js");
        const sourcePath = path.join(tempDir, jsFile);
        const outputPath = path.join(toolsOutputDir, jsFile);

        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, outputPath);
          console.log(`  Compiled and copied ${jsFile}`);
        }
      } else if (file.endsWith(".js")) {
        const sourcePath = path.join(sourceDir, file);
        const outputPath = path.join(toolsOutputDir, file);
        fs.copyFileSync(sourcePath, outputPath);
        console.log(`  Copied ${file}`);
      }
    }
  } finally {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
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

async function generateMetadataJson(
  tools: InternalToolDefinition[],
  config: BuildConfig
): Promise<void> {
  console.log(
    `[${new Date()
      .toISOString()
      .replace("T", " ")
      .slice(0, 19)}] Generating metadata JSON...`
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

      const { exec } = require("child_process");
      const { promisify } = require("util");
      const execAsync = promisify(exec);

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

  // Write metadata JSON to output directory
  const outputMetadataPath = path.join(config.outputDir, "metadata.json");
  fs.writeFileSync(outputMetadataPath, JSON.stringify(metadataJson, null, 2));

  console.log(`  Generated metadata.json with ${metadataTools.length} tools`);
}

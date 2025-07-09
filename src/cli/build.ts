import * as fs from "fs";
import * as path from "path";
import {
  BuildConfig,
  createToolMetadata,
  PartialToolMetadata,
  ToolDefinition,
} from "../types";

// TypeScript compilation is handled directly in the build process

export interface BuildOptions {
  input: string;
  output: string;
  name?: string;
  version?: string;
}

export async function buildCommand(options: BuildOptions): Promise<void> {
  console.log("🔨 Building OpenTool project...");

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

    // Load and validate tools
    const tools = await loadTools(config.toolsDir);
    console.log(`📦 Found ${tools.length} tools`);

    // Create output directory
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }

    // Generate server index
    await generateServerIndex(tools, config);

    // Copy tools to output directory
    await copyTools(config.toolsDir, config.outputDir, tools);

    console.log("✅ Build completed successfully!");
    console.log(`📁 Output directory: ${config.outputDir}`);
    console.log("📄 Generated files:");
    console.log("  📟 mcp-server.js - Stdio MCP server");
    console.log("  🔗 lambda-handler.js - AWS Lambda handler");
    console.log(`  📂 tools/ - ${tools.length} tool files`);
    console.log("\\n🧪 Test your MCP server:");
    console.log(
      `  echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node ${config.outputDir}/mcp-server.js`
    );
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

async function loadTools(toolsDir: string): Promise<ToolDefinition[]> {
  const tools: ToolDefinition[] = [];
  const files = fs.readdirSync(toolsDir);

  // First, compile any TypeScript files to a temp directory
  const tempDir = path.join(toolsDir, ".opentool-temp");
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  const { exec } = require("child_process");
  const { promisify } = require("util");
  const execAsync = promisify(exec);

  try {
    // Compile TypeScript files if any exist
    const tsFiles = files.filter(file => file.endsWith(".ts"));
    if (tsFiles.length > 0) {
      console.log(`📝 Compiling ${tsFiles.length} TypeScript files...`);
      
      // Copy all files to temp directory
      for (const file of files) {
        if (file.endsWith(".ts") || file.endsWith(".js")) {
          fs.copyFileSync(
            path.join(toolsDir, file),
            path.join(tempDir, file)
          );
        }
      }

      // Compile TypeScript files
      try {
        await execAsync(
          `npx tsc --target es2020 --module commonjs --esModuleInterop --skipLibCheck --moduleResolution node --outDir ${tempDir} ${tsFiles.map(f => path.join(tempDir, f)).join(' ')}`
        );
      } catch (tscError) {
        console.warn("TypeScript compilation failed, trying with relaxed settings...");
        // Fallback with more permissive settings
        await execAsync(
          `npx tsc --target es2020 --module commonjs --esModuleInterop --skipLibCheck --moduleResolution node --noImplicitAny false --strict false --outDir ${tempDir} ${tsFiles.map(f => path.join(tempDir, f)).join(' ')}`
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

            // Only create metadata if user provided some metadata
            if (toolModule.metadata) {
              const partialMetadata: PartialToolMetadata = toolModule.metadata;
              completeMetadata = createToolMetadata(partialMetadata, file);
            }

            const tool: ToolDefinition = {
              schema: toolModule.schema,
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

            const toolName =
              completeMetadata?.name || file.replace(/\.(ts|js)$/, "");
            const toolDesc = completeMetadata?.description || `${toolName} tool`;
            console.log(`  ✓ ${toolName} - ${toolDesc}`);
          } else {
            console.warn(
              `  ⚠ ${file} - Invalid tool format. Must export: schema and TOOL function (metadata is optional)`
            );
          }
        } catch (error) {
          console.warn(`  ❌ ${file} - Failed to load: ${error}`);
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

async function generateServerIndex(
  tools: ToolDefinition[],
  config: BuildConfig
): Promise<void> {
  // Generate MCP server for stdio transport
  await generateMcpServer(tools, config);

  // Generate Lambda handler with AWS adapter
  await generateLambdaHandler(config);
}

async function generateMcpServer(
  tools: ToolDefinition[],
  config: BuildConfig
): Promise<void> {
  const mcpServerCode = `#!/usr/bin/env node
// Auto-generated MCP server with stdio transport
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

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
    // Convert Zod schema to JSON Schema format using proper library
    let inputSchema = { type: 'object' };
    const toolName = tool.metadata?.name || tool.filename;
    
    try {
      const { zodToJsonSchema } = require('zod-to-json-schema');
      inputSchema = zodToJsonSchema(tool.schema, {
        name: \`\${toolName}Schema\`,
        target: 'jsonSchema7',
        definitions: {}
      });
    } catch (error) {
      console.warn(\`Failed to convert schema for tool \${toolName}:\`, error);
      // Fallback to basic object schema
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
      // Fallback for any other response type
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

async function generateLambdaHandler(config: BuildConfig): Promise<void> {
  const lambdaHandlerCode = `// Auto-generated AWS Lambda handler
// Uses AWS MCP adapter to run stdio MCP server

const serverParams = {
  command: 'node',
  args: ['mcp-server.js'],
};

exports.handler = async (event, context) => {
  // Dynamically import ES module into CommonJS Lambda function
  const { stdioServerAdapter } = await import(
    '@aws/run-mcp-servers-with-aws-lambda'
  );

  return await stdioServerAdapter(serverParams, event, context);
};
`;

  const lambdaHandlerPath = path.join(config.outputDir, "lambda-handler.js");
  fs.writeFileSync(lambdaHandlerPath, lambdaHandlerCode);
}

async function copyTools(
  sourceDir: string,
  outputDir: string,
  tools: ToolDefinition[]
): Promise<void> {
  const toolsOutputDir = path.join(outputDir, "tools");
  if (!fs.existsSync(toolsOutputDir)) {
    fs.mkdirSync(toolsOutputDir, { recursive: true });
  }

  // Create a map of filenames to their generated metadata using tool.filename as source of truth
  const toolMetadataMap = new Map<string, any>();
  tools.forEach((tool) => {
    if (tool.metadata) {
      // Use the filename with extensions for mapping
      const tsFile = `${tool.filename}.ts`;
      const jsFile = `${tool.filename}.js`;
      toolMetadataMap.set(tsFile, tool.metadata);
      toolMetadataMap.set(jsFile, tool.metadata);
    }
  });

  const files = fs.readdirSync(sourceDir);
  for (const file of files) {
    if (file.endsWith(".ts") || file.endsWith(".js")) {
      const sourcePath = path.join(sourceDir, file);

      if (file.endsWith(".ts")) {
        // For TypeScript files, compile to JavaScript
        const outputPath = path.join(
          toolsOutputDir,
          file.replace(".ts", ".js")
        );
        const generatedMetadata = toolMetadataMap.get(file);
        await compileTypeScriptFile(sourcePath, outputPath, generatedMetadata);
      } else {
        // For JavaScript files, copy directly
        const outputPath = path.join(toolsOutputDir, file);
        fs.copyFileSync(sourcePath, outputPath);
      }
    }
  }
}

async function compileTypeScriptFile(
  sourcePath: string,
  outputPath: string,
  metadata?: any
): Promise<void> {
  const { exec } = require("child_process");
  const { promisify } = require("util");
  const execAsync = promisify(exec);

  try {
    // Create a temporary directory for compilation
    const tempDir = path.join(path.dirname(outputPath), "temp_compile");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Copy the TypeScript file to temp directory
    const tempSourcePath = path.join(tempDir, path.basename(sourcePath));
    fs.copyFileSync(sourcePath, tempSourcePath);

    // Use TypeScript compiler to compile single file
    await execAsync(
      `npx tsc ${tempSourcePath} --outDir ${tempDir} --target es2020 --module commonjs --esModuleInterop --skipLibCheck --moduleResolution node`
    );

    // Move the compiled file to the correct location and inject metadata if needed
    const compiledPath = path.join(
      tempDir,
      path.basename(sourcePath).replace(".ts", ".js")
    );
    if (fs.existsSync(compiledPath)) {
      let jsContent = fs.readFileSync(compiledPath, "utf8");

      // Only inject metadata if the user originally provided some metadata
      if (metadata && !jsContent.includes("exports.metadata")) {
        // Add metadata export to the compiled JavaScript
        const metadataExport = `\nexports.metadata = ${JSON.stringify(
          metadata,
          null,
          2
        )};\n`;
        jsContent += metadataExport;
      }

      fs.writeFileSync(outputPath, jsContent);
    }

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.warn(`Failed to compile ${sourcePath}:`, error);
    // Fallback: copy the TypeScript file as-is
    fs.copyFileSync(sourcePath, outputPath.replace(".js", ".ts"));
  }
}

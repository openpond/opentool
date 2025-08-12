import * as fs from 'fs';
import * as path from 'path';
import { InternalToolDefinition } from '../types';

export interface ValidateOptions {
  input: string;
}

export async function validateCommand(options: ValidateOptions): Promise<void> {
  console.log('🔍 Validating OpenTool tools...');
  
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
      console.log('⚠️  No tools found in directory');
      return;
    }

    console.log(`\n📊 Validation Summary:`);
    console.log(`  ✓ ${tools.length} valid tools found`);
    
    // Check for duplicate tool names
    const names = tools.map(t => t.metadata?.name || t.filename);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
      console.log(`  ❌ Duplicate tool names: ${duplicates.join(', ')}`);
      hasErrors = true;
    }

    // Validate each tool
    for (const tool of tools) {
      const name = tool.metadata?.name || tool.filename;
      const description = tool.metadata?.description || 'no description';
      console.log(`\n🔧 Tool: ${name}`);
      console.log(`   Description: ${description}`);
      console.log(`   Schema: ${(tool.schema as any)._def?.typeName || 'unknown'}`);
      
      // Check annotations
      if (tool.metadata?.annotations) {
        console.log(`   Annotations:`);
        Object.entries(tool.metadata.annotations).forEach(([key, value]) => {
          console.log(`     ${key}: ${value}`);
        });
      }
    }

    if (hasErrors) {
      console.log('\n❌ Validation failed with errors');
      process.exit(1);
    } else {
      console.log('\n✅ All tools are valid!');
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

export async function loadAndValidateTools(toolsDir: string): Promise<InternalToolDefinition[]> {
  const tools: InternalToolDefinition[] = [];
  const files = fs.readdirSync(toolsDir);

  for (const file of files) {
    if (file.endsWith('.ts') || file.endsWith('.js')) {
      const toolPath = path.join(toolsDir, file);
      try {
        const toolModule = require(toolPath);
        
        // Check for required exports (schema and TOOL function, metadata is optional)
        if (toolModule.TOOL && toolModule.schema) {
          const baseName = file.replace(/\.(ts|js)$/, '');
          const tool: InternalToolDefinition = {
            schema: toolModule.schema,
            inputSchema: { type: 'object' }, // Placeholder for validation
            metadata: toolModule.metadata || null,
            filename: baseName,
            handler: async (params) => {
              const result = await toolModule.TOOL(params);
              // Handle both string and object returns
              if (typeof result === 'string') {
                return {
                  content: [{ type: 'text', text: result }],
                  isError: false,
                };
              }
              return result;
            }
          };
          
          if (validateTool(tool, file)) {
            tools.push(tool);
            const name = tool.metadata?.name || tool.filename;
            console.log(`  ✓ ${file} - Valid tool: ${name}`);
          }
        } else {
          console.log(`  ⚠ ${file} - Invalid tool format. Must export: schema and TOOL function (metadata is optional)`);
        }
      } catch (error) {
        console.log(`  ❌ ${file} - Failed to load: ${error}`);
      }
    }
  }

  return tools;
}

function validateTool(tool: unknown, filename: string): tool is InternalToolDefinition {
  if (!tool || typeof tool !== 'object') {
    console.log(`  ❌ ${filename} - Not an object`);
    return false;
  }

  const t = tool as Record<string, unknown>;

  if (!t.schema) {
    console.log(`  ❌ ${filename} - Missing schema`);
    return false;
  }

  // Metadata is optional now
  if (t.metadata !== null && t.metadata !== undefined) {
    if (typeof t.metadata !== 'object') {
      console.log(`  ❌ ${filename} - Invalid metadata (must be object or null)`);
      return false;
    }

    const metadata = t.metadata as Record<string, unknown>;
    if (metadata.name !== undefined && typeof metadata.name !== 'string') {
      console.log(`  ❌ ${filename} - Invalid metadata.name (must be string)`);
      return false;
    }

    if (metadata.description !== undefined && typeof metadata.description !== 'string') {
      console.log(`  ❌ ${filename} - Invalid metadata.description (must be string)`);
      return false;
    }
  }

  if (!t.handler || typeof t.handler !== 'function') {
    console.log(`  ❌ ${filename} - Missing or invalid handler function`);
    return false;
  }

  return true;
}
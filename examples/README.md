# OpenTool Examples

This directory contains example projects demonstrating different approaches to building OpenTool agents.

## Examples

### `full-metadata/` - Complete Metadata Example
A comprehensive example showing all metadata features:
- Custom metadata.ts file with full configuration
- Tool-level payment overrides
- Rich discovery metadata with examples and performance data
- Complex mathematical calculator tool

### `minimal/` - Smart Defaults Example  
A minimal example demonstrating automatic metadata generation:
- No metadata.ts file required
- Smart defaults from package.json and folder structure
- Simple greeting tool
- Automatic tool discovery and schema generation

## Testing Examples Locally

To test these examples using the local OpenTool development version:

1. **Build and link the local OpenTool package** (from the opentool root directory):
   ```bash
   npm run build  # Build the TypeScript source
   npm link       # Make package available globally
   ```

2. **Test any example**:
   ```bash
   cd examples/minimal  # or examples/full-metadata
   npm link opentool    # Use local development version
   npm run build        # Build the MCP server and Lambda handler
   ```

3. **Test with MCP Inspector** (recommended):
   ```bash
   # Test the stdio MCP server interactively
   npx @modelcontextprotocol/inspector node dist/mcp-server.js
   ```
   
   This opens a web interface where you can:
   - View all available tools and schemas
   - Test tool calls interactively
   - Debug MCP protocol interactions

4. **Examine the generated files**:
   ```bash
   ls dist/                    # mcp-server.js, lambda-handler.js, metadata.json
   cat dist/metadata.json      # Complete metadata for registration
   ```

## Key Differences

| Feature | Full Metadata | Minimal |
|---------|---------------|---------|
| metadata.ts | ✅ Required | ❌ Optional |
| Smart defaults | ➕ Enhanced by metadata | ✅ Fully automatic |
| Payment config | ✅ Custom pricing | ❌ No payment |
| Discovery data | ✅ Rich SEO data | ❌ Basic only |
| Setup complexity | 🔸 Medium | 🟢 Simple |

Both examples generate complete `metadata.json` files suitable for on-chain registration.
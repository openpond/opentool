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

1. **Link the local OpenTool package** (from the opentool root directory):
   ```bash
   npm run build  # Build the TypeScript source
   npm link       # Make package available globally
   ```

2. **Test the full-metadata example**:
   ```bash
   cd examples/full-metadata
   npm link opentool     # Use local development version
   npm run build         # Build the agent
   npm run dev           # Start development server (optional)
   ```

3. **Test the minimal example**:
   ```bash
   cd examples/minimal
   npm link opentool     # Use local development version  
   npm run build         # Build with smart defaults
   ```

4. **Examine the generated output**:
   ```bash
   # Check the metadata.json in each dist/ folder
   cat dist/metadata.json
   
   # Test the MCP server
   echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/mcp-server.js
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
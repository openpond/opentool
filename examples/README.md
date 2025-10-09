# OpenTool Examples

This directory contains example projects demonstrating different approaches to building OpenTool agents.

## Examples

### `full-metadata/`
A comprehensive example showing all metadata features:
- Custom `metadata.ts` file with full configuration
- Tool-level payment overrides and discovery data
- Dual ESM/CommonJS outputs for the compiled tools and servers

## Testing Examples Locally

To test these examples using the local OpenTool development version:

1. **Build and link the local OpenTool package** (from the opentool root directory):
   ```bash
   npm run build  # Build the TypeScript source
   npm link       # Make package available globally
   ```

2. **Test any example**:
   ```bash
   cd examples/full-metadata
   cp .env.example .env    # Populate with your own credentials
   npm link opentool    # Use local development version
   npm run build        # Build the MCP servers and metadata bundle
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
   ls dist/                    # mcp-server.js, metadata.json
   cat dist/metadata.json      # Complete metadata for registration
   ```

The full-metadata example generates a complete `metadata.json` artifact alongside the `mcp-server.js` entry point used by the Lambda adapter.

# Full Metadata OpenTool Example

This example demonstrates a complete OpenTool project with metadata configuration and a calculator tool.

## Files

- `tools/calculate.ts` - A calculator tool with mathematical operations
- `metadata.ts` - Complete metadata configuration
- `package.json` - Project configuration
- `dist/` - Generated files after build

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Test locally with MCP Inspector:**
   ```bash
   npx @modelcontextprotocol/inspector node dist/mcp-server.js
   ```

## Features

This example showcases:

- **Custom metadata** - Project information, categories, and discovery data
- **Tool annotations** - Enhanced tool descriptions and capabilities
- **Payment configuration** - Optional monetization settings
- **Complex tool schemas** - Mathematical operations with validation

## Generated Files

After building, you'll find these files in `dist/`:

- **`mcp-server.js`** - Stdio MCP server for local testing
- **`lambda-handler.js`** - AWS Lambda handler using the MCP adapter
- **`metadata.json`** - Complete tool and project metadata
- **`tools/calculate.js`** - Compiled calculator tool

## Testing

Use the MCP Inspector to test the calculator tool with operations like:

```json
{
  "operation": "add",
  "a": 10,
  "b": 5
}
```

Expected response: `"Result: 15"`

## Metadata Configuration

The `metadata.ts` file demonstrates how to configure:

- Project information and branding
- Tool categories and discovery
- Payment and monetization settings
- Compatibility requirements
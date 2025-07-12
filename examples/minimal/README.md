# Minimal OpenTool Example

This example demonstrates a simple OpenTool project with a greeting tool that can be deployed to AWS Lambda using the MCP adapter architecture.

## Files

- `tools/greeting.ts` - A simple greeting tool with language options
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
   
   This opens a web interface where you can:
   - View available tools and their schemas
   - Test tool calls interactively
   - Debug MCP protocol interactions

## Generated Files

After building, you'll find these files in `dist/`:

- **`mcp-server.js`** - Stdio MCP server for local testing
- **`lambda-handler.js`** - AWS Lambda handler using the MCP adapter
- **`metadata.json`** - Tool metadata for registration
- **`tools/greeting.js`** - Compiled tool

## Deployment

The `lambda-handler.js` file is ready for AWS Lambda deployment using the AWS Lambda MCP Adapter. It automatically:

- Sets up API Gateway endpoints
- Handles HTTP to stdio protocol conversion
- Provides standard MCP compatibility

## Testing the Greeting Tool

Once the MCP Inspector is running, try calling the greeting tool with:

```json
{
  "name": "Your Name",
  "language": "spanish"
}
```

Expected response: `"Hola, Your Name! Welcome to the AI Assistant."`

## Architecture

This example uses the AWS Lambda MCP Adapter approach:

```
MCP Client → API Gateway → Lambda (Adapter) → Stdio MCP Server → Tool
```

For local development, you connect directly to the stdio server:

```
MCP Inspector → Stdio MCP Server → Tool
```
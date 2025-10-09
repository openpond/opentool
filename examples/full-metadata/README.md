# Full Metadata OpenTool Example

This example demonstrates a complete OpenTool project with metadata configuration, calculator utilities, and several AI-powered endpoints built on the `opentool/ai` package.

## Files

- `tools/calculate.ts` – Calculator with discovery metadata and 402 payments
- `tools/ai-summarize.ts` – Summary generator using `generateText`
- `tools/ai-research.ts` – Research assistant with auto web search tool calling
- `tools/ai-code-suggestion.ts` – Code snippet drafter with configurable constraints
- `tools/ai-streaming-outline.ts` – Streaming outline generator demonstrating `streamText`
- `metadata.ts` – Complete metadata configuration
- `package.json` – Project configuration
- `dist/` – Generated files after build

## Quick Start

1. **Create your environment file:**
   ```bash
   cp .env.example .env
   ```
   Update the copied file with your own Turnkey, 0x, and Alchemy credentials before running the tooling.

1. **Install dependencies:**
   ```bash
   npm install
   ```

1. **Build the project:**
   ```bash
   npm run build
   ```

1. **Test locally with MCP Inspector:**
   ```bash
   npx @modelcontextprotocol/inspector node dist/mcp-server.js
   ```

## Features

This example showcases:

- **Custom metadata** – Project information, categories, and discovery data
- **Tool annotations** – Enhanced tool descriptions and capabilities
- **Payment configuration** – Optional monetization settings
- **Complex tool schemas** – Mathematical operations with validation
- **AI integrations** – Non-streaming calls to `https://gateway.openpond.dev` with optional model overrides
- **Web search usage** – Automatic inclusion of the OpenPond `websearch` function tool
- **Streaming demo** – Live SSE handling with incremental text, reasoning, and usage callbacks

## Generated Files

After building, you'll find these files in `dist/`:

- **`mcp-server.js`** - stdio MCP server for Node/Lambda execution
- **`metadata.json`** - Complete tool and project metadata (spec `v1.0.0`)
- **`tools/calculate.js`** - Compiled calculator tool

## Testing

Use the MCP Inspector to test tools. Examples:

- **Calculator:**
  ```json
  {
    "operation": "add",
    "a": 10,
    "b": 5
  }
  ```
- **AI summary:**
  ```json
  {
    "topic": "OpenTool AI package release",
    "tone": "enthusiastic"
  }
  ```
- **AI research:**
  ```json
  {
    "query": "Recent Model Context Protocol updates",
    "maxResults": 3
  }
  ```
- **Streaming outline:**
  ```json
  {
    "topic": "OpenTool AI package launch",
    "bulletCount": 5,
    "includeSummary": true
  }
  ```

Set `OPENPOND_GATEWAY_URL` or `OPENPOND_API_KEY` in your environment if you need to target a custom gateway or authenticated provider.

## Metadata Configuration

The `metadata.ts` file demonstrates how to configure:

- Project information and branding
- Tool categories and discovery
- Payment and monetization settings
- Compatibility requirements

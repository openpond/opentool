# OpenTool

[![npm version](https://badge.fury.io/js/opentool.svg)](https://badge.fury.io/js/opentool)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## OpenPond Hosting launching August 2025

(current openpond.ai site hasn't been updated yet)

A TypeScript framework for building serverless MCP (Model Context Protocol) tools that automatically deploy to AWS Lambda using [OpenPond](https://openpond.ai) hosting.

## Features

- **Serverless-first**: Tools automatically deploy to AWS Lambda
- **Type-safe**: Full TypeScript support with Zod schema validation
- **CLI Tools**: Build, develop, and validate your tools
- **MCP Compatible**: Works with any MCP client
- **Automatic Detection**: Detected by OpenPond hosting platform
- **Local Development**: Test your tools locally before deployment

## Installation

```bash
npm install opentool
```

## Quick Start

### 1. Create a new project

```bash
mkdir my-opentool-project
cd my-opentool-project
npm init -y
npm install opentool
```

### 2. Create your first tool

Create a `tools/` directory and add your first tool:

```typescript
// tools/greet.ts
import { z } from "zod";

export const schema = z.object({
  name: z.string().describe("The name of the user to greet"),
});

export async function TOOL({ name }: z.infer<typeof schema>) {
  return `Hello, ${name}! 👋`;
}
```

### 3. Test locally

```bash
# Validate your tools
npx opentool validate

# Start development server
npx opentool dev
```

### MCP Inspector

The `examples/full-metadata` project includes an `inspector.json` preset so you can exercise MCP tools with the official MCP Inspector:

```bash
cd examples/full-metadata
npx mcp-inspector --config inspector.json --server opentool-dev
```

Before starting the inspector, copy `examples/full-metadata/.env.example` to `examples/full-metadata/.env` and populate the Turnkey, 0x, and Alchemy secrets with your own credentials. The actual `.env` file is git-ignored so you can keep real keys out of version control.

The inspector spawns `opentool dev --stdio --no-watch --input tools`, so you don’t need a second terminal. Only tools that export `mcp = { enabled: true }` (for example `mcp_ping`) appear in the inspector’s tool list; HTTP-only tools like `calculate` and `hello` keep responding on the local HTTP port.


### 4. Build for deployment

```bash
# Build tools for Lambda deployment
npx opentool build
```

### 5. Deploy to OpenPond

Create an account on [OpenPond](https://openpond.ai) and create a new project.

Add your project to the OpenPond project and connect it to your GitHub repository.

OpenPond will automatically detect the `opentool` dependency and deploy your tools to AWS Lambda using the UI.

## CLI Commands

### Build

Build your tools for deployment:

```bash
npx opentool build [options]

Options:
  -i, --input <dir>      Input directory containing tools (default: "tools")
  -o, --output <dir>     Output directory for built tools (default: "dist")
  --name <name>          Server name (default: "opentool-server")
  --version <version>    Server version (default: "1.0.0")
```

### Development Server

Start a local development server:

```bash
npx opentool dev [options]

Options:
  -i, --input <dir>      Input directory containing tools (default: "tools")
  --watch                Watch for file changes (default: false)
```

### Validate

Validate your tools:

```bash
npx opentool validate [options]

Options:
  -i, --input <dir>      Input directory containing tools (default: "tools")
```

### Generate Metadata

Generate OpenTool metadata JSON without building:

```bash
npx opentool metadata [options]

Options:
  -i, --input <dir>      Input directory containing tools (default: "tools")
  -o, --output <file>    Output file path for metadata.json (default: "metadata.json")
  --name <name>          Server name (default: "opentool-server")
  --version <version>    Server version (default: "1.0.0")
```

This command generates the `metadata.json` file that contains all the information needed for on-chain registration and discovery, including tool schemas, payment configurations, and discovery metadata. It's useful when you need to inspect or share the metadata without performing a full build.

## Tool Definition

Each tool is defined by exporting three things:

1. **schema**: Zod schema for input validation
2. **metadata**: Tool information and MCP annotations
3. **TOOL**: Async function that implements the tool logic

```typescript
import { z } from "zod";

export const schema = z.object({
  // Define your input parameters here
});

export async function TOOL(params: z.infer<typeof schema>) {
  // Implement your tool logic here
  // Just return a string - it will be wrapped in MCP format automatically
  return "Tool response";
}
```

## Error Handling

Simply throw errors in your TOOL function - they will be automatically converted to MCP error responses:

```typescript
export async function TOOL(params: z.infer<typeof schema>) {
  if (someCondition) {
    throw new Error("Something went wrong");
  }
  return "Success";
}
```

## Local Development

The development server runs your tools locally using the MCP protocol over stdio. You can:

1. Test individual tools
2. Validate schemas
3. Check tool responses
4. Debug issues before deployment

## Deployment

When you push a project with `opentool` dependency to GitHub and connect it to OpenPond:

1. **Detection**: OpenPond detects the `opentool` package
2. **Routing**: Project is routed to AWS Lambda deployment
3. **Build**: Tools are built using `npx opentool build`
4. **Deploy**: Lambda function is created with Function URLs
5. **Ready**: Your tools are available as serverless MCP servers!

## Examples

See the `examples/` directory for a comprehensive example:

- **`examples/full-metadata/`** - Metadata configuration with payment and discovery features

### Testing Examples Locally

To test the examples using the local development version:

```bash
# Build the OpenTool package
npm run build
npm link

# Test the full metadata example
cd examples/full-metadata
npm link opentool
npm run build

# Examine generated output
cat dist/metadata.json

# Test the MCP server
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/mcp-server.js

# Quick regression helpers from the repo root
npm run examples:build      # Build full metadata example (CJS+ESM)
npm run examples:validate   # Validate example metadata and tools
npm run examples:metadata   # Regenerate metadata.json without rebuilding tools
```

## Metadata System

OpenTool features a sophisticated **three-tier metadata system**:

1. **Smart Defaults** - Zero configuration, automatic generation from `package.json`
2. **Enhanced Metadata** - Optional `metadata.ts` for custom branding and crypto payments
3. **Full Control** - Tool-level overrides for rich discovery metadata

See [`METADATA.md`](./METADATA.md) for the complete guide to configuring metadata for on-chain registration and payments.

## Future Work

- Explore an esbuild-powered watch mode that keeps metadata and tool artifacts up to date for the dev server. This remains on the follow-up list once the new pipeline settles.

## Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/openpond/opentool/blob/master/CONTRIBUTING.md) for details.

## License

MIT © [OpenTool](https://opentool.dev)

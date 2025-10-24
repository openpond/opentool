# OpenTool

[![npm version](https://badge.fury.io/js/opentool.svg)](https://badge.fury.io/js/opentool)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Build serverless TypeScript tools that work with AI assistants, handle crypto payments, and deploy to AWS Lambda automatically.

**For LLMs/AI Code Generation:** [`dist/opentool-context.ts`](./scripts/build-context.ts)

## What is it?

OpenTool lets you write simple TypeScript functions that can be called by other agents, monetized with crypto payments, and deployed as serverless functions. It handles the boring stuff like:

- Type validation with Zod schemas
- AI client integration (OpenAI, Anthropic, etc.)
- Multi-chain wallet support (Ethereum, Base, Arbitrum, etc.)
- Automatic AWS Lambda deployment via [OpenPond](https://openpond.ai)
- Payment infrastructure for on-chain tool monetization

## Recent Updates

- **Selective MCP mode** - tools now support `mcp = { enabled: true }` to enable MCP clients on a per-tool basis
- **Context bundling** - generates consolidated context files for AI code generation (see `dist/opentool-context.ts`)
- **Default bundling enabled** - tools now bundle by default for cleaner deployments
- **Improved CLI** - better validation and metadata generation commands

## Features

- **TypeScript-first** with Zod validation and auto-generated JSON schemas
- **Serverless by default** - deploys to AWS Lambda with Function URLs
- **MCP support** - works with Claude Desktop, MCP Inspector, or any MCP client
- **Built-in AI client** for OpenAI, Anthropic, and compatible providers
- **Multi-chain wallets** - Ethereum, Base, Arbitrum, Polygon, etc.
- **Crypto payments** - monetize tools with ERC-20 tokens (USDC, USDT, DAI)
- **CLI tools** for building, validating, and local dev with watch mode
- **Context bundling** - generates consolidated context files for AI code generation

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

export const metadata = {
  name: "greet",
  description: "Simple greeting tool",
};

export async function POST(request: Request) {
  const payload = await request.json();
  const { name } = schema.parse(payload);

  return Response.json({
    message: `Hello, ${name}!`,
  });
}
```

### 3. Test locally

```bash
# Validate your tools
npx opentool validate

# Start development server
npx opentool dev
```

### 4. Enable MCP mode (optional)

By default, tools are HTTP-only. Want them accessible via MCP clients like Claude Desktop? Just add this to your tool file:

```typescript
// tools/greet.ts
export const mcp = {
  enabled: true, // Now works with Claude Desktop, MCP Inspector, etc.
};
```

Tools without this export stay HTTP-only, which is useful when you want selective access. Mix and match as needed.

### Testing with MCP Inspector

The `examples/full-metadata` project has an `inspector.json` config ready to go:

```bash
cd examples/full-metadata
npx mcp-inspector --config inspector.json --server opentool-dev
```

Copy `.env.example` to `.env` and add your credentials if you're using wallet/payment features. The inspector starts `opentool dev` automatically, so you only need one terminal. Only tools with `mcp = { enabled: true }` show up in the inspector - HTTP-only tools keep running on localhost.

### Quick x402 test with curl

1. Start the dev server against the example tools:

   ```bash
   npx opentool dev --input examples/full-metadata/tools
   ```

2. Trigger the paywall and inspect the returned payment requirements:

   ```bash
   curl -i \
     -X POST http://localhost:7000/premium-report \
     -H "content-type: application/json" \
     -d '{"symbol":"BTC"}'
   ```

   The response includes a `402 Payment Required` status and JSON body with an `x402.accepts[0]` object describing the payment request.

3. Submit a follow-up request with an `X-PAYMENT` header produced by your x402 facilitator (for example, by using the Coinbase [x402](https://github.com/coinbase/x402) tooling or your own signing flow):

   ```bash
   curl -i \
     -X POST http://localhost:7000/premium-report \
     -H "content-type: application/json" \
     -H "X-PAYMENT: ${X402_HEADER}" \
     -d '{"symbol":"BTC"}'
   ```

   Replace `${X402_HEADER}` with the base64-encoded payment payload returned by your facilitator’s `/verify` or `/pay` workflow. If the payment is valid the server responds with `200 OK`; otherwise it returns a new `402` with failure details.

### 5. Build for deployment

```bash
# Build tools for Lambda deployment
npx opentool build
```

### 6. Deploy to OpenPond

Create an account on [OpenPond](https://openpond.ai) and create a new project.

Add your project to the OpenPond project and connect it to your GitHub repository.

OpenPond will automatically detect the `opentool` dependency and deploy your tools to AWS Lambda.

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

Generate `metadata.json` without building:

```bash
npx opentool metadata [options]

Options:
  -i, --input <dir>      Input directory containing tools (default: "tools")
  -o, --output <file>    Output file path for metadata.json (default: "metadata.json")
  --name <name>          Server name (default: "opentool-server")
  --version <version>    Server version (default: "1.0.0")
```

Generates the metadata file with tool schemas, payment configs, and discovery info. Useful for inspecting or sharing metadata without a full build.

## Tool Definition

Tools are just TypeScript files with a few exports:

```typescript
import { z } from "zod";

// 1. Schema for input validation
export const schema = z.object({
  input: z.string().describe("Some input parameter"),
});

// 2. Metadata
export const metadata = {
  name: "my_tool",
  description: "What this tool does",
};

// 3. Optional: enable MCP mode
export const mcp = {
  enabled: true, // Makes it work with Claude Desktop, etc.
};

// 4. Handler (POST, GET, PUT, DELETE, etc.)
export async function POST(request: Request) {
  const payload = await request.json();
  const params = schema.parse(payload);

  // Your tool logic here
  return Response.json({
    result: "Tool response",
  });
}
```

## Error Handling

Just return standard HTTP responses:

```typescript
export async function POST(request: Request) {
  const payload = await request.json();
  const params = schema.parse(payload);

  if (someCondition) {
    return Response.json({ error: "Something went wrong" }, { status: 400 });
  }

  return Response.json({ result: "Success" });
}
```

## Local Development

Run `npx opentool dev` to test your tools locally. It runs them via stdio (for MCP clients) or HTTP (for direct API calls). Good for:

- Testing tool logic
- Validating schemas
- Debugging before deployment

## Deployment

Push your repo to GitHub and connect it to [OpenPond](https://openpond.ai):

1. OpenPond detects the `opentool` dependency
2. Runs `npx opentool build`
3. Deploys to AWS Lambda with Function URLs
4. Done - your tools are live

## Examples

Check `examples/full-metadata/` for a complete example with payment and discovery features.

### Testing Examples Locally

```bash
# Build and link the OpenTool package
npm run build
npm link

# Test the example
cd examples/full-metadata
npm link opentool
npm run build

# Check the output
cat dist/metadata.json

# Test the MCP server
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node dist/mcp-server.js

# Or from repo root:
npm run examples:build      # Build example (CJS+ESM)
npm run examples:validate   # Validate metadata and tools
npm run examples:metadata   # Regenerate metadata.json
```

## Metadata System

OpenTool has three levels of metadata config:

1. **Default** - pulls from your `package.json` automatically
2. **Project-level** - add a `metadata.ts` file for branding, payments, etc.
3. **Tool-level** - override metadata per tool

See [`METADATA.md`](./METADATA.md) for details on configuring metadata for on-chain registration and payments.

## What's Next

- Better watch mode that keeps metadata and tool artifacts synced during dev

## Contributing

Contributions welcome! See the [Contributing Guide](https://github.com/openpond/opentool/blob/master/CONTRIBUTING.md).

## License

MIT © [OpenTool](https://opentool.dev)

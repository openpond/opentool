# OpenTool Metadata System

This guide explains how OpenTool's metadata system works, from simple automatic generation to full custom configuration for on-chain registration and payments.

## How It Works

OpenTool has a **three-tier metadata system** that gets progressively more sophisticated:

1. **🟢 Automatic (Smart Defaults)** - Zero configuration required
2. **🔸 Enhanced (metadata.ts)** - Custom configuration with smart fallbacks  
3. **🔴 Full Control** - Complete tool-level overrides

The build process automatically generates a complete `metadata.json` file suitable for on-chain registration regardless of which tier you use.

## Tier 1: Smart Defaults (Zero Config)

For simple projects, OpenTool generates complete metadata automatically:

**What you provide:**
- `package.json` with basic fields
- Tool files in `tools/` directory

**What OpenTool generates automatically:**
```json
{
  "metadataSpecVersion": "1.1.0",
  "name": "package-name",           // From package.json name
  "displayName": "Package Name",   // Formatted from name
  "version": "2.5.0",              // From package.json version (semantic string)
  "description": "...",            // From package.json description
  "author": "...",                 // From package.json author
  "repository": "...",             // From package.json repository
  "website": "...",                // From package.json homepage
  "category": "utility",           // Default fallback
  "termsOfService": "Please review terms before use.",
  "tools": [
    {
      "name": "filename",          // From .ts filename
      "description": "filename tool", // Auto-generated
      "inputSchema": { ... }       // From Zod schema
    }
  ]
}
```

**Example project structure:**
```
my-assistant/
├── package.json                 # Basic npm package info
└── tools/
    └── greeting.ts              # Tool with schema and POST handler
```

## Tier 2: Enhanced Metadata (metadata.ts, optional)

Add a `metadata.ts` file to customize agent-wide settings while keeping smart defaults for missing fields:

```typescript
export const metadata = {
  // Override smart defaults
  displayName: "My AI Assistant Pro",
  category: "productivity",
  
  // Add discovery fields  
  keywords: ["ai", "assistant", "productivity"],
  useCases: ["Customer support", "Content writing"],
  
  // Add payment configuration
  payment: {
    amountUSDC: 0.01,
    description: "Standard usage tier",
    x402: true,
    openpondDirect: true,
    acceptedMethods: ["USDC", "ETH"],
    chains: [8453] // Base
  },
  
  // Smart defaults still apply for: name, version, description, author, etc.
};
```

The build process **merges** your metadata with smart defaults, so you only specify what you want to customize.

If `metadata.ts` is missing, OpenTool uses smart defaults from `package.json` and folder name without failing the build.

## Tier 3: Full Tool-Level Control

Individual tools can override agent defaults and add rich discovery metadata:

```typescript
// tools/analyze.ts
import { z } from "zod";

export const schema = z.object({
  text: z.string().describe("Text to analyze")
});

export const metadata = {
  name: "text-analyzer",
  description: "Advanced text analysis with sentiment and keywords",
  
  // Override agent-level payment
  payment: {
    amountUSDC: 0.05,  // More expensive than agent default
    acceptETH: true,
    acceptSolana: true,
    acceptX402: true,
    chains: [8453]
  },
  
  // MCP annotations for behavior hints
  annotations: {
    readOnlyHint: true,     // Safe, only reads data
    idempotentHint: true,   // Same input = same output
  },
  
  // Rich discovery metadata
  discovery: {
    keywords: ["nlp", "sentiment", "analysis"],
    category: "ai-processing",
    examples: [
      {
        description: "Analyze customer feedback",
        input: { text: "This product is amazing!" },
        expectedOutput: "Sentiment: positive (0.9), Keywords: product, amazing"
      }
    ],
    performance: {
      estimatedDuration: 2000,
      isAsync: true
    },
    safety: {
      requiresConfirmation: false,
      isReversible: true,
      sideEffects: []
    }
  }
};

export async function POST(request: Request) {
  const payload = await request.json();
  const params = schema.parse(payload);

  // Implementation
  return Response.json({
    result: "Analysis complete",
  });
}
```

## Build Process Flow

When you run `opentool build`, here's what happens:

1. **📂 Scan** `tools/` directory for `.ts`/`.js` files
2. **🔍 Load** optional `metadata.ts` (or `discovery.ts` for backwards compatibility)
3. **📦 Read** `package.json` for fallback values
4. **🧠 Generate** smart defaults from folder name if needed
5. **⚙️ Compile** TypeScript tools to JavaScript
6. **🔗 Merge** all metadata layers:
   - Tool metadata (highest priority)
   - Agent metadata from metadata.ts
   - Smart defaults from package.json
   - Built-in fallbacks (lowest priority)
7. **📄 Generate** complete `metadata.json`

## Metadata Hierarchy

The system uses this precedence order (highest to lowest):

```
Tool-level metadata (in tool files)
     ↓ overrides
Agent-level metadata (metadata.ts) 
     ↓ overrides
Smart defaults (package.json + folder name)
     ↓ overrides
Built-in fallbacks (sensible defaults)
```

## Payment Configuration

Payment settings work hierarchically:

```typescript
// Agent-level default (metadata.ts)
export const metadata = {
  payment: {
    amountUSDC: 0.01,        // Default for all tools
    acceptETH: true,
    acceptSolana: true,
    acceptX402: true,
    chains: [8453]
  }
};

// Tool-level override (tools/premium.ts)
export const metadata = {
  payment: {
    amountUSDC: 0.10,        // Override: more expensive
    x402: true,
    openpondDirect: true,
    acceptedMethods: ["USDC"],
    chains: [8453]
  }
};
```

**Payment Settings:**
- **acceptedMethods**: Currency codes accepted for settlement (e.g. `USDC`, `ETH`)
- **x402**: Enables HTTP 402 (paywall) flows
- **openpondDirect**: Enables direct settlement through OpenPond
- **chains**: Supported blockchain networks (accepts numbers like `8453` or strings like `"base"`)

## Blockchain Networks (Chains)

Specify which blockchain networks your agent/tools interact with using the `chains` field:

```typescript
// Agent-level chains (metadata.ts)
export const metadata = {
  displayName: "Multi-Chain Trading Bot",

  // Chains accepts numbers (EVM chain IDs) or strings (chain names)
  chains: [
    1,                  // Ethereum mainnet (EVM chain ID)
    8453,               // Base (EVM chain ID)
    "base-sepolia",     // Base testnet (Alchemy naming)
    "solana",           // Solana (chain name)
    "hyperliquid"       // Hyperliquid (chain name)
  ]
};

// Tool-level override (tools/ethereum-swap.ts)
export const metadata = {
  name: "ethereum-swap",
  chains: [1, "ethereum"]  // Only Ethereum for this tool
};
```

**Chain Format:**
- **Numbers**: EVM chain IDs (e.g., `1`=Ethereum, `8453`=Base, `42161`=Arbitrum)
- **Strings**: Chain names following Alchemy naming conventions (e.g., `"base-sepolia"`, `"solana"`, `"hyperliquid"`)

**Common Chain IDs:**
- Ethereum: `1`
- Base: `8453`
- Arbitrum: `42161`
- Polygon: `137`
- Optimism: `10`

**Hierarchy:**
- Tools inherit agent-level chains by default
- Tool-level chains override agent chains for that specific tool
- Used for discovery, filtering, and showing network-specific UI

## Generated Metadata JSON

The final `metadata.json` combines all metadata into a standardized format:

```json
{
  "metadataSpecVersion": "1.1.0",
  "name": "my-assistant",
  "displayName": "My AI Assistant Pro",
  "version": "2.5.0",
  "description": "A helpful AI assistant for productivity tasks",
  "author": "Jane Developer",
  "repository": "https://github.com/jane/my-ai-assistant",
  "website": "https://my-ai-assistant.com",
  "category": "productivity",
  "termsOfService": "Please review terms before use.",
  "chains": [8453, "base-sepolia"],

  "tools": [
    {
      "name": "text-analyzer",
      "description": "Advanced text analysis with sentiment and keywords",
      "inputSchema": { /* JSON Schema from Zod */ },
      "payment": { /* Tool-specific payment config */ },
      "annotations": { /* MCP behavior hints */ },
      "discovery": { /* SEO and discovery metadata */ },
      "chains": [8453, "base-sepolia"]
    }
  ],

  "payment": { /* Agent-level payment defaults */ },
  "discovery": { /* Agent-level discovery metadata */ }
}
```

## Best Practices

### 🟢 Start Simple
Begin with just `package.json` and tool files. OpenTool handles the rest automatically.

### 🔸 Add Metadata When Needed
Create `metadata.ts` only when you need:
- Custom branding (displayName, category)
- Payment configuration
- Discovery/SEO optimization

### 🔴 Tool-Level Overrides Sparingly
Use tool-level metadata for:
- Different pricing tiers
- Tool-specific behavior hints
- Rich examples and documentation

### 💰 Pricing Guidelines
- **Free/Demo**: `amountUSDC: 0`
- **Simple Operations**: `0.001 - 0.01 USDC`
- **Complex Processing**: `0.01 - 0.1 USDC`  
- **Premium Features**: `0.1+ USDC`

### 🔒 Safety Annotations
Always set accurate MCP annotations:
- `readOnlyHint: true` for data-reading tools
- `destructiveHint: true` for irreversible operations
- `idempotentHint: true` if same input always gives same result

## On-Chain Registration

The generated `metadata.json` enables decentralized discovery:

1. **Deploy** your agent to AWS Lambda or supported platform
2. **Register** on-chain through the wallet UI
3. **Discover** agents are indexed by category, keywords, and capabilities
4. **Payments** are automatically processed through configured methods

## Example Projects

See `examples/full-metadata` for a full configuration that demonstrates agent metadata, tool-level overrides, and the dual-module build outputs.

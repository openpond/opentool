export const metadata = {
  // Core metadata fields (top-level in registry.json)
  name: "opentool-example",
  displayName: "OpenTool Example Agent",
  description: "A demonstration agent showcasing basic OpenTool capabilities with mathematical operations",
  version: 1.0, // Note: version is a number in Metadata type
  author: "OpenPond",
  website: "https://opentool.dev",
  repository: "https://github.com/openpond/opentool",
  category: "example", // Single category for top-level field
  termsOfService: "Please review terms before use.",
  
  // Fields that will be mapped to the discovery section
  keywords: ["example", "demo", "tutorial", "basic", "math"],
  categories: ["example", "utility", "education"], // Multiple categories for discovery
  useCases: [
    "Learning how to build MCP tools with OpenTool",
    "Template for creating new OpenTool projects", 
    "Demonstrating basic tool functionality",
    "Testing deployment and registration workflows"
  ],
  capabilities: [
    "mathematical-operations", 
    "basic-interactions",
    "educational-examples"
  ],
  
  requirements: {
    authentication: [],
    permissions: [],
    dependencies: [],
    minimumInputs: ["varies by tool"]
  },
  
  // Payment configuration  
  payment: {
    amountUSDC: 0.001,
    description: "Very low cost example tools for learning and testing",
    x402: true,
    openpondDirect: true,
    acceptedMethods: ["ETH", "USDC"],
    chainIds: [8453] // Base
  },
  
  // Legacy pricing for discovery section
  pricing: {
    model: "pay-per-use",
    defaultAmount: 0.001,
    description: "Very low cost example tools for learning and testing"
  },
  
  compatibility: {
    platforms: ["web", "mobile", "server", "cli"],
    languages: ["any"],
    frameworks: ["mcp", "opentool"],
    regions: ["global"]
  },

  // New UI Enhancement fields
  promptExamples: [
    "Calculate the square root of 144",
    "Add 25 and 37 together",
    "What's 15 multiplied by 8?",
    "Help me solve: (10 + 5) * 3"
  ],
  iconPath: "/icons/calculator.svg",
  videoPath: "/videos/opentool-demo.mp4"
};
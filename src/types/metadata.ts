// MCP Tool Annotations (Model Context Protocol specification)
export interface McpAnnotations {
  /** Human-readable title for the tool */
  title?: string;
  /** Whether the tool only reads data (doesn't modify state) */
  readOnlyHint?: boolean;
  /** Whether the tool has destructive effects */
  destructiveHint?: boolean;
  /** Whether the tool is idempotent (same result for same input) */
  idempotentHint?: boolean;
  /** Whether the tool interacts with external systems */
  openWorldHint?: boolean;
}

export interface PaymentConfig {
  // Pricing info
  amountUSDC: number;
  currency?: string;
  description?: string;

  // Payment methods
  acceptETH: boolean;
  acceptSolana: boolean;
  acceptX402: boolean;
  chainIds: number[];
}

// Discovery metadata for SEO/search optimization
export interface DiscoveryMetadata {
  keywords?: string[];
  category?: string;
  useCases?: string[];
  examples?: Array<{
    description: string;
    input: any;
    expectedOutput?: any;
  }>;
  relatedTools?: string[];
  alternatives?: string[];
  compatibility?: {
    platforms?: string[];
    languages?: string[];
    frameworks?: string[];
  };
  [key: string]: any;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: any; // JSON Schema
  annotations?: McpAnnotations;
  payment?: PaymentConfig;
  discovery?: DiscoveryMetadata;
}

export interface Metadata {
  name: string;
  displayName: string;
  version: number;
  description?: string;
  author?: string;
  repository?: string;
  website?: string;
  category?: string;
  termsOfService?: string;
  payment?: PaymentConfig;
  tools?: Tool[];
  discovery?: DiscoveryMetadata;
}

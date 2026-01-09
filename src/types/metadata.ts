import { z } from "zod";

export const METADATA_SPEC_VERSION = "1.1.0";

export const McpAnnotationsSchema = z
  .object({
    title: z.string().optional(),
    readOnlyHint: z.boolean().optional(),
    destructiveHint: z.boolean().optional(),
    idempotentHint: z.boolean().optional(),
    openWorldHint: z.boolean().optional(),
    requiresPayment: z.boolean().optional(),
  })
  .strict();

export type McpAnnotations = z.infer<typeof McpAnnotationsSchema>;

// X402Payment structure (from defineX402Payment)
const X402PaymentSchema = z
  .object({
    definition: z.object({
      amount: z.string(),
      currency: z.object({
        code: z.string(),
        symbol: z.string(),
        decimals: z.number(),
      }),
      asset: z.object({
        symbol: z.string(),
        network: z.string(),
        address: z.string(),
        decimals: z.number(),
      }),
      payTo: z.string(),
      resource: z.string().optional(),
      description: z.string().optional(),
      scheme: z.string(),
      network: z.string(),
      facilitator: z.object({
        url: z.string(),
        verifyPath: z.string().optional(),
        settlePath: z.string().optional(),
        apiKeyHeader: z.string().optional(),
      }),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

// Accept x402 or any custom payment config
export const PaymentConfigSchema = z.union([
  X402PaymentSchema,
  z.record(z.string(), z.unknown()),
]);

export type PaymentConfig = z.infer<typeof PaymentConfigSchema>;

export const DiscoveryMetadataSchema = z
  .object({
    keywords: z.array(z.string()).optional(),
    category: z.string().optional(),
    useCases: z.array(z.string()).optional(),
    capabilities: z.array(z.string()).optional(),
    requirements: z.record(z.string(), z.any()).optional(),
    compatibility: z.record(z.string(), z.any()).optional(),
    documentation: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .catchall(z.any());

export type DiscoveryMetadata = z.infer<typeof DiscoveryMetadataSchema>;

export const ToolCategorySchema = z.enum(["strategy", "tracker", "orchestrator"]);
export type ToolCategory = z.infer<typeof ToolCategorySchema>;

export const ToolMetadataOverridesSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    annotations: McpAnnotationsSchema.optional(),
    payment: PaymentConfigSchema.optional(),
    discovery: DiscoveryMetadataSchema.optional(),
    chains: z.array(z.union([z.string(), z.number()])).optional(),
  })
  .catchall(z.any());

export type ToolMetadataOverrides = z.infer<typeof ToolMetadataOverridesSchema>;

export const ToolSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    inputSchema: z.any(),
    annotations: McpAnnotationsSchema.optional(),
    payment: PaymentConfigSchema.optional(),
    discovery: DiscoveryMetadataSchema.optional(),
    chains: z.array(z.union([z.string(), z.number()])).optional(),
    notifyEmail: z.boolean().optional(),
    category: ToolCategorySchema.optional(),
  })
  .strict();

export type Tool = z.infer<typeof ToolSchema>;

export const MetadataSchema = z
  .object({
    metadataSpecVersion: z.string().optional(),
    name: z.string().optional(),
    displayName: z.string().optional(),
    version: z.string().optional(),
    description: z.string().optional(),
    author: z.string().optional(),
    repository: z.string().optional(),
    website: z.string().optional(),
    category: z.string().optional(),
    categories: z.array(z.string()).optional(),
    termsOfService: z.string().optional(),
    mcpUrl: z.string().optional(),
    payment: PaymentConfigSchema.optional(),
    discovery: DiscoveryMetadataSchema.optional(),
    promptExamples: z.array(z.string()).optional(),
    iconPath: z.string().optional(),
    videoPath: z.string().optional(),
    image: z.string().optional(),
    animation_url: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    useCases: z.array(z.string()).optional(),
    capabilities: z.array(z.string()).optional(),
    requirements: z.record(z.string(), z.any()).optional(),
    compatibility: z.record(z.string(), z.any()).optional(),
    chains: z.array(z.union([z.string(), z.number()])).optional(),
  })
  .catchall(z.any());

export type Metadata = z.infer<typeof MetadataSchema>;

export const BuildMetadataSchema = z
  .object({
    metadataSpecVersion: z.string().default(METADATA_SPEC_VERSION),
    name: z.string(),
    displayName: z.string(),
    version: z.string(),
    description: z.string().optional(),
    author: z.string().optional(),
    repository: z.string().optional(),
    website: z.string().optional(),
    category: z.string(),
    termsOfService: z.string().optional(),
    mcpUrl: z.string().optional(),
    payment: PaymentConfigSchema.optional(),
    tools: z.array(ToolSchema).min(1),
    discovery: DiscoveryMetadataSchema.optional(),
    promptExamples: z.array(z.string()).optional(),
    iconPath: z.string().optional(),
    videoPath: z.string().optional(),
    image: z.string().optional(),
    animation_url: z.string().optional(),
    chains: z.array(z.union([z.string(), z.number()])).optional(),
  })
  .strict();

export type BuildMetadata = z.infer<typeof BuildMetadataSchema>;

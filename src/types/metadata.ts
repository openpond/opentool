import { z } from "zod";

export const METADATA_SPEC_VERSION = "1.0.0";

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

export const PaymentConfigSchema = z
  .object({
    amountUSDC: z.number().nonnegative().optional(),
    description: z.string().optional(),
    x402: z.boolean().optional(),
    plain402: z.boolean().optional(),
    acceptedMethods: z
      .array(z.union([z.literal("x402"), z.literal("402")]))
      .optional(),
    acceptedCurrencies: z.array(z.string()).optional(),
    chainIds: z.array(z.number().int()).optional(),
    facilitator: z.string().optional(),
  })
  .strict();

export type PaymentConfig = z.infer<typeof PaymentConfigSchema>;

export const DiscoveryMetadataSchema = z
  .object({
    keywords: z.array(z.string()).optional(),
    category: z.string().optional(),
    useCases: z.array(z.string()).optional(),
    capabilities: z.array(z.string()).optional(),
    requirements: z.record(z.any()).optional(),
    pricing: z.record(z.any()).optional(),
    compatibility: z.record(z.any()).optional(),
    documentation: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .catchall(z.any());

export type DiscoveryMetadata = z.infer<typeof DiscoveryMetadataSchema>;

export const ToolMetadataOverridesSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    annotations: McpAnnotationsSchema.optional(),
    payment: PaymentConfigSchema.optional(),
    discovery: DiscoveryMetadataSchema.optional(),
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
  })
  .strict();

export type Tool = z.infer<typeof ToolSchema>;

export const AuthoredMetadataSchema = z
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
    requirements: z.record(z.any()).optional(),
    pricing: z.record(z.any()).optional(),
    compatibility: z.record(z.any()).optional(),
  })
  .catchall(z.any());

export type AuthoredMetadata = z.infer<typeof AuthoredMetadataSchema>;

export const MetadataSchema = z
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
  })
  .strict();

export type Metadata = z.infer<typeof MetadataSchema>;

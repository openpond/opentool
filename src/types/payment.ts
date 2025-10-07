import { z } from "zod";

export const PAYMENT_SCHEMA_VERSION = 1 as const;
export const paymentSchemaVersionSchema = z.literal(PAYMENT_SCHEMA_VERSION);
export type PaymentSchemaVersion = z.infer<typeof paymentSchemaVersionSchema>;

export const decimalStringSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, "Value must be a positive decimal string");

export const currencySchema = z.object({
  code: z
    .string()
    .min(2)
    .max(12)
    .transform((value) => value.toUpperCase()),
  symbol: z.string().min(1).max(6).optional(),
  decimals: z.number().int().min(0).max(36).optional(),
  kind: z.enum(["fiat", "crypto"]).default("crypto").optional(),
  description: z.string().optional(),
});
export type Currency = z.infer<typeof currencySchema>;

export const paymentAmountSchema = z.object({
  value: decimalStringSchema,
  currency: currencySchema,
  display: z.string().optional(),
});
export type PaymentAmount = z.infer<typeof paymentAmountSchema>;

export const cryptoAssetSchema = z.object({
  symbol: z.string().min(2).max(12),
  network: z.string().min(1).optional(),
  chainId: z.number().int().min(0).optional(),
  address: z.string().min(1).optional(),
  decimals: z.number().int().min(0).max(36).optional(),
  standard: z.enum(["erc20", "spl", "custom"]).default("erc20").optional(),
  description: z.string().optional(),
});
export type CryptoAsset = z.infer<typeof cryptoAssetSchema>;

export const facilitatorConfigSchema = z.object({
  url: z.string().url(),
  vendor: z.string().optional(),
  verifyPath: z.string().default("/verify").optional(),
  settlePath: z.string().default("/settle").optional(),
  apiKey: z.string().optional(),
  apiKeyEnv: z.string().optional(),
  apiKeyHeader: z.string().default("Authorization").optional(),
  headers: z.record(z.string(), z.string()).optional(),
  timeoutMs: z.number().int().positive().optional(),
});
export type FacilitatorConfig = z.infer<typeof facilitatorConfigSchema>;

export const settlementTermsSchema = z.object({
  windowSeconds: z.number().int().positive().optional(),
  targetConfirmations: z.number().int().positive().optional(),
  finalityDescription: z.string().optional(),
  slaDescription: z.string().optional(),
});
export type SettlementTerms = z.infer<typeof settlementTermsSchema>;

export const paymentFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean().default(true).optional(),
  description: z.string().optional(),
  example: z.string().optional(),
});
export type PaymentField = z.infer<typeof paymentFieldSchema>;

export const x402ProofSchema = z.object({
  mode: z.literal("x402"),
  scheme: z.string().min(1),
  network: z.string().min(1),
  version: z.number().int().min(1).optional(),
  facilitator: facilitatorConfigSchema.optional(),
  verifier: z.string().optional(),
});
export type X402ProofConfig = z.infer<typeof x402ProofSchema>;

export const directProofSchema = z.object({
  mode: z.literal("direct"),
  proofTypes: z.array(z.string().min(1)).nonempty(),
  verifier: z.string().optional(),
  instructions: z.string().optional(),
  fields: z.array(paymentFieldSchema).optional(),
  allowsManualReview: z.boolean().optional(),
});
export type DirectProofConfig = z.infer<typeof directProofSchema>;

export const paymentProofSchema = z.discriminatedUnion("mode", [
  x402ProofSchema,
  directProofSchema,
]);
export type PaymentProofConfig = z.infer<typeof paymentProofSchema>;

export const paymentOptionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  amount: paymentAmountSchema,
  asset: cryptoAssetSchema,
  payTo: z.string().min(1),
  resource: z.string().url().optional(),
  proof: paymentProofSchema,
  settlement: settlementTermsSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type PaymentOption = z.infer<typeof paymentOptionSchema>;

export const paymentRequirementsSchema = z.object({
  schemaVersion: paymentSchemaVersionSchema,
  message: z.string().optional(),
  title: z.string().optional(),
  resource: z.string().url().optional(),
  accepts: z.array(paymentOptionSchema).nonempty(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  fallbackText: z.string().optional(),
});
export type PaymentRequirementsDefinition = z.infer<
  typeof paymentRequirementsSchema
>;

export const x402PaymentHeaderSchema = z.object({
  x402Version: z.number().int().min(1),
  scheme: z.string().min(1),
  network: z.string().min(1),
  payload: z.unknown(),
  correlationId: z.string().optional(),
});
export type X402PaymentHeader = z.infer<typeof x402PaymentHeaderSchema>;

export const directPaymentPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  optionId: z.string().min(1),
  proofType: z.string().min(1),
  payload: z.unknown(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type DirectPaymentPayload = z.infer<typeof directPaymentPayloadSchema>;

export const paymentSuccessMetadataSchema = z.object({
  optionId: z.string().min(1),
  verifier: z.string().optional(),
  txHash: z.string().optional(),
  networkId: z.string().optional(),
  amount: paymentAmountSchema.optional(),
  settledAt: z.string().datetime().optional(),
  payload: z.unknown().optional(),
});
export type PaymentSuccessMetadata = z.infer<
  typeof paymentSuccessMetadataSchema
>;

export const paymentFailureSchema = z.object({
  reason: z.string().min(1),
  code: z
    .enum([
      "verifier_not_found",
      "verification_failed",
      "invalid_payload",
      "unsupported_option",
      "missing_header",
      "unknown",
    ])
    .default("unknown")
    .optional(),
  retryable: z.boolean().optional(),
  detail: z.unknown().optional(),
});
export type PaymentFailure = z.infer<typeof paymentFailureSchema>;

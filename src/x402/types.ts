import { z } from "zod";

export const X402_VERSION = 1;
export const HEADER_X402 = "X-PAYMENT";
export const HEADER_PAYMENT_RESPONSE = "X-PAYMENT-RESPONSE";

export const x402RequirementSchema = z.object({
  scheme: z.string().min(1),
  network: z.string().min(1),
  maxAmountRequired: z.string().min(1),
  asset: z.string().min(1),
  payTo: z.string().min(1),
  resource: z.string().optional(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  outputSchema: z.unknown().optional(),
  maxTimeoutSeconds: z.number().int().positive().optional(),
  extra: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type X402Requirement = z.infer<typeof x402RequirementSchema>;

export const x402PaymentHeaderSchema = z.object({
  x402Version: z.number().int().positive(),
  scheme: z.string().min(1),
  network: z.string().min(1),
  correlationId: z.string().optional(),
  payload: z.unknown(),
});

export type X402PaymentHeader = z.infer<typeof x402PaymentHeaderSchema>;

export interface X402RequirementsResponse {
  x402Version: number;
  error?: string;
  accepts: X402Requirement[];
}

export interface X402PaymentAttempt {
  type: "x402";
  headerName: typeof HEADER_X402;
  raw: string;
  payload: X402PaymentHeader;
}

export interface X402VerificationResult {
  success: boolean;
  metadata?: {
    optionId: string;
    verifier: string;
    [key: string]: unknown;
  };
  failure?: {
    reason: string;
    code: string;
  };
  responseHeaders?: Record<string, string>;
}

export interface X402FacilitatorConfig {
  url: string;
  verifyPath?: string;
  settlePath?: string;
  apiKeyHeader?: string;
}

export interface CurrencySpec {
  decimals: number;
  symbol: string;
  network: string;
  assetAddress: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencySpec> = {
  USDC: {
    decimals: 6,
    symbol: "USDC",
    network: "base",
    assetAddress: "0x833589fCD6eDb6E08f4c7C37b7b4c6e997E08A43",
  },
};

export const DEFAULT_FACILITATOR: X402FacilitatorConfig = {
  url: "https://facilitator.x402.rs",
  verifyPath: "/verify",
  settlePath: "/settle",
  apiKeyHeader: "Authorization",
};

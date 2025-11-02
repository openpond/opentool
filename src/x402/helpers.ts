import { z } from "zod";
import {
  HEADER_X402,
  HEADER_PAYMENT_RESPONSE,
  X402_VERSION,
  x402PaymentHeaderSchema,
  x402RequirementSchema,
  type X402PaymentAttempt,
  type X402Requirement,
  type X402VerificationResult,
  type X402FacilitatorConfig,
} from "./types";

export interface X402PaymentDefinition {
  amount: string;
  currency: { code: string; symbol: string; decimals: number };
  asset: { symbol: string; network: string; address: string; decimals: number };
  payTo: string;
  resource?: string;
  description?: string;
  scheme: string;
  network: string;
  facilitator: X402FacilitatorConfig;
  metadata?: Record<string, unknown>;
}

export function createX402PaymentRequired(
  definition: X402PaymentDefinition
): Response {
  const requirement = toX402Requirement(definition);

  // Build full payment requirements response
  const body = {
    schemaVersion: 1,
    message: definition.description ?? "Payment required",
    resource: definition.resource,
    accepts: [
      {
        id: "x402",
        title: `Pay ${definition.amount} ${definition.currency.code}`,
        description: definition.description,
        amount: {
          value: definition.amount,
          currency: {
            code: definition.currency.code,
            symbol: definition.currency.symbol,
            decimals: definition.currency.decimals,
            kind: "crypto",
          },
        },
        asset: {
          symbol: definition.asset.symbol,
          network: definition.asset.network,
          address: definition.asset.address,
          decimals: definition.asset.decimals,
          standard: "erc20",
        },
        payTo: definition.payTo,
        resource: definition.resource,
        proof: {
          mode: "x402",
          scheme: definition.scheme,
          network: definition.network,
          version: X402_VERSION,
          facilitator: definition.facilitator,
          verifier: "x402:facilitator",
        },
      },
    ],
    metadata: definition.metadata ?? {},
    x402: {
      x402Version: X402_VERSION,
      error: definition.description ?? "Payment required",
      accepts: [requirement],
    },
  };

  return new Response(JSON.stringify(body), {
    status: 402,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function extractX402Attempt(request: Request): X402PaymentAttempt | null {
  const raw = request.headers.get(HEADER_X402);
  if (!raw) {
    return null;
  }

  try {
    const payload = decodeJson(raw, x402PaymentHeaderSchema);
    return {
      type: "x402",
      headerName: HEADER_X402,
      raw,
      payload,
    };
  } catch {
    return null;
  }
}

export async function verifyX402Payment(
  attempt: X402PaymentAttempt,
  definition: X402PaymentDefinition,
  options: {
    settle?: boolean;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<X402VerificationResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const facilitator = definition.facilitator;

  const verifierUrl = new URL(
    facilitator.verifyPath ?? "/verify",
    ensureTrailingSlash(facilitator.url)
  ).toString();

  const requirement = toX402Requirement(definition);
  const headers = buildFacilitatorHeaders(facilitator);

  try {
    const verifyBody = {
      x402Version: attempt.payload.x402Version,
      paymentPayload: attempt.payload,
      paymentRequirements: requirement,
    };
    console.log("[x402] Calling facilitator /verify", {
      url: verifierUrl,
      bodyPreview: JSON.stringify(verifyBody).substring(0, 200)
    });
    const verifyResponse = await fetchImpl(verifierUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(verifyBody),
    });
    console.log("[x402] Facilitator /verify response", { status: verifyResponse.status });

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text().catch(() => "");
      console.error("[x402] Facilitator /verify error", { status: verifyResponse.status, body: errorText });
      return {
        success: false,
        failure: {
          reason: `Facilitator verify request failed: ${verifyResponse.status}${errorText ? ` - ${errorText}` : ""}`,
          code: "verification_failed",
        },
      };
    }

    const verifyPayload = (await verifyResponse.json()) as {
      isValid: boolean;
      invalidReason?: string | null;
    };

    if (!verifyPayload.isValid) {
      return {
        success: false,
        failure: {
          reason: verifyPayload.invalidReason ?? "Facilitator verification failed",
          code: "verification_failed",
        },
      };
    }

    const responseHeaders: Record<string, string> = {};
    if (options.settle) {
      const settleUrl = new URL(
        facilitator.settlePath ?? "/settle",
        ensureTrailingSlash(facilitator.url)
      ).toString();

      try {
        console.log("[x402] Calling facilitator /settle", { url: settleUrl });
        const settleResponse = await fetchImpl(settleUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            x402Version: attempt.payload.x402Version,
            paymentPayload: attempt.payload,
            paymentRequirements: requirement,
          }),
        });
        console.log("[x402] Facilitator /settle response", { status: settleResponse.status });

        if (!settleResponse.ok) {
          return {
            success: false,
            failure: {
              reason: `Facilitator settlement failed: ${settleResponse.status}`,
              code: "settlement_failed",
            },
          };
        }

        const settlePayload = (await settleResponse.json()) as {
          txHash?: string;
          [key: string]: unknown;
        };
        if (settlePayload.txHash) {
          responseHeaders[HEADER_PAYMENT_RESPONSE] = JSON.stringify({
            settled: true,
            txHash: settlePayload.txHash,
          });
        }
      } catch (error) {
        return {
          success: false,
          failure: {
            reason: error instanceof Error ? error.message : "Settlement failed",
            code: "settlement_failed",
          },
        };
      }
    }

    const result: X402VerificationResult = {
      success: true,
      metadata: {
        optionId: "x402",
        verifier: "x402:facilitator",
        amount: definition.amount,
        currency: definition.currency.code,
        network: definition.network,
      },
    };

    if (Object.keys(responseHeaders).length > 0) {
      result.responseHeaders = responseHeaders;
    }

    return result;
  } catch (error) {
    return {
      success: false,
      failure: {
        reason: error instanceof Error ? error.message : "Unknown error",
        code: "verification_failed",
      },
    };
  }
}

function toX402Requirement(definition: X402PaymentDefinition): X402Requirement {
  const decimals = definition.asset.decimals;
  const units = decimalToBaseUnits(definition.amount, decimals);

  return x402RequirementSchema.parse({
    scheme: definition.scheme,
    network: definition.network,
    maxAmountRequired: units,
    asset: definition.asset.address,
    payTo: definition.payTo,
    resource: definition.resource,
    description: definition.description,
    mimeType: "application/json",
    maxTimeoutSeconds: 900,
    extra: {
      symbol: definition.asset.symbol,
      currencyCode: definition.currency.code,
      decimals,
    },
  });
}

function decimalToBaseUnits(value: string, decimals: number): string {
  const [whole, fraction = ""] = value.split(".");
  const sanitizedFraction = fraction.slice(0, decimals);
  const paddedFraction = sanitizedFraction.padEnd(decimals, "0");
  const combined = `${whole}${paddedFraction}`.replace(/^0+/, "");
  return combined.length > 0 ? combined : "0";
}

function decodeJson<T>(value: string, schema: z.ZodSchema<T>): T {
  const base64 = normalizeBase64(value);
  const json = Buffer.from(base64, "base64").toString("utf-8");
  const parsed = JSON.parse(json);
  return schema.parse(parsed);
}

function normalizeBase64(input: string): string {
  if (/^[A-Za-z0-9+/=]+$/.test(input)) {
    return input;
  }
  const restored = input.replace(/-/g, "+").replace(/_/g, "/");
  const paddingNeeded = (4 - (restored.length % 4)) % 4;
  return restored + "=".repeat(paddingNeeded);
}

function buildFacilitatorHeaders(facilitator: X402FacilitatorConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (facilitator.apiKeyHeader && process.env.X402_FACILITATOR_API_KEY) {
    headers[facilitator.apiKeyHeader] = process.env.X402_FACILITATOR_API_KEY;
  }
  return headers;
}

function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

export const PAYMENT_HEADERS = [HEADER_X402, HEADER_PAYMENT_RESPONSE] as const;

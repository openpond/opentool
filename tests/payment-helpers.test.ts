import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPaymentRequiredBody,
  extractPaymentAttempts,
  PAYMENT_HEADERS,
  paymentRequiredResponse,
  verifyPayment,
} from "../src/helpers/payment";
import {
  PAYMENT_SCHEMA_VERSION,
  PaymentRequirementsDefinition,
} from "../src/types/payment";
import {
  definePayment,
  getPaymentContext,
  PaymentRequiredError,
  requirePayment,
  withPaymentRequirement,
} from "../src/payment/index";

const BASE_OPTION: PaymentRequirementsDefinition["accepts"][number] = {
  id: "base-usdc",
  title: "Access premium API",
  description: "Pay per call",
  amount: {
    value: "1.50",
    currency: { code: "usd", decimals: 2, symbol: "$", kind: "fiat" },
  },
  asset: {
    symbol: "USDC",
    network: "base",
    chainId: 8453,
    address: "0x0000000000000000000000000000000000000000",
    decimals: 6,
    standard: "erc20",
  },
  payTo: "0x1111111111111111111111111111111111111111",
  proof: {
    mode: "x402",
    scheme: "exact",
    network: "base",
    facilitator: {
      url: "https://facilitator.example/",
      apiKey: "secret",
    },
  },
  settlement: {
    windowSeconds: 60,
  },
};

test("createPaymentRequiredBody generates x402 requirements and response", () => {
  const definition: PaymentRequirementsDefinition = {
    schemaVersion: PAYMENT_SCHEMA_VERSION,
    message: "Payment required",
    resource: "https://api.example.com/premium",
    accepts: [BASE_OPTION],
  };

  const payload = createPaymentRequiredBody(definition);

  assert.equal(payload.accepts.length, 1);
  assert.ok(payload.x402, "expected x402 payload");
  assert.equal(payload.x402?.accepts.length, 1);
  assert.equal(payload.x402?.accepts[0]?.maxAmountRequired, "1500000");
  assert.equal(payload.x402?.accepts[0]?.payTo, BASE_OPTION.payTo);
  assert.equal(payload.x402?.error, "Payment required");
});

test("extractPaymentAttempts parses payment headers", () => {
  const x402HeaderValue = encodeHeader({
    x402Version: 1,
    scheme: "exact",
    network: "base",
    payload: { signature: "0xabc" },
  });

  const directHeaderValue = encodeHeader({
    schemaVersion: 1,
    optionId: "direct-option",
    proofType: "onchain-transaction",
    payload: { txHash: "0xdef" },
  });

  const request = new Request("https://example.com/tool", {
    method: "POST",
    headers: new Headers([
      [PAYMENT_HEADERS.x402, x402HeaderValue],
      [PAYMENT_HEADERS.direct, directHeaderValue],
    ]),
  });

  const { attempts, failures } = extractPaymentAttempts(request);
  assert.equal(failures.length, 0);
  assert.equal(attempts.length, 2);
  const x402Attempt = attempts.find((entry) => entry.type === "x402");
  assert.ok(x402Attempt);
  assert.equal(x402Attempt?.payload.scheme, "exact");
  const directAttempt = attempts.find((entry) => entry.type === "direct");
  assert.ok(directAttempt);
  assert.equal(directAttempt?.payload.optionId, "direct-option");
});

test("verifyPayment calls facilitator endpoints and returns metadata", async () => {
  const definition: PaymentRequirementsDefinition = {
    schemaVersion: PAYMENT_SCHEMA_VERSION,
    message: "Payment required",
    resource: "https://api.example.com/premium",
    accepts: [BASE_OPTION],
  };

  const headerValue = encodeHeader({
    x402Version: 1,
    scheme: "exact",
    network: "base",
    payload: { signature: "0xabc" },
  });

  const attempts = extractPaymentAttempts(
    new Request("https://example.com", {
      method: "POST",
      headers: new Headers([[PAYMENT_HEADERS.x402, headerValue]]),
    })
  ).attempts;

  let verifyCalls = 0;
  let settleCalls = 0;
  const fetchImpl: typeof fetch = async (url, init) => {
    if (String(url).includes("/verify")) {
      verifyCalls += 1;
      return new Response(JSON.stringify({ isValid: true }), { status: 200 });
    }
    if (String(url).includes("/settle")) {
      settleCalls += 1;
      return new Response(
        JSON.stringify({ success: true, txHash: "0x123", networkId: "base" }),
        { status: 200 }
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const result = await verifyPayment({
    definition,
    attempts,
    settle: true,
    fetchImpl,
  });

  assert.equal(verifyCalls, 1);
  assert.equal(settleCalls, 1);
  assert.equal(result.success, true);
  assert.equal(result.metadata?.txHash, "0x123");
  assert.ok(result.responseHeaders?.[PAYMENT_HEADERS.response]);
});

test("paymentRequiredResponse produces HTTP 402 with JSON body", async () => {
  const definition: PaymentRequirementsDefinition = {
    schemaVersion: PAYMENT_SCHEMA_VERSION,
    message: "Payment required",
    accepts: [BASE_OPTION],
  };

  const response = paymentRequiredResponse(definition);
  assert.equal(response.status, 402);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  const body = await response.json();
  assert.equal(body.schemaVersion, PAYMENT_SCHEMA_VERSION);
});

test("requirePayment succeeds with defined payment configuration", async () => {
  const payment = definePayment({
    amount: "1.00",
    payTo: "0x1111111111111111111111111111111111111111",
    direct: {
      id: "demo",
      token: "demo-access",
    },
  });

  const headerValue = encodeHeader({
    schemaVersion: 1,
    optionId: "demo",
    proofType: "demo",
    payload: { token: "demo-access" },
  });

  const request = new Request("https://example.com", {
    method: "POST",
    headers: new Headers([[PAYMENT_HEADERS.direct, headerValue]]),
  });

  const result = await requirePayment(request, payment);
  assert.ok(!(result instanceof Response));
  if (!(result instanceof Response)) {
    assert.equal(result.payment.optionId, "demo");
    assert.equal(result.payment.verifier, "direct:demo");
  }
});

test("requirePayment throws PaymentRequiredError when missing header", async () => {
  const payment = definePayment({
    amount: "1.00",
    payTo: "0x1111111111111111111111111111111111111111",
    direct: {
      id: "demo",
      token: "demo-access",
    },
  });

  const request = new Request("https://example.com", { method: "POST" });

  await assert.rejects(async () => {
    await requirePayment(request, payment);
  }, PaymentRequiredError);
});

test("withPaymentRequirement enforces payment automatically", async () => {
  const payment = definePayment({
    amount: "1.00",
    payTo: "0x1111111111111111111111111111111111111111",
    direct: {
      id: "demo",
      token: "demo-access",
    },
  });

  const handler = withPaymentRequirement(async (request: Request) => {
    const context = getPaymentContext(request);
    assert.ok(context);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    });
  }, payment);

  const missingHeaderRequest = new Request("https://example.com", {
    method: "POST",
  });

  await assert.rejects(async () => {
    await handler(missingHeaderRequest);
  }, PaymentRequiredError);

  const headerValue = encodeHeader({
    schemaVersion: 1,
    optionId: "demo",
    proofType: "demo",
    payload: { token: "demo-access" },
  });

  const authedRequest = new Request("https://example.com", {
    method: "POST",
    headers: new Headers([[PAYMENT_HEADERS.direct, headerValue]]),
  });

  const response = await handler(authedRequest);
  assert.equal(response.status, 200);
  const cloned = response.clone();
  const body = await cloned.json();
  assert.ok(body.success);
  const context = getPaymentContext(authedRequest);
  assert.ok(context);
  assert.equal(context?.payment.optionId, "demo");
});

function encodeHeader(value: unknown): string {
  const json = JSON.stringify(value);
  return Buffer.from(json, "utf-8").toString("base64");
}

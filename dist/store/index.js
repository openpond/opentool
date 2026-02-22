// src/store/index.ts
var STORE_EVENT_LEVELS = [
  "decision",
  "execution",
  "lifecycle"
];
var STORE_EVENT_LEVEL_SET = new Set(STORE_EVENT_LEVELS);
var MARKET_REQUIRED_ACTIONS = [
  "swap",
  "bridge",
  "order",
  "trade",
  "lend",
  "borrow",
  "repay",
  "stake",
  "unstake",
  "withdraw",
  "provide_liquidity",
  "remove_liquidity",
  "claim"
];
var MARKET_REQUIRED_ACTIONS_SET = new Set(MARKET_REQUIRED_ACTIONS);
var EXECUTION_ACTIONS_SET = new Set(MARKET_REQUIRED_ACTIONS);
var StoreError = class extends Error {
  constructor(message, status, causeData) {
    super(message);
    this.status = status;
    this.causeData = causeData;
    this.name = "StoreError";
  }
};
var normalizeAction = (action) => {
  const normalized = action?.trim().toLowerCase();
  return normalized ? normalized : null;
};
var coerceEventLevel = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized || !STORE_EVENT_LEVEL_SET.has(normalized)) return null;
  return normalized;
};
var requiresMarketIdentity = (input) => {
  const action = normalizeAction(input.action);
  if (!action) return false;
  return MARKET_REQUIRED_ACTIONS_SET.has(action);
};
var hasMarketIdentity = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value;
  const requiredKeys = ["market_type", "venue", "environment", "canonical_symbol"];
  return requiredKeys.every((key) => {
    const field = record[key];
    return typeof field === "string" && field.trim().length > 0;
  });
};
var resolveEventLevel = (input) => {
  const direct = coerceEventLevel(input.eventLevel);
  if (direct) return direct;
  const metadataLevel = coerceEventLevel(input.metadata?.eventLevel);
  if (metadataLevel) return metadataLevel;
  const action = normalizeAction(input.action);
  if (action && EXECUTION_ACTIONS_SET.has(action) && (input.metadata?.lifecycle === true || typeof input.metadata?.executionRef === "string" || typeof input.metadata?.parentExecutionRef === "string")) {
    return "lifecycle";
  }
  if (action && EXECUTION_ACTIONS_SET.has(action) || hasMarketIdentity(input.market)) {
    return "execution";
  }
  if (action) return "decision";
  return null;
};
var normalizeStoreInput = (input) => {
  const metadata = { ...input.metadata ?? {} };
  const eventLevel = resolveEventLevel({ ...input, metadata });
  if (eventLevel) {
    metadata.eventLevel = eventLevel;
  }
  const hasMetadata = Object.keys(metadata).length > 0;
  return {
    ...input,
    ...eventLevel ? { eventLevel } : {},
    ...hasMetadata ? { metadata } : {}
  };
};
function resolveConfig(options) {
  const baseUrl = options?.baseUrl ?? process.env.BASE_URL ?? "https://api.openpond.ai";
  const apiKey = options?.apiKey ?? process.env.OPENPOND_API_KEY;
  if (!baseUrl) {
    throw new StoreError("BASE_URL is required to store activity events");
  }
  if (!apiKey) {
    throw new StoreError(
      "OPENPOND_API_KEY is required to store activity events"
    );
  }
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  const fetchFn = options?.fetchFn ?? globalThis.fetch;
  if (!fetchFn) {
    throw new StoreError("Fetch is not available in this environment");
  }
  return { baseUrl: normalizedBaseUrl, apiKey, fetchFn };
}
async function requestJson(url, options, init) {
  const { apiKey, fetchFn } = resolveConfig(options);
  const response = await fetchFn(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      "openpond-api-key": apiKey,
      ...init.headers ?? {}
    }
  });
  if (!response.ok) {
    let body;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => void 0);
    }
    throw new StoreError(
      `Request failed with status ${response.status}`,
      response.status,
      body
    );
  }
  if (response.status === 204) {
    return null;
  }
  try {
    return await response.json();
  } catch {
    return await response.text().catch(() => null);
  }
}
async function store(input, options) {
  const normalizedInput = normalizeStoreInput(input);
  const eventLevel = normalizedInput.eventLevel;
  const normalizedAction = normalizeAction(normalizedInput.action);
  if (eventLevel === "execution" || eventLevel === "lifecycle") {
    if (!normalizedAction || !EXECUTION_ACTIONS_SET.has(normalizedAction)) {
      throw new StoreError(
        `eventLevel "${eventLevel}" requires an execution action`
      );
    }
  }
  if (eventLevel === "execution" && !hasMarketIdentity(normalizedInput.market)) {
    throw new StoreError(
      `market is required for execution events. market must include market_type, venue, environment, canonical_symbol`
    );
  }
  const shouldApplyLegacyMarketRule = eventLevel == null || eventLevel === "execution";
  if (shouldApplyLegacyMarketRule && requiresMarketIdentity(normalizedInput) && !hasMarketIdentity(normalizedInput.market)) {
    throw new StoreError(
      `market is required for action "${normalizedInput.action}". market must include market_type, venue, environment, canonical_symbol`
    );
  }
  const { baseUrl, apiKey, fetchFn } = resolveConfig(options);
  const url = `${baseUrl}/apps/positions/tx`;
  let response;
  try {
    response = await fetchFn(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "openpond-api-key": apiKey
      },
      body: JSON.stringify(normalizedInput)
    });
  } catch (error) {
    throw new StoreError("Failed to reach store endpoint", void 0, error);
  }
  if (!response.ok) {
    let body;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => void 0);
    }
    throw new StoreError(
      `Store request failed with status ${response.status}`,
      response.status,
      body
    );
  }
  try {
    const data = await response.json();
    return {
      id: data.id ?? "",
      status: data.status ?? null
    };
  } catch {
    return { id: "", status: null };
  }
}
async function retrieve(params, options) {
  const { baseUrl, apiKey, fetchFn } = resolveConfig(options);
  const url = new URL(`${baseUrl}/apps/positions/tx`);
  if (params?.source) url.searchParams.set("source", params.source);
  if (params?.walletAddress) url.searchParams.set("walletAddress", params.walletAddress);
  if (params?.symbol) url.searchParams.set("symbol", params.symbol);
  if (params?.status?.length) url.searchParams.set("status", params.status.join(","));
  if (typeof params?.since === "number") url.searchParams.set("since", params.since.toString());
  if (typeof params?.until === "number") url.searchParams.set("until", params.until.toString());
  if (typeof params?.limit === "number") url.searchParams.set("limit", params.limit.toString());
  if (params?.cursor) url.searchParams.set("cursor", params.cursor);
  if (params?.history) url.searchParams.set("history", "true");
  let response;
  try {
    response = await fetchFn(url.toString(), {
      method: "GET",
      headers: {
        "content-type": "application/json",
        "openpond-api-key": apiKey
      }
    });
  } catch (error) {
    throw new StoreError("Failed to reach store endpoint", void 0, error);
  }
  if (!response.ok) {
    let body;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => void 0);
    }
    throw new StoreError(
      `Store retrieve failed with status ${response.status}`,
      response.status,
      body
    );
  }
  const data = await response.json().catch(() => null);
  if (!data) {
    return { items: [], cursor: null };
  }
  return data;
}
async function getMyTools(options) {
  const { baseUrl } = resolveConfig(options);
  const url = `${baseUrl}/apps/tools`;
  const data = await requestJson(url, options, { method: "GET" });
  return data;
}
async function getMyPerformance(options) {
  const { baseUrl } = resolveConfig(options);
  const url = `${baseUrl}/apps/performance`;
  return requestJson(url, options, { method: "GET" });
}
async function postAgentDigest(input, options) {
  const { baseUrl } = resolveConfig(options);
  const url = `${baseUrl}/apps/agent/digest`;
  return requestJson(url, options, {
    method: "POST",
    body: JSON.stringify(input)
  });
}
async function executeTool(input, options) {
  const { baseUrl } = resolveConfig(options);
  const url = `${baseUrl}/apps/tools/execute`;
  const data = await requestJson(url, options, {
    method: "POST",
    body: JSON.stringify(input)
  });
  return data;
}

export { StoreError, executeTool, getMyPerformance, getMyTools, postAgentDigest, retrieve, store };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
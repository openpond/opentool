type StoreStatus =
  | "submitted"
  | "pending"
  | "confirmed"
  | "failed"
  | "cancelled"
  | "filled"
  | "partial_fill"
  | "settled"
  | "info";

const STORE_EVENT_LEVELS = [
  "decision",
  "execution",
  "lifecycle",
] as const;

const STORE_EVENT_LEVEL_SET = new Set<string>(STORE_EVENT_LEVELS);

const CANONICAL_STORE_ACTIONS = [
  "stake",
  "unstake",
  "swap",
  "bridge",
  "order",
  "trade",
  "lend",
  "borrow",
  "repay",
  "withdraw",
  "provide_liquidity",
  "remove_liquidity",
  "claim",
  "custom",
] as const;

const MARKET_REQUIRED_ACTIONS = [
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
  "claim",
] as const;

const MARKET_REQUIRED_ACTIONS_SET = new Set<string>(MARKET_REQUIRED_ACTIONS);
const EXECUTION_ACTIONS_SET = new Set<string>(MARKET_REQUIRED_ACTIONS);

export type StoreAction =
  | (typeof CANONICAL_STORE_ACTIONS)[number]
  | string;

export type StoreEventLevel = (typeof STORE_EVENT_LEVELS)[number];

type ChainScope =
  | { chainId: number; network?: never }
  | { network: string; chainId?: never }
  | { chainId?: never; network?: never };

export type StoreEventInput = ChainScope & {
  source: string;
  ref: string;
  status: StoreStatus;
  walletAddress?: `0x${string}`;
  action?: StoreAction;
  eventLevel?: StoreEventLevel;
  notional?: string; // decimal string recommended to avoid float precision issues
  metadata?: Record<string, unknown>;
  market?: Record<string, unknown>;
};

export interface StoreOptions {
  baseUrl?: string;
  apiKey?: string;
  fetchFn?: typeof fetch;
}

export interface StoreResponse {
  id: string;
  status?: StoreStatus | null;
}

export type StoreRetrieveParams = {
  source?: string;
  walletAddress?: `0x${string}`;
  symbol?: string;
  status?: StoreStatus[];
  since?: number;
  until?: number;
  limit?: number;
  cursor?: string;
  history?: boolean;
};

export type StoreRetrieveResult = {
  items: Array<
    StoreEventInput & {
      timestamp?: number;
      updatedBy?: string | null;
      signerKeyId?: string | null;
    }
  >;
  cursor?: string | null;
};

export type MyToolsResponse = {
  tools: Array<{
    id: string;
    name: string;
    displayName: string;
    description?: string;
    serverUrl: string;
    source: "internal" | "public";
    appId?: string;
    deploymentId?: string;
    metadata?: unknown;
  }>;
};

export type ToolExecuteRequest = {
  appId: string;
  deploymentId: string;
  toolName: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

export type ToolExecuteResponse = {
  ok: boolean;
  status: number;
  data: unknown;
};

export type AgentDigestRequest = {
  content: string;
  runAt?: string;
  metadata?: Record<string, unknown>;
};
export class StoreError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly causeData?: unknown
  ) {
    super(message);
    this.name = "StoreError";
  }
}

const normalizeAction = (
  action: string | null | undefined
): string | null => {
  const normalized = action?.trim().toLowerCase();
  return normalized ? normalized : null;
};

const coerceEventLevel = (value: unknown): StoreEventLevel | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized || !STORE_EVENT_LEVEL_SET.has(normalized)) return null;
  return normalized as StoreEventLevel;
};

const requiresMarketIdentity = (input: StoreEventInput): boolean => {
  const action = normalizeAction(input.action);
  if (!action) return false;
  return MARKET_REQUIRED_ACTIONS_SET.has(action);
};

const hasMarketIdentity = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const requiredKeys = ["market_type", "venue", "environment", "canonical_symbol"] as const;
  return requiredKeys.every((key) => {
    const field = record[key];
    return typeof field === "string" && field.trim().length > 0;
  });
};

const resolveEventLevel = (input: StoreEventInput): StoreEventLevel | null => {
  const direct = coerceEventLevel(input.eventLevel);
  if (direct) return direct;

  const metadataLevel = coerceEventLevel(input.metadata?.eventLevel);
  if (metadataLevel) return metadataLevel;

  const action = normalizeAction(input.action);
  if (
    action &&
    EXECUTION_ACTIONS_SET.has(action) &&
    (input.metadata?.lifecycle === true ||
      typeof input.metadata?.executionRef === "string" ||
      typeof input.metadata?.parentExecutionRef === "string")
  ) {
    return "lifecycle";
  }
  if ((action && EXECUTION_ACTIONS_SET.has(action)) || hasMarketIdentity(input.market)) {
    return "execution";
  }
  if (action) return "decision";

  return null;
};

const normalizeStoreInput = (input: StoreEventInput): StoreEventInput => {
  const metadata = { ...(input.metadata ?? {}) };
  const eventLevel = resolveEventLevel({ ...input, metadata });
  if (eventLevel) {
    metadata.eventLevel = eventLevel;
  }
  const hasMetadata = Object.keys(metadata).length > 0;
  return {
    ...input,
    ...(eventLevel ? { eventLevel } : {}),
    ...(hasMetadata ? { metadata } : {}),
  };
};

function resolveConfig(options?: StoreOptions) {
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

async function requestJson(
  url: string,
  options: StoreOptions | undefined,
  init: RequestInit
): Promise<unknown> {
  const { apiKey, fetchFn } = resolveConfig(options);
  const response = await fetchFn(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      "openpond-api-key": apiKey,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => undefined);
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

/**
 * Store a generic activity event (onchain tx, Hyperliquid order, etc.) in OpenPond.
 */
export async function store(
  input: StoreEventInput,
  options?: StoreOptions
): Promise<StoreResponse> {
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
  const shouldApplyLegacyMarketRule =
    eventLevel == null || eventLevel === "execution";
  if (
    shouldApplyLegacyMarketRule &&
    requiresMarketIdentity(normalizedInput) &&
    !hasMarketIdentity(normalizedInput.market)
  ) {
    throw new StoreError(
      `market is required for action "${normalizedInput.action}". market must include market_type, venue, environment, canonical_symbol`
    );
  }
  const { baseUrl, apiKey, fetchFn } = resolveConfig(options);

  const url = `${baseUrl}/apps/positions/tx`;

  let response: Response;
  try {
    response = await fetchFn(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "openpond-api-key": apiKey,
      },
      body: JSON.stringify(normalizedInput),
    });
  } catch (error) {
    throw new StoreError("Failed to reach store endpoint", undefined, error);
  }

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => undefined);
    }
    throw new StoreError(
      `Store request failed with status ${response.status}`,
      response.status,
      body
    );
  }

  try {
    const data = (await response.json()) as Partial<StoreResponse>;
    return {
      id: data.id ?? "",
      status: data.status ?? null,
    };
  } catch {
    // Response is optional; return empty success
    return { id: "", status: null };
  }
}

/**
 * Retrieve stored activity events for an app.
 */
export async function retrieve(
  params?: StoreRetrieveParams,
  options?: StoreOptions
): Promise<StoreRetrieveResult> {
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

  let response: Response;
  try {
    response = await fetchFn(url.toString(), {
      method: "GET",
      headers: {
        "content-type": "application/json",
        "openpond-api-key": apiKey,
      },
    });
  } catch (error) {
    throw new StoreError("Failed to reach store endpoint", undefined, error);
  }

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => undefined);
    }
    throw new StoreError(
      `Store retrieve failed with status ${response.status}`,
      response.status,
      body
    );
  }

  const data = (await response.json().catch(() => null)) as StoreRetrieveResult | null;
  if (!data) {
    return { items: [], cursor: null };
  }
  return data;
}

export async function getMyTools(options?: StoreOptions): Promise<MyToolsResponse> {
  const { baseUrl } = resolveConfig(options);
  const url = `${baseUrl}/apps/tools`;
  const data = (await requestJson(url, options, { method: "GET" })) as MyToolsResponse;
  return data;
}

export async function getMyPerformance(options?: StoreOptions): Promise<unknown> {
  const { baseUrl } = resolveConfig(options);
  const url = `${baseUrl}/apps/performance`;
  return requestJson(url, options, { method: "GET" });
}

export async function postAgentDigest(
  input: AgentDigestRequest,
  options?: StoreOptions
): Promise<unknown> {
  const { baseUrl } = resolveConfig(options);
  const url = `${baseUrl}/apps/agent/digest`;
  return requestJson(url, options, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function executeTool(
  input: ToolExecuteRequest,
  options?: StoreOptions
): Promise<ToolExecuteResponse> {
  const { baseUrl } = resolveConfig(options);
  const url = `${baseUrl}/apps/tools/execute`;
  const data = (await requestJson(url, options, {
    method: "POST",
    body: JSON.stringify(input),
  })) as ToolExecuteResponse;
  return data;
}

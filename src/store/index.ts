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

export type StoreAction =
  | "stake"
  | "swap"
  | "bridge"
  | "order"
  | "lend"
  | "repay"
  | "withdraw"
  | "custom"
  | string;

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

const requiresMarketIdentity = (input: StoreEventInput): boolean => {
  const action = (input.action ?? "").toLowerCase();
  if (action === "order" || action === "swap" || action === "trade") return true;
  return false;
};

const hasMarketIdentity = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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
  if (requiresMarketIdentity(input) && !hasMarketIdentity(input.market)) {
    throw new StoreError("market is required for trade events");
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
      body: JSON.stringify(input),
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

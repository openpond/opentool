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

function resolveConfig(options?: StoreOptions) {
  const baseUrl = options?.baseUrl ?? process.env.BASE_URL;
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

/**
 * Store a generic activity event (onchain tx, Hyperliquid order, etc.) in OpenPond.
 */
export async function store(
  input: StoreEventInput,
  options?: StoreOptions
): Promise<StoreResponse> {
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

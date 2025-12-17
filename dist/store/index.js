// src/store/index.ts
var StoreError = class extends Error {
  constructor(message, status, causeData) {
    super(message);
    this.status = status;
    this.causeData = causeData;
    this.name = "StoreError";
  }
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
async function store(input, options) {
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
      body: JSON.stringify(input)
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

export { StoreError, retrieve, store };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map
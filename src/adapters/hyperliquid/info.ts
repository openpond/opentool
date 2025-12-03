import {
  API_BASES,
  HyperliquidApiError,
  HyperliquidEnvironment,
  normalizeAddress,
} from "./base";

type InfoPayload =
  | { type: "meta" }
  | { type: "metaAndAssetCtxs" }
  | { type: "spotMeta" }
  | { type: "spotMetaAndAssetCtxs" }
  | { type: "assetCtxs" }
  | { type: "spotAssetCtxs" }
  | { type: "openOrders"; user: `0x${string}` }
  | { type: "frontendOpenOrders"; user: `0x${string}` }
  | { type: "orderStatus"; user: `0x${string}`; oid: number | string }
  | { type: "historicalOrders"; user: `0x${string}` }
  | { type: "userHistoricalOrders"; user: `0x${string}` }
  | { type: "userFills"; user: `0x${string}` }
  | {
      type: "userFillsByTime";
      user: `0x${string}`;
      startTime: number;
      endTime: number;
    }
  | { type: "userRateLimit"; user: `0x${string}` }
  | { type: "preTransferCheck"; user: `0x${string}`; source: `0x${string}` }
  | { type: "spotClearinghouseState"; user: `0x${string}` };

async function postInfo(environment: HyperliquidEnvironment, payload: InfoPayload) {
  const baseUrl = API_BASES[environment];
  const response = await fetch(`${baseUrl}/info`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new HyperliquidApiError(
      "Hyperliquid info request failed.",
      data ?? { status: response.status }
    );
  }
  return data;
}

export class HyperliquidInfoClient {
  private readonly environment: HyperliquidEnvironment;

  constructor(environment: HyperliquidEnvironment = "mainnet") {
    this.environment = environment;
  }

  meta() {
    return fetchHyperliquidMeta(this.environment);
  }

  metaAndAssetCtxs() {
    return fetchHyperliquidMetaAndAssetCtxs(this.environment);
  }

  spotMeta() {
    return fetchHyperliquidSpotMeta(this.environment);
  }

  spotMetaAndAssetCtxs() {
    return fetchHyperliquidSpotMetaAndAssetCtxs(this.environment);
  }

  assetCtxs() {
    return fetchHyperliquidAssetCtxs(this.environment);
  }

  spotAssetCtxs() {
    return fetchHyperliquidSpotAssetCtxs(this.environment);
  }

  openOrders(user: `0x${string}`) {
    return fetchHyperliquidOpenOrders({ user, environment: this.environment });
  }

  frontendOpenOrders(user: `0x${string}`) {
    return fetchHyperliquidFrontendOpenOrders({
      user,
      environment: this.environment,
    });
  }

  orderStatus(user: `0x${string}`, oid: number | string) {
    return fetchHyperliquidOrderStatus({
      user,
      oid,
      environment: this.environment,
    });
  }

  historicalOrders(user: `0x${string}`) {
    return fetchHyperliquidHistoricalOrders({
      user,
      environment: this.environment,
    });
  }

  userFills(user: `0x${string}`) {
    return fetchHyperliquidUserFills({ user, environment: this.environment });
  }

  userFillsByTime(user: `0x${string}`, startTime: number, endTime: number) {
    return fetchHyperliquidUserFillsByTime({
      user,
      startTime,
      endTime,
      environment: this.environment,
    });
  }

  userRateLimit(user: `0x${string}`) {
    return fetchHyperliquidUserRateLimit({
      user,
      environment: this.environment,
    });
  }

  preTransferCheck(user: `0x${string}`, source: `0x${string}`) {
    return fetchHyperliquidPreTransferCheck({
      user,
      source,
      environment: this.environment,
    });
  }

  spotClearinghouseState(user: `0x${string}`) {
    return fetchHyperliquidSpotClearinghouseState({
      user,
      environment: this.environment,
    });
  }
}

export async function fetchHyperliquidMeta(environment: HyperliquidEnvironment = "mainnet") {
  return postInfo(environment, { type: "meta" });
}

export async function fetchHyperliquidMetaAndAssetCtxs(
  environment: HyperliquidEnvironment = "mainnet"
) {
  return postInfo(environment, { type: "metaAndAssetCtxs" });
}

export async function fetchHyperliquidSpotMeta(
  environment: HyperliquidEnvironment = "mainnet"
) {
  return postInfo(environment, { type: "spotMeta" });
}

export async function fetchHyperliquidSpotMetaAndAssetCtxs(
  environment: HyperliquidEnvironment = "mainnet"
) {
  return postInfo(environment, { type: "spotMetaAndAssetCtxs" });
}

export async function fetchHyperliquidAssetCtxs(
  environment: HyperliquidEnvironment = "mainnet"
) {
  return postInfo(environment, { type: "assetCtxs" });
}

export async function fetchHyperliquidSpotAssetCtxs(
  environment: HyperliquidEnvironment = "mainnet"
) {
  return postInfo(environment, { type: "spotAssetCtxs" });
}

export async function fetchHyperliquidOpenOrders(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
}) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, { type: "openOrders", user: normalizeAddress(params.user) });
}

export async function fetchHyperliquidFrontendOpenOrders(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
}) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "frontendOpenOrders",
    user: normalizeAddress(params.user),
  });
}

export async function fetchHyperliquidOrderStatus(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
  oid: number | string;
}) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "orderStatus",
    user: normalizeAddress(params.user),
    oid: params.oid,
  });
}

export async function fetchHyperliquidHistoricalOrders(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
}) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "historicalOrders",
    user: normalizeAddress(params.user),
  });
}

export async function fetchHyperliquidUserFills(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
}) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "userFills",
    user: normalizeAddress(params.user),
  });
}

export async function fetchHyperliquidUserFillsByTime(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
  startTime: number;
  endTime: number;
}) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "userFillsByTime",
    user: normalizeAddress(params.user),
    startTime: params.startTime,
    endTime: params.endTime,
  });
}

export async function fetchHyperliquidUserRateLimit(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
}) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "userRateLimit",
    user: normalizeAddress(params.user),
  });
}

export async function fetchHyperliquidPreTransferCheck(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
  source: `0x${string}`;
}) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "preTransferCheck",
    user: normalizeAddress(params.user),
    source: normalizeAddress(params.source),
  });
}

export async function fetchHyperliquidSpotClearinghouseState(params: {
  environment?: HyperliquidEnvironment;
  user: `0x${string}`;
}) {
  const env = params.environment ?? "mainnet";
  return postInfo(env, {
    type: "spotClearinghouseState",
    user: normalizeAddress(params.user),
  });
}

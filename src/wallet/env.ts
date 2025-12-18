export type TurnkeyEnvConfig = {
  organizationId: string;
  apiPublicKey: string;
  apiPrivateKey: string;
  signWith: string;
  apiBaseUrl?: string;
};

function readTrimmed(name: string): string | undefined {
  const value = process.env[name];
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length ? trimmed : undefined;
}

/**
 * Reads Turnkey configuration from environment variables.
 */
export function readTurnkeyEnv(): TurnkeyEnvConfig | undefined {
  const suborgId = readTrimmed("TURNKEY_SUBORG_ID");
  if (!suborgId) return undefined;

  const apiPublicKey = readTrimmed("TURNKEY_API_PUBLIC_KEY");
  const apiPrivateKey = readTrimmed("TURNKEY_API_PRIVATE_KEY");
  const signWith = readTrimmed("TURNKEY_WALLET_ADDRESS");
  if (!apiPublicKey || !apiPrivateKey || !signWith) return undefined;

  const apiBaseUrl = readTrimmed("TURNKEY_API_BASE_URL");

  return {
    organizationId: suborgId,
    apiPublicKey,
    apiPrivateKey,
    signWith,
    ...(apiBaseUrl ? { apiBaseUrl } : {}),
  };
}

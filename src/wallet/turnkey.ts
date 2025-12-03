export interface TurnkeyCredentials {
  organizationId: string;
  apiPublicKey: string;
  apiPrivateKey: string;
  apiBaseUrl?: string;
}

export interface TurnkeyWalletConfig extends TurnkeyCredentials {
  walletId?: string;
}

// Placeholder implementation to be replaced in the wallet integration work.
export function createTurnkeyWalletClient(_config: TurnkeyWalletConfig) {
  throw new Error("Turnkey wallet support is not implemented yet");
}

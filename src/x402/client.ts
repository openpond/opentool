import { createWalletClient, http, type Address, type PrivateKeyAccount, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

export interface X402ClientConfig {
  privateKey: `0x${string}`;
  rpcUrl?: string;
}

export interface X402PayRequest {
  url: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface X402PayResult {
  success: boolean;
  response?: Response;
  error?: string;
  paymentDetails?: {
    amount: string;
    currency: string;
    network: string;
    signature: string;
  };
}

export class X402Client {
  private account: PrivateKeyAccount;
  private walletClient: ReturnType<typeof createWalletClient>;

  constructor(config: X402ClientConfig) {
    this.account = privateKeyToAccount(config.privateKey);

    // Support both base and base-sepolia
    const chain = baseSepolia;
    this.walletClient = createWalletClient({
      account: this.account,
      chain,
      transport: http(config.rpcUrl),
    });
  }

  async pay(request: X402PayRequest): Promise<X402PayResult> {
    try {
      // Step 1: Make initial request to get 402 response
      const initialResponse = await fetch(request.url, {
        method: request.method ?? "POST",
        headers: {
          "Content-Type": "application/json",
          ...request.headers,
        },
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });

      // If not 402, return the response directly
      if (initialResponse.status !== 402) {
        return {
          success: initialResponse.ok,
          response: initialResponse,
        };
      }

      // Step 2: Parse payment requirements
      const paymentRequirements = await initialResponse.json();
      const x402Requirements = paymentRequirements.x402?.accepts?.[0];

      if (!x402Requirements) {
        return {
          success: false,
          error: "No x402 payment requirements found in 402 response",
        };
      }

      // Step 3: Generate EIP-3009 authorization
      const authorization = await this.signTransferAuthorization({
        from: this.account.address,
        to: x402Requirements.payTo as Address,
        value: BigInt(x402Requirements.maxAmountRequired),
        validAfter: BigInt(Math.floor(Date.now() / 1000)),
        validBefore: BigInt(Math.floor(Date.now() / 1000) + 900), // 15 min
        nonce: `0x${Array.from({ length: 32 }, () =>
          Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join('')}` as `0x${string}`,
        tokenAddress: x402Requirements.asset as Address,
      });

      // Step 4: Build X-PAYMENT header
      const paymentProof = {
        x402Version: 1,
        scheme: x402Requirements.scheme,
        network: x402Requirements.network,
        correlationId: "",
        payload: {
          signature: authorization.signature,
          authorization: {
            from: authorization.from,
            to: authorization.to,
            value: authorization.value.toString(),
            validAfter: authorization.validAfter.toString(),
            validBefore: authorization.validBefore.toString(),
            nonce: authorization.nonce,
          },
        },
      };

      const paymentHeader = Buffer.from(JSON.stringify(paymentProof)).toString("base64");

      // Step 5: Retry request with payment
      const paidResponse = await fetch(request.url, {
        method: request.method ?? "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PAYMENT": paymentHeader,
          ...request.headers,
        },
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });

      return {
        success: paidResponse.ok,
        response: paidResponse,
        paymentDetails: {
          amount: x402Requirements.maxAmountRequired,
          currency: x402Requirements.extra?.currencyCode ?? "USDC",
          network: x402Requirements.network,
          signature: authorization.signature,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async signTransferAuthorization(params: {
    from: Address;
    to: Address;
    value: bigint;
    validAfter: bigint;
    validBefore: bigint;
    nonce: `0x${string}`;
    tokenAddress: Address;
  }) {
    if (!this.walletClient.chain) {
      throw new Error("Wallet client chain not configured");
    }

    const domain = {
      name: "USD Coin",
      version: "2",
      chainId: this.walletClient.chain.id,
      verifyingContract: params.tokenAddress,
    };

    const types = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    };

    const message = {
      from: params.from,
      to: params.to,
      value: params.value,
      validAfter: params.validAfter,
      validBefore: params.validBefore,
      nonce: params.nonce,
    };

    const signature = await this.walletClient.signTypedData({
      account: this.account,
      domain,
      types,
      primaryType: "TransferWithAuthorization",
      message,
    });

    return {
      signature,
      from: params.from,
      to: params.to,
      value: params.value,
      validAfter: params.validAfter,
      validBefore: params.validBefore,
      nonce: params.nonce,
    };
  }

  getAddress(): Address {
    return this.account.address;
  }
}

// Helper function for quick testing
export async function payX402(config: {
  privateKey: `0x${string}`;
  url: string;
  body?: unknown;
  rpcUrl?: string;
}): Promise<X402PayResult> {
  const client = new X402Client({
    privateKey: config.privateKey,
    ...(config.rpcUrl ? { rpcUrl: config.rpcUrl } : {}),
  });

  return client.pay({
    url: config.url,
    body: config.body,
  });
}

export interface EIP3009Authorization {
  from: Address;
  to: Address;
  value: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: `0x${string}`;
}

export interface X402BrowserClientConfig {
  walletClient: WalletClient;
  chainId: number;
}

export class X402BrowserClient {
  private walletClient: WalletClient;
  private chainId: number;

  constructor(config: X402BrowserClientConfig) {
    this.walletClient = config.walletClient;
    this.chainId = config.chainId;
  }

  async pay(request: X402PayRequest): Promise<X402PayResult> {
    try {
      const initialResponse = await fetch(request.url, {
        method: request.method ?? "POST",
        headers: {
          "Content-Type": "application/json",
          ...request.headers,
        },
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });

      if (initialResponse.status !== 402) {
        return {
          success: initialResponse.ok,
          response: initialResponse,
        };
      }

      const paymentRequirements = await initialResponse.json();
      const x402Requirements = paymentRequirements.x402?.accepts?.[0];

      if (!x402Requirements) {
        return {
          success: false,
          error: "No x402 payment requirements found in 402 response",
        };
      }

      const account = this.walletClient.account;
      if (!account) {
        return {
          success: false,
          error: "No account connected to wallet",
        };
      }

      const authorization: EIP3009Authorization = {
        from: account.address,
        to: x402Requirements.payTo as Address,
        value: BigInt(x402Requirements.maxAmountRequired),
        validAfter: BigInt(Math.floor(Date.now() / 1000)),
        validBefore: BigInt(Math.floor(Date.now() / 1000) + 900),
        nonce: `0x${Array.from({ length: 32 }, () =>
          Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join('')}` as `0x${string}`,
      };

      const signature = await this.signTransferAuthorization(
        authorization,
        x402Requirements.asset as Address
      );

      const paymentProof = {
        x402Version: 1,
        scheme: x402Requirements.scheme,
        network: x402Requirements.network,
        correlationId: "",
        payload: {
          signature,
          authorization: {
            from: authorization.from,
            to: authorization.to,
            value: authorization.value.toString(),
            validAfter: authorization.validAfter.toString(),
            validBefore: authorization.validBefore.toString(),
            nonce: authorization.nonce,
          },
        },
      };

      const paymentHeader = btoa(JSON.stringify(paymentProof));

      const paidResponse = await fetch(request.url, {
        method: request.method ?? "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PAYMENT": paymentHeader,
          ...request.headers,
        },
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });

      return {
        success: paidResponse.ok,
        response: paidResponse,
        paymentDetails: {
          amount: x402Requirements.maxAmountRequired,
          currency: x402Requirements.extra?.currencyCode ?? "USDC",
          network: x402Requirements.network,
          signature,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async signTransferAuthorization(
    authorization: EIP3009Authorization,
    tokenAddress: Address
  ): Promise<`0x${string}`> {
    const account = this.walletClient.account;
    if (!account) {
      throw new Error("No account connected to wallet");
    }

    const domain = {
      name: "USD Coin",
      version: "2",
      chainId: this.chainId,
      verifyingContract: tokenAddress,
    };

    const types = {
      TransferWithAuthorization: [
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "value", type: "uint256" },
        { name: "validAfter", type: "uint256" },
        { name: "validBefore", type: "uint256" },
        { name: "nonce", type: "bytes32" },
      ],
    };

    const message = {
      from: authorization.from,
      to: authorization.to,
      value: authorization.value,
      validAfter: authorization.validAfter,
      validBefore: authorization.validBefore,
      nonce: authorization.nonce,
    };

    return await this.walletClient.signTypedData({
      account,
      domain,
      types,
      primaryType: "TransferWithAuthorization",
      message,
    });
  }
}

export async function payX402WithWallet(
  walletClient: WalletClient,
  chainId: number,
  request: X402PayRequest
): Promise<X402PayResult> {
  const client = new X402BrowserClient({ walletClient, chainId });
  return client.pay(request);
}

interface ErrorInit {
  cause?: unknown;
}

export class AIError extends Error {
  constructor(message: string, options?: ErrorInit) {
    super(message);
    this.name = "AIError";
    if (options && "cause" in options) {
      (this as unknown as { cause?: unknown }).cause = options.cause;
    }
  }
}

export interface ResponseErrorDetails {
  status: number;
  statusText: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export class AIFetchError extends AIError {
  constructor(message: string, options?: ErrorInit) {
    super(message, options);
    this.name = "AIFetchError";
  }
}

export class AIResponseError extends AIError {
  readonly status: number;
  readonly statusText: string;
  readonly body?: unknown;
  readonly headers: Record<string, string>;

  constructor(details: ResponseErrorDetails, message?: string) {
    super(message ?? `AI response error: ${details.status} ${details.statusText}`);
    this.name = "AIResponseError";
    this.status = details.status;
    this.statusText = details.statusText;
    this.body = details.body;
    this.headers = details.headers ?? {};
  }
}

export class AIAbortError extends AIError {
  constructor(message = "AI request aborted") {
    super(message);
    this.name = "AIAbortError";
  }
}

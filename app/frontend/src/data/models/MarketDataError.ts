export type ProviderErrorCode =
  | 'TIMEOUT'
  | 'HTTP_ERROR'
  | 'AUTHENTICATION_FAILED'
  | 'MALFORMED_RESPONSE'
  | 'MISSING_CANDLE'
  | 'DUPLICATE_TIMESTAMP'
  | 'UNAVAILABLE_SYMBOL'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface MarketDataErrorOptions {
  status?: number;
  symbol?: string;
  details?: unknown;
  cause?: Error;
}

export class MarketDataError extends Error {
  public readonly code: ProviderErrorCode;
  public readonly status?: number;
  public readonly symbol?: string;
  public readonly details?: unknown;

  constructor(code: ProviderErrorCode, message: string, options?: MarketDataErrorOptions) {
    super(message);
    this.name = 'MarketDataError';
    this.code = code;
    this.status = options?.status;
    this.symbol = options?.symbol;
    this.details = options?.details;
    if (options?.cause) {
      this.cause = options.cause;
    }
    Object.setPrototypeOf(this, MarketDataError.prototype);
  }
}

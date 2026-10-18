import type {
  MarketDataProvider,
  ConnectionState,
  MarketStatus,
  BarSubscription,
} from './MarketDataProvider';
import type { MarketBar } from '../models/MarketBar';
import type { SymbolInfo } from '../models/SymbolInfo';
import type { Timeframe, RangeShortcut } from '../../chart/models/Candle';
import { getMarketDataConfig, type MarketDataConfig } from '../../config/marketDataConfig';
import { MarketDataError, type ProviderErrorCode } from '../models/MarketDataError';

export class RealMarketDataProvider implements MarketDataProvider {
  public readonly name: string = 'RealMarketDataProvider';
  public status: MarketStatus = 'CONNECTING';

  private config: MarketDataConfig;
  private connectionState: ConnectionState = 'CONNECTING';
  private subscriptions: Map<string, BarSubscription> = new Map();
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();

  // Pluggable fetch handler for unit/integration testing
  private customFetch: typeof fetch | null = null;

  constructor(configOverride?: Partial<MarketDataConfig>) {
    this.config = {
      ...getMarketDataConfig(),
      ...(configOverride || {}),
    };
    this.updateStatusFromState(this.connectionState);
  }

  public setCustomFetchHandler(handler: typeof fetch | null): void {
    this.customFetch = handler;
  }

  public getConfig(): MarketDataConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<MarketDataConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
    };
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public onConnectionStateChange(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.connectionState);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.updateStatusFromState(state);

    for (const listener of this.stateListeners) {
      listener(state);
    }
    for (const sub of this.subscriptions.values()) {
      sub.onStateChange?.(state);
    }
  }

  private updateStatusFromState(state: ConnectionState): void {
    switch (state) {
      case 'CONNECTED':
        this.status = 'LIVE';
        break;
      case 'CONNECTING':
        this.status = 'CONNECTING';
        break;
      case 'DISCONNECTED':
        this.status = 'OFFLINE';
        break;
      case 'ERROR':
        this.status = 'ERROR';
        break;
      default:
        this.status = 'OFFLINE';
    }
  }

  /**
   * Bounded exponential backoff retry runner.
   * Prevents infinite loops and skips retries for unrecoverable errors.
   */
  private async executeWithRetry<T>(
    fn: (attempt: number) => Promise<T>,
    symbol?: string
  ): Promise<T> {
    const maxRetries = Math.max(0, this.config.retryCount ?? 3);
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn(attempt);
        // Successful call brings state to CONNECTED
        if (this.connectionState !== 'CONNECTED') {
          this.setConnectionState('CONNECTED');
        }
        return result;
      } catch (err: any) {
        lastError = err;

        // Classify error if not already classified
        const mdError =
          err instanceof MarketDataError
            ? err
            : this.classifyError(err, undefined, symbol);

        // Immediate fail for non-retryable errors
        const nonRetryableCodes: ProviderErrorCode[] = [
          'AUTHENTICATION_FAILED',
          'UNAVAILABLE_SYMBOL',
          'MALFORMED_RESPONSE',
        ];
        if (nonRetryableCodes.includes(mdError.code)) {
          this.setConnectionState('ERROR');
          throw mdError;
        }

        // If reached max retries, mark ERROR and throw
        if (attempt >= maxRetries) {
          this.setConnectionState('ERROR');
          throw mdError;
        }

        // Bounded exponential backoff: base 100ms * 2^attempt + jitter
        const baseDelay = 100;
        const delay = Math.min(baseDelay * Math.pow(2, attempt) + Math.random() * 50, 2000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Network fetch wrapper with configurable timeout.
   */
  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const timeoutMs = this.config.timeout || 10000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      headers['X-API-KEY'] = this.config.apiKey;
    }

    const fetchFn = this.customFetch || fetch;

    try {
      const response = await fetchFn(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      if (controller.signal.aborted) {
        throw new MarketDataError('TIMEOUT', `Request timed out after ${timeoutMs}ms`, {
          details: { url, timeoutMs },
        });
      }
      return response;
    } catch (err: any) {
      if (err instanceof MarketDataError) {
        throw err;
      }
      if (err.name === 'AbortError' || controller.signal.aborted) {
        throw new MarketDataError('TIMEOUT', `Request timed out after ${timeoutMs}ms`, {
          details: { url, timeoutMs },
          cause: err,
        });
      }
      throw new MarketDataError('NETWORK_ERROR', err.message || 'Network request failed', {
        details: { url },
        cause: err,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Categorizes HTTP and network exceptions into normalized MarketDataErrors.
   */
  private classifyError(err: any, status?: number, symbol?: string): MarketDataError {
    if (err instanceof MarketDataError) {
      return err;
    }

    if (status === 401 || status === 403) {
      return new MarketDataError(
        'AUTHENTICATION_FAILED',
        'Authentication failed: invalid or missing API key',
        { status, symbol, details: err }
      );
    }

    if (status === 404) {
      return new MarketDataError(
        'UNAVAILABLE_SYMBOL',
        `Symbol "${symbol || 'unknown'}" is unavailable or not found`,
        { status, symbol, details: err }
      );
    }

    if (status === 429) {
      return new MarketDataError(
        'RATE_LIMITED',
        'Rate limit exceeded. Please back off request frequency.',
        { status, symbol, details: err }
      );
    }

    if (status && status >= 400) {
      return new MarketDataError('HTTP_ERROR', `HTTP Error ${status}`, {
        status,
        symbol,
        details: err,
      });
    }

    return new MarketDataError('UNKNOWN', err?.message || 'An unknown provider error occurred', {
      symbol,
      details: err,
    });
  }

  /**
   * Fetches and normalizes available symbols from external endpoint.
   */
  public async getSymbols(): Promise<SymbolInfo[]> {
    return this.executeWithRetry(async () => {
      const baseUrl = this.config.baseUrl.replace(/\/+$/, '');
      const url = `${baseUrl}/symbols`;

      const response = await this.fetchWithTimeout(url);
      if (!response.ok) {
        throw this.classifyError(null, response.status);
      }

      let data: any;
      try {
        data = await response.json();
      } catch (e) {
        throw new MarketDataError('MALFORMED_RESPONSE', 'Invalid JSON in symbols response', {
          cause: e as Error,
        });
      }

      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.symbols)
        ? data.symbols
        : Array.isArray(data?.data)
        ? data.data
        : null;

      if (!rawList) {
        throw new MarketDataError('MALFORMED_RESPONSE', 'Expected array of symbols in response');
      }

      return rawList.map((item: any) => this.normalizeSymbol(item));
    });
  }

  /**
   * Normalizes external symbol representation into SymbolInfo.
   */
  public normalizeSymbol(item: any): SymbolInfo {
    const symbol = String(item.symbol || item.ticker || '').toUpperCase();
    const name = String(item.name || item.description || symbol);
    const exchange = String(item.exchange || item.mic || 'GLOBAL');

    let assetType: SymbolInfo['assetType'] = 'stock';
    if (item.assetType) {
      assetType = item.assetType;
    } else if (item.type === 'crypto' || symbol.includes('BTC') || symbol.includes('ETH')) {
      assetType = 'crypto';
    } else if (item.type === 'forex' || symbol.includes('EUR') || symbol.includes('USD')) {
      assetType = 'forex';
    }

    const currency = String(item.currency || 'USD');
    const precision = typeof item.precision === 'number' ? item.precision : assetType === 'crypto' ? 2 : 2;
    const timezone = String(item.timezone || (exchange === 'NASDAQ' || exchange === 'NYSE' ? 'America/New_York' : 'UTC'));

    return {
      symbol,
      ticker: symbol,
      name,
      exchange,
      assetType,
      type: assetType === 'crypto' ? 'crypto' : 'stock',
      currency,
      precision,
      decimals: precision,
      timezone,
      basePrice: typeof item.basePrice === 'number' ? item.basePrice : undefined,
    };
  }

  /**
   * Fetches historical bars with error handling, normalization, and deduplication.
   */
  public async getHistoricalBars(
    symbol: string,
    timeframe: Timeframe,
    range?: RangeShortcut
  ): Promise<MarketBar[]> {
    return this.executeWithRetry(async () => {
      const baseUrl = this.config.baseUrl.replace(/\/+$/, '');
      const queryParams = new URLSearchParams({
        symbol,
        timeframe,
        ...(range ? { range } : {}),
      });
      const url = `${baseUrl}/bars?${queryParams.toString()}`;

      const response = await this.fetchWithTimeout(url);
      if (!response.ok) {
        throw this.classifyError(null, response.status, symbol);
      }

      let data: any;
      try {
        data = await response.json();
      } catch (e) {
        throw new MarketDataError('MALFORMED_RESPONSE', 'Invalid JSON in historical bars response', {
          symbol,
          cause: e as Error,
        });
      }

      return this.normalizeHistoricalBarsResponse(data, symbol);
    }, symbol);
  }

  /**
   * Parses various vendor response formats into chronologically sorted, deduplicated MarketBar[].
   */
  public normalizeHistoricalBarsResponse(data: any, symbol?: string): MarketBar[] {
    if (!data || typeof data !== 'object') {
      throw new MarketDataError('MALFORMED_RESPONSE', 'Response body must be an object or array', {
        symbol,
      });
    }

    let rawBars: any[] = [];

    if (Array.isArray(data)) {
      rawBars = data;
    } else if (Array.isArray(data.bars)) {
      rawBars = data.bars;
    } else if (Array.isArray(data.candles)) {
      rawBars = data.candles;
    } else if (Array.isArray(data.data)) {
      rawBars = data.data;
    } else if (Array.isArray(data.t) && Array.isArray(data.c)) {
      // Columnar format (e.g. UDF / Finnhub format)
      rawBars = data.t.map((t: number, i: number) => ({
        timestamp: t,
        open: data.o ? data.o[i] : data.c[i],
        high: data.h ? data.h[i] : data.c[i],
        low: data.l ? data.l[i] : data.c[i],
        close: data.c[i],
        volume: data.v ? data.v[i] : 0,
      }));
    } else {
      throw new MarketDataError('MALFORMED_RESPONSE', 'Could not locate bars array in response', {
        symbol,
      });
    }

    if (rawBars.length === 0) {
      throw new MarketDataError('MISSING_CANDLE', 'No candle data returned in response', {
        symbol,
      });
    }

    const normalizedBars: MarketBar[] = [];

    for (let i = 0; i < rawBars.length; i++) {
      const item = rawBars[i];
      try {
        const bar = this.normalizeBar(item);
        normalizedBars.push(bar);
      } catch (err: any) {
        // If single bar is corrupt, log or rethrow depending on severity
        if (rawBars.length === 1) {
          throw err;
        }
      }
    }

    if (normalizedBars.length === 0) {
      throw new MarketDataError('MISSING_CANDLE', 'All candles in response were invalid', {
        symbol,
      });
    }

    // Sort chronologically
    normalizedBars.sort((a, b) => a.timestamp - b.timestamp);

    // Deduplicate timestamps: keep latest entry for identical timestamps
    const deduplicated: MarketBar[] = [];
    for (const b of normalizedBars) {
      if (deduplicated.length === 0) {
        deduplicated.push(b);
      } else {
        const prev = deduplicated[deduplicated.length - 1];
        if (b.timestamp === prev.timestamp) {
          // Duplicate timestamp: replace previous with latest values
          deduplicated[deduplicated.length - 1] = { ...b };
        } else if (b.timestamp > prev.timestamp) {
          deduplicated.push(b);
        }
      }
    }

    return deduplicated;
  }

  /**
   * Normalizes a single raw object or tick into a MarketBar.
   */
  public normalizeBar(item: any): MarketBar {
    if (!item || typeof item !== 'object') {
      throw new MarketDataError('MALFORMED_RESPONSE', 'Candle item is not an object');
    }

    // Parse timestamp: supports timestamp, time, t, date
    let rawTime = item.timestamp ?? item.time ?? item.t ?? item.date;
    if (typeof rawTime === 'string') {
      const parsed = Date.parse(rawTime);
      if (!isNaN(parsed)) {
        rawTime = parsed;
      } else {
        rawTime = Number(rawTime);
      }
    }

    if (typeof rawTime !== 'number' || isNaN(rawTime) || rawTime <= 0) {
      throw new MarketDataError('MALFORMED_RESPONSE', 'Candle timestamp is missing or invalid');
    }

    // Convert seconds to milliseconds if timestamp is in Unix seconds
    const timestamp = rawTime < 1e11 ? rawTime * 1000 : rawTime;

    const open = Number(item.open ?? item.o);
    const high = Number(item.high ?? item.h ?? open);
    const low = Number(item.low ?? item.l ?? open);
    const close = Number(item.close ?? item.c ?? item.price ?? open);
    const volume = Number(item.volume ?? item.v ?? item.vol ?? 0);

    if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
      throw new MarketDataError(
        'MALFORMED_RESPONSE',
        'Candle contains invalid or NaN OHLC price values'
      );
    }

    return {
      timestamp,
      open,
      high: Math.max(high, open, close),
      low: Math.min(low, open, close),
      close,
      volume: isNaN(volume) ? 0 : Math.max(0, volume),
    };
  }

  /**
   * Subscribes to realtime updates for a symbol and timeframe.
   */
  public subscribeBars(
    symbol: string,
    timeframe: Timeframe,
    callback: (bar: MarketBar) => void,
    onError?: (error: Error) => void,
    onStateChange?: (state: ConnectionState) => void
  ): string {
    const id = `real_sub_${symbol}_${timeframe}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const sub: BarSubscription = {
      id,
      symbol,
      timeframe,
      callback,
      onError,
      onStateChange,
      lastUpdateTimestamp: Date.now(),
    };
    this.subscriptions.set(id, sub);

    if (onStateChange) {
      onStateChange(this.connectionState);
    }

    return id;
  }

  /**
   * Cancels an active subscription.
   */
  public unsubscribeBars(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Ingests a raw realtime update (from WebSocket, SSE, or test harness),
   * normalizes it into a MarketBar, and dispatches it to active subscribers.
   */
  public ingestRealtimeUpdate(
    symbol: string,
    timeframe: Timeframe,
    rawUpdate: unknown
  ): MarketBar {
    const normalizedBar = this.normalizeBar(rawUpdate);

    for (const sub of this.subscriptions.values()) {
      if (
        sub.symbol.toUpperCase() === symbol.toUpperCase() &&
        sub.timeframe === timeframe
      ) {
        sub.lastUpdateTimestamp = Date.now();
        try {
          sub.callback(normalizedBar);
        } catch (err: any) {
          sub.onError?.(err);
        }
      }
    }

    return normalizedBar;
  }

  /**
   * Simulation hook for automated tests.
   */
  public simulateIncomingBar(
    symbol: string,
    timeframe: Timeframe,
    barData: unknown
  ): MarketBar {
    return this.ingestRealtimeUpdate(symbol, timeframe, barData);
  }

  /**
   * Simulation hook for connection state transitions.
   */
  public simulateConnectionState(state: ConnectionState): void {
    this.setConnectionState(state);
  }

  /**
   * Simulation hook to dispatch an error to listeners and subscribers.
   */
  public simulateError(error: Error): void {
    this.setConnectionState('ERROR');
    for (const sub of this.subscriptions.values()) {
      sub.onError?.(error);
    }
  }
}

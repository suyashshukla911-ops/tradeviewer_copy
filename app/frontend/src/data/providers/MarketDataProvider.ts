import type { MarketBar } from '../models/MarketBar';
import type { SymbolInfo } from '../models/SymbolInfo';
import type { Timeframe, RangeShortcut } from '../../chart/models/Candle';

export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';

export type MarketStatus = 'LIVE' | 'CONNECTING' | 'OFFLINE' | 'ERROR' | 'MOCK';

export interface BarSubscription {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  callback: (bar: MarketBar) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: ConnectionState) => void;
  lastUpdateTimestamp?: number;
}

export interface MarketDataProvider {
  /**
   * Human-readable identifier for the provider (e.g. "MockMarketDataProvider").
   */
  readonly name: string;

  /**
   * Market status exposed to the UI (e.g. MOCK, LIVE, OFFLINE).
   */
  readonly status: MarketStatus;

  /**
   * Retrieves list of available symbols from this provider.
   */
  getSymbols(): Promise<SymbolInfo[]>;

  /**
   * Retrieves historical normalized bars for a given symbol, timeframe, and range.
   */
  getHistoricalBars(
    symbol: string,
    timeframe: Timeframe,
    range?: RangeShortcut
  ): Promise<MarketBar[]>;

  /**
   * Subscribes to real-time or simulated forming bar updates.
   * Returns a unique subscription ID string.
   */
  subscribeBars(
    symbol: string,
    timeframe: Timeframe,
    callback: (bar: MarketBar) => void,
    onError?: (error: Error) => void,
    onStateChange?: (state: ConnectionState) => void
  ): string;

  /**
   * Cancels an active subscription by subscription ID.
   */
  unsubscribeBars(subscriptionId: string): void;

  /**
   * Returns current connection state.
   */
  getConnectionState(): ConnectionState;

  /**
   * Registers a connection state listener. Returns unsubscribe function.
   */
  onConnectionStateChange(listener: (state: ConnectionState) => void): () => void;
}

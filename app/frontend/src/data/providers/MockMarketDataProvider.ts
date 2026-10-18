import type {
  MarketDataProvider,
  ConnectionState,
  MarketStatus,
  BarSubscription,
} from './MarketDataProvider';
import type { MarketBar } from '../models/MarketBar';
import { candlesToMarketBars } from '../models/MarketBar';
import type { SymbolInfo } from '../models/SymbolInfo';
import type { Timeframe, RangeShortcut } from '../../chart/models/Candle';
import { SYMBOL_CATALOG } from '../symbolCatalog';
import { generateMockCandles } from '../mockMarketData';

export class MockMarketDataProvider implements MarketDataProvider {
  public readonly name: string = 'MockMarketDataProvider';
  public status: MarketStatus = 'MOCK';

  private connectionState: ConnectionState = 'CONNECTED';
  private subscriptions: Map<string, BarSubscription> = new Map();
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();

  public async getSymbols(): Promise<SymbolInfo[]> {
    return SYMBOL_CATALOG.map((s) => ({
      symbol: s.ticker,
      ticker: s.ticker,
      name: s.name,
      exchange: s.exchange,
      assetType: s.type === 'crypto' ? 'crypto' : 'stock',
      type: s.type,
      currency: 'USD',
      precision: s.decimals,
      decimals: s.decimals,
      timezone: s.exchange === 'NASDAQ' ? 'America/New_York' : 'UTC',
      basePrice: s.basePrice,
    }));
  }

  public async getHistoricalBars(
    symbol: string,
    timeframe: Timeframe,
    _range?: RangeShortcut
  ): Promise<MarketBar[]> {
    // Generate deterministic candles and normalize to MarketBar format
    const candles = generateMockCandles(symbol, timeframe);
    return candlesToMarketBars(candles);
  }

  public subscribeBars(
    symbol: string,
    timeframe: Timeframe,
    callback: (bar: MarketBar) => void,
    onError?: (error: Error) => void,
    onStateChange?: (state: ConnectionState) => void
  ): string {
    const id = `mock_sub_${symbol}_${timeframe}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
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

  public unsubscribeBars(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
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

  protected setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    for (const listener of this.stateListeners) {
      listener(state);
    }
    for (const sub of this.subscriptions.values()) {
      sub.onStateChange?.(state);
    }
  }

  /**
   * Helper to emit a simulated bar to all matching subscribers.
   */
  public emitBarUpdate(symbol: string, timeframe: Timeframe, bar: MarketBar): void {
    for (const sub of this.subscriptions.values()) {
      if (
        sub.symbol.toUpperCase() === symbol.toUpperCase() &&
        sub.timeframe === timeframe
      ) {
        sub.lastUpdateTimestamp = Date.now();
        sub.callback(bar);
      }
    }
  }
}

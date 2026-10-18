import type {
  MarketDataProvider,
  ConnectionState,
  MarketStatus,
} from '../providers/MarketDataProvider';
import { MockMarketDataProvider } from '../providers/MockMarketDataProvider';
import type { MarketBar } from '../models/MarketBar';
import type { SymbolInfo } from '../models/SymbolInfo';
import type { Timeframe, RangeShortcut } from '../../chart/models/Candle';

export interface ServiceSubscription {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  callback: (bars: MarketBar[], latestBar: MarketBar) => void;
  onError?: (error: Error) => void;
  onStateChange?: (state: ConnectionState) => void;
}

export class MarketDataService {
  private provider: MarketDataProvider;
  private seriesCache: Map<string, MarketBar[]> = new Map();
  private subscribers: Map<string, Map<string, ServiceSubscription>> = new Map();
  private providerSubscriptionMap: Map<string, string> = new Map();
  private statusListeners: Set<
    (status: MarketStatus, state: ConnectionState) => void
  > = new Set();
  private providerUnsubState: (() => void) | null = null;

  constructor(initialProvider?: MarketDataProvider) {
    this.provider = initialProvider || new MockMarketDataProvider();
    this.bindProviderStateListener();
  }

  private getKey(symbol: string, timeframe: Timeframe): string {
    return `${symbol.toUpperCase()}_${timeframe}`;
  }

  private bindProviderStateListener(): void {
    if (this.providerUnsubState) {
      this.providerUnsubState();
    }
    this.providerUnsubState = this.provider.onConnectionStateChange((state) => {
      this.notifyStatusListeners(this.provider.status, state);
    });
  }

  public getProvider(): MarketDataProvider {
    return this.provider;
  }

  public setProvider(newProvider: MarketDataProvider): void {
    // Unsubscribe from old provider
    for (const providerSubId of this.providerSubscriptionMap.values()) {
      this.provider.unsubscribeBars(providerSubId);
    }
    this.providerSubscriptionMap.clear();

    this.provider = newProvider;
    this.bindProviderStateListener();

    // Re-subscribe any currently active channels on the new provider
    for (const subMap of this.subscribers.values()) {
      if (subMap.size > 0) {
        const first = subMap.values().next().value;
        if (first) {
          this.subscribeProviderChannel(first.symbol, first.timeframe);
        }
      }
    }

    this.notifyStatusListeners(this.provider.status, this.provider.getConnectionState());
  }

  public getMarketStatus(): MarketStatus {
    return this.provider.status;
  }

  public getConnectionState(): ConnectionState {
    return this.provider.getConnectionState();
  }

  public onStatusChange(
    listener: (status: MarketStatus, state: ConnectionState) => void
  ): () => void {
    this.statusListeners.add(listener);
    listener(this.provider.status, this.provider.getConnectionState());
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyStatusListeners(status: MarketStatus, state: ConnectionState): void {
    for (const l of this.statusListeners) {
      l(status, state);
    }
    for (const subMap of this.subscribers.values()) {
      for (const sub of subMap.values()) {
        sub.onStateChange?.(state);
      }
    }
  }

  public async getSymbols(): Promise<SymbolInfo[]> {
    return this.provider.getSymbols();
  }

  public async getHistoricalBars(
    symbol: string,
    timeframe: Timeframe,
    range?: RangeShortcut
  ): Promise<MarketBar[]> {
    const key = this.getKey(symbol, timeframe);
    const bars = await this.provider.getHistoricalBars(symbol, timeframe, range);
    // Store in series cache
    this.seriesCache.set(key, [...bars]);
    return [...bars];
  }

  public getCachedBars(symbol: string, timeframe: Timeframe): MarketBar[] | null {
    const key = this.getKey(symbol, timeframe);
    const cached = this.seriesCache.get(key);
    return cached ? [...cached] : null;
  }

  public subscribeBars(
    symbol: string,
    timeframe: Timeframe,
    callback: (bars: MarketBar[], latestBar: MarketBar) => void,
    onError?: (error: Error) => void,
    onStateChange?: (state: ConnectionState) => void
  ): string {
    const key = this.getKey(symbol, timeframe);
    const id = `srv_sub_${key}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    let subMap = this.subscribers.get(key);
    if (!subMap) {
      subMap = new Map();
      this.subscribers.set(key, subMap);
    }

    const sub: ServiceSubscription = {
      id,
      symbol,
      timeframe,
      callback,
      onError,
      onStateChange,
    };
    subMap.set(id, sub);

    // If this is the first subscriber on this channel, subscribe on the underlying provider
    if (!this.providerSubscriptionMap.has(key)) {
      this.subscribeProviderChannel(symbol, timeframe);
    }

    // If cached bars already exist, notify immediately
    const cached = this.seriesCache.get(key);
    if (cached && cached.length > 0) {
      const latest = cached[cached.length - 1];
      callback([...cached], { ...latest });
    }

    return id;
  }

  private subscribeProviderChannel(symbol: string, timeframe: Timeframe): void {
    const key = this.getKey(symbol, timeframe);
    const providerSubId = this.provider.subscribeBars(
      symbol,
      timeframe,
      (bar) => this.handleIncomingBar(symbol, timeframe, bar),
      (err) => {
        const subMap = this.subscribers.get(key);
        if (subMap) {
          for (const s of subMap.values()) s.onError?.(err);
        }
      },
      (state) => {
        const subMap = this.subscribers.get(key);
        if (subMap) {
          for (const s of subMap.values()) s.onStateChange?.(state);
        }
      }
    );
    this.providerSubscriptionMap.set(key, providerSubId);
  }

  public unsubscribeBars(serviceSubscriptionId: string): void {
    for (const [key, subMap] of this.subscribers.entries()) {
      if (subMap.has(serviceSubscriptionId)) {
        subMap.delete(serviceSubscriptionId);
        // If channel has no more subscribers, unsubscribe from provider
        if (subMap.size === 0) {
          this.subscribers.delete(key);
          const providerSubId = this.providerSubscriptionMap.get(key);
          if (providerSubId) {
            this.provider.unsubscribeBars(providerSubId);
            this.providerSubscriptionMap.delete(key);
          }
        }
        break;
      }
    }
  }

  /**
   * Data Update Engine:
   * - updates forming bar if same timestamp
   * - appends completed bar if timestamp advances
   * - updates existing historical bar without duplicating if timestamp matches earlier bar
   */
  public handleIncomingBar(symbol: string, timeframe: Timeframe, bar: MarketBar): void {
    const key = this.getKey(symbol, timeframe);
    let series = this.seriesCache.get(key);
    if (!series) {
      series = [];
      this.seriesCache.set(key, series);
    }

    let latestBar: MarketBar;

    if (series.length === 0) {
      series.push({ ...bar });
      latestBar = { ...bar };
    } else {
      const last = series[series.length - 1];

      if (bar.timestamp === last.timestamp) {
        // Update forming bar
        last.high = Math.max(last.high, bar.high);
        last.low = Math.min(last.low, bar.low);
        last.close = bar.close;
        last.volume = (last.volume || 0) + (bar.volume || 0);
        latestBar = { ...last };
      } else if (bar.timestamp > last.timestamp) {
        // Append new bar
        series.push({ ...bar });
        latestBar = { ...bar };
      } else {
        // Duplicate timestamp or backfilled bar: avoid duplicate!
        const existingIdx = series.findIndex((b) => b.timestamp === bar.timestamp);
        if (existingIdx !== -1) {
          series[existingIdx] = { ...series[existingIdx], ...bar };
          latestBar = { ...series[series.length - 1] };
        } else {
          // Insert sorted
          series.push({ ...bar });
          series.sort((a, b) => a.timestamp - b.timestamp);
          latestBar = { ...series[series.length - 1] };
        }
      }
    }

    // Notify all active subscribers
    const subMap = this.subscribers.get(key);
    if (subMap) {
      const seriesSnapshot = [...series];
      for (const sub of subMap.values()) {
        sub.callback(seriesSnapshot, latestBar);
      }
    }
  }

  public clearCache(): void {
    this.seriesCache.clear();
  }
}

// Global default singleton instance
export const marketDataService = new MarketDataService();

import type {
  MarketDataProvider,
  ConnectionState,
  MarketStatus,
  BarSubscription,
} from './MarketDataProvider';
import type { MarketBar } from '../models/MarketBar';
import type { Timeframe } from '../../chart/models/Candle';
import { MockMarketDataProvider } from './MockMarketDataProvider';

export class FakeRealtimeProvider extends MockMarketDataProvider implements MarketDataProvider {
  public override readonly name: string = 'FakeRealtimeProvider';
  public override status: MarketStatus = 'LIVE';

  private activeTimer: ReturnType<typeof setInterval> | null = null;
  private testSubscriptions: Map<string, BarSubscription> = new Map();

  public override subscribeBars(
    symbol: string,
    timeframe: Timeframe,
    callback: (bar: MarketBar) => void,
    onError?: (error: Error) => void,
    onStateChange?: (state: ConnectionState) => void
  ): string {
    const id = super.subscribeBars(symbol, timeframe, callback, onError, onStateChange);
    this.testSubscriptions.set(id, {
      id,
      symbol,
      timeframe,
      callback,
      onError,
      onStateChange,
      lastUpdateTimestamp: Date.now(),
    });
    return id;
  }

  public override unsubscribeBars(subscriptionId: string): void {
    super.unsubscribeBars(subscriptionId);
    this.testSubscriptions.delete(subscriptionId);
  }

  public getActiveSubscriptionCount(): number {
    return this.testSubscriptions.size;
  }

  public simulateConnect(): void {
    this.status = 'LIVE';
    this.setConnectionState('CONNECTED');
  }

  public simulateDisconnect(): void {
    this.status = 'OFFLINE';
    this.setConnectionState('DISCONNECTED');
  }

  public simulateConnecting(): void {
    this.status = 'CONNECTING';
    this.setConnectionState('CONNECTING');
  }

  public simulateReconnect(): void {
    this.simulateConnecting();
    setTimeout(() => {
      this.simulateConnect();
    }, 150);
  }

  public simulateError(message: string = 'Simulated connection failure'): void {
    this.status = 'ERROR';
    this.setConnectionState('ERROR');
    const err = new Error(message);
    for (const sub of this.testSubscriptions.values()) {
      sub.onError?.(err);
    }
  }

  public simulateBarUpdate(symbol: string, timeframe: Timeframe, bar: MarketBar): void {
    this.emitBarUpdate(symbol, timeframe, bar);
  }

  public simulateTick(
    symbol: string,
    timeframe: Timeframe,
    price: number,
    volumeDelta: number = 100
  ): void {
    const timestamp = Math.floor(Date.now() / 1000);
    this.emitBarUpdate(symbol, timeframe, {
      timestamp,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: volumeDelta,
    });
  }

  public startAutoTicks(symbol: string, timeframe: Timeframe, intervalMs: number = 500): void {
    this.stopAutoTicks();
    let currentPrice = 150;
    let baseTime = Math.floor(Date.now() / 1000);

    this.activeTimer = setInterval(() => {
      const change = (Math.random() - 0.48) * 0.5;
      currentPrice = Math.round((currentPrice + change) * 100) / 100;
      this.emitBarUpdate(symbol, timeframe, {
        timestamp: baseTime,
        open: currentPrice,
        high: Math.round((currentPrice + Math.random() * 0.2) * 100) / 100,
        low: Math.round((currentPrice - Math.random() * 0.2) * 100) / 100,
        close: currentPrice,
        volume: Math.floor(Math.random() * 500),
      });
    }, intervalMs);
  }

  public stopAutoTicks(): void {
    if (this.activeTimer) {
      clearInterval(this.activeTimer);
      this.activeTimer = null;
    }
  }
}

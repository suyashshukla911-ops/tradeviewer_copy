import type { Candle } from '../../chart/models/Candle';

/**
 * Normalized, provider-independent MarketBar model.
 */
export interface MarketBar {
  timestamp: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Converts a normalized MarketBar to the Chart Engine Candle model.
 */
export function marketBarToCandle(bar: MarketBar): Candle {
  return {
    time: bar.timestamp,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  };
}

/**
 * Converts a Chart Engine Candle to a normalized MarketBar.
 */
export function candleToMarketBar(candle: Candle): MarketBar {
  return {
    timestamp: candle.time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume ?? 0,
  };
}

/**
 * Converts an array of MarketBars to Candles.
 */
export function marketBarsToCandles(bars: MarketBar[]): Candle[] {
  return bars.map(marketBarToCandle);
}

/**
 * Converts an array of Candles to MarketBars.
 */
export function candlesToMarketBars(candles: Candle[]): MarketBar[] {
  return candles.map(candleToMarketBar);
}

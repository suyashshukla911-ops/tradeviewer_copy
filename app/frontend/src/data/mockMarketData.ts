import type { Candle, Timeframe } from '../chart/models/Candle';
import { getSymbolInfo, SYMBOL_CATALOG } from './symbolCatalog';

// Simple deterministic pseudo-random number generator (Mulberry32)
function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 42;
}

export function getTimeframeSeconds(tf: Timeframe): number {
  switch (tf) {
    case '1m':
      return 60;
    case '5m':
      return 300;
    case '15m':
      return 900;
    case '30m':
      return 1800;
    case '1h':
      return 3600;
    case '4h':
      return 14400;
    case '1D':
      return 86400;
    case '1W':
      return 604800;
    case '1M':
      return 2592000;
    default:
      return 86400;
  }
}

export function getTimeframeBarCount(tf: Timeframe): number {
  switch (tf) {
    case '1m':
      return 120;
    case '5m':
      return 120;
    case '15m':
      return 120;
    case '30m':
      return 120;
    case '1h':
      return 150;
    case '4h':
      return 150;
    case '1D':
      return 200;
    case '1W':
      return 150;
    case '1M':
      return 100;
    default:
      return 150;
  }
}

/**
 * Generates realistic deterministic OHLCV candles for any symbol and timeframe
 */
export function generateMockCandles(
  ticker: string = 'AAPL',
  timeframe: Timeframe = '1D'
): Candle[] {
  const symInfo = getSymbolInfo(ticker);
  const count = getTimeframeBarCount(timeframe);
  const stepSec = getTimeframeSeconds(timeframe);

  // Deterministic seed combining symbol and timeframe
  const seed = stringToSeed(`${ticker}_${timeframe}_market_v2`);
  const random = createPRNG(seed);

  const candles: Candle[] = [];
  const nowSec = 1792300800; // Oct 18, 2026 UTC
  const startTime = nowSec - count * stepSec;

  let currentPrice = symInfo.basePrice;

  // Adjust volatility by timeframe
  let baseVolPct = 0.015;
  if (timeframe === '1m' || timeframe === '5m') baseVolPct = 0.002;
  else if (timeframe === '15m' || timeframe === '30m') baseVolPct = 0.004;
  else if (timeframe === '1h' || timeframe === '4h') baseVolPct = 0.008;
  else if (timeframe === '1W' || timeframe === '1M') baseVolPct = 0.035;

  if (symInfo.type === 'crypto') baseVolPct *= 1.8;

  for (let i = 0; i < count; i++) {
    const time = startTime + i * stepSec;

    // Daily drift with mean reversion
    const meanPull = (symInfo.basePrice - currentPrice) / symInfo.basePrice * 0.03;
    const changePct = (random() - 0.495) * baseVolPct + meanPull;
    const open = Math.round(currentPrice * 100) / 100;
    let close = Math.round(open * (1 + changePct) * 100) / 100;
    if (close === open) {
      const minStep = symInfo.decimals === 2 ? 0.05 : 1;
      close = Math.round((open + (random() > 0.5 ? minStep : -minStep)) * 100) / 100;
    }

    const maxOC = Math.max(open, close);
    const minOC = Math.min(open, close);

    const wickFactor = baseVolPct * 0.8 * currentPrice;
    const highWick = random() * wickFactor;
    const lowWick = random() * wickFactor;

    const high = Math.round((maxOC + highWick) * 100) / 100;
    const low = Math.round(Math.max(0.01, minOC - lowWick) * 100) / 100;

    // Volume estimation
    const volBase = symInfo.type === 'crypto' ? 20_000 : 25_000_000;
    const volume = Math.floor(volBase * (0.6 + random() * 0.8));

    candles.push({
      time,
      open,
      high,
      low,
      close,
      volume,
    });

    currentPrice = close;
  }

  // Anchor the latest candle close closely to symbol's representative price
  if (candles.length > 0) {
    const last = candles[candles.length - 1];
    if (ticker.toUpperCase() === 'AAPL' && timeframe === '1D') {
      last.close = 343.46;
      last.open = 346.09;
      last.high = 347.82;
      last.low = 340.46;
    }
  }

  return candles;
}

export interface WatchlistItem {
  ticker: string;
  name: string;
  exchange: string;
  type: 'stock' | 'crypto';
  lastPrice: number;
  change: number;
  changePct: number;
}

/**
 * Generates deterministic watchlist snapshot for all symbols in catalog
 */
export function generateWatchlistSnapshot(): WatchlistItem[] {
  return SYMBOL_CATALOG.map((sym) => {
    // Generate latest 2 daily candles to compute last price and 24h change
    const candles = generateMockCandles(sym.ticker, '1D');
    const last = candles[candles.length - 1];
    const prev = candles.length > 1 ? candles[candles.length - 2] : last;

    const change = Math.round((last.close - prev.close) * 100) / 100;
    const changePct = prev.close > 0 ? Math.round((change / prev.close) * 10000) / 100 : 0;

    return {
      ticker: sym.ticker,
      name: sym.name,
      exchange: sym.exchange,
      type: sym.type,
      lastPrice: last.close,
      change,
      changePct,
    };
  });
}

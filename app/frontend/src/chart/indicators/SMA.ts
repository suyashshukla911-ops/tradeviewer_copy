import type { Candle } from '../models/Candle';
import type { SMAResult } from './Indicator';

export class SMA {
  public static calculate(candles: Candle[], period: number = 20): SMAResult {
    const values: (number | null)[] = new Array(candles.length).fill(null);
    if (candles.length < period || period <= 0) {
      return { values };
    }

    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += candles[i].close;
    }
    values[period - 1] = sum / period;

    for (let i = period; i < candles.length; i++) {
      sum += candles[i].close - candles[i - period].close;
      values[i] = sum / period;
    }

    return { values };
  }
}

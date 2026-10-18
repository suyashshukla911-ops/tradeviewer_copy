import type { Candle } from '../models/Candle';
import type { EMAResult } from './Indicator';

export class EMA {
  public static calculate(candles: Candle[], period: number = 20): EMAResult {
    const values: (number | null)[] = new Array(candles.length).fill(null);
    if (candles.length < period || period <= 0) {
      return { values };
    }

    const multiplier = 2 / (period + 1);

    // Initial SMA for first value
    let initialSum = 0;
    for (let i = 0; i < period; i++) {
      initialSum += candles[i].close;
    }
    let prevEma = initialSum / period;
    values[period - 1] = prevEma;

    for (let i = period; i < candles.length; i++) {
      const currentEma = (candles[i].close - prevEma) * multiplier + prevEma;
      values[i] = currentEma;
      prevEma = currentEma;
    }

    return { values };
  }
}

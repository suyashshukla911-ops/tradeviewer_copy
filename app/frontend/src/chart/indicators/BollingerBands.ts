import type { Candle } from '../models/Candle';
import type { BollingerResult } from './Indicator';

export class BollingerBands {
  public static calculate(
    candles: Candle[],
    period: number = 20,
    stdDevMult: number = 2
  ): BollingerResult {
    const len = candles.length;
    const middle: (number | null)[] = new Array(len).fill(null);
    const upper: (number | null)[] = new Array(len).fill(null);
    const lower: (number | null)[] = new Array(len).fill(null);

    if (len < period || period <= 0) {
      return { middle, upper, lower };
    }

    for (let i = period - 1; i < len; i++) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += candles[j].close;
      }
      const mean = sum / period;
      middle[i] = mean;

      let varianceSum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const diff = candles[j].close - mean;
        varianceSum += diff * diff;
      }
      const stdDev = Math.sqrt(varianceSum / period);

      upper[i] = mean + stdDevMult * stdDev;
      lower[i] = mean - stdDevMult * stdDev;
    }

    return { middle, upper, lower };
  }
}

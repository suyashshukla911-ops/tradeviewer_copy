import type { Candle } from '../models/Candle';
import type { RSIResult } from './Indicator';

export class RSI {
  public static calculate(candles: Candle[], period: number = 14): RSIResult {
    const len = candles.length;
    const values: (number | null)[] = new Array(len).fill(null);

    if (len <= period || period <= 0) {
      return { values };
    }

    let gainSum = 0;
    let lossSum = 0;

    for (let i = 1; i <= period; i++) {
      const change = candles[i].close - candles[i - 1].close;
      if (change > 0) gainSum += change;
      else lossSum += Math.abs(change);
    }

    let avgGain = gainSum / period;
    let avgLoss = lossSum / period;

    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    values[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

    for (let i = period + 1; i < len; i++) {
      const change = candles[i].close - candles[i - 1].close;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      if (avgLoss === 0) {
        values[i] = 100;
      } else {
        rs = avgGain / avgLoss;
        values[i] = 100 - 100 / (1 + rs);
      }
    }

    return { values };
  }
}

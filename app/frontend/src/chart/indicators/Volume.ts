import type { Candle } from '../models/Candle';
import type { VolumeResult } from './Indicator';

export class Volume {
  public static calculate(candles: Candle[], maPeriod: number = 20): VolumeResult {
    const len = candles.length;
    const volumes: number[] = new Array(len);
    const colors: string[] = new Array(len);
    const ma: (number | null)[] = new Array(len).fill(null);

    const upColor = '#089981'; // Green
    const downColor = '#f23645'; // Red

    let sum = 0;

    for (let i = 0; i < len; i++) {
      const c = candles[i];
      volumes[i] = c.volume;
      colors[i] = c.close >= c.open ? upColor : downColor;

      sum += c.volume;
      if (i >= maPeriod) {
        sum -= candles[i - maPeriod].volume;
        ma[i] = sum / maPeriod;
      } else if (i === maPeriod - 1) {
        ma[i] = sum / maPeriod;
      }
    }

    return { volumes, colors, ma };
  }
}

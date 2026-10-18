import type { Candle } from '../models/Candle';
import type {
  IndicatorInstance,
  SMAResult,
  EMAResult,
  BollingerResult,
  RSIResult,
  VolumeResult,
} from './Indicator';
import { SMA } from './SMA';
import { EMA } from './EMA';
import { BollingerBands } from './BollingerBands';
import { RSI } from './RSI';
import { Volume } from './Volume';

export type CalculatedIndicatorData =
  | { type: 'SMA'; result: SMAResult }
  | { type: 'EMA'; result: EMAResult }
  | { type: 'BB'; result: BollingerResult }
  | { type: 'RSI'; result: RSIResult }
  | { type: 'VOL'; result: VolumeResult };

export class IndicatorEngine {
  private cache: Map<string, { key: string; data: CalculatedIndicatorData }> = new Map();

  public calculate(
    instance: IndicatorInstance,
    candles: Candle[]
  ): CalculatedIndicatorData | null {
    if (!instance.visible || candles.length === 0) return null;

    const cacheKey = `${instance.id}_${instance.type}_${JSON.stringify(instance.params)}_${candles.length}_${candles[candles.length - 1]?.close}`;
    const cached = this.cache.get(instance.id);
    if (cached && cached.key === cacheKey) {
      return cached.data;
    }

    let data: CalculatedIndicatorData | null = null;

    switch (instance.type) {
      case 'SMA': {
        const period = Number(instance.params.period) || 20;
        data = { type: 'SMA', result: SMA.calculate(candles, period) };
        break;
      }
      case 'EMA': {
        const period = Number(instance.params.period) || 20;
        data = { type: 'EMA', result: EMA.calculate(candles, period) };
        break;
      }
      case 'BB': {
        const period = Number(instance.params.period) || 20;
        const stdDev = Number(instance.params.stdDev) || 2;
        data = { type: 'BB', result: BollingerBands.calculate(candles, period, stdDev) };
        break;
      }
      case 'RSI': {
        const period = Number(instance.params.period) || 14;
        data = { type: 'RSI', result: RSI.calculate(candles, period) };
        break;
      }
      case 'VOL': {
        const maPeriod = Number(instance.params.maPeriod) || 20;
        data = { type: 'VOL', result: Volume.calculate(candles, maPeriod) };
        break;
      }
    }

    if (data) {
      this.cache.set(instance.id, { key: cacheKey, data });
    }

    return data;
  }

  public clear(): void {
    this.cache.clear();
  }
}

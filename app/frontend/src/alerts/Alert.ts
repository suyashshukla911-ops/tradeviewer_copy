import type { Timeframe } from '../chart/models/Candle';
import type { AlertConditionType } from './AlertCondition';

export interface Alert {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  condition: AlertConditionType;
  value: number;
  enabled: boolean;
  createdAt: number;
  triggeredAt?: number;
}

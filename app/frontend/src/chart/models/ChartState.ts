import type { Candle, ChartType, Timeframe } from './Candle';

export interface ViewportDimensions {
  width: number;
  height: number;
  plotWidth: number;
  plotHeight: number;
  priceScaleWidth: number;
  timeScaleHeight: number;
  dpr: number;
}

export interface CrosshairPoint {
  x: number;
  y: number;
  price: number;
  time: number;
  barIndex: number;
  candle: Candle | null;
  visible: boolean;
}

export interface ChartState {
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  candles: Candle[];
}

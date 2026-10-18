export type IndicatorType = 'SMA' | 'EMA' | 'BB' | 'RSI' | 'VOL';

export type IndicatorCategory = 'trend' | 'volatility' | 'momentum' | 'volume';

export interface IndicatorMeta {
  type: IndicatorType;
  name: string;
  category: IndicatorCategory;
  description: string;
  isOverlay: boolean; // true = renders on main price chart; false = separate pane
  defaultParams: Record<string, any>;
}

export interface IndicatorInstance {
  id: string;
  type: IndicatorType;
  visible: boolean;
  color: string;
  params: Record<string, any>;
}

export interface SMAResult {
  values: (number | null)[]; // Indexed matching candles
}

export interface EMAResult {
  values: (number | null)[];
}

export interface BollingerResult {
  middle: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
}

export interface RSIResult {
  values: (number | null)[];
}

export interface VolumeResult {
  volumes: number[];
  colors: string[]; // Green or Red
  ma: (number | null)[];
}

export const INDICATOR_METAS: Record<IndicatorType, IndicatorMeta> = {
  SMA: {
    type: 'SMA',
    name: 'Simple Moving Average',
    category: 'trend',
    description: 'Averages closing prices over a specified period',
    isOverlay: true,
    defaultParams: { period: 20, color: '#f59e0b' },
  },
  EMA: {
    type: 'EMA',
    name: 'Exponential Moving Average',
    category: 'trend',
    description: 'Weighted moving average giving higher priority to recent prices',
    isOverlay: true,
    defaultParams: { period: 20, color: '#06b6d4' },
  },
  BB: {
    type: 'BB',
    name: 'Bollinger Bands',
    category: 'volatility',
    description: 'Volatility bands placed above and below a moving average',
    isOverlay: true,
    defaultParams: { period: 20, stdDev: 2, color: '#a855f7' },
  },
  RSI: {
    type: 'RSI',
    name: 'Relative Strength Index',
    category: 'momentum',
    description: 'Momentum oscillator measuring speed and change of price moves',
    isOverlay: false,
    defaultParams: { period: 14, color: '#8b5cf6' },
  },
  VOL: {
    type: 'VOL',
    name: 'Volume',
    category: 'volume',
    description: 'Trading activity volume with 20-period moving average',
    isOverlay: false,
    defaultParams: { maPeriod: 20 },
  },
};

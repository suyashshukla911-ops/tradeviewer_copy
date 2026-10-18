import type { ChartType } from '../chart/models/Candle';
import type { IndicatorInstance } from '../chart/indicators/Indicator';
import type { Drawing } from '../chart/drawings/Drawing';
import type { PaneHeights } from '../context/WorkspaceContext';

export interface ChartTemplate {
  id: string;
  name: string;
  createdAt: number;
  chartType: ChartType;
  indicators: IndicatorInstance[];
  drawings: Drawing[];
  paneHeights: PaneHeights;
}

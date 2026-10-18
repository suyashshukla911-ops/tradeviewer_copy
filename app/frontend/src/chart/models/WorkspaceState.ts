import type { ChartType, Timeframe, RangeShortcut } from './Candle';
import type { WatchlistItem } from '../../data/mockMarketData';
import type { SymbolInfo } from '../../data/symbolCatalog';

export interface WorkspaceState {
  activeSymbol: string;
  symbolInfo: SymbolInfo;
  activeTimeframe: Timeframe;
  chartType: ChartType;
  activeRange: RangeShortcut;
  watchlist: WatchlistItem[];
  isWatchlistOpen: boolean;
  isSymbolSearchOpen: boolean;
  toastMessage: string | null;
}

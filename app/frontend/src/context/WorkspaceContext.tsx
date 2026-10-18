import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import type { Candle, ChartType, Timeframe, RangeShortcut } from '../chart/models/Candle';
import type { SymbolInfo } from '../data/symbolCatalog';
import { getSymbolInfo } from '../data/symbolCatalog';
import { generateMockCandles, generateWatchlistSnapshot, type WatchlistItem } from '../data/mockMarketData';
import type { IndicatorInstance, IndicatorType } from '../chart/indicators/Indicator';
import { INDICATOR_METAS } from '../chart/indicators/Indicator';
import type { Drawing } from '../chart/drawings/Drawing';
import type { DrawingToolType } from '../chart/drawings/DrawingManager';

export interface PaneHeights {
  volume: number;
  rsi: number;
}

export interface WorkspaceContextType {
  activeSymbol: string;
  symbolInfo: SymbolInfo;
  activeTimeframe: Timeframe;
  chartType: ChartType;
  activeRange: RangeShortcut;
  candles: Candle[];
  watchlist: WatchlistItem[];
  isWatchlistOpen: boolean;
  isSymbolSearchOpen: boolean;
  isIndicatorMenuOpen: boolean;
  activeIndicators: IndicatorInstance[];
  drawings: Drawing[];
  selectedDrawingId: string | null;
  activeDrawingTool: DrawingToolType;
  paneHeights: PaneHeights;
  editingIndicatorId: string | null;
  toastMessage: string | null;

  setActiveSymbol: (symbol: string) => void;
  setActiveTimeframe: (tf: Timeframe) => void;
  setChartType: (type: ChartType) => void;
  setActiveRange: (range: RangeShortcut) => void;
  setIsWatchlistOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsSymbolSearchOpen: (open: boolean) => void;
  setIsIndicatorMenuOpen: (open: boolean) => void;
  setEditingIndicatorId: (id: string | null) => void;
  setPaneHeights: React.Dispatch<React.SetStateAction<PaneHeights>>;
  setSelectedDrawingId: (id: string | null) => void;

  addIndicator: (type: IndicatorType, customParams?: Record<string, any>) => void;
  updateIndicator: (id: string, params: Record<string, any>, color?: string) => void;
  removeIndicator: (id: string) => void;
  toggleIndicatorVisibility: (id: string) => void;

  addDrawing: (drawing: Drawing) => void;
  updateDrawing: (drawing: Drawing) => void;
  removeDrawing: (id: string) => void;
  deleteSelectedDrawing: () => boolean;
  clearDrawings: () => void;
  setActiveDrawingTool: (tool: DrawingToolType) => void;

  showToast: (msg: string) => void;
  toggleFullscreen: () => void;
}

const STORAGE_V4_KEY = 'tv_workspace_v4';

const DEFAULT_PANE_HEIGHTS: PaneHeights = {
  volume: 110,
  rsi: 110,
};

const DEFAULT_INDICATORS: IndicatorInstance[] = [
  {
    id: 'ind_sma_20',
    type: 'SMA',
    visible: true,
    color: '#f59e0b',
    params: { period: 20, lineWidth: 1.5 },
  },
];

interface StoredWorkspaceV4 {
  version: 4;
  activeSymbol?: string;
  activeTimeframe?: Timeframe;
  chartType?: ChartType;
  activeRange?: RangeShortcut;
  isWatchlistOpen?: boolean;
  activeIndicators?: IndicatorInstance[];
  drawings?: Drawing[];
  selectedDrawingId?: string | null;
  paneHeights?: PaneHeights;
}

function loadSafeStorage(): StoredWorkspaceV4 | null {
  try {
    const raw = localStorage.getItem(STORAGE_V4_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as StoredWorkspaceV4;
    }
  } catch (err) {
    console.warn('Corrupt localStorage detected, safely falling back to defaults:', err);
  }
  return null;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialData = useMemo(() => loadSafeStorage(), []);

  // 1. Hydrate state safely
  const [activeSymbol, setActiveSymbolState] = useState<string>(() => {
    return (
      initialData?.activeSymbol ||
      localStorage.getItem('tv_symbol') ||
      'AAPL'
    );
  });

  const [activeTimeframe, setActiveTimeframeState] = useState<Timeframe>(() => {
    const raw = initialData?.activeTimeframe || (localStorage.getItem('tv_timeframe') as Timeframe);
    return raw || '1D';
  });

  const [chartType, setChartTypeState] = useState<ChartType>(() => {
    const raw = initialData?.chartType || (localStorage.getItem('tv_chart_type') as ChartType);
    return raw || 'candles';
  });

  const [activeRange, setActiveRangeState] = useState<RangeShortcut>(() => {
    const raw = initialData?.activeRange || (localStorage.getItem('tv_range') as RangeShortcut);
    return raw || '1D';
  });

  const [activeIndicators, setActiveIndicatorsState] = useState<IndicatorInstance[]>(() => {
    if (Array.isArray(initialData?.activeIndicators)) {
      return initialData!.activeIndicators;
    }
    try {
      const stored = localStorage.getItem('tv_indicators');
      return stored ? JSON.parse(stored) : DEFAULT_INDICATORS;
    } catch {
      return DEFAULT_INDICATORS;
    }
  });

  const [drawings, setDrawingsState] = useState<Drawing[]>(() => {
    if (Array.isArray(initialData?.drawings)) {
      return initialData!.drawings;
    }
    try {
      const stored = localStorage.getItem('tv_drawings');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [paneHeights, setPaneHeights] = useState<PaneHeights>(() => {
    if (
      initialData?.paneHeights &&
      typeof initialData.paneHeights.volume === 'number' &&
      typeof initialData.paneHeights.rsi === 'number'
    ) {
      return initialData.paneHeights;
    }
    return DEFAULT_PANE_HEIGHTS;
  });

  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(() => {
    return initialData?.selectedDrawingId ?? null;
  });

  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingToolType>('cursor');
  const [isWatchlistOpen, setIsWatchlistOpen] = useState<boolean>(() => {
    return initialData?.isWatchlistOpen ?? true;
  });
  const [isSymbolSearchOpen, setIsSymbolSearchOpen] = useState<boolean>(false);
  const [isIndicatorMenuOpen, setIsIndicatorMenuOpen] = useState<boolean>(false);
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 2. Persist versioned snapshot to localStorage
  useEffect(() => {
    try {
      const snapshot: StoredWorkspaceV4 = {
        version: 4,
        activeSymbol,
        activeTimeframe,
        chartType,
        activeRange,
        isWatchlistOpen,
        activeIndicators,
        drawings,
        selectedDrawingId,
        paneHeights,
      };
      localStorage.setItem(STORAGE_V4_KEY, JSON.stringify(snapshot));
      // Also keep legacy keys in sync for backwards-compatibility
      localStorage.setItem('tv_symbol', activeSymbol);
      localStorage.setItem('tv_timeframe', activeTimeframe);
      localStorage.setItem('tv_chart_type', chartType);
      localStorage.setItem('tv_range', activeRange);
      localStorage.setItem('tv_indicators', JSON.stringify(activeIndicators));
      localStorage.setItem('tv_drawings', JSON.stringify(drawings));
    } catch (e) {
      console.warn('Failed to persist workspace snapshot to localStorage:', e);
    }
  }, [
    activeSymbol,
    activeTimeframe,
    chartType,
    activeRange,
    isWatchlistOpen,
    activeIndicators,
    drawings,
    selectedDrawingId,
    paneHeights,
  ]);

  const symbolInfo = useMemo(() => getSymbolInfo(activeSymbol), [activeSymbol]);

  const candles = useMemo(() => {
    return generateMockCandles(activeSymbol, activeTimeframe);
  }, [activeSymbol, activeTimeframe]);

  const watchlist = useMemo(() => {
    return generateWatchlistSnapshot();
  }, [activeSymbol]);

  const setActiveSymbol = useCallback((symbol: string) => {
    setActiveSymbolState(symbol);
  }, []);

  const setActiveTimeframe = useCallback((tf: Timeframe) => {
    setActiveTimeframeState(tf);
  }, []);

  const setChartType = useCallback((type: ChartType) => {
    setChartTypeState(type);
  }, []);

  const setActiveRange = useCallback((range: RangeShortcut) => {
    setActiveRangeState(range);
  }, []);

  // Indicator Actions
  const addIndicator = useCallback((type: IndicatorType, customParams?: Record<string, any>) => {
    const meta = INDICATOR_METAS[type];
    const newInst: IndicatorInstance = {
      id: `ind_${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      type,
      visible: true,
      color: customParams?.color || meta?.defaultParams?.color || '#2962ff',
      params: { ...(meta?.defaultParams || {}), ...(customParams || {}) },
    };
    setActiveIndicatorsState((prev) => [...prev, newInst]);
  }, []);

  const updateIndicator = useCallback((id: string, params: Record<string, any>, color?: string) => {
    setActiveIndicatorsState((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        return {
          ...i,
          params: { ...i.params, ...params },
          color: color ?? i.color,
        };
      })
    );
  }, []);

  const removeIndicator = useCallback((id: string) => {
    setActiveIndicatorsState((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toggleIndicatorVisibility = useCallback((id: string) => {
    setActiveIndicatorsState((prev) =>
      prev.map((i) => (i.id === id ? { ...i, visible: !i.visible } : i))
    );
  }, []);

  // Drawing Actions
  const addDrawing = useCallback((drawing: Drawing) => {
    setDrawingsState((prev) => [...prev, drawing]);
  }, []);

  const updateDrawing = useCallback((drawing: Drawing) => {
    setDrawingsState((prev) => prev.map((d) => (d.id === drawing.id ? drawing : d)));
  }, []);

  const removeDrawing = useCallback((id: string) => {
    setDrawingsState((prev) => prev.filter((d) => d.id !== id));
    setSelectedDrawingId((prev) => (prev === id ? null : prev));
  }, []);

  const deleteSelectedDrawing = useCallback(() => {
    if (selectedDrawingId) {
      removeDrawing(selectedDrawingId);
      return true;
    }
    return false;
  }, [selectedDrawingId, removeDrawing]);

  const clearDrawings = useCallback(() => {
    setDrawingsState([]);
    setSelectedDrawingId(null);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2500);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  const value = {
    activeSymbol,
    symbolInfo,
    activeTimeframe,
    chartType,
    activeRange,
    candles,
    watchlist,
    isWatchlistOpen,
    isSymbolSearchOpen,
    isIndicatorMenuOpen,
    activeIndicators,
    drawings,
    selectedDrawingId,
    activeDrawingTool,
    paneHeights,
    editingIndicatorId,
    toastMessage,
    setActiveSymbol,
    setActiveTimeframe,
    setChartType,
    setActiveRange,
    setIsWatchlistOpen,
    setIsSymbolSearchOpen,
    setIsIndicatorMenuOpen,
    setEditingIndicatorId,
    setPaneHeights,
    setSelectedDrawingId,
    addIndicator,
    updateIndicator,
    removeIndicator,
    toggleIndicatorVisibility,
    addDrawing,
    updateDrawing,
    removeDrawing,
    deleteSelectedDrawing,
    clearDrawings,
    setActiveDrawingTool,
    showToast,
    toggleFullscreen,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export function useWorkspace(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

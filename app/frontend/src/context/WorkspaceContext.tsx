import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import type { Candle, ChartType, Timeframe, RangeShortcut } from '../chart/models/Candle';
import type { SymbolInfo } from '../data/symbolCatalog';
import { getSymbolInfo } from '../data/symbolCatalog';
import { generateMockCandles, generateWatchlistSnapshot, type WatchlistItem } from '../data/mockMarketData';
import type { IndicatorInstance, IndicatorType } from '../chart/indicators/Indicator';
import { INDICATOR_METAS } from '../chart/indicators/Indicator';
import type { Drawing } from '../chart/drawings/Drawing';
import type { DrawingToolType } from '../chart/drawings/DrawingManager';
import type { Alert } from '../alerts/Alert';
import { AlertEngine, type CreateAlertParams } from '../alerts/AlertEngine';
import type { ChartTemplate } from '../templates/ChartTemplate';
import type { ChartLayoutType } from '../components/LayoutSelector';
import type { WorkspacePanel } from '../components/WorkspaceNav';
import type { WorkspaceSettings } from '../components/SettingsModal';
import { marketDataService, MarketDataService } from '../data/services/MarketDataService';
import type { MarketStatus } from '../data/providers/MarketDataProvider';
import { marketBarsToCandles } from '../data/models/MarketBar';
import { FakeRealtimeProvider } from '../data/providers/FakeRealtimeProvider';

export interface PaneHeights {
  volume: number;
  rsi: number;
}

export interface ChartInstanceState {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  indicators: IndicatorInstance[];
  drawings: Drawing[];
  paneHeights: PaneHeights;
  selectedDrawingId: string | null;
}

export interface WorkspaceContextType {
  // Layout & Multi-Chart
  activeLayout: ChartLayoutType;
  activeChartId: string;
  charts: Record<string, ChartInstanceState>;
  setActiveLayout: (layout: ChartLayoutType) => void;
  setActiveChartId: (id: string) => void;
  updateChart: (id: string, updates: Partial<ChartInstanceState>) => void;

  // Active Chart Proxies (Preserves V1-V4 compatibility)
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
  isFullscreen: boolean;

  // V5: Alerts
  alerts: Alert[];
  createAlert: (params: CreateAlertParams) => Alert;
  toggleAlert: (id: string) => void;
  deleteAlert: (id: string) => void;

  // V5: Templates
  templates: ChartTemplate[];
  saveTemplate: (name: string) => void;
  loadTemplate: (template: ChartTemplate) => void;
  deleteTemplate: (id: string) => void;
  isTemplatesOpen: boolean;
  setIsTemplatesOpen: (open: boolean) => void;

  // V5: Replay
  isReplayActive: boolean;
  isReplayPlaying: boolean;
  replayIndex: number;
  replaySpeed: number;
  toggleReplay: () => void;
  toggleReplayPlay: () => void;
  stepReplayForward: () => void;
  resetReplay: () => void;
  setReplaySpeed: (speed: number) => void;
  exitReplay: () => void;

  // V5: Navigation & Settings
  activePanel: WorkspacePanel;
  setActivePanel: React.Dispatch<React.SetStateAction<WorkspacePanel>>;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  settings: WorkspaceSettings;
  updateSettings: (newSettings: Partial<WorkspaceSettings>) => void;
  resetWorkspaceDefaults: () => void;

  // V6: Market Data Architecture
  marketStatus: MarketStatus;
  marketDataService: MarketDataService;
}

const STORAGE_V5_KEY = 'tv_workspace_v5';
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

const DEFAULT_SETTINGS: WorkspaceSettings = {
  showGrid: true,
  showWatermark: true,
  crosshairStyle: 'dashed',
};

const DEFAULT_CHARTS: Record<string, ChartInstanceState> = {
  chart_0: {
    id: 'chart_0',
    symbol: 'AAPL',
    timeframe: '1D',
    chartType: 'candles',
    indicators: DEFAULT_INDICATORS,
    drawings: [],
    paneHeights: DEFAULT_PANE_HEIGHTS,
    selectedDrawingId: null,
  },
  chart_1: {
    id: 'chart_1',
    symbol: 'MSFT',
    timeframe: '1h',
    chartType: 'candles',
    indicators: [],
    drawings: [],
    paneHeights: DEFAULT_PANE_HEIGHTS,
    selectedDrawingId: null,
  },
  chart_2: {
    id: 'chart_2',
    symbol: 'BTCUSD',
    timeframe: '4h',
    chartType: 'line',
    indicators: [],
    drawings: [],
    paneHeights: DEFAULT_PANE_HEIGHTS,
    selectedDrawingId: null,
  },
  chart_3: {
    id: 'chart_3',
    symbol: 'NVDA',
    timeframe: '15m',
    chartType: 'bars',
    indicators: [],
    drawings: [],
    paneHeights: DEFAULT_PANE_HEIGHTS,
    selectedDrawingId: null,
  },
};

interface StoredWorkspaceV5 {
  version: 5;
  activeLayout: ChartLayoutType;
  activeChartId: string;
  charts: Record<string, ChartInstanceState>;
  alerts: Alert[];
  templates: ChartTemplate[];
  activePanel: WorkspacePanel;
  settings: WorkspaceSettings;
}

function loadSafeStorageV5(): StoredWorkspaceV5 | null {
  try {
    const rawV5 = localStorage.getItem(STORAGE_V5_KEY);
    if (rawV5) {
      const parsed = JSON.parse(rawV5);
      if (parsed && typeof parsed === 'object' && parsed.version === 5 && parsed.charts) {
        return parsed as StoredWorkspaceV5;
      }
    }

    // Migration from V4 if available
    const rawV4 = localStorage.getItem(STORAGE_V4_KEY);
    if (rawV4) {
      const p4 = JSON.parse(rawV4);
      if (p4 && typeof p4 === 'object') {
        const migratedCharts: Record<string, ChartInstanceState> = {
          ...DEFAULT_CHARTS,
          chart_0: {
            id: 'chart_0',
            symbol: p4.activeSymbol || 'AAPL',
            timeframe: p4.activeTimeframe || '1D',
            chartType: p4.chartType || 'candles',
            indicators: Array.isArray(p4.activeIndicators) ? p4.activeIndicators : DEFAULT_INDICATORS,
            drawings: Array.isArray(p4.drawings) ? p4.drawings : [],
            paneHeights: p4.paneHeights || DEFAULT_PANE_HEIGHTS,
            selectedDrawingId: p4.selectedDrawingId ?? null,
          },
        };
        return {
          version: 5,
          activeLayout: '1',
          activeChartId: 'chart_0',
          charts: migratedCharts,
          alerts: [],
          templates: [],
          activePanel: p4.isWatchlistOpen ? 'watchlist' : 'none',
          settings: DEFAULT_SETTINGS,
        };
      }
    }
  } catch (err) {
    console.warn('Corrupt localStorage detected, safely falling back to defaults:', err);
  }
  return null;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialData = useMemo(() => loadSafeStorageV5(), []);

  // 1. Multi-Chart and Layout State
  const [activeLayout, setActiveLayout] = useState<ChartLayoutType>(() => {
    return initialData?.activeLayout || '1';
  });

  const [activeChartId, setActiveChartId] = useState<string>(() => {
    return initialData?.activeChartId || 'chart_0';
  });

  const [charts, setCharts] = useState<Record<string, ChartInstanceState>>(() => {
    return initialData?.charts || DEFAULT_CHARTS;
  });

  // Ensure activeChart exists
  const activeChart = charts[activeChartId] || charts.chart_0 || DEFAULT_CHARTS.chart_0;

  // Active chart proxy fields
  const activeSymbol = activeChart.symbol;
  const activeTimeframe = activeChart.timeframe;
  const chartType = activeChart.chartType;
  const activeIndicators = activeChart.indicators;
  const drawings = activeChart.drawings;
  const selectedDrawingId = activeChart.selectedDrawingId;
  const paneHeights = activeChart.paneHeights;

  const [activeRange, setActiveRange] = useState<RangeShortcut>('1D');
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingToolType>('cursor');
  const [isSymbolSearchOpen, setIsSymbolSearchOpen] = useState<boolean>(false);
  const [isIndicatorMenuOpen, setIsIndicatorMenuOpen] = useState<boolean>(false);
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // V5: Panels & Navigation
  const [activePanel, setActivePanelState] = useState<WorkspacePanel>(() => {
    return initialData?.activePanel || 'watchlist';
  });

  const isWatchlistOpen = activePanel === 'watchlist';

  const setIsWatchlistOpen: React.Dispatch<React.SetStateAction<boolean>> = useCallback(
    (action) => {
      setActivePanelState((prev) => {
        const next = typeof action === 'function' ? action(prev === 'watchlist') : action;
        return next ? 'watchlist' : 'none';
      });
    },
    []
  );

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);

  // V5: Settings
  const [settings, setSettings] = useState<WorkspaceSettings>(() => {
    return initialData?.settings || DEFAULT_SETTINGS;
  });

  // V5: Alerts
  const [alerts, setAlerts] = useState<Alert[]>(() => {
    return initialData?.alerts || [];
  });
  const alertEngineRef = useRef<AlertEngine>(new AlertEngine(alerts));

  // Sync alertEngine alerts
  useEffect(() => {
    alertEngineRef.current.setAlerts(alerts);
  }, [alerts]);

  // V5: Templates
  const [templates, setTemplates] = useState<ChartTemplate[]>(() => {
    if (initialData?.templates && Array.isArray(initialData.templates)) {
      return initialData.templates;
    }
    try {
      const stored = localStorage.getItem('tv_chart_templates');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // V5: Replay Mode
  const [isReplayActive, setIsReplayActive] = useState<boolean>(false);
  const [isReplayPlaying, setIsReplayPlaying] = useState<boolean>(false);
  const [replayIndex, setReplayIndex] = useState<number>(0);
  const [replaySpeed, setReplaySpeed] = useState<number>(1);

  // Helper to show toasts
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Update specific chart helper
  const updateChart = useCallback((id: string, updates: Partial<ChartInstanceState>) => {
    setCharts((prev) => {
      const current = prev[id] || DEFAULT_CHARTS[id] || { ...DEFAULT_CHARTS.chart_0, id };
      return {
        ...prev,
        [id]: { ...current, ...updates },
      };
    });
  }, []);

  // Active chart proxy setters
  const setActiveSymbol = useCallback(
    (symbol: string) => {
      updateChart(activeChartId, { symbol });
    },
    [activeChartId, updateChart]
  );

  const setActiveTimeframe = useCallback(
    (tf: Timeframe) => {
      updateChart(activeChartId, { timeframe: tf });
    },
    [activeChartId, updateChart]
  );

  const setChartType = useCallback(
    (type: ChartType) => {
      updateChart(activeChartId, { chartType: type });
    },
    [activeChartId, updateChart]
  );

  const setPaneHeights: React.Dispatch<React.SetStateAction<PaneHeights>> = useCallback(
    (action) => {
      setCharts((prev) => {
        const current = prev[activeChartId] || DEFAULT_CHARTS.chart_0;
        const next = typeof action === 'function' ? action(current.paneHeights) : action;
        return {
          ...prev,
          [activeChartId]: { ...current, paneHeights: next },
        };
      });
    },
    [activeChartId]
  );

  const setSelectedDrawingId = useCallback(
    (id: string | null) => {
      updateChart(activeChartId, { selectedDrawingId: id });
    },
    [activeChartId, updateChart]
  );

  // Indicator Actions for activeChart
  const addIndicator = useCallback(
    (type: IndicatorType, customParams?: Record<string, any>) => {
      const meta = INDICATOR_METAS[type];
      const newInst: IndicatorInstance = {
        id: `ind_${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        type,
        visible: true,
        color: customParams?.color || meta?.defaultParams?.color || '#2962ff',
        params: { ...(meta?.defaultParams || {}), ...(customParams || {}) },
      };
      setCharts((prev) => {
        const current = prev[activeChartId] || DEFAULT_CHARTS.chart_0;
        return {
          ...prev,
          [activeChartId]: {
            ...current,
            indicators: [...current.indicators, newInst],
          },
        };
      });
    },
    [activeChartId]
  );

  const updateIndicator = useCallback(
    (id: string, params: Record<string, any>, color?: string) => {
      setCharts((prev) => {
        const current = prev[activeChartId] || DEFAULT_CHARTS.chart_0;
        const updated = current.indicators.map((i) => {
          if (i.id !== id) return i;
          return {
            ...i,
            params: { ...i.params, ...params },
            color: color ?? i.color,
          };
        });
        return {
          ...prev,
          [activeChartId]: { ...current, indicators: updated },
        };
      });
    },
    [activeChartId]
  );

  const removeIndicator = useCallback(
    (id: string) => {
      setCharts((prev) => {
        const current = prev[activeChartId] || DEFAULT_CHARTS.chart_0;
        return {
          ...prev,
          [activeChartId]: {
            ...current,
            indicators: current.indicators.filter((i) => i.id !== id),
          },
        };
      });
    },
    [activeChartId]
  );

  const toggleIndicatorVisibility = useCallback(
    (id: string) => {
      setCharts((prev) => {
        const current = prev[activeChartId] || DEFAULT_CHARTS.chart_0;
        return {
          ...prev,
          [activeChartId]: {
            ...current,
            indicators: current.indicators.map((i) =>
              i.id === id ? { ...i, visible: !i.visible } : i
            ),
          },
        };
      });
    },
    [activeChartId]
  );

  // Drawing Actions for activeChart
  const addDrawing = useCallback(
    (drawing: Drawing) => {
      setCharts((prev) => {
        const current = prev[activeChartId] || DEFAULT_CHARTS.chart_0;
        return {
          ...prev,
          [activeChartId]: {
            ...current,
            drawings: [...current.drawings, drawing],
          },
        };
      });
    },
    [activeChartId]
  );

  const updateDrawing = useCallback(
    (drawing: Drawing) => {
      setCharts((prev) => {
        const current = prev[activeChartId] || DEFAULT_CHARTS.chart_0;
        return {
          ...prev,
          [activeChartId]: {
            ...current,
            drawings: current.drawings.map((d) => (d.id === drawing.id ? drawing : d)),
          },
        };
      });
    },
    [activeChartId]
  );

  const removeDrawing = useCallback(
    (id: string) => {
      setCharts((prev) => {
        const current = prev[activeChartId] || DEFAULT_CHARTS.chart_0;
        return {
          ...prev,
          [activeChartId]: {
            ...current,
            drawings: current.drawings.filter((d) => d.id !== id),
            selectedDrawingId: current.selectedDrawingId === id ? null : current.selectedDrawingId,
          },
        };
      });
    },
    [activeChartId]
  );

  const deleteSelectedDrawing = useCallback(() => {
    if (selectedDrawingId) {
      removeDrawing(selectedDrawingId);
      return true;
    }
    return false;
  }, [selectedDrawingId, removeDrawing]);

  const clearDrawings = useCallback(() => {
    updateChart(activeChartId, { drawings: [], selectedDrawingId: null });
  }, [activeChartId, updateChart]);

  // Fullscreen support
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // V5: Alert actions
  const createAlert = useCallback((params: CreateAlertParams): Alert => {
    const newAlert = alertEngineRef.current.addAlert(params);
    setAlerts(alertEngineRef.current.getAlerts());
    showToast(`Alert created for ${newAlert.symbol} @ $${newAlert.value}`);
    return newAlert;
  }, [showToast]);

  const toggleAlert = useCallback((id: string) => {
    alertEngineRef.current.toggleAlert(id);
    setAlerts(alertEngineRef.current.getAlerts());
  }, []);

  const deleteAlert = useCallback((id: string) => {
    alertEngineRef.current.deleteAlert(id);
    setAlerts(alertEngineRef.current.getAlerts());
  }, []);

  // V5: Template actions
  const saveTemplate = useCallback(
    (name: string) => {
      const newTpl: ChartTemplate = {
        id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        createdAt: Date.now(),
        chartType: activeChart.chartType,
        indicators: [...activeChart.indicators],
        drawings: [...activeChart.drawings],
        paneHeights: { ...activeChart.paneHeights },
      };
      setTemplates((prev) => {
        const next = [...prev, newTpl];
        try {
          localStorage.setItem('tv_chart_templates', JSON.stringify(next));
        } catch {}
        return next;
      });
      showToast(`Template "${name}" saved!`);
    },
    [activeChart, showToast]
  );

  const loadTemplate = useCallback(
    (template: ChartTemplate) => {
      updateChart(activeChartId, {
        chartType: template.chartType,
        indicators: [...template.indicators],
        drawings: [...template.drawings],
        paneHeights: { ...template.paneHeights },
      });
      showToast(`Template "${template.name}" applied!`);
    },
    [activeChartId, updateChart, showToast]
  );

  const deleteTemplate = useCallback(
    (id: string) => {
      setTemplates((prev) => {
        const next = prev.filter((t) => t.id !== id);
        try {
          localStorage.setItem('tv_chart_templates', JSON.stringify(next));
        } catch {}
        return next;
      });
      showToast('Template removed');
    },
    [showToast]
  );

  // V6: Market Data Service Subscription for Active Chart
  const [marketStatus, setMarketStatus] = useState<MarketStatus>(
    marketDataService.getMarketStatus()
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).marketDataService = marketDataService;
      (window as any).FakeRealtimeProvider = FakeRealtimeProvider;
    }
    return marketDataService.onStatusChange((newStatus) => {
      setMarketStatus(newStatus);
    });
  }, []);

  const [rawCandles, setRawCandles] = useState<Candle[]>(() => {
    const cached = marketDataService.getCachedBars(activeSymbol, activeTimeframe);
    return cached ? marketBarsToCandles(cached) : generateMockCandles(activeSymbol, activeTimeframe);
  });

  useEffect(() => {
    let isCurrent = true;

    marketDataService
      .getHistoricalBars(activeSymbol, activeTimeframe)
      .then((bars) => {
        if (isCurrent) {
          setRawCandles(marketBarsToCandles(bars));
        }
      })
      .catch((err) => {
        console.warn('MarketDataService error:', err);
      });

    const subId = marketDataService.subscribeBars(
      activeSymbol,
      activeTimeframe,
      (bars) => {
        if (isCurrent) {
          setRawCandles(marketBarsToCandles(bars));
        }
      }
    );

    return () => {
      isCurrent = false;
      marketDataService.unsubscribeBars(subId);
    };
  }, [activeSymbol, activeTimeframe]);

  const toggleReplay = useCallback(() => {
    setIsReplayActive((prev) => {
      const next = !prev;
      if (next) {
        // Start replay at 60% of existing bars
        const startIdx = Math.max(10, Math.floor(rawCandles.length * 0.6));
        setReplayIndex(startIdx);
        setIsReplayPlaying(false);
        showToast('Replay mode activated');
      } else {
        setIsReplayPlaying(false);
        showToast('Replay mode exited');
      }
      return next;
    });
  }, [rawCandles.length, showToast]);

  const toggleReplayPlay = useCallback(() => {
    setIsReplayPlaying((prev) => !prev);
  }, []);

  const stepReplayForward = useCallback(() => {
    setReplayIndex((prev) => {
      if (prev < rawCandles.length) {
        return prev + 1;
      }
      return prev;
    });
  }, [rawCandles.length]);

  const resetReplay = useCallback(() => {
    const startIdx = Math.max(10, Math.floor(rawCandles.length * 0.5));
    setReplayIndex(startIdx);
    setIsReplayPlaying(false);
    showToast('Replay reset to starting point');
  }, [rawCandles.length, showToast]);

  const exitReplay = useCallback(() => {
    setIsReplayActive(false);
    setIsReplayPlaying(false);
    showToast('Replay mode exited');
  }, [showToast]);

  // Replay playback timer
  useEffect(() => {
    if (!isReplayActive || !isReplayPlaying) return;

    const intervalMs = Math.round(1000 / replaySpeed);
    const timer = setInterval(() => {
      setReplayIndex((prev) => {
        if (prev >= rawCandles.length) {
          setIsReplayPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isReplayActive, isReplayPlaying, replaySpeed, rawCandles.length]);

  // Effective candles for active chart (sliced during replay)
  const candles = useMemo(() => {
    if (isReplayActive && replayIndex > 0) {
      return rawCandles.slice(0, Math.min(rawCandles.length, replayIndex));
    }
    return rawCandles;
  }, [isReplayActive, replayIndex, rawCandles]);

  // Trigger alert check whenever current candle price changes
  useEffect(() => {
    if (candles.length === 0) return;
    const lastCandle = candles[candles.length - 1];
    const currentPrice = lastCandle.close;
    const triggered = alertEngineRef.current.checkAlerts(activeSymbol, currentPrice);

    for (const trig of triggered) {
      showToast(`🚨 Alert Triggered: ${trig.symbol} ${trig.condition} $${trig.value.toFixed(2)}!`);
    }
  }, [candles, activeSymbol, showToast]);

  const symbolInfo = useMemo(() => getSymbolInfo(activeSymbol), [activeSymbol]);

  const watchlist = useMemo(() => {
    return generateWatchlistSnapshot();
  }, [activeSymbol]);

  const updateSettings = useCallback((newSettings: Partial<WorkspaceSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const resetWorkspaceDefaults = useCallback(() => {
    setActiveLayout('1');
    setActiveChartId('chart_0');
    setCharts(DEFAULT_CHARTS);
    setAlerts([]);
    setTemplates([]);
    setSettings(DEFAULT_SETTINGS);
    setActivePanelState('watchlist');
    setIsReplayActive(false);
    setIsReplayPlaying(false);
    localStorage.removeItem(STORAGE_V5_KEY);
    localStorage.removeItem(STORAGE_V4_KEY);
    localStorage.removeItem('tv_chart_templates');
    showToast('Workspace reset to defaults');
  }, [showToast]);

  // 2. Persist V5 snapshot to localStorage
  useEffect(() => {
    try {
      const snapshot: StoredWorkspaceV5 = {
        version: 5,
        activeLayout,
        activeChartId,
        charts,
        alerts,
        templates,
        activePanel,
        settings,
      };
      localStorage.setItem(STORAGE_V5_KEY, JSON.stringify(snapshot));

      // Keep legacy keys in sync
      const act = charts[activeChartId] || charts.chart_0;
      if (act) {
        localStorage.setItem('tv_symbol', act.symbol);
        localStorage.setItem('tv_timeframe', act.timeframe);
        localStorage.setItem('tv_chart_type', act.chartType);
        localStorage.setItem('tv_indicators', JSON.stringify(act.indicators));
        localStorage.setItem('tv_drawings', JSON.stringify(act.drawings));
      }
    } catch (e) {
      console.warn('Failed to persist V5 workspace snapshot to localStorage:', e);
    }
  }, [activeLayout, activeChartId, charts, alerts, templates, activePanel, settings]);

  const value: WorkspaceContextType = {
    activeLayout,
    activeChartId,
    charts,
    setActiveLayout,
    setActiveChartId,
    updateChart,

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
    isFullscreen,

    alerts,
    createAlert,
    toggleAlert,
    deleteAlert,

    templates,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    isTemplatesOpen,
    setIsTemplatesOpen,

    isReplayActive,
    isReplayPlaying,
    replayIndex,
    replaySpeed,
    toggleReplay,
    toggleReplayPlay,
    stepReplayForward,
    resetReplay,
    setReplaySpeed,
    exitReplay,

    activePanel,
    setActivePanel: setActivePanelState,
    isSettingsOpen,
    setIsSettingsOpen,
    settings,
    updateSettings,
    resetWorkspaceDefaults,

    // V6
    marketStatus,
    marketDataService,
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

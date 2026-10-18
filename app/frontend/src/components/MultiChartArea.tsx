import React, { useMemo, useState, useEffect } from 'react';
import { TradingChart, type TradingChartRef } from './TradingChart';
import type { ChartLayoutType } from './LayoutSelector';
import type { ChartInstanceState, PaneHeights } from '../context/WorkspaceContext';
import type { Drawing } from '../chart/drawings/Drawing';
import type { DrawingToolType } from '../chart/drawings/DrawingManager';
import { marketDataService } from '../data/services/MarketDataService';
import { marketBarsToCandles } from '../data/models/MarketBar';
import type { Candle } from '../chart/models/Candle';

export interface MultiChartAreaProps {
  layout: ChartLayoutType;
  charts: Record<string, ChartInstanceState>;
  activeChartId: string;
  onSelectActiveChart: (id: string) => void;
  updateChart: (id: string, updates: Partial<ChartInstanceState>) => void;
  activeDrawingTool: DrawingToolType;
  onDrawingToolChange: (tool: DrawingToolType) => void;
  onOpenIndicatorSettings: (id: string) => void;
  isReplayActive: boolean;
  replayCandles: Candle[];
  activeChartRef?: React.RefObject<TradingChartRef | null>;
}

export const MultiChartArea: React.FC<MultiChartAreaProps> = ({
  layout,
  charts,
  activeChartId,
  onSelectActiveChart,
  updateChart,
  activeDrawingTool,
  onDrawingToolChange,
  onOpenIndicatorSettings,
  isReplayActive,
  replayCandles,
  activeChartRef,
}) => {
  // Determine which chart IDs are visible in current layout
  const visibleChartIds = useMemo(() => {
    switch (layout) {
      case '2h':
      case '2v':
        return ['chart_0', 'chart_1'];
      case '4':
        return ['chart_0', 'chart_1', 'chart_2', 'chart_3'];
      case '1':
      default:
        return ['chart_0'];
    }
  }, [layout]);

  // CSS Grid configuration based on layout
  const gridStyle: React.CSSProperties = useMemo(() => {
    switch (layout) {
      case '2h':
        return {
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gridTemplateRows: 'minmax(0, 1fr)',
          width: '100%',
          height: '100%',
          gap: '2px',
          backgroundColor: '#131722',
        };
      case '2v':
        return {
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
          width: '100%',
          height: '100%',
          gap: '2px',
          backgroundColor: '#131722',
        };
      case '4':
        return {
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
          width: '100%',
          height: '100%',
          gap: '2px',
          backgroundColor: '#131722',
        };
      case '1':
      default:
        return {
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gridTemplateRows: 'minmax(0, 1fr)',
          width: '100%',
          height: '100%',
          backgroundColor: '#131722',
        };
    }
  }, [layout]);

  return (
    <div className={`multi-chart-grid layout-${layout}`} style={gridStyle}>
      {visibleChartIds.map((id) => {
        const chart = charts[id] || {
          id,
          symbol: 'AAPL',
          timeframe: '1D',
          chartType: 'candles',
          indicators: [],
          drawings: [],
          paneHeights: { volume: 110, rsi: 110 },
          selectedDrawingId: null,
        };

        const isActive = id === activeChartId;

        return (
          <ChartCell
            key={id}
            chart={chart}
            isActive={isActive}
            layout={layout}
            isMultiChart={visibleChartIds.length > 1}
            onActivate={() => onSelectActiveChart(id)}
            updateChart={updateChart}
            activeDrawingTool={isActive ? activeDrawingTool : 'cursor'}
            onDrawingToolChange={onDrawingToolChange}
            onOpenIndicatorSettings={onOpenIndicatorSettings}
            isReplayActive={isReplayActive && isActive}
            replayCandles={replayCandles}
            ref={isActive ? activeChartRef : undefined}
          />
        );
      })}
    </div>
  );
};

interface ChartCellProps {
  chart: ChartInstanceState;
  isActive: boolean;
  layout: ChartLayoutType;
  isMultiChart: boolean;
  onActivate: () => void;
  updateChart: (id: string, updates: Partial<ChartInstanceState>) => void;
  activeDrawingTool: DrawingToolType;
  onDrawingToolChange: (tool: DrawingToolType) => void;
  onOpenIndicatorSettings: (id: string) => void;
  isReplayActive: boolean;
  replayCandles: Candle[];
}

const ChartCell = React.forwardRef<TradingChartRef, ChartCellProps>(
  (
    {
      chart,
      isActive,
      isMultiChart,
      onActivate,
      updateChart,
      activeDrawingTool,
      onDrawingToolChange,
      onOpenIndicatorSettings,
      isReplayActive,
      replayCandles,
    },
    ref
  ) => {
    // Subscribe to marketDataService for this specific chart cell
    const [liveBars, setLiveBars] = useState<Candle[]>(() => {
      const cached = marketDataService.getCachedBars(chart.symbol, chart.timeframe);
      return cached ? marketBarsToCandles(cached) : [];
    });

    useEffect(() => {
      let isCurrent = true;

      marketDataService
        .getHistoricalBars(chart.symbol, chart.timeframe)
        .then((bars) => {
          if (isCurrent) {
            setLiveBars(marketBarsToCandles(bars));
          }
        })
        .catch((err) => {
          console.warn(`Failed to fetch bars for ${chart.symbol} ${chart.timeframe}:`, err);
        });

      const subId = marketDataService.subscribeBars(
        chart.symbol,
        chart.timeframe,
        (bars) => {
          if (isCurrent) {
            setLiveBars(marketBarsToCandles(bars));
          }
        }
      );

      return () => {
        isCurrent = false;
        marketDataService.unsubscribeBars(subId);
      };
    }, [chart.symbol, chart.timeframe]);

    const candles = useMemo(() => {
      if (isReplayActive && replayCandles.length > 0) {
        return replayCandles;
      }
      return liveBars;
    }, [isReplayActive, replayCandles, liveBars]);

    const handleRemoveIndicator = (indId: string) => {
      updateChart(chart.id, {
        indicators: chart.indicators.filter((i) => i.id !== indId),
      });
    };

    const handleToggleIndicatorVisibility = (indId: string) => {
      updateChart(chart.id, {
        indicators: chart.indicators.map((i) =>
          i.id === indId ? { ...i, visible: !i.visible } : i
        ),
      });
    };

    const handleSelectDrawing = (drawingId: string | null) => {
      updateChart(chart.id, { selectedDrawingId: drawingId });
    };

    const handleUpdateDrawing = (drawing: Drawing) => {
      updateChart(chart.id, {
        drawings: chart.drawings.map((d) => (d.id === drawing.id ? drawing : d)),
      });
    };

    const handleDeleteSelectedDrawing = () => {
      if (chart.selectedDrawingId) {
        updateChart(chart.id, {
          drawings: chart.drawings.filter((d) => d.id !== chart.selectedDrawingId),
          selectedDrawingId: null,
        });
        return true;
      }
      return false;
    };

    const handleAddDrawing = (drawing: Drawing) => {
      updateChart(chart.id, {
        drawings: [...chart.drawings, drawing],
      });
    };

    const handlePaneHeightsChange = (
      action: React.SetStateAction<PaneHeights>
    ) => {
      const next = typeof action === 'function' ? action(chart.paneHeights) : action;
      updateChart(chart.id, { paneHeights: next });
    };

    return (
      <div
        className={`chart-cell chart-cell-${chart.id} ${isActive ? 'active-chart' : ''}`}
        onClick={onActivate}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: '#131722',
          outline: isMultiChart
            ? isActive
              ? '2px solid #2962ff'
              : '1px solid #2a2e39'
            : 'none',
          outlineOffset: '-2px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Subtle multi-chart header tag */}
        {isMultiChart && (
          <div
            className="chart-cell-header"
            style={{
              height: '24px',
              backgroundColor: isActive ? '#1e222d' : '#171b26',
              borderBottom: '1px solid #2a2e39',
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
              userSelect: 'none',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontWeight: 700,
                  color: isActive ? '#2962ff' : '#d1d4dc',
                }}
              >
                {chart.symbol}
              </span>
              <span style={{ color: '#787b86' }}>•</span>
              <span style={{ color: '#787b86' }}>{chart.timeframe}</span>
              <span style={{ color: '#787b86' }}>•</span>
              <span style={{ color: '#787b86', textTransform: 'capitalize' }}>
                {chart.chartType}
              </span>
            </div>
            {isActive && (
              <span
                style={{
                  backgroundColor: '#2962ff',
                  color: '#ffffff',
                  fontSize: '9px',
                  fontWeight: 600,
                  padding: '1px 5px',
                  borderRadius: '3px',
                }}
              >
                ACTIVE
              </span>
            )}
          </div>
        )}

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <TradingChart
            ref={ref}
            symbol={chart.symbol}
            chartType={chart.chartType}
            timeframe={chart.timeframe}
            candles={candles}
            activeIndicators={chart.indicators}
            onRemoveIndicator={handleRemoveIndicator}
            onToggleIndicatorVisibility={handleToggleIndicatorVisibility}
            onOpenIndicatorSettings={onOpenIndicatorSettings}
            drawings={chart.drawings}
            selectedDrawingId={chart.selectedDrawingId}
            onSelectDrawing={handleSelectDrawing}
            onUpdateDrawing={handleUpdateDrawing}
            onDeleteSelectedDrawing={handleDeleteSelectedDrawing}
            onAddDrawing={handleAddDrawing}
            activeDrawingTool={activeDrawingTool}
            onDrawingToolChange={onDrawingToolChange}
            paneHeights={chart.paneHeights}
            onPaneHeightsChange={handlePaneHeightsChange}
          />
        </div>
      </div>
    );
  }
);

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { Candle, ChartType, Timeframe } from '../chart/models/Candle';
import { TimeScale } from '../chart/core/TimeScale';
import { PriceScale } from '../chart/core/PriceScale';
import { CoordinateSystem } from '../chart/core/CoordinateSystem';
import { GridRenderer } from '../chart/rendering/GridRenderer';
import { CandleRenderer } from '../chart/rendering/CandleRenderer';
import { BarRenderer } from '../chart/rendering/BarRenderer';
import { LineRenderer } from '../chart/rendering/LineRenderer';
import { AreaRenderer } from '../chart/rendering/AreaRenderer';
import { HollowCandleRenderer } from '../chart/rendering/HollowCandleRenderer';
import { PriceScaleRenderer } from '../chart/rendering/PriceScaleRenderer';
import { TimeScaleRenderer } from '../chart/rendering/TimeScaleRenderer';
import { CrosshairController } from '../chart/interaction/CrosshairController';
import { PanController } from '../chart/interaction/PanController';
import { ZoomController } from '../chart/interaction/ZoomController';

// V3 & V4 Technical Indicator Engine & Renderers
import type { IndicatorInstance } from '../chart/indicators/Indicator';
import { IndicatorEngine } from '../chart/indicators/IndicatorEngine';
import { LineIndicatorRenderer } from '../chart/rendering/indicator/LineIndicatorRenderer';
import { BollingerRenderer } from '../chart/rendering/indicator/BollingerRenderer';
import { RSIRenderer } from '../chart/rendering/indicator/RSIRenderer';
import { VolumeRenderer } from '../chart/rendering/indicator/VolumeRenderer';

// V3 & V4 Drawing Tools & Hit Testing
import type { Drawing } from '../chart/drawings/Drawing';
import { DrawingManager, type DrawingToolType } from '../chart/drawings/DrawingManager';

export interface TradingChartRef {
  resetView: () => void;
}

export interface TradingChartProps {
  candles: Candle[];
  symbol?: string;
  chartType: ChartType;
  timeframe: Timeframe;
  activeIndicators?: IndicatorInstance[];
  onRemoveIndicator?: (id: string) => void;
  onToggleIndicatorVisibility?: (id: string) => void;
  onOpenIndicatorSettings?: (id: string) => void;
  drawings?: Drawing[];
  selectedDrawingId?: string | null;
  onSelectDrawing?: (id: string | null) => void;
  onUpdateDrawing?: (drawing: Drawing) => void;
  onDeleteSelectedDrawing?: () => void;
  onAddDrawing?: (drawing: Drawing) => void;
  activeDrawingTool?: DrawingToolType;
  onDrawingToolChange?: (tool: DrawingToolType) => void;
  paneHeights?: { volume: number; rsi: number };
  onPaneHeightsChange?: (heights: { volume: number; rsi: number }) => void;
}

export const TradingChart = forwardRef<TradingChartRef, TradingChartProps>(({
  candles,
  symbol = 'AAPL',
  chartType,
  timeframe,
  activeIndicators = [],
  onRemoveIndicator,
  onToggleIndicatorVisibility,
  onOpenIndicatorSettings,
  drawings = [],
  selectedDrawingId = null,
  onSelectDrawing,
  onUpdateDrawing,
  onDeleteSelectedDrawing,
  onAddDrawing,
  activeDrawingTool = 'cursor',
  onDrawingToolChange,
  paneHeights = { volume: 110, rsi: 110 },
  onPaneHeightsChange,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Canvases for Main Price Pane
  const mainPlotBgRef = useRef<HTMLCanvasElement>(null);
  const mainPlotFgRef = useRef<HTMLCanvasElement>(null);
  const mainPriceBgRef = useRef<HTMLCanvasElement>(null);
  const mainPriceFgRef = useRef<HTMLCanvasElement>(null);

  // 2. Canvases for Volume Sub-pane
  const volPlotBgRef = useRef<HTMLCanvasElement>(null);
  const volPlotFgRef = useRef<HTMLCanvasElement>(null);
  const volScaleBgRef = useRef<HTMLCanvasElement>(null);
  const volScaleFgRef = useRef<HTMLCanvasElement>(null);

  // 3. Canvases for RSI Sub-pane
  const rsiPlotBgRef = useRef<HTMLCanvasElement>(null);
  const rsiPlotFgRef = useRef<HTMLCanvasElement>(null);
  const rsiScaleBgRef = useRef<HTMLCanvasElement>(null);
  const rsiScaleFgRef = useRef<HTMLCanvasElement>(null);

  // 4. Canvases for Bottom Time Scale
  const timeBgRef = useRef<HTMLCanvasElement>(null);
  const timeFgRef = useRef<HTMLCanvasElement>(null);
  const cornerRef = useRef<HTMLCanvasElement>(null);

  // Shared Core Engines
  const timeScaleRef = useRef<TimeScale>(new TimeScale(12));
  const mainPriceScaleRef = useRef<PriceScale>(new PriceScale(300, 360));
  const indicatorEngineRef = useRef<IndicatorEngine>(new IndicatorEngine());
  const drawingManagerRef = useRef<DrawingManager>(new DrawingManager());

  const isInitializedRef = useRef<boolean>(false);
  const rafIdRef = useRef<number | null>(null);

  const priceScaleWidth = 58;
  const timeScaleHeight = 28;

  // Active sub-panes
  const volumeIndicator = activeIndicators.find((i) => i.type === 'VOL' && i.visible);
  const rsiIndicator = activeIndicators.find((i) => i.type === 'RSI' && i.visible);
  const hasVolume = !!volumeIndicator;
  const hasRsi = !!rsiIndicator;

  // Viewport dimensions state
  const [dimensions, setDimensions] = useState({
    width: 800,
    height: 500,
    plotWidth: 800 - priceScaleWidth,
    mainPaneHeight: 500 - timeScaleHeight,
    volPaneHeight: hasVolume ? paneHeights.volume : 0,
    rsiPaneHeight: hasRsi ? paneHeights.rsi : 0,
  });

  const [hoverCandle, setHoverCandle] = useState<Candle | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [hoverCursor, setHoverCursor] = useState<string | null>(null);

  // Divider Drag State for Pane Resizing
  const [resizingDivider, setResizingDivider] = useState<'volume' | 'rsi' | null>(null);
  const dividerDragStartRef = useRef<{ startY: number; startHeight: number } | null>(null);

  // Sync DrawingManager state
  useEffect(() => {
    drawingManagerRef.current.drawings = drawings;
  }, [drawings]);

  useEffect(() => {
    drawingManagerRef.current.selectDrawing(selectedDrawingId);
  }, [selectedDrawingId]);

  useEffect(() => {
    drawingManagerRef.current.setTool(activeDrawingTool);
  }, [activeDrawingTool]);

  // Request Render loop
  const requestChartRender = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      renderAllPanes();
    });
  }, [candles, chartType, activeIndicators, dimensions]);

  // Pan and Zoom controllers
  const panControllerRef = useRef<PanController | null>(null);
  const zoomControllerRef = useRef<ZoomController | null>(null);

  useEffect(() => {
    panControllerRef.current = new PanController({
      timeScale: timeScaleRef.current,
      priceScale: mainPriceScaleRef.current,
      onRequestRender: requestChartRender,
      onPanChange: (panning) => setIsPanning(panning),
    });

    zoomControllerRef.current = new ZoomController({
      timeScale: timeScaleRef.current,
      priceScale: mainPriceScaleRef.current,
      onRequestRender: requestChartRender,
    });
  }, [requestChartRender]);

  // Reset view
  const handleResetView = useCallback(() => {
    if (candles.length === 0) return;
    timeScaleRef.current.resetView(dimensions.plotWidth, candles.length);
    const { startIndex, endIndex } = timeScaleRef.current.getVisibleRange(dimensions.plotWidth, candles.length);
    const visibleCandles = candles.slice(startIndex, endIndex + 1);
    mainPriceScaleRef.current.updateAutoScale(visibleCandles);
    requestChartRender();
  }, [candles, dimensions.plotWidth, requestChartRender]);

  useImperativeHandle(ref, () => ({
    resetView: () => handleResetView(),
  }));

  // Initial mount auto-fit
  useEffect(() => {
    if (candles.length > 0 && !isInitializedRef.current && dimensions.plotWidth > 100) {
      isInitializedRef.current = true;
      handleResetView();
    }
  }, [candles, dimensions.plotWidth, handleResetView]);

  // Render All Panes
  const renderAllPanes = () => {
    const { plotWidth, mainPaneHeight, volPaneHeight, rsiPaneHeight } = dimensions;
    if (plotWidth <= 0 || mainPaneHeight <= 0) return;

    const timeScale = timeScaleRef.current;
    const mainPriceScale = mainPriceScaleRef.current;
    const engine = indicatorEngineRef.current;

    // 1. Auto-scale main price if active
    const { startIndex, endIndex } = timeScale.getVisibleRange(plotWidth, candles.length);
    const visibleCandles = candles.slice(startIndex, endIndex + 1);
    mainPriceScale.updateAutoScale(visibleCandles);

    // 2. Main Pane Render
    const mainPlotBg = mainPlotBgRef.current;
    const mainPriceBg = mainPriceBgRef.current;
    if (mainPlotBg && mainPriceBg) {
      const plotCtx = mainPlotBg.getContext('2d');
      const priceCtx = mainPriceBg.getContext('2d');
      if (plotCtx && priceCtx) {
        const timeTicks = timeScale.calculateTimeTicks(plotWidth, candles);
        const priceTicks = mainPriceScale.calculatePriceTicks(mainPaneHeight);

        // Grid
        plotCtx.clearRect(0, 0, plotWidth, mainPaneHeight);
        GridRenderer.render(plotCtx, plotWidth, mainPaneHeight, timeTicks, priceTicks);

        // Candles / Bars / Line / Area / Hollow
        switch (chartType) {
          case 'bars':
            BarRenderer.render(plotCtx, candles, timeScale, mainPriceScale, plotWidth, mainPaneHeight);
            break;
          case 'line':
            LineRenderer.render(plotCtx, candles, timeScale, mainPriceScale, plotWidth, mainPaneHeight);
            break;
          case 'area':
            AreaRenderer.render(plotCtx, candles, timeScale, mainPriceScale, plotWidth, mainPaneHeight);
            break;
          case 'hollow_candles':
            HollowCandleRenderer.render(plotCtx, candles, timeScale, mainPriceScale, plotWidth, mainPaneHeight);
            break;
          case 'candles':
          default:
            CandleRenderer.render(plotCtx, candles, timeScale, mainPriceScale, plotWidth, mainPaneHeight);
            break;
        }

        // Overlay Technical Indicators (SMA, EMA, Bollinger Bands)
        for (const ind of activeIndicators) {
          if (!ind.visible) continue;
          const calculated = engine.calculate(ind, candles);
          if (!calculated) continue;

          if (calculated.type === 'SMA') {
            LineIndicatorRenderer.render(
              plotCtx,
              calculated.result.values,
              timeScale,
              mainPriceScale,
              plotWidth,
              mainPaneHeight,
              ind.color || '#f59e0b',
              ind.params.lineWidth || 1.5
            );
          } else if (calculated.type === 'EMA') {
            LineIndicatorRenderer.render(
              plotCtx,
              calculated.result.values,
              timeScale,
              mainPriceScale,
              plotWidth,
              mainPaneHeight,
              ind.color || '#06b6d4',
              ind.params.lineWidth || 1.5
            );
          } else if (calculated.type === 'BB') {
            BollingerRenderer.render(
              plotCtx,
              calculated.result,
              timeScale,
              mainPriceScale,
              plotWidth,
              mainPaneHeight,
              ind.color || '#a855f7'
            );
          }
        }

        // Price Scale
        priceCtx.clearRect(0, 0, priceScaleWidth, mainPaneHeight);
        const lastCandle = candles.length > 0 ? candles[candles.length - 1] : null;
        PriceScaleRenderer.render(
          priceCtx,
          priceScaleWidth,
          mainPaneHeight,
          priceTicks,
          lastCandle,
          (price: number) => mainPriceScale.priceToY(price, mainPaneHeight)
        );
      }
    }

    // 2b. Main Plot Foreground (Committed Drawings)
    const mainPlotFg = mainPlotFgRef.current;
    if (mainPlotFg) {
      const fgCtx = mainPlotFg.getContext('2d');
      if (fgCtx) {
        fgCtx.clearRect(0, 0, plotWidth, mainPaneHeight);
        drawingManagerRef.current.render(
          fgCtx,
          candles,
          timeScale,
          mainPriceScale,
          plotWidth,
          mainPaneHeight
        );
      }
    }

    // 3. Volume Sub-pane Render (if active)
    if (hasVolume && volPlotBgRef.current && volScaleBgRef.current && volPaneHeight > 0) {
      const volPlotCtx = volPlotBgRef.current.getContext('2d');
      const volScaleCtx = volScaleBgRef.current.getContext('2d');
      if (volPlotCtx && volScaleCtx && volumeIndicator) {
        const calculated = engine.calculate(volumeIndicator, candles);
        if (calculated && calculated.type === 'VOL') {
          VolumeRenderer.render(
            volPlotCtx,
            volScaleCtx,
            calculated.result,
            timeScale,
            plotWidth,
            volPaneHeight,
            priceScaleWidth
          );
        }
      }
    }

    // 4. RSI Sub-pane Render (if active)
    if (hasRsi && rsiPlotBgRef.current && rsiScaleBgRef.current && rsiPaneHeight > 0) {
      const rsiPlotCtx = rsiPlotBgRef.current.getContext('2d');
      const rsiScaleCtx = rsiScaleBgRef.current.getContext('2d');
      if (rsiPlotCtx && rsiScaleCtx && rsiIndicator) {
        const calculated = engine.calculate(rsiIndicator, candles);
        if (calculated && calculated.type === 'RSI') {
          RSIRenderer.render(
            rsiPlotCtx,
            rsiScaleCtx,
            calculated.result,
            timeScale,
            plotWidth,
            rsiPaneHeight,
            priceScaleWidth,
            rsiIndicator.color || '#8b5cf6',
            rsiIndicator.params.overbought ?? 70,
            rsiIndicator.params.center ?? 50,
            rsiIndicator.params.oversold ?? 30
          );
        }
      }
    }

    // 5. Bottom Time Scale Render
    const timeBg = timeBgRef.current;
    const corner = cornerRef.current;
    if (timeBg && corner) {
      const timeCtx = timeBg.getContext('2d');
      const cornerCtx = corner.getContext('2d');
      if (timeCtx && cornerCtx) {
        const timeTicks = timeScale.calculateTimeTicks(plotWidth, candles);
        TimeScaleRenderer.render(timeCtx, plotWidth, timeScaleHeight, timeTicks);

        cornerCtx.fillStyle = '#131722';
        cornerCtx.fillRect(0, 0, priceScaleWidth, timeScaleHeight);
        cornerCtx.strokeStyle = '#2a2e39';
        cornerCtx.lineWidth = 1;
        cornerCtx.beginPath();
        cornerCtx.moveTo(0, 0.5);
        cornerCtx.lineTo(priceScaleWidth, 0.5);
        cornerCtx.moveTo(0.5, 0);
        cornerCtx.lineTo(0.5, timeScaleHeight);
        cornerCtx.stroke();
      }
    }
  };

  const [containerSize, setContainerSize] = useState({ width: 800, height: 500 });

  // 1. Observe outer container dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width <= 0 || height <= 0) continue;
        setContainerSize({ width: Math.floor(width), height: Math.floor(height) });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // 2. Recalculate multi-pane dimensions and setup canvas buffers
  useEffect(() => {
    const { width, height } = containerSize;
    if (width <= 0 || height <= 0) return;

    const plotWidth = Math.max(10, Math.floor(width - priceScaleWidth));
    const volH = hasVolume ? paneHeights.volume : 0;
    const rsiH = hasRsi ? paneHeights.rsi : 0;
    const mainH = Math.max(100, Math.floor(height - timeScaleHeight - volH - rsiH));
    const dpr = window.devicePixelRatio || 1;

    // Setup Main Canvases
    if (mainPlotBgRef.current) CoordinateSystem.setupCanvas(mainPlotBgRef.current, plotWidth, mainH, dpr);
    if (mainPlotFgRef.current) CoordinateSystem.setupCanvas(mainPlotFgRef.current, plotWidth, mainH, dpr);
    if (mainPriceBgRef.current) CoordinateSystem.setupCanvas(mainPriceBgRef.current, priceScaleWidth, mainH, dpr);
    if (mainPriceFgRef.current) CoordinateSystem.setupCanvas(mainPriceFgRef.current, priceScaleWidth, mainH, dpr);

    // Setup Volume Canvases
    if (hasVolume) {
      if (volPlotBgRef.current) CoordinateSystem.setupCanvas(volPlotBgRef.current, plotWidth, volH, dpr);
      if (volPlotFgRef.current) CoordinateSystem.setupCanvas(volPlotFgRef.current, plotWidth, volH, dpr);
      if (volScaleBgRef.current) CoordinateSystem.setupCanvas(volScaleBgRef.current, priceScaleWidth, volH, dpr);
      if (volScaleFgRef.current) CoordinateSystem.setupCanvas(volScaleFgRef.current, priceScaleWidth, volH, dpr);
    }

    // Setup RSI Canvases
    if (hasRsi) {
      if (rsiPlotBgRef.current) CoordinateSystem.setupCanvas(rsiPlotBgRef.current, plotWidth, rsiH, dpr);
      if (rsiPlotFgRef.current) CoordinateSystem.setupCanvas(rsiPlotFgRef.current, plotWidth, rsiH, dpr);
      if (rsiScaleBgRef.current) CoordinateSystem.setupCanvas(rsiScaleBgRef.current, priceScaleWidth, rsiH, dpr);
      if (rsiScaleFgRef.current) CoordinateSystem.setupCanvas(rsiScaleFgRef.current, priceScaleWidth, rsiH, dpr);
    }

    // Setup Time Scale Canvases
    if (timeBgRef.current) CoordinateSystem.setupCanvas(timeBgRef.current, plotWidth, timeScaleHeight, dpr);
    if (timeFgRef.current) CoordinateSystem.setupCanvas(timeFgRef.current, plotWidth, timeScaleHeight, dpr);
    if (cornerRef.current) CoordinateSystem.setupCanvas(cornerRef.current, priceScaleWidth, timeScaleHeight, dpr);

    setDimensions({
      width,
      height,
      plotWidth,
      mainPaneHeight: mainH,
      volPaneHeight: volH,
      rsiPaneHeight: rsiH,
    });
  }, [containerSize, priceScaleWidth, timeScaleHeight, hasVolume, hasRsi, paneHeights.volume, paneHeights.rsi]);

  // Re-render when dependencies change
  useEffect(() => {
    requestChartRender();
  }, [requestChartRender]);

  // Pane Divider Drag Handlers (Draggable Sub-panes with Window Event Tracking)
  const startDividerDrag = (pane: 'volume' | 'rsi', e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startH = pane === 'volume' ? paneHeights.volume : paneHeights.rsi;
    dividerDragStartRef.current = { startY: e.clientY, startHeight: startH };
    setResizingDivider(pane);
  };

  useEffect(() => {
    if (!resizingDivider) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!dividerDragStartRef.current) return;
      const deltaY = e.clientY - dividerDragStartRef.current.startY;
      // Dragging UP (deltaY < 0) expands the subpane below
      const newH = Math.max(50, Math.min(350, Math.round(dividerDragStartRef.current.startHeight - deltaY)));
      onPaneHeightsChange?.({
        volume: resizingDivider === 'volume' ? newH : paneHeights.volume,
        rsi: resizingDivider === 'rsi' ? newH : paneHeights.rsi,
      });
    };

    const handlePointerUp = () => {
      setResizingDivider(null);
      dividerDragStartRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [resizingDivider, paneHeights, onPaneHeightsChange]);

  // Keyboard shortcut listener (Delete/Backspace to delete drawing, Escape to deselect/cancel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (drawingManagerRef.current.selectedDrawingId) {
          e.preventDefault();
          drawingManagerRef.current.deleteSelected();
          onDeleteSelectedDrawing?.();
          requestChartRender();
        }
      } else if (e.key === 'Escape') {
        if (drawingManagerRef.current.inProgressDrawing) {
          drawingManagerRef.current.cancelInProgress();
          onDrawingToolChange?.('cursor');
          requestChartRender();
        } else if (drawingManagerRef.current.selectedDrawingId) {
          drawingManagerRef.current.deselectAll();
          onSelectDrawing?.(null);
          requestChartRender();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDeleteSelectedDrawing, onSelectDrawing, onDrawingToolChange, requestChartRender]);

  // Synchronized Crosshair Overlay Helpers
  const clearMainOverlay = () => {
    const mainPlotFgCtx = mainPlotFgRef.current?.getContext('2d');
    const mainPriceFgCtx = mainPriceFgRef.current?.getContext('2d');
    const timeFgCtx = timeFgRef.current?.getContext('2d');

    CrosshairController.clear(
      mainPlotFgCtx ?? null,
      mainPriceFgCtx ?? null,
      timeFgCtx ?? null,
      dimensions.plotWidth,
      dimensions.mainPaneHeight,
      priceScaleWidth,
      timeScaleHeight
    );
  };

  const clearAllOverlays = () => {
    clearMainOverlay();
    volPlotFgRef.current?.getContext('2d')?.clearRect(0, 0, dimensions.plotWidth, dimensions.volPaneHeight);
    volScaleFgRef.current?.getContext('2d')?.clearRect(0, 0, priceScaleWidth, dimensions.volPaneHeight);
    rsiPlotFgRef.current?.getContext('2d')?.clearRect(0, 0, dimensions.plotWidth, dimensions.rsiPaneHeight);
    rsiScaleFgRef.current?.getContext('2d')?.clearRect(0, 0, priceScaleWidth, dimensions.rsiPaneHeight);
  };

  const drawSynchronizedVerticalLine = (targetCtx: CanvasRenderingContext2D | null, x: number, height: number) => {
    if (!targetCtx || height <= 0) return;
    targetCtx.save();
    targetCtx.strokeStyle = '#787b86';
    targetCtx.lineWidth = 1;
    targetCtx.setLineDash([4, 4]);
    targetCtx.beginPath();
    targetCtx.moveTo(x + 0.5, 0);
    targetCtx.lineTo(x + 0.5, height);
    targetCtx.stroke();
    targetCtx.restore();
  };

  // Main Plot Pointer Down (Drawings Creation / Selection / Pan start)
  const handleMainPlotPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const rawIndex = Math.round(timeScaleRef.current.xToIndex(mouseX));
    const clampedIndex = Math.max(0, Math.min(candles.length - 1, rawIndex));
    const c = candles[clampedIndex];
    const time = c ? c.time : Date.now() / 1000;
    const price = mainPriceScaleRef.current.yToPrice(mouseY, dimensions.mainPaneHeight);

    // 1. If in cursor mode: Hit test for drawing selection & handle drag
    if (activeDrawingTool === 'cursor') {
      const handled = drawingManagerRef.current.handlePointerDownCursor(
        mouseX,
        mouseY,
        time,
        price,
        candles,
        timeScaleRef.current,
        mainPriceScaleRef.current,
        dimensions.plotWidth,
        dimensions.mainPaneHeight
      );

      onSelectDrawing?.(drawingManagerRef.current.selectedDrawingId);
      requestChartRender();

      if (handled) {
        return; // Consumed by drawing selection/drag, prevent panning
      }

      // If not handled, allow pan
      if (panControllerRef.current && mainPlotFgRef.current) {
        panControllerRef.current.handlePointerDown(e.nativeEvent, mainPlotFgRef.current);
      }
      return;
    }

    // 2. Active Drawing Tool: Create or finalize drawing point
    const created = drawingManagerRef.current.handleChartClick(time, price);
    if (created && !drawingManagerRef.current.inProgressDrawing) {
      const latest = drawingManagerRef.current.drawings[drawingManagerRef.current.drawings.length - 1];
      if (latest) onAddDrawing?.(latest);
      onDrawingToolChange?.('cursor');
    }
    requestChartRender();
  };

  // Main Plot Pointer Move (Crosshair + Drawing Preview + Drawing Drag + Panning)
  const handleMainPlotPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 1. Pan handling
    if (panControllerRef.current?.isPanning) {
      panControllerRef.current.handlePointerMove(e.nativeEvent, dimensions.mainPaneHeight);
      clearAllOverlays();
      return;
    }

    // 2. Drawing dragging / hovering in cursor mode
    if (activeDrawingTool === 'cursor') {
      const rawIndex = Math.round(timeScaleRef.current.xToIndex(mouseX));
      const clampedIndex = Math.max(0, Math.min(candles.length - 1, rawIndex));
      const c = candles[clampedIndex];
      const time = c ? c.time : Date.now() / 1000;
      const price = mainPriceScaleRef.current.yToPrice(mouseY, dimensions.mainPaneHeight);

      const { isDragging, cursor } = drawingManagerRef.current.handlePointerMoveCursor(
        mouseX,
        mouseY,
        time,
        price,
        candles,
        timeScaleRef.current,
        mainPriceScaleRef.current,
        dimensions.plotWidth,
        dimensions.mainPaneHeight
      );

      setHoverCursor(cursor);

      if (isDragging) {
        const fg = mainPlotFgRef.current;
        if (fg) {
          const ctx = fg.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, dimensions.plotWidth, dimensions.mainPaneHeight);
            drawingManagerRef.current.render(
              ctx,
              candles,
              timeScaleRef.current,
              mainPriceScaleRef.current,
              dimensions.plotWidth,
              dimensions.mainPaneHeight
            );
          }
        }
        return;
      }
    }

    // 3. Drawing tool in-progress preview
    if (activeDrawingTool !== 'cursor' && drawingManagerRef.current.inProgressDrawing) {
      const rawIndex = Math.round(timeScaleRef.current.xToIndex(mouseX));
      const clampedIndex = Math.max(0, Math.min(candles.length - 1, rawIndex));
      const c = candles[clampedIndex];
      const time = c ? c.time : Date.now() / 1000;
      const price = mainPriceScaleRef.current.yToPrice(mouseY, dimensions.mainPaneHeight);

      drawingManagerRef.current.handleChartPointerMove(time, price);

      const fg = mainPlotFgRef.current;
      if (fg) {
        const ctx = fg.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, dimensions.plotWidth, dimensions.mainPaneHeight);
          drawingManagerRef.current.render(
            ctx,
            candles,
            timeScaleRef.current,
            mainPriceScaleRef.current,
            dimensions.plotWidth,
            dimensions.mainPaneHeight
          );
        }
      }
      return;
    }

    // 4. Synchronized Crosshair Rendering across Main, Volume, and RSI
    const mainPlotFgCtx = mainPlotFgRef.current?.getContext('2d');
    const mainPriceFgCtx = mainPriceFgRef.current?.getContext('2d');
    const timeFgCtx = timeFgRef.current?.getContext('2d');

    if (mainPlotFgCtx && mainPriceFgCtx && timeFgCtx) {
      mainPlotFgCtx.clearRect(0, 0, dimensions.plotWidth, dimensions.mainPaneHeight);

      // Re-draw drawings on foreground
      drawingManagerRef.current.render(
        mainPlotFgCtx,
        candles,
        timeScaleRef.current,
        mainPriceScaleRef.current,
        dimensions.plotWidth,
        dimensions.mainPaneHeight
      );

      const pt = CrosshairController.render(
        mainPlotFgCtx,
        mainPriceFgCtx,
        timeFgCtx,
        dimensions.plotWidth,
        dimensions.mainPaneHeight,
        priceScaleWidth,
        timeScaleHeight,
        mouseX,
        mouseY,
        timeScaleRef.current,
        mainPriceScaleRef.current,
        candles
      );
      if (pt?.candle) setHoverCandle(pt.candle);

      // Synchronize vertical line to Volume Sub-pane
      if (hasVolume && volPlotFgRef.current) {
        const volCtx = volPlotFgRef.current.getContext('2d');
        if (volCtx) {
          volCtx.clearRect(0, 0, dimensions.plotWidth, dimensions.volPaneHeight);
          drawSynchronizedVerticalLine(volCtx, mouseX, dimensions.volPaneHeight);
        }
      }

      // Synchronize vertical line to RSI Sub-pane
      if (hasRsi && rsiPlotFgRef.current) {
        const rsiCtx = rsiPlotFgRef.current.getContext('2d');
        if (rsiCtx) {
          rsiCtx.clearRect(0, 0, dimensions.plotWidth, dimensions.rsiPaneHeight);
          drawSynchronizedVerticalLine(rsiCtx, mouseX, dimensions.rsiPaneHeight);
        }
      }
    }
  };

  // Main Plot Pointer Up
  const handleMainPlotPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeDrawingTool === 'cursor' && drawingManagerRef.current.isDragging) {
      drawingManagerRef.current.handlePointerUpCursor();
      const updated = drawingManagerRef.current.drawings.find(
        (d) => d.id === drawingManagerRef.current.selectedDrawingId
      );
      if (updated) onUpdateDrawing?.(updated);
      requestChartRender();
      return;
    }

    if (panControllerRef.current && mainPlotFgRef.current) {
      panControllerRef.current.handlePointerUp(e.nativeEvent, mainPlotFgRef.current);
    }
  };

  const handleMainPlotPointerLeave = () => {
    if (panControllerRef.current?.isPanning) return;
    if (drawingManagerRef.current.isDragging) return;
    clearAllOverlays();
    setHoverCandle(null);
    setHoverCursor(null);
  };

  // Volume Sub-pane Pointer Move (Crosshair Sync)
  const handleVolPlotPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    clearAllOverlays();

    // 1. Crosshair on Volume pane
    const volPlotCtx = volPlotFgRef.current?.getContext('2d');
    const volScaleCtx = volScaleFgRef.current?.getContext('2d');
    const timeCtx = timeFgRef.current?.getContext('2d');

    if (volPlotCtx) {
      volPlotCtx.save();
      volPlotCtx.strokeStyle = '#787b86';
      volPlotCtx.lineWidth = 1;
      volPlotCtx.setLineDash([4, 4]);
      // Vertical
      volPlotCtx.beginPath();
      volPlotCtx.moveTo(mouseX + 0.5, 0);
      volPlotCtx.lineTo(mouseX + 0.5, dimensions.volPaneHeight);
      volPlotCtx.stroke();
      // Horizontal
      volPlotCtx.beginPath();
      volPlotCtx.moveTo(0, mouseY + 0.5);
      volPlotCtx.lineTo(dimensions.plotWidth, mouseY + 0.5);
      volPlotCtx.stroke();
      volPlotCtx.restore();
    }

    // 2. Volume Scale hover badge
    if (volScaleCtx) {
      // Find visible max volume
      const engine = indicatorEngineRef.current;
      const calculated = volumeIndicator ? engine.calculate(volumeIndicator, candles) : null;
      let maxVol = 1000000;
      if (calculated && calculated.type === 'VOL') {
        const { startIndex, endIndex } = timeScaleRef.current.getVisibleRange(dimensions.plotWidth, candles.length);
        for (let i = startIndex; i <= endIndex; i++) {
          if (calculated.result.volumes[i] > maxVol) maxVol = calculated.result.volumes[i];
        }
        maxVol *= 1.1;
      }
      VolumeRenderer.renderHoverBadge(volScaleCtx, mouseY, dimensions.volPaneHeight, priceScaleWidth, maxVol);
    }

    // 3. Time scale label
    if (timeCtx) {
      const rawIdx = Math.round(timeScaleRef.current.xToIndex(mouseX));
      const clampedIdx = Math.max(0, Math.min(candles.length - 1, rawIdx));
      const candle = candles[clampedIdx];
      if (candle) {
        setHoverCandle(candle);
        CrosshairController.renderTimeBadge(timeCtx, dimensions.plotWidth, timeScaleHeight, mouseX, candle.time, timeScaleRef.current, false);
      }
    }

    // 4. Synchronize vertical lines to Main Plot and RSI
    if (mainPlotFgRef.current) {
      const ctx = mainPlotFgRef.current.getContext('2d');
      drawSynchronizedVerticalLine(ctx, mouseX, dimensions.mainPaneHeight);
    }
    if (hasRsi && rsiPlotFgRef.current) {
      const ctx = rsiPlotFgRef.current.getContext('2d');
      drawSynchronizedVerticalLine(ctx, mouseX, dimensions.rsiPaneHeight);
    }
  };

  // RSI Sub-pane Pointer Move (Crosshair Sync)
  const handleRsiPlotPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    clearAllOverlays();

    // 1. Crosshair on RSI pane
    const rsiPlotCtx = rsiPlotFgRef.current?.getContext('2d');
    const rsiScaleCtx = rsiScaleFgRef.current?.getContext('2d');
    const timeCtx = timeFgRef.current?.getContext('2d');

    if (rsiPlotCtx) {
      rsiPlotCtx.save();
      rsiPlotCtx.strokeStyle = '#787b86';
      rsiPlotCtx.lineWidth = 1;
      rsiPlotCtx.setLineDash([4, 4]);
      // Vertical
      rsiPlotCtx.beginPath();
      rsiPlotCtx.moveTo(mouseX + 0.5, 0);
      rsiPlotCtx.lineTo(mouseX + 0.5, dimensions.rsiPaneHeight);
      rsiPlotCtx.stroke();
      // Horizontal
      rsiPlotCtx.beginPath();
      rsiPlotCtx.moveTo(0, mouseY + 0.5);
      rsiPlotCtx.lineTo(dimensions.plotWidth, mouseY + 0.5);
      rsiPlotCtx.stroke();
      rsiPlotCtx.restore();
    }

    // 2. RSI Scale hover badge
    if (rsiScaleCtx) {
      RSIRenderer.renderHoverBadge(
        rsiScaleCtx,
        mouseY,
        dimensions.rsiPaneHeight,
        priceScaleWidth,
        rsiIndicator?.color || '#8b5cf6'
      );
    }

    // 3. Time scale label
    if (timeCtx) {
      const rawIdx = Math.round(timeScaleRef.current.xToIndex(mouseX));
      const clampedIdx = Math.max(0, Math.min(candles.length - 1, rawIdx));
      const candle = candles[clampedIdx];
      if (candle) {
        setHoverCandle(candle);
        CrosshairController.renderTimeBadge(timeCtx, dimensions.plotWidth, timeScaleHeight, mouseX, candle.time, timeScaleRef.current, false);
      }
    }

    // 4. Synchronize vertical lines to Main Plot and Volume
    if (mainPlotFgRef.current) {
      const ctx = mainPlotFgRef.current.getContext('2d');
      drawSynchronizedVerticalLine(ctx, mouseX, dimensions.mainPaneHeight);
    }
    if (hasVolume && volPlotFgRef.current) {
      const ctx = volPlotFgRef.current.getContext('2d');
      drawSynchronizedVerticalLine(ctx, mouseX, dimensions.volPaneHeight);
    }
  };

  const handleSubpanePointerLeave = () => {
    clearAllOverlays();
    setHoverCandle(null);
  };

  const handlePlotWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (!zoomControllerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    zoomControllerRef.current.handleWheel(e.nativeEvent, mouseX);
  };

  // Price Scale Drag Handlers
  const handlePricePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!zoomControllerRef.current || !mainPriceFgRef.current) return;
    zoomControllerRef.current.handlePriceScalePointerDown(e.nativeEvent, mainPriceFgRef.current);
  };
  const handlePricePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!zoomControllerRef.current) return;
    zoomControllerRef.current.handlePriceScalePointerMove(e.nativeEvent, dimensions.mainPaneHeight);
  };
  const handlePricePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!zoomControllerRef.current || !mainPriceFgRef.current) return;
    zoomControllerRef.current.handlePriceScalePointerUp(e.nativeEvent, mainPriceFgRef.current);
  };

  // Time Scale Drag Handlers
  const handleTimePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!zoomControllerRef.current || !timeFgRef.current) return;
    zoomControllerRef.current.handleTimeScalePointerDown(e.nativeEvent, timeFgRef.current);
  };
  const handleTimePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!zoomControllerRef.current) return;
    zoomControllerRef.current.handleTimeScalePointerMove(e.nativeEvent, dimensions.plotWidth);
  };
  const handleTimePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!zoomControllerRef.current || !timeFgRef.current) return;
    zoomControllerRef.current.handleTimeScalePointerUp(e.nativeEvent, timeFgRef.current);
  };

  // Display Candle in Legend
  const displayCandle = hoverCandle || (candles.length > 0 ? candles[candles.length - 1] : null);
  const isUp = displayCandle ? displayCandle.close >= displayCandle.open : true;
  const changeValue = displayCandle ? displayCandle.close - displayCandle.open : 0;
  const changePct = displayCandle && displayCandle.open > 0 ? (changeValue / displayCandle.open) * 100 : 0;

  // Selected Drawing for floating action bar
  const selectedDrawing = drawings.find((d) => d.id === selectedDrawingId);
  const overlayIndicators = activeIndicators.filter((i) => i.type === 'SMA' || i.type === 'EMA' || i.type === 'BB');

  const formatIndicatorLabel = (ind: IndicatorInstance) => {
    switch (ind.type) {
      case 'SMA':
        return `SMA ${ind.params.period ?? 20}`;
      case 'EMA':
        return `EMA ${ind.params.period ?? 20}`;
      case 'BB':
        return `BB ${ind.params.period ?? 20} ${ind.params.stdDev ?? 2}`;
      case 'RSI':
        return `RSI ${ind.params.period ?? 14}`;
      case 'VOL':
        return `Vol ${ind.params.maPeriod ?? 20}`;
      default:
        return ind.type;
    }
  };

  return (
    <div
      ref={containerRef}
      className="trading-chart-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#131722',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* =========================================================================
          1. MAIN PRICE PANE (Candles + Overlays + Drawings)
          ========================================================================= */}
      <div
        className="pane-row main-price-pane"
        style={{
          display: 'flex',
          flex: 1,
          minHeight: '100px',
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Main Plot Surface */}
        <div
          className="plot-surface"
          style={{
            flex: 1,
            position: 'relative',
            height: '100%',
            cursor:
              hoverCursor ||
              (activeDrawingTool !== 'cursor' ? 'crosshair' : isPanning ? 'grabbing' : 'crosshair'),
            overflow: 'hidden',
          }}
        >
          <canvas
            ref={mainPlotBgRef}
            style={{ position: 'absolute', left: 0, top: 0, display: 'block', pointerEvents: 'none' }}
          />
          <canvas
            ref={mainPlotFgRef}
            onPointerDown={handleMainPlotPointerDown}
            onPointerMove={handleMainPlotPointerMove}
            onPointerUp={handleMainPlotPointerUp}
            onPointerLeave={handleMainPlotPointerLeave}
            onWheel={handlePlotWheel}
            style={{ position: 'absolute', left: 0, top: 0, display: 'block', touchAction: 'none' }}
          />

          {/* In-Chart Legend (OHLC + Overlay Indicators) */}
          <div
            className="chart-main-legend"
            style={{
              position: 'absolute',
              top: 8,
              left: 12,
              pointerEvents: 'none',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              zIndex: 10,
              color: '#d1d4dc',
            }}
          >
            {/* Symbol & OHLC Row */}
            {displayCandle && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, color: '#f0f3fa' }}>{symbol}</span>
                <span
                  style={{
                    color: '#787b86',
                    fontSize: '11px',
                    background: '#2a2e39',
                    padding: '1px 5px',
                    borderRadius: '3px',
                  }}
                >
                  {timeframe}
                </span>
                <span>
                  <span style={{ color: '#787b86' }}>O </span>
                  <span style={{ color: isUp ? '#089981' : '#f23645' }}>{displayCandle.open.toFixed(2)}</span>
                </span>
                <span>
                  <span style={{ color: '#787b86' }}>H </span>
                  <span style={{ color: isUp ? '#089981' : '#f23645' }}>{displayCandle.high.toFixed(2)}</span>
                </span>
                <span>
                  <span style={{ color: '#787b86' }}>L </span>
                  <span style={{ color: isUp ? '#089981' : '#f23645' }}>{displayCandle.low.toFixed(2)}</span>
                </span>
                <span>
                  <span style={{ color: '#787b86' }}>C </span>
                  <span style={{ color: isUp ? '#089981' : '#f23645' }}>{displayCandle.close.toFixed(2)}</span>
                </span>
                <span style={{ color: isUp ? '#089981' : '#f23645' }}>
                  {changeValue >= 0 ? `+${changeValue.toFixed(2)}` : changeValue.toFixed(2)} (
                  {changePct >= 0 ? `+${changePct.toFixed(2)}%` : `${changePct.toFixed(2)}%`})
                </span>
              </div>
            )}

            {/* Overlay Indicators Status Badges with V4 Controls */}
            {overlayIndicators.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', pointerEvents: 'auto' }}>
                {overlayIndicators.map((ind) => (
                  <div
                    key={ind.id}
                    className="indicator-status-badge"
                    onDoubleClick={() => onOpenIndicatorSettings?.(ind.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      backgroundColor: 'rgba(30, 34, 45, 0.88)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #2a2e39',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ind.color }} />
                    <span style={{ fontWeight: 600, color: ind.visible ? '#f0f3fa' : '#787b86' }}>
                      {formatIndicatorLabel(ind)}
                    </span>

                    {/* Visibility Toggle */}
                    {onToggleIndicatorVisibility && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleIndicatorVisibility(ind.id);
                        }}
                        title={ind.visible ? 'Hide indicator' : 'Show indicator'}
                        className="badge-btn-visibility"
                        style={badgeBtnStyle}
                      >
                        {ind.visible ? '👁' : 'Ø'}
                      </button>
                    )}

                    {/* Settings Gear */}
                    {onOpenIndicatorSettings && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenIndicatorSettings(ind.id);
                        }}
                        title="Settings"
                        className="badge-btn-settings"
                        style={badgeBtnStyle}
                      >
                        ⚙
                      </button>
                    )}

                    {/* Remove X */}
                    {onRemoveIndicator && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveIndicator(ind.id);
                        }}
                        title="Remove indicator"
                        className="badge-btn-remove"
                        style={badgeBtnStyle}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Floating Action Bar for Selected Drawing */}
          {selectedDrawing && (
            <div
              className="selected-drawing-toolbar"
              style={{
                position: 'absolute',
                top: 10,
                right: 12,
                backgroundColor: '#1e222d',
                border: '1px solid #363a45',
                borderRadius: '6px',
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#f0f3fa',
                boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                zIndex: 25,
              }}
            >
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                {selectedDrawing.type}
              </span>
              <button
                type="button"
                onClick={() => {
                  drawingManagerRef.current.deleteSelected();
                  onDeleteSelectedDrawing?.();
                  requestChartRender();
                }}
                title="Delete drawing (Delete / Backspace)"
                className="btn-delete-drawing"
                style={{
                  background: '#f23645',
                  border: 'none',
                  borderRadius: '3px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 500,
                }}
              >
                Delete 🗑
              </button>
              <button
                type="button"
                onClick={() => {
                  drawingManagerRef.current.deselectAll();
                  onSelectDrawing?.(null);
                  requestChartRender();
                }}
                title="Deselect (Escape)"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#787b86',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Main Price Scale */}
        <div
          className="scale-surface"
          style={{ width: `${priceScaleWidth}px`, height: '100%', position: 'relative', cursor: 'ns-resize' }}
        >
          <canvas ref={mainPriceBgRef} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} />
          <canvas
            ref={mainPriceFgRef}
            onPointerDown={handlePricePointerDown}
            onPointerMove={handlePricePointerMove}
            onPointerUp={handlePricePointerUp}
            style={{ position: 'absolute', left: 0, top: 0, touchAction: 'none' }}
          />
        </div>
      </div>

      {/* =========================================================================
          PANE DIVIDER 1: Between Main Pane & Volume Pane (or RSI if no Volume)
          ========================================================================= */}
      {(hasVolume || hasRsi) && (
        <div
          className="pane-divider main-subpane-divider"
          onPointerDown={(e) => startDividerDrag(hasVolume ? 'volume' : 'rsi', e)}
          title="Drag to resize pane"
          style={dividerContainerStyle}
        >
          <div style={dividerBarInnerStyle(resizingDivider === (hasVolume ? 'volume' : 'rsi'))} />
        </div>
      )}

      {/* =========================================================================
          2. VOLUME SUB-PANE (Conditional)
          ========================================================================= */}
      {hasVolume && (
        <div
          className="pane-row volume-pane"
          style={{
            display: 'flex',
            height: `${dimensions.volPaneHeight}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <div className="plot-surface" style={{ flex: 1, position: 'relative', height: '100%' }}>
            <canvas ref={volPlotBgRef} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} />
            <canvas
              ref={volPlotFgRef}
              onPointerMove={handleVolPlotPointerMove}
              onPointerLeave={handleSubpanePointerLeave}
              style={{ position: 'absolute', left: 0, top: 0, touchAction: 'none', cursor: 'crosshair' }}
            />
            {/* Volume Status Badge with V4 controls */}
            <div
              className="indicator-status-badge"
              onDoubleClick={() => volumeIndicator && onOpenIndicatorSettings?.(volumeIndicator.id)}
              style={{
                position: 'absolute',
                top: 4,
                left: 12,
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: 'rgba(30, 34, 45, 0.88)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #2a2e39',
                zIndex: 10,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontWeight: 600, color: '#f0f3fa' }}>
                Vol {volumeIndicator?.params.maPeriod || 20}
              </span>
              {volumeIndicator && onToggleIndicatorVisibility && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleIndicatorVisibility(volumeIndicator.id);
                  }}
                  title={volumeIndicator.visible ? 'Hide indicator' : 'Show indicator'}
                  className="badge-btn-visibility"
                  style={badgeBtnStyle}
                >
                  {volumeIndicator.visible ? '👁' : 'Ø'}
                </button>
              )}
              {volumeIndicator && onOpenIndicatorSettings && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenIndicatorSettings(volumeIndicator.id);
                  }}
                  title="Settings"
                  className="badge-btn-settings"
                  style={badgeBtnStyle}
                >
                  ⚙
                </button>
              )}
              {volumeIndicator && onRemoveIndicator && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveIndicator(volumeIndicator.id);
                  }}
                  title="Remove Volume pane"
                  className="badge-btn-remove"
                  style={badgeBtnStyle}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <div className="scale-surface" style={{ width: `${priceScaleWidth}px`, height: '100%', position: 'relative' }}>
            <canvas ref={volScaleBgRef} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} />
            <canvas ref={volScaleFgRef} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} />
          </div>
        </div>
      )}

      {/* =========================================================================
          PANE DIVIDER 2: Between Volume Pane & RSI Pane (when both active)
          ========================================================================= */}
      {hasVolume && hasRsi && (
        <div
          className="pane-divider vol-rsi-divider"
          onPointerDown={(e) => startDividerDrag('rsi', e)}
          title="Drag to resize RSI pane"
          style={dividerContainerStyle}
        >
          <div style={dividerBarInnerStyle(resizingDivider === 'rsi')} />
        </div>
      )}

      {/* =========================================================================
          3. RSI SUB-PANE (Conditional)
          ========================================================================= */}
      {hasRsi && (
        <div
          className="pane-row rsi-pane"
          style={{
            display: 'flex',
            height: `${dimensions.rsiPaneHeight}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <div className="plot-surface" style={{ flex: 1, position: 'relative', height: '100%' }}>
            <canvas ref={rsiPlotBgRef} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} />
            <canvas
              ref={rsiPlotFgRef}
              onPointerMove={handleRsiPlotPointerMove}
              onPointerLeave={handleSubpanePointerLeave}
              style={{ position: 'absolute', left: 0, top: 0, touchAction: 'none', cursor: 'crosshair' }}
            />
            {/* RSI Status Badge with V4 controls */}
            <div
              className="indicator-status-badge"
              onDoubleClick={() => rsiIndicator && onOpenIndicatorSettings?.(rsiIndicator.id)}
              style={{
                position: 'absolute',
                top: 4,
                left: 12,
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: 'rgba(30, 34, 45, 0.88)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid #2a2e39',
                zIndex: 10,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontWeight: 600, color: rsiIndicator?.color || '#8b5cf6' }}>
                RSI {rsiIndicator?.params.period || 14}
              </span>
              {rsiIndicator && onToggleIndicatorVisibility && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleIndicatorVisibility(rsiIndicator.id);
                  }}
                  title={rsiIndicator.visible ? 'Hide indicator' : 'Show indicator'}
                  className="badge-btn-visibility"
                  style={badgeBtnStyle}
                >
                  {rsiIndicator.visible ? '👁' : 'Ø'}
                </button>
              )}
              {rsiIndicator && onOpenIndicatorSettings && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenIndicatorSettings(rsiIndicator.id);
                  }}
                  title="Settings"
                  className="badge-btn-settings"
                  style={badgeBtnStyle}
                >
                  ⚙
                </button>
              )}
              {rsiIndicator && onRemoveIndicator && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveIndicator(rsiIndicator.id);
                  }}
                  title="Remove RSI pane"
                  className="badge-btn-remove"
                  style={badgeBtnStyle}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
          <div className="scale-surface" style={{ width: `${priceScaleWidth}px`, height: '100%', position: 'relative' }}>
            <canvas ref={rsiScaleBgRef} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} />
            <canvas ref={rsiScaleFgRef} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} />
          </div>
        </div>
      )}

      {/* =========================================================================
          4. BOTTOM TIME SCALE ROW (Spans full width across all panes)
          ========================================================================= */}
      <div
        className="time-scale-row"
        style={{
          display: 'flex',
          height: `${timeScaleHeight}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        <div className="time-scale-surface" style={{ flex: 1, position: 'relative', height: '100%', cursor: 'ew-resize' }}>
          <canvas ref={timeBgRef} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} />
          <canvas
            ref={timeFgRef}
            onPointerDown={handleTimePointerDown}
            onPointerMove={handleTimePointerMove}
            onPointerUp={handleTimePointerUp}
            style={{ position: 'absolute', left: 0, top: 0, touchAction: 'none' }}
          />
        </div>

        {/* Bottom Right Corner */}
        <div
          className="corner-surface"
          onClick={handleResetView}
          title="Reset Chart View & Auto-scale"
          style={{ width: `${priceScaleWidth}px`, height: '100%', position: 'relative', cursor: 'pointer' }}
        >
          <canvas ref={cornerRef} style={{ position: 'absolute', left: 0, top: 0 }} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              color: '#787b86',
              fontWeight: 600,
              letterSpacing: '0.5px',
            }}
          >
            AUTO
          </div>
        </div>
      </div>
    </div>
  );
});

const badgeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#787b86',
  cursor: 'pointer',
  padding: '0 2px',
  fontSize: '11px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const dividerContainerStyle: React.CSSProperties = {
  height: '6px',
  width: '100%',
  cursor: 'row-resize',
  position: 'relative',
  zIndex: 15,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
  backgroundColor: '#171b26',
};

const dividerBarInnerStyle = (isActive: boolean): React.CSSProperties => ({
  height: isActive ? '3px' : '1px',
  width: '100%',
  backgroundColor: isActive ? '#2962ff' : '#2a2e39',
  transition: 'background-color 0.15s, height 0.15s',
});

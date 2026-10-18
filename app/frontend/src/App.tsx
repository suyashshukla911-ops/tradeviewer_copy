import React, { useRef } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { TradingChart, type TradingChartRef } from './components/TradingChart';
import { TopToolbar } from './components/TopToolbar';
import { BottomToolbar } from './components/BottomToolbar';
import { Watchlist } from './components/Watchlist';
import { SymbolSearch } from './components/SymbolSearch';
import { LeftToolbar } from './components/LeftToolbar';
import { IndicatorMenu } from './components/IndicatorMenu';
import { IndicatorSettings } from './components/IndicatorSettings';
import type { Timeframe, RangeShortcut } from './chart/models/Candle';
import './App.css';

const WorkspaceContent: React.FC = () => {
  const {
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
    deleteSelectedDrawing,
    clearDrawings,
    setActiveDrawingTool,
    showToast,
    toggleFullscreen,
  } = useWorkspace();

  const chartRef = useRef<TradingChartRef>(null);

  const handleResetView = () => {
    chartRef.current?.resetView();
  };

  const handleSymbolSelect = (ticker: string) => {
    setActiveSymbol(ticker);
    requestAnimationFrame(() => {
      chartRef.current?.resetView();
    });
  };

  const handleTimeframeChange = (tf: Timeframe) => {
    setActiveTimeframe(tf);
    requestAnimationFrame(() => {
      chartRef.current?.resetView();
    });
  };

  const handleRangeChange = (range: RangeShortcut) => {
    setActiveRange(range);
    requestAnimationFrame(() => {
      chartRef.current?.resetView();
    });
  };

  const activeEditingIndicator = activeIndicators.find((i) => i.id === editingIndicatorId) || null;

  return (
    <div className="workspace-container">
      {/* 1. Top Workspace Toolbar */}
      <TopToolbar
        symbolInfo={symbolInfo}
        onOpenSymbolSearch={() => setIsSymbolSearchOpen(true)}
        activeTimeframe={activeTimeframe}
        onTimeframeChange={handleTimeframeChange}
        chartType={chartType}
        onChartTypeChange={setChartType}
        onResetView={handleResetView}
        onToggleWatchlist={() => setIsWatchlistOpen((prev) => !prev)}
        isWatchlistOpen={isWatchlistOpen}
        onIndicatorsClick={() => setIsIndicatorMenuOpen(true)}
        onSettingsClick={() => showToast('Chart Settings: Appearance, Scales & Grid coming next')}
        onFullscreenClick={toggleFullscreen}
      />

      {/* 2. Main Workspace Body: Left Toolbar + Chart Surface + Watchlist Panel */}
      <div className="workspace-body">
        <LeftToolbar
          activeTool={activeDrawingTool}
          onSelectTool={setActiveDrawingTool}
          onClearDrawings={clearDrawings}
          drawingsCount={drawings.length}
          hasSelectedDrawing={!!selectedDrawingId}
          onDeleteSelected={deleteSelectedDrawing}
        />

        <main className="chart-main-area">
          <TradingChart
            ref={chartRef}
            symbol={symbolInfo.ticker}
            chartType={chartType}
            timeframe={activeTimeframe}
            candles={candles}
            activeIndicators={activeIndicators}
            onRemoveIndicator={removeIndicator}
            onToggleIndicatorVisibility={toggleIndicatorVisibility}
            onOpenIndicatorSettings={(id) => setEditingIndicatorId(id)}
            drawings={drawings}
            selectedDrawingId={selectedDrawingId}
            onSelectDrawing={setSelectedDrawingId}
            onUpdateDrawing={updateDrawing}
            onDeleteSelectedDrawing={deleteSelectedDrawing}
            onAddDrawing={addDrawing}
            activeDrawingTool={activeDrawingTool}
            onDrawingToolChange={setActiveDrawingTool}
            paneHeights={paneHeights}
            onPaneHeightsChange={setPaneHeights}
          />
        </main>

        {isWatchlistOpen && (
          <Watchlist
            items={watchlist}
            activeSymbol={activeSymbol}
            onSelectSymbol={handleSymbolSelect}
            onClose={() => setIsWatchlistOpen(false)}
          />
        )}
      </div>

      {/* 3. Bottom Workspace Toolbar */}
      <BottomToolbar
        activeRange={activeRange}
        onRangeChange={handleRangeChange}
        onResetView={handleResetView}
      />

      {/* 4. Symbol Search Modal */}
      <SymbolSearch
        isOpen={isSymbolSearchOpen}
        onClose={() => setIsSymbolSearchOpen(false)}
        onSelectSymbol={handleSymbolSelect}
        currentSymbol={activeSymbol}
      />

      {/* 5. Technical Indicator Modal */}
      <IndicatorMenu
        isOpen={isIndicatorMenuOpen}
        onClose={() => setIsIndicatorMenuOpen(false)}
        onAddIndicator={addIndicator}
        activeIndicators={activeIndicators}
      />

      {/* 6. Indicator Settings Modal (V4) */}
      <IndicatorSettings
        isOpen={!!editingIndicatorId}
        indicator={activeEditingIndicator}
        onClose={() => setEditingIndicatorId(null)}
        onSave={updateIndicator}
      />

      {/* 7. Non-intrusive Toast */}
      {toastMessage && <div className="workspace-toast">{toastMessage}</div>}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <WorkspaceProvider>
      <WorkspaceContent />
    </WorkspaceProvider>
  );
};

export default App;

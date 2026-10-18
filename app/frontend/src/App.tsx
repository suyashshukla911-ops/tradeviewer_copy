import React, { useRef } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import type { TradingChartRef } from './components/TradingChart';
import { TopToolbar } from './components/TopToolbar';
import { BottomToolbar } from './components/BottomToolbar';
import { Watchlist } from './components/Watchlist';
import { AlertsPanel } from './components/AlertsPanel';
import { WorkspaceNav } from './components/WorkspaceNav';
import { ReplayToolbar } from './components/ReplayToolbar';
import { TemplatesModal } from './components/TemplatesModal';
import { SettingsModal } from './components/SettingsModal';
import { SymbolSearch } from './components/SymbolSearch';
import { LeftToolbar } from './components/LeftToolbar';
import { IndicatorMenu } from './components/IndicatorMenu';
import { IndicatorSettings } from './components/IndicatorSettings';
import { MultiChartArea } from './components/MultiChartArea';
import type { Timeframe, RangeShortcut } from './chart/models/Candle';
import './App.css';

const WorkspaceContent: React.FC = () => {
  const {
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
    editingIndicatorId,
    toastMessage,

    setActiveSymbol,
    setActiveTimeframe,
    setChartType,
    setActiveRange,
    setIsSymbolSearchOpen,
    setIsIndicatorMenuOpen,
    setEditingIndicatorId,

    addIndicator,
    updateIndicator,
    deleteSelectedDrawing,
    clearDrawings,
    setActiveDrawingTool,

    toggleFullscreen,

    // V5
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
    setActivePanel,
    isSettingsOpen,
    setIsSettingsOpen,
    settings,
    updateSettings,
    resetWorkspaceDefaults,
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

  const activeEditingIndicator =
    activeIndicators.find((i) => i.id === editingIndicatorId) || null;

  const currentClosePrice = candles.length > 0 ? candles[candles.length - 1].close : 150;

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
        onToggleWatchlist={() =>
          setActivePanel((prev) => (prev === 'watchlist' ? 'none' : 'watchlist'))
        }
        isWatchlistOpen={isWatchlistOpen}
        onIndicatorsClick={() => setIsIndicatorMenuOpen(true)}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onFullscreenClick={toggleFullscreen}
        activeLayout={activeLayout}
        onSelectLayout={setActiveLayout}
        isReplayActive={isReplayActive}
        onToggleReplay={toggleReplay}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
      />

      {/* 2. Floating Replay Control Bar */}
      <ReplayToolbar
        isActive={isReplayActive}
        isPlaying={isReplayPlaying}
        currentIndex={replayIndex}
        totalCandles={candles.length}
        speed={replaySpeed}
        onTogglePlay={toggleReplayPlay}
        onStepForward={stepReplayForward}
        onReset={resetReplay}
        onChangeSpeed={setReplaySpeed}
        onExit={exitReplay}
      />

      {/* 3. Main Workspace Body: Left Toolbar + Chart Area + Side Panels + Right Nav */}
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
          <MultiChartArea
            layout={activeLayout}
            charts={charts}
            activeChartId={activeChartId}
            onSelectActiveChart={setActiveChartId}
            updateChart={updateChart}
            activeDrawingTool={activeDrawingTool}
            onDrawingToolChange={setActiveDrawingTool}
            onOpenIndicatorSettings={(id) => setEditingIndicatorId(id)}
            isReplayActive={isReplayActive}
            replayCandles={candles}
            activeChartRef={chartRef}
          />
        </main>

        {/* Watchlist Side Panel */}
        {activePanel === 'watchlist' && (
          <Watchlist
            items={watchlist}
            activeSymbol={activeSymbol}
            onSelectSymbol={handleSymbolSelect}
            onClose={() => setActivePanel('none')}
          />
        )}

        {/* Alerts Side Panel */}
        {activePanel === 'alerts' && (
          <AlertsPanel
            isOpen={activePanel === 'alerts'}
            onClose={() => setActivePanel('none')}
            alerts={alerts}
            currentSymbol={activeSymbol}
            currentTimeframe={activeTimeframe}
            currentPrice={currentClosePrice}
            onCreateAlert={createAlert}
            onToggleAlert={toggleAlert}
            onDeleteAlert={deleteAlert}
          />
        )}

        {/* Compact Right Navigation Strip */}
        <WorkspaceNav
          activePanel={activePanel}
          onTogglePanel={(p) => setActivePanel((prev) => (prev === p ? 'none' : p))}
          isReplayActive={isReplayActive}
          onToggleReplay={toggleReplay}
          onOpenTemplates={() => setIsTemplatesOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      </div>

      {/* 4. Bottom Workspace Toolbar */}
      <BottomToolbar
        activeRange={activeRange}
        onRangeChange={handleRangeChange}
        onResetView={handleResetView}
      />

      {/* 5. Symbol Search Modal */}
      <SymbolSearch
        isOpen={isSymbolSearchOpen}
        onClose={() => setIsSymbolSearchOpen(false)}
        onSelectSymbol={handleSymbolSelect}
        currentSymbol={activeSymbol}
      />

      {/* 6. Technical Indicator Modal */}
      <IndicatorMenu
        isOpen={isIndicatorMenuOpen}
        onClose={() => setIsIndicatorMenuOpen(false)}
        onAddIndicator={addIndicator}
        activeIndicators={activeIndicators}
      />

      {/* 7. Indicator Settings Modal */}
      <IndicatorSettings
        isOpen={!!editingIndicatorId}
        indicator={activeEditingIndicator}
        onClose={() => setEditingIndicatorId(null)}
        onSave={updateIndicator}
      />

      {/* 8. Chart Templates Modal (V5) */}
      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        templates={templates}
        onSaveTemplate={saveTemplate}
        onLoadTemplate={loadTemplate}
        onDeleteTemplate={deleteTemplate}
      />

      {/* 9. Workspace Settings Modal (V5) */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        onResetWorkspace={resetWorkspaceDefaults}
      />

      {/* 10. Non-intrusive Toast */}
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

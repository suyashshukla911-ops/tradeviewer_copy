import React from 'react';
import type { ChartType, Timeframe } from '../chart/models/Candle';
import type { SymbolInfo } from '../data/symbolCatalog';
import { TimeframeSelector } from './TimeframeSelector';
import { ChartTypeMenu } from './ChartTypeMenu';
import { LayoutSelector, type ChartLayoutType } from './LayoutSelector';

export interface TopToolbarProps {
  symbolInfo: SymbolInfo;
  onOpenSymbolSearch: () => void;
  activeTimeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  onResetView: () => void;
  onToggleWatchlist: () => void;
  isWatchlistOpen: boolean;
  onIndicatorsClick: () => void;
  onSettingsClick: () => void;
  onFullscreenClick: () => void;
  activeLayout: ChartLayoutType;
  onSelectLayout: (layout: ChartLayoutType) => void;
  isReplayActive?: boolean;
  onToggleReplay?: () => void;
  onOpenTemplates?: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  symbolInfo,
  onOpenSymbolSearch,
  activeTimeframe,
  onTimeframeChange,
  chartType,
  onChartTypeChange,
  onResetView,
  onToggleWatchlist,
  isWatchlistOpen,
  onIndicatorsClick,
  onSettingsClick,
  onFullscreenClick,
  activeLayout,
  onSelectLayout,
  isReplayActive,
  onToggleReplay,
  onOpenTemplates,
}) => {
  return (
    <header
      className="workspace-top-toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '42px',
        backgroundColor: '#1e222d',
        borderBottom: '1px solid #2a2e39',
        padding: '0 12px',
        userSelect: 'none',
        gap: '8px',
        fontSize: '13px',
        color: '#d1d4dc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
      }}
    >
      {/* 1. Symbol Search Button */}
      <button
        type="button"
        onClick={onOpenSymbolSearch}
        title="Search symbol (Ctrl+K)"
        className="symbol-search-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 10px',
          borderRadius: '4px',
          backgroundColor: '#2a2e39',
          border: '1px solid #363a45',
          color: '#f0f3fa',
          cursor: 'pointer',
          fontWeight: 600,
          transition: 'border-color 0.15s, background-color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#2962ff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#363a45';
        }}
      >
        <span style={{ color: '#2962ff', fontSize: '14px' }}>🔍</span>
        <span>{symbolInfo.ticker}</span>
        <span
          style={{
            fontSize: '11px',
            color: '#787b86',
            fontWeight: 400,
            maxWidth: '120px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {symbolInfo.exchange}
        </span>
      </button>

      <div style={{ width: '1px', height: '20px', backgroundColor: '#2a2e39', margin: '0 2px' }} />

      {/* 2. Timeframe Selector */}
      <TimeframeSelector
        activeTimeframe={activeTimeframe}
        onTimeframeChange={onTimeframeChange}
      />

      <div style={{ width: '1px', height: '20px', backgroundColor: '#2a2e39', margin: '0 2px' }} />

      {/* 3. Chart Type Dropdown Menu */}
      <ChartTypeMenu
        chartType={chartType}
        onChartTypeChange={onChartTypeChange}
      />

      <div style={{ width: '1px', height: '20px', backgroundColor: '#2a2e39', margin: '0 2px' }} />

      {/* 4. Indicators Button */}
      <button
        type="button"
        onClick={onIndicatorsClick}
        title="Technical Indicators"
        className="top-toolbar-indicators-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          background: 'transparent',
          color: '#d1d4dc',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#2a2e39';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ fontSize: '13px' }}>ƒx</span>
        <span>Indicators</span>
      </button>

      {/* 5. V5: Replay Button */}
      {onToggleReplay && (
        <button
          type="button"
          onClick={onToggleReplay}
          title="Toggle Replay Mode"
          className={`top-toolbar-replay-btn ${isReplayActive ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: isReplayActive ? '#2962ff' : 'transparent',
            color: isReplayActive ? '#ffffff' : '#d1d4dc',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            if (!isReplayActive) e.currentTarget.style.backgroundColor = '#2a2e39';
          }}
          onMouseLeave={(e) => {
            if (!isReplayActive) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span style={{ fontSize: '13px' }}>⏪</span>
          <span>Replay</span>
        </button>
      )}

      {/* 6. V5: Templates Button */}
      {onOpenTemplates && (
        <button
          type="button"
          onClick={onOpenTemplates}
          title="Chart Templates"
          className="top-toolbar-templates-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'transparent',
            color: '#d1d4dc',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2a2e39';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span style={{ fontSize: '13px' }}>📐</span>
          <span>Templates</span>
        </button>
      )}

      <div style={{ flex: 1 }} />

      {/* 7. V5: Layout Selector */}
      <LayoutSelector
        activeLayout={activeLayout}
        onSelectLayout={onSelectLayout}
      />

      <div style={{ width: '1px', height: '20px', backgroundColor: '#2a2e39', margin: '0 2px' }} />

      {/* Reset View Button */}
      <button
        type="button"
        onClick={onResetView}
        title="Reset chart scale and view"
        className="top-toolbar-reset-btn"
        style={{
          background: 'transparent',
          color: '#787b86',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#d1d4dc';
          e.currentTarget.style.backgroundColor = '#2a2e39';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#787b86';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span>⟲</span>
        <span>Reset</span>
      </button>

      {/* Settings Button */}
      <button
        type="button"
        onClick={onSettingsClick}
        title="Chart Settings"
        className="top-toolbar-settings-btn"
        style={{
          background: 'transparent',
          color: '#787b86',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '14px',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#d1d4dc';
          e.currentTarget.style.backgroundColor = '#2a2e39';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#787b86';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        ⚙
      </button>

      {/* Fullscreen Button */}
      <button
        type="button"
        onClick={onFullscreenClick}
        title="Toggle Fullscreen"
        className="top-toolbar-fullscreen-btn"
        style={{
          background: 'transparent',
          color: '#787b86',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '13px',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#d1d4dc';
          e.currentTarget.style.backgroundColor = '#2a2e39';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#787b86';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        ⛶
      </button>

      <div style={{ width: '1px', height: '20px', backgroundColor: '#2a2e39', margin: '0 2px' }} />

      {/* Watchlist Toggle Button */}
      <button
        type="button"
        onClick={onToggleWatchlist}
        title="Toggle Watchlist Panel"
        className="top-toolbar-watchlist-btn"
        style={{
          background: isWatchlistOpen ? '#2a2e39' : 'transparent',
          color: isWatchlistOpen ? '#2962ff' : '#787b86',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        ☰
      </button>
    </header>
  );
};

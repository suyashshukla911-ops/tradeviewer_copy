import React from 'react';
import type { ChartType } from '../chart/models/Candle';

export interface ChartToolbarProps {
  symbol: string;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  onResetView: () => void;
}

export const ChartToolbar: React.FC<ChartToolbarProps> = ({
  symbol,
  chartType,
  onChartTypeChange,
  onResetView,
}) => {
  return (
    <header
      className="chart-toolbar-header"
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
      {/* Symbol Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 8px',
          borderRadius: '4px',
          backgroundColor: '#2a2e39',
          fontWeight: 600,
          color: '#f0f3fa',
          cursor: 'default',
        }}
      >
        <span style={{ color: '#2962ff', fontSize: '15px' }}>●</span>
        <span>{symbol}</span>
        <span style={{ fontSize: '11px', color: '#787b86', fontWeight: 400 }}>Apple Inc · NASDAQ</span>
      </div>

      <div style={{ width: '1px', height: '20px', backgroundColor: '#2a2e39', margin: '0 4px' }} />

      {/* Interval / Timeframe indicator */}
      <div
        style={{
          padding: '4px 8px',
          fontWeight: 600,
          color: '#d1d4dc',
          borderRadius: '4px',
        }}
      >
        1D
      </div>

      <div style={{ width: '1px', height: '20px', backgroundColor: '#2a2e39', margin: '0 4px' }} />

      {/* Chart Type Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: '#131722', padding: '2px', borderRadius: '4px' }}>
        <button
          type="button"
          onClick={() => onChartTypeChange('candles')}
          title="Candles"
          style={{
            background: chartType === 'candles' ? '#2a2e39' : 'transparent',
            color: chartType === 'candles' ? '#2962ff' : '#787b86',
            border: 'none',
            borderRadius: '3px',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          Candles
        </button>
        <button
          type="button"
          onClick={() => onChartTypeChange('bars')}
          title="OHLC Bars"
          style={{
            background: chartType === 'bars' ? '#2a2e39' : 'transparent',
            color: chartType === 'bars' ? '#2962ff' : '#787b86',
            border: 'none',
            borderRadius: '3px',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          Bars
        </button>
        <button
          type="button"
          onClick={() => onChartTypeChange('line')}
          title="Line Area"
          style={{
            background: chartType === 'line' ? '#2a2e39' : 'transparent',
            color: chartType === 'line' ? '#2962ff' : '#787b86',
            border: 'none',
            borderRadius: '3px',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          Line
        </button>
      </div>

      <div style={{ flex: 1 }} />

      {/* Right Controls */}
      <button
        type="button"
        onClick={onResetView}
        title="Reset chart view and auto-scale (Alt+R)"
        style={{
          background: '#2a2e39',
          color: '#d1d4dc',
          border: 'none',
          borderRadius: '4px',
          padding: '5px 12px',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span>⟲</span>
        <span>Reset View</span>
      </button>
    </header>
  );
};

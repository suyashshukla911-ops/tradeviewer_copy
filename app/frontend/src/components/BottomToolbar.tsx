import React from 'react';
import type { RangeShortcut } from '../chart/models/Candle';

export interface BottomToolbarProps {
  activeRange: RangeShortcut;
  onRangeChange: (range: RangeShortcut) => void;
  onResetView: () => void;
}

const RANGES: RangeShortcut[] = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', 'ALL'];

export const BottomToolbar: React.FC<BottomToolbarProps> = ({
  activeRange,
  onRangeChange,
  onResetView,
}) => {
  return (
    <footer
      className="workspace-bottom-toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '32px',
        backgroundColor: '#1e222d',
        borderTop: '1px solid #2a2e39',
        padding: '0 12px',
        userSelect: 'none',
        gap: '4px',
        fontSize: '11px',
        color: '#787b86',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
      }}
    >
      {/* Range Shortcuts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {RANGES.map((r) => {
          const isActive = activeRange === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              style={{
                background: isActive ? '#2962ff' : 'transparent',
                color: isActive ? '#ffffff' : '#787b86',
                border: 'none',
                borderRadius: '3px',
                padding: '3px 7px',
                fontSize: '11px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'background 0.12s, color 0.12s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = '#d1d4dc';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = '#787b86';
              }}
            >
              {r}
            </button>
          );
        })}
      </div>

      <div style={{ width: '1px', height: '16px', backgroundColor: '#2a2e39', margin: '0 6px' }} />

      {/* Auto Scale Reset */}
      <button
        type="button"
        onClick={onResetView}
        title="Reset Chart View & Auto Scale"
        style={{
          background: 'transparent',
          color: '#787b86',
          border: 'none',
          borderRadius: '3px',
          padding: '3px 8px',
          fontSize: '11px',
          fontWeight: 500,
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
        Auto Scale
      </button>

      <div style={{ flex: 1 }} />

      {/* TradingView-like scale and timezone indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#787b86' }}>
        <span>%</span>
        <span>log</span>
        <span style={{ color: '#2962ff', fontWeight: 600 }}>auto</span>
        <div style={{ width: '1px', height: '12px', backgroundColor: '#2a2e39' }} />
        <span>UTC</span>
      </div>
    </footer>
  );
};

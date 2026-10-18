import React from 'react';
import type { RangeShortcut } from '../chart/models/Candle';

export interface TimeframeToolbarProps {
  timeframe: RangeShortcut;
  onTimeframeChange: (tf: RangeShortcut) => void;
  onResetView: () => void;
}

const TIMEFRAMES: RangeShortcut[] = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', 'ALL'];

export const TimeframeToolbar: React.FC<TimeframeToolbarProps> = ({
  timeframe,
  onTimeframeChange,
  onResetView,
}) => {
  return (
    <footer
      className="chart-bottom-toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '32px',
        backgroundColor: '#1e222d',
        borderTop: '1px solid #2a2e39',
        padding: '0 12px',
        userSelect: 'none',
        gap: '4px',
        fontSize: '12px',
        color: '#787b86',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
      }}
    >
      {/* Timeframe shortcuts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            type="button"
            onClick={() => onTimeframeChange(tf)}
            style={{
              background: timeframe === tf ? '#2962ff' : 'transparent',
              color: timeframe === tf ? '#ffffff' : '#787b86',
              border: 'none',
              borderRadius: '3px',
              padding: '3px 8px',
              fontSize: '11px',
              fontWeight: timeframe === tf ? 600 : 500,
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {tf}
          </button>
        ))}
      </div>

      <div style={{ width: '1px', height: '16px', backgroundColor: '#2a2e39', margin: '0 6px' }} />

      {/* Auto / Reset button */}
      <button
        type="button"
        onClick={onResetView}
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
      >
        Auto Scale
      </button>

      <div style={{ flex: 1 }} />

      {/* Timezone badge */}
      <div style={{ fontSize: '11px', color: '#787b86', paddingRight: '4px' }}>
        % log auto · UTC
      </div>
    </footer>
  );
};

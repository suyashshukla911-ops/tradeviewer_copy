import React from 'react';
import type { WatchlistItem } from '../data/mockMarketData';

export interface WatchlistProps {
  items: WatchlistItem[];
  activeSymbol: string;
  onSelectSymbol: (ticker: string) => void;
  onClose?: () => void;
}

export const Watchlist: React.FC<WatchlistProps> = ({
  items,
  activeSymbol,
  onSelectSymbol,
  onClose,
}) => {
  return (
    <aside
      className="chart-watchlist-panel"
      style={{
        width: '240px',
        height: '100%',
        backgroundColor: '#1e222d',
        borderLeft: '1px solid #2a2e39',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        color: '#d1d4dc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
        fontSize: '12px',
      }}
    >
      {/* Watchlist Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid #2a2e39',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontWeight: 600, color: '#f0f3fa', fontSize: '13px' }}>Watchlist</span>
          <span
            style={{
              backgroundColor: '#2a2e39',
              color: '#787b86',
              fontSize: '10px',
              padding: '1px 5px',
              borderRadius: '8px',
            }}
          >
            {items.length}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            title="Close watchlist"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#787b86',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '2px 4px',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Column Headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 65px 55px',
          padding: '6px 12px',
          fontSize: '11px',
          color: '#787b86',
          borderBottom: '1px solid #2a2e39',
          fontWeight: 500,
        }}
      >
        <span>Symbol</span>
        <span style={{ textAlign: 'right' }}>Last</span>
        <span style={{ textAlign: 'right' }}>Chg %</span>
      </div>

      {/* Items List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2px 0',
        }}
      >
        {items.map((item) => {
          const isSelected = item.ticker.toUpperCase() === activeSymbol.toUpperCase();
          const isUp = item.change >= 0;
          const chgColor = isUp ? '#089981' : '#f23645';
          const chgSign = isUp ? '+' : '';

          return (
            <div
              key={item.ticker}
              onClick={() => onSelectSymbol(item.ticker)}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 65px 55px',
                alignItems: 'center',
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor: isSelected ? 'rgba(41, 98, 255, 0.14)' : 'transparent',
                borderLeft: isSelected ? '3px solid #2962ff' : '3px solid transparent',
                transition: 'background-color 0.12s',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.backgroundColor = '#252936';
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {/* Symbol & Name */}
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span
                  style={{
                    fontWeight: 600,
                    color: isSelected ? '#ffffff' : '#f0f3fa',
                    fontSize: '12px',
                  }}
                >
                  {item.ticker}
                </span>
                <span
                  style={{
                    color: '#787b86',
                    fontSize: '10px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={item.name}
                >
                  {item.name}
                </span>
              </div>

              {/* Last Price */}
              <div
                style={{
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 500,
                  color: '#f0f3fa',
                }}
              >
                {item.lastPrice.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>

              {/* Chg % */}
              <div
                style={{
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  fontWeight: 500,
                  color: chgColor,
                  fontSize: '11px',
                }}
              >
                {chgSign}
                {item.changePct.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

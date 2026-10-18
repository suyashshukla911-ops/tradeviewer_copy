import React, { useState, useRef, useEffect } from 'react';
import type { Timeframe } from '../chart/models/Candle';

export interface TimeframeSelectorProps {
  activeTimeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
}

const PRIMARY_TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];

const ALL_GROUPS: { label: string; items: Timeframe[] }[] = [
  { label: 'MINUTES', items: ['1m', '5m', '15m', '30m'] },
  { label: 'HOURS', items: ['1h', '4h'] },
  { label: 'DAYS / WEEKS', items: ['1D', '1W', '1M'] },
];

export const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  activeTimeframe,
  onTimeframeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
      }}
    >
      {/* Primary quick buttons */}
      {PRIMARY_TIMEFRAMES.map((tf) => {
        const isActive = activeTimeframe === tf;
        return (
          <button
            key={tf}
            type="button"
            className="timeframe-button"
            onClick={() => onTimeframeChange(tf)}
            style={{
              background: isActive ? '#2962ff' : 'transparent',
              color: isActive ? '#ffffff' : '#787b86',
              border: 'none',
              borderRadius: '3px',
              padding: '4px 7px',
              fontSize: '12px',
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
            {tf}
          </button>
        );
      })}

      {/* Dropdown toggle for full timeframe menu */}
      <button
        type="button"
        title="More timeframes"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          background: isOpen ? '#2a2e39' : 'transparent',
          color: '#787b86',
          border: 'none',
          borderRadius: '3px',
          padding: '4px 6px',
          fontSize: '11px',
          cursor: 'pointer',
        }}
      >
        ▾
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            backgroundColor: '#1e222d',
            border: '1px solid #2a2e39',
            borderRadius: '6px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 100,
            minWidth: '160px',
            padding: '6px 0',
          }}
        >
          {ALL_GROUPS.map((group) => (
            <div key={group.label} style={{ marginBottom: '6px' }}>
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#50535e',
                  padding: '4px 12px',
                  letterSpacing: '0.5px',
                }}
              >
                {group.label}
              </div>
              {group.items.map((tf) => {
                const isActive = activeTimeframe === tf;
                return (
                  <div
                    key={tf}
                    onClick={() => {
                      onTimeframeChange(tf);
                      setIsOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 14px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      color: isActive ? '#2962ff' : '#d1d4dc',
                      backgroundColor: isActive ? 'rgba(41, 98, 255, 0.12)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = '#252936';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span>{tf}</span>
                    {isActive && <span style={{ fontSize: '11px' }}>✓</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

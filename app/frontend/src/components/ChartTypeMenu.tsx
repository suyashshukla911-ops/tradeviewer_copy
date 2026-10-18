import React, { useState, useRef, useEffect } from 'react';
import type { ChartType } from '../chart/models/Candle';

export interface ChartTypeMenuProps {
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
}

interface ChartTypeOption {
  type: ChartType;
  label: string;
  icon: string;
  description: string;
}

const OPTIONS: ChartTypeOption[] = [
  { type: 'candles', label: 'Candles', icon: '🕯️', description: 'Japanese Candlesticks' },
  { type: 'bars', label: 'Bars', icon: '📊', description: 'OHLC Bars' },
  { type: 'line', label: 'Line', icon: '📈', description: 'Close Price Line' },
  { type: 'area', label: 'Area', icon: '📉', description: 'Gradient Mountain Area' },
  { type: 'hollow_candles', label: 'Hollow Candles', icon: '🕯', description: 'Hollow Up / Solid Down' },
];

export const ChartTypeMenu: React.FC<ChartTypeMenuProps> = ({
  chartType,
  onChartTypeChange,
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

  const activeOption = OPTIONS.find((o) => o.type === chartType) || OPTIONS[0];

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Dropdown trigger button */}
      <button
        type="button"
        className="chart-type-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: isOpen ? '#2a2e39' : '#131722',
          color: '#d1d4dc',
          border: '1px solid #2a2e39',
          borderRadius: '4px',
          padding: '4px 10px',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#404554';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#2a2e39';
        }}
      >
        <span>{activeOption.icon}</span>
        <span>{activeOption.label}</span>
        <span style={{ fontSize: '10px', color: '#787b86' }}>▾</span>
      </button>

      {/* Menu dropdown */}
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
            minWidth: '190px',
            padding: '4px 0',
          }}
        >
          {OPTIONS.map((opt) => {
            const isSelected = opt.type === chartType;
            return (
              <button
                key={opt.type}
                type="button"
                className="chart-type-option"
                data-chart-type={opt.type}
                onClick={() => {
                  onChartTypeChange(opt.type);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '8px 14px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  border: 'none',
                  textAlign: 'left',
                  color: isSelected ? '#2962ff' : '#d1d4dc',
                  backgroundColor: isSelected ? 'rgba(41, 98, 255, 0.12)' : 'transparent',
                  fontFamily: 'inherit',
                  transition: 'background-color 0.12s',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = '#252936';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px' }}>{opt.icon}</span>
                  <div>
                    <div style={{ fontWeight: 500 }}>{opt.label}</div>
                    <div style={{ fontSize: '10px', color: '#787b86' }}>{opt.description}</div>
                  </div>
                </div>
                {isSelected && <span style={{ fontSize: '12px', fontWeight: 600 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

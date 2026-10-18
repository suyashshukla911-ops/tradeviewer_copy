import React, { useState, useEffect, useRef } from 'react';
import {
  type IndicatorType,
  type IndicatorMeta,
  INDICATOR_METAS,
  type IndicatorInstance,
} from '../chart/indicators/Indicator';

export interface IndicatorMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAddIndicator: (type: IndicatorType) => void;
  activeIndicators: IndicatorInstance[];
}

export const IndicatorMenu: React.FC<IndicatorMenuProps> = ({
  isOpen,
  onClose,
  onAddIndicator,
  activeIndicators,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allMetas = Object.values(INDICATOR_METAS);

  const filtered = allMetas.filter((meta: IndicatorMeta) => {
    const matchesQuery =
      meta.name.toLowerCase().includes(query.toLowerCase()) ||
      meta.type.toLowerCase().includes(query.toLowerCase()) ||
      meta.description.toLowerCase().includes(query.toLowerCase());
    const matchesCat = selectedCategory === 'all' || meta.category === selectedCategory;
    return matchesQuery && matchesCat;
  });

  return (
    <div
      className="indicator-menu-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        className="indicator-menu-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '560px',
          maxWidth: '100%',
          backgroundColor: '#1e222d',
          borderRadius: '8px',
          border: '1px solid #2a2e39',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          color: '#d1d4dc',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid #2a2e39',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '16px', color: '#787b86' }}>ƒx</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search indicator (e.g. SMA, EMA, RSI, Bollinger Bands, Volume)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f0f3fa',
              fontSize: '15px',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#787b86',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Categories Bar */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '8px 16px',
            borderBottom: '1px solid #2a2e39',
            backgroundColor: '#171b26',
            fontSize: '12px',
          }}
        >
          {['all', 'trend', 'volatility', 'momentum', 'volume'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? '#2962ff' : 'transparent',
                color: selectedCategory === cat ? '#ffffff' : '#787b86',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                cursor: 'pointer',
                fontWeight: 500,
                textTransform: 'uppercase',
                fontSize: '11px',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Indicators List */}
        <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '6px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#787b86', fontSize: '13px' }}>
              No indicators matching "{query}"
            </div>
          ) : (
            filtered.map((meta) => {
              const activeCount = activeIndicators.filter((i) => i.type === meta.type).length;
              return (
                <div
                  key={meta.type}
                  className="indicator-item"
                  onClick={() => {
                    onAddIndicator(meta.type);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    transition: 'background-color 0.12s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#252936')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, color: '#f0f3fa', fontSize: '13px' }}>
                        {meta.name}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          color: '#787b86',
                          backgroundColor: '#2a2e39',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          fontWeight: 600,
                        }}
                      >
                        {meta.type}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          color: meta.isOverlay ? '#06b6d4' : '#a855f7',
                        }}
                      >
                        {meta.isOverlay ? '• Overlay' : '• Separate Pane'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#787b86' }}>{meta.description}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {activeCount > 0 && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#2962ff',
                          backgroundColor: 'rgba(41, 98, 255, 0.15)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 600,
                        }}
                      >
                        Active ({activeCount})
                      </span>
                    )}
                    <button
                      type="button"
                      style={{
                        background: '#2962ff',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { SYMBOL_CATALOG, type SymbolInfo } from '../data/symbolCatalog';

export interface SymbolSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (ticker: string) => void;
  currentSymbol: string;
}

export const SymbolSearch: React.FC<SymbolSearchProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
  currentSymbol,
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'stock' | 'crypto'>('all');
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

  const filteredSymbols = SYMBOL_CATALOG.filter((item: SymbolInfo) => {
    const matchesQuery =
      item.ticker.toLowerCase().includes(query.toLowerCase()) ||
      item.name.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filterType === 'all' || item.type === filterType;
    return matchesQuery && matchesFilter;
  });

  return (
    <div
      className="symbol-search-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        className="symbol-search-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '520px',
          maxWidth: '100%',
          backgroundColor: '#1e222d',
          borderRadius: '8px',
          border: '1px solid #2a2e39',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          color: '#d1d4dc',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid #2a2e39',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '16px', color: '#787b86' }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search symbol (e.g. AAPL, BTCUSD)..."
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
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Filter Tabs */}
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
          <button
            type="button"
            onClick={() => setFilterType('all')}
            style={{
              background: filterType === 'all' ? '#2962ff' : 'transparent',
              color: filterType === 'all' ? '#ffffff' : '#787b86',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilterType('stock')}
            style={{
              background: filterType === 'stock' ? '#2962ff' : 'transparent',
              color: filterType === 'stock' ? '#ffffff' : '#787b86',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Stocks
          </button>
          <button
            type="button"
            onClick={() => setFilterType('crypto')}
            style={{
              background: filterType === 'crypto' ? '#2962ff' : 'transparent',
              color: filterType === 'crypto' ? '#ffffff' : '#787b86',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Crypto
          </button>
        </div>

        {/* Results List */}
        <div
          style={{
            maxHeight: '320px',
            overflowY: 'auto',
            padding: '4px 0',
          }}
        >
          {filteredSymbols.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#787b86', fontSize: '13px' }}>
              No symbols found matching "{query}"
            </div>
          ) : (
            filteredSymbols.map((item) => {
              const isSelected = item.ticker.toUpperCase() === currentSymbol.toUpperCase();
              return (
                <div
                  key={item.ticker}
                  className="symbol-item"
                  onClick={() => {
                    onSelectSymbol(item.ticker);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'rgba(41, 98, 255, 0.12)' : 'transparent',
                    borderLeft: isSelected ? '3px solid #2962ff' : '3px solid transparent',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#252936';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        fontWeight: 600,
                        color: '#f0f3fa',
                        fontSize: '14px',
                        minWidth: '65px',
                      }}
                    >
                      {item.ticker}
                    </span>
                    <span style={{ color: '#787b86', fontSize: '13px' }}>{item.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#787b86',
                        background: '#2a2e39',
                        padding: '2px 6px',
                        borderRadius: '3px',
                      }}
                    >
                      {item.exchange}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: item.type === 'crypto' ? '#c084fc' : '#2962ff',
                        background: 'rgba(41, 98, 255, 0.1)',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      {item.type}
                    </span>
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

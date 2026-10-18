import React, { useState, useRef, useEffect } from 'react';

export type ChartLayoutType = '1' | '2h' | '2v' | '4';

export interface LayoutSelectorProps {
  activeLayout: ChartLayoutType;
  onSelectLayout: (layout: ChartLayoutType) => void;
}

export const LayoutSelector: React.FC<LayoutSelectorProps> = ({
  activeLayout,
  onSelectLayout,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const layouts: { type: ChartLayoutType; label: string; icon: string }[] = [
    { type: '1', label: '1 Chart', icon: '▢' },
    { type: '2h', label: '2 Charts (Horizontal)', icon: '◫' },
    { type: '2v', label: '2 Charts (Vertical)', icon: '⬒' },
    { type: '4', label: '4 Charts (Grid)', icon: '⊞' },
  ];

  const currentMeta = layouts.find((l) => l.type === activeLayout) || layouts[0];

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="layout-selector-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Select multi-chart layout"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          background: isOpen ? '#2a2e39' : 'transparent',
          color: '#d1d4dc',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: '15px' }}>{currentMeta.icon}</span>
        <span style={{ fontSize: '11px', color: '#787b86' }}>▾</span>
      </button>

      {isOpen && (
        <div
          className="layout-selector-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            backgroundColor: '#1e222d',
            border: '1px solid #363a45',
            borderRadius: '6px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 100,
            padding: '6px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '6px',
            minWidth: '180px',
          }}
        >
          {layouts.map((l) => {
            const isSelected = l.type === activeLayout;
            return (
              <button
                key={l.type}
                type="button"
                className={`layout-option-btn layout-option-${l.type}`}
                onClick={() => {
                  onSelectLayout(l.type);
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 10px',
                  borderRadius: '4px',
                  backgroundColor: isSelected ? '#2962ff' : '#2a2e39',
                  color: isSelected ? '#ffffff' : '#d1d4dc',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '16px' }}>{l.icon}</span>
                <span>{l.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

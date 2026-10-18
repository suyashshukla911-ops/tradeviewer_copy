import React from 'react';
import type { DrawingToolType } from '../chart/drawings/DrawingManager';

export interface LeftToolbarProps {
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  onClearDrawings: () => void;
  drawingsCount: number;
  hasSelectedDrawing?: boolean;
  onDeleteSelected?: () => void;
}

export const LeftToolbar: React.FC<LeftToolbarProps> = ({
  activeTool,
  onSelectTool,
  onClearDrawings,
  drawingsCount,
  hasSelectedDrawing = false,
  onDeleteSelected,
}) => {
  return (
    <aside
      className="workspace-left-toolbar left-toolbar"
      style={{
        width: '42px',
        height: '100%',
        backgroundColor: '#1e222d',
        borderRight: '1px solid #2a2e39',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '6px 0',
        gap: '4px',
        userSelect: 'none',
        zIndex: 20,
      }}
    >
      {/* 1. Cursor / Crosshair */}
      <button
        type="button"
        title="Cursor / Crosshair"
        onClick={() => onSelectTool('cursor')}
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: activeTool === 'cursor' ? '#2962ff' : 'transparent',
          color: activeTool === 'cursor' ? '#ffffff' : '#787b86',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px',
          transition: 'background-color 0.12s, color 0.12s',
        }}
      >
        ✛
      </button>

      {/* 2. Trend Line */}
      <button
        type="button"
        title="Trend Line"
        onClick={() => onSelectTool('trendline')}
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: activeTool === 'trendline' ? '#2962ff' : 'transparent',
          color: activeTool === 'trendline' ? '#ffffff' : '#787b86',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 700,
          transition: 'background-color 0.12s, color 0.12s',
        }}
      >
        ╱
      </button>

      {/* 3. Horizontal Line */}
      <button
        type="button"
        title="Horizontal Line / Level"
        onClick={() => onSelectTool('horizontal')}
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: activeTool === 'horizontal' ? '#2962ff' : 'transparent',
          color: activeTool === 'horizontal' ? '#ffffff' : '#787b86',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 700,
          transition: 'background-color 0.12s, color 0.12s',
        }}
      >
        ―
      </button>

      {/* 4. Measurement Tool */}
      <button
        type="button"
        title="Measurement Tool (Price / Bars)"
        onClick={() => onSelectTool('measure')}
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: activeTool === 'measure' ? '#2962ff' : 'transparent',
          color: activeTool === 'measure' ? '#ffffff' : '#787b86',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          transition: 'background-color 0.12s, color 0.12s',
        }}
      >
        📏
      </button>

      <div style={{ flex: 1 }} />

      {/* 4b. Delete Selected Drawing Button */}
      {hasSelectedDrawing && (
        <button
          type="button"
          title="Delete selected drawing (Delete / Backspace)"
          onClick={onDeleteSelected}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(242, 54, 69, 0.2)',
            color: '#f23645',
            border: '1px solid #f23645',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            marginBottom: '4px',
            transition: 'background 0.12s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f23645')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(242, 54, 69, 0.2)')}
        >
          ⌫
        </button>
      )}

      {/* 5. Clear All Drawings Button */}
      <button
        type="button"
        title={`Clear all drawings (${drawingsCount})`}
        onClick={onClearDrawings}
        disabled={drawingsCount === 0}
        style={{
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          color: drawingsCount > 0 ? '#787b86' : '#363a45',
          border: 'none',
          borderRadius: '4px',
          cursor: drawingsCount > 0 ? 'pointer' : 'default',
          fontSize: '14px',
          transition: 'color 0.12s',
        }}
        onMouseEnter={(e) => {
          if (drawingsCount > 0) e.currentTarget.style.color = '#f23645';
        }}
        onMouseLeave={(e) => {
          if (drawingsCount > 0) e.currentTarget.style.color = '#787b86';
        }}
      >
        🗑
      </button>
    </aside>
  );
};

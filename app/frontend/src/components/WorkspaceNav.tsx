import React from 'react';

export type WorkspacePanel = 'watchlist' | 'alerts' | 'none';

export interface WorkspaceNavProps {
  activePanel: WorkspacePanel;
  onTogglePanel: (panel: WorkspacePanel) => void;
  isReplayActive: boolean;
  onToggleReplay: () => void;
  onOpenTemplates: () => void;
  onOpenSettings: () => void;
}

export const WorkspaceNav: React.FC<WorkspaceNavProps> = ({
  activePanel,
  onTogglePanel,
  isReplayActive,
  onToggleReplay,
  onOpenTemplates,
  onOpenSettings,
}) => {
  return (
    <aside
      className="workspace-right-nav"
      style={{
        width: '42px',
        backgroundColor: '#1e222d',
        borderLeft: '1px solid #2a2e39',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 0',
        gap: '6px',
        userSelect: 'none',
        zIndex: 60,
      }}
    >
      {/* 1. Chart (Reset / Focus) */}
      <button
        type="button"
        className="nav-btn nav-btn-chart"
        title="Focus Chart"
        onClick={() => onTogglePanel('none')}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: activePanel === 'none' ? '#2a2e39' : 'transparent',
          color: activePanel === 'none' ? '#2962ff' : '#787b86',
          cursor: 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        📊
      </button>

      {/* 2. Watchlist */}
      <button
        type="button"
        className={`nav-btn nav-btn-watchlist ${activePanel === 'watchlist' ? 'active' : ''}`}
        title="Watchlist"
        onClick={() => onTogglePanel('watchlist')}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: activePanel === 'watchlist' ? '#2a2e39' : 'transparent',
          color: activePanel === 'watchlist' ? '#2962ff' : '#787b86',
          cursor: 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        📋
      </button>

      {/* 3. Alerts */}
      <button
        type="button"
        className={`nav-btn nav-btn-alerts ${activePanel === 'alerts' ? 'active' : ''}`}
        title="Price Alerts"
        onClick={() => onTogglePanel('alerts')}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: activePanel === 'alerts' ? '#2a2e39' : 'transparent',
          color: activePanel === 'alerts' ? '#2962ff' : '#787b86',
          cursor: 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ⏰
      </button>

      {/* 4. Replay */}
      <button
        type="button"
        className={`nav-btn nav-btn-replay ${isReplayActive ? 'active' : ''}`}
        title={isReplayActive ? 'Exit Replay' : 'Bar Replay Mode'}
        onClick={onToggleReplay}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: isReplayActive ? '#2962ff' : 'transparent',
          color: isReplayActive ? '#ffffff' : '#787b86',
          cursor: 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ⏪
      </button>

      {/* 5. Templates */}
      <button
        type="button"
        className="nav-btn nav-btn-templates"
        title="Chart Templates"
        onClick={onOpenTemplates}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: 'transparent',
          color: '#787b86',
          cursor: 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        📐
      </button>

      <div style={{ flex: 1 }} />

      {/* 6. Settings */}
      <button
        type="button"
        className="nav-btn nav-btn-settings"
        title="Workspace Settings"
        onClick={onOpenSettings}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: 'transparent',
          color: '#787b86',
          cursor: 'pointer',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ⚙
      </button>
    </aside>
  );
};

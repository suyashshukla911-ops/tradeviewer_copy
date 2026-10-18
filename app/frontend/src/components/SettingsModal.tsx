import React from 'react';

export interface WorkspaceSettings {
  showGrid: boolean;
  showWatermark: boolean;
  crosshairStyle: 'dashed' | 'solid';
}

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: WorkspaceSettings;
  onUpdateSettings: (newSettings: Partial<WorkspaceSettings>) => void;
  onResetWorkspace: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetWorkspace,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="settings-modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="settings-modal-content"
        style={{
          width: '380px',
          backgroundColor: '#1e222d',
          border: '1px solid #363a45',
          borderRadius: '8px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
          color: '#d1d4dc',
          userSelect: 'none',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #2a2e39',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px' }}>⚙</span>
            <span style={{ fontWeight: 600, fontSize: '15px', color: '#f0f3fa' }}>
              Chart Settings
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="settings-close-btn"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#787b86',
              fontSize: '16px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Grid */}
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <span style={{ fontSize: '13px' }}>Grid Lines</span>
            <input
              type="checkbox"
              checked={settings.showGrid}
              onChange={(e) => onUpdateSettings({ showGrid: e.target.checked })}
              style={{ accentColor: '#2962ff' }}
            />
          </label>

          {/* Watermark */}
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <span style={{ fontSize: '13px' }}>Symbol Watermark</span>
            <input
              type="checkbox"
              checked={settings.showWatermark}
              onChange={(e) => onUpdateSettings({ showWatermark: e.target.checked })}
              style={{ accentColor: '#2962ff' }}
            />
          </label>

          {/* Crosshair */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px' }}>Crosshair Style</span>
            <select
              value={settings.crosshairStyle}
              onChange={(e) => onUpdateSettings({ crosshairStyle: e.target.value as 'dashed' | 'solid' })}
              style={{
                backgroundColor: '#2a2e39',
                color: '#f0f3fa',
                border: '1px solid #363a45',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                outline: 'none',
              }}
            >
              <option value="dashed">Dashed</option>
              <option value="solid">Solid</option>
            </select>
          </div>

          <div style={{ height: '1px', backgroundColor: '#2a2e39', margin: '4px 0' }} />

          {/* Reset button */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all workspace settings and layouts to defaults?')) {
                onResetWorkspace();
                onClose();
              }
            }}
            className="settings-reset-workspace-btn"
            style={{
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            Reset Workspace Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

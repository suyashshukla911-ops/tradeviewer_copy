import React, { useState } from 'react';
import type { ChartTemplate } from '../templates/ChartTemplate';

export interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: ChartTemplate[];
  onSaveTemplate: (name: string) => void;
  onLoadTemplate: (template: ChartTemplate) => void;
  onDeleteTemplate: (id: string) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  templates,
  onSaveTemplate,
  onLoadTemplate,
  onDeleteTemplate,
}) => {
  const [templateName, setTemplateName] = useState('');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;
    onSaveTemplate(templateName.trim());
    setTemplateName('');
  };

  return (
    <div
      className="templates-modal-backdrop"
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
        className="templates-modal-content"
        style={{
          width: '420px',
          backgroundColor: '#1e222d',
          border: '1px solid #363a45',
          borderRadius: '8px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
          color: '#d1d4dc',
          userSelect: 'none',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
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
            <span style={{ fontSize: '16px' }}>📐</span>
            <span style={{ fontWeight: 600, fontSize: '15px', color: '#f0f3fa' }}>
              Chart Templates
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="templates-close-btn"
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

        {/* Save Form */}
        <form
          onSubmit={handleSave}
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #2a2e39',
            backgroundColor: '#131722',
            display: 'flex',
            gap: '8px',
          }}
        >
          <input
            type="text"
            placeholder="Template name (e.g., Scalp Setup)..."
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="template-name-input"
            style={{
              flex: 1,
              backgroundColor: '#1e222d',
              border: '1px solid #363a45',
              borderRadius: '4px',
              padding: '6px 10px',
              color: '#f0f3fa',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            className="save-template-btn"
            style={{
              backgroundColor: '#2962ff',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Save
          </button>
        </form>

        {/* Templates List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: '#787b86',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}
          >
            Saved Templates ({templates.length})
          </div>

          {templates.length === 0 ? (
            <div
              style={{
                color: '#787b86',
                fontSize: '12px',
                textAlign: 'center',
                padding: '24px 8px',
              }}
            >
              No saved templates found.
              <br />
              Save your indicators, chart style, and pane layout above.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="template-item"
                  style={{
                    backgroundColor: '#2a2e39',
                    border: '1px solid #363a45',
                    borderRadius: '4px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#f0f3fa' }}>
                      {tpl.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#787b86', marginTop: '2px' }}>
                      {tpl.chartType} • {tpl.indicators?.length || 0} indicators • {tpl.drawings?.length || 0} drawings
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        onLoadTemplate(tpl);
                        onClose();
                      }}
                      className="apply-template-btn"
                      title="Apply this template"
                      style={{
                        backgroundColor: '#2962ff',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTemplate(tpl.id)}
                      className="delete-template-btn"
                      title="Delete template"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '4px',
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

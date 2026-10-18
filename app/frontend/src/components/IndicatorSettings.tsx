import React, { useState, useEffect } from 'react';
import type { IndicatorInstance } from '../chart/indicators/Indicator';
import { INDICATOR_METAS } from '../chart/indicators/Indicator';

export interface IndicatorSettingsProps {
  isOpen: boolean;
  indicator: IndicatorInstance | null;
  onClose: () => void;
  onSave: (id: string, params: Record<string, any>, color?: string) => void;
}

export const IndicatorSettings: React.FC<IndicatorSettingsProps> = ({
  isOpen,
  indicator,
  onClose,
  onSave,
}) => {
  const [params, setParams] = useState<Record<string, any>>({});
  const [color, setColor] = useState<string>('#2962ff');

  // Hydrate local form state when indicator changes or opens
  useEffect(() => {
    if (indicator) {
      setParams({ ...indicator.params });
      setColor(indicator.color);
    }
  }, [indicator, isOpen]);

  // Handle Escape key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !indicator) return null;

  const meta = INDICATOR_METAS[indicator.type];
  const title = meta ? `${meta.name} Settings` : `${indicator.type} Settings`;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(indicator.id, params, color);
    onClose();
  };

  const handleResetDefaults = () => {
    if (meta) {
      setParams({ ...meta.defaultParams });
      if (meta.defaultParams.color) {
        setColor(meta.defaultParams.color);
      }
    }
  };

  const updateParam = (key: string, value: any) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div
      className="indicator-settings-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        className="indicator-settings-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '380px',
          backgroundColor: '#1e222d',
          border: '1px solid #2a2e39',
          borderRadius: '8px',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif',
          color: '#d1d4dc',
          animation: 'modalFadeIn 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderBottom: '1px solid #2a2e39',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: color,
                display: 'inline-block',
              }}
            />
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f0f3fa' }}>
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
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

        {/* Form Body */}
        <form onSubmit={handleApply} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 1. SMA / EMA inputs */}
          {(indicator.type === 'SMA' || indicator.type === 'EMA') && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', color: '#b2b5be' }}>Period Length</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={params.period ?? 20}
                  onChange={(e) => updateParam('period', parseInt(e.target.value, 10) || 1)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', color: '#b2b5be' }}>Line Color</label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{ width: '40px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', color: '#b2b5be' }}>Line Width</label>
                <select
                  value={params.lineWidth ?? 1.5}
                  onChange={(e) => updateParam('lineWidth', parseFloat(e.target.value))}
                  style={inputStyle}
                >
                  <option value="1">1 px</option>
                  <option value="1.5">1.5 px</option>
                  <option value="2">2 px</option>
                  <option value="3">3 px</option>
                </select>
              </div>
            </>
          )}

          {/* 2. Bollinger Bands inputs */}
          {indicator.type === 'BB' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', color: '#b2b5be' }}>Period</label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={params.period ?? 20}
                  onChange={(e) => updateParam('period', parseInt(e.target.value, 10) || 1)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', color: '#b2b5be' }}>Std Deviation</label>
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={params.stdDev ?? 2}
                  onChange={(e) => updateParam('stdDev', parseFloat(e.target.value) || 2)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', color: '#b2b5be' }}>Middle Line Color</label>
                <input
                  type="color"
                  value={params.middleColor ?? color}
                  onChange={(e) => updateParam('middleColor', e.target.value)}
                  style={{ width: '40px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', color: '#b2b5be' }}>Bands Color</label>
                <input
                  type="color"
                  value={params.bandsColor ?? color}
                  onChange={(e) => {
                    updateParam('bandsColor', e.target.value);
                    setColor(e.target.value);
                  }}
                  style={{ width: '40px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                />
              </div>
            </>
          )}

          {/* 3. RSI inputs */}
          {indicator.type === 'RSI' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', color: '#b2b5be' }}>RSI Period</label>
                <input
                  type="number"
                  min="2"
                  max="100"
                  value={params.period ?? 14}
                  onChange={(e) => updateParam('period', parseInt(e.target.value, 10) || 14)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', color: '#b2b5be' }}>Overbought Level</label>
                <input
                  type="number"
                  min="50"
                  max="95"
                  value={params.overbought ?? 70}
                  onChange={(e) => updateParam('overbought', parseInt(e.target.value, 10) || 70)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', color: '#b2b5be' }}>Center Level</label>
                <input
                  type="number"
                  min="40"
                  max="60"
                  value={params.center ?? 50}
                  onChange={(e) => updateParam('center', parseInt(e.target.value, 10) || 50)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', color: '#b2b5be' }}>Oversold Level</label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={params.oversold ?? 30}
                  onChange={(e) => updateParam('oversold', parseInt(e.target.value, 10) || 30)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', color: '#b2b5be' }}>Line Color</label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  style={{ width: '40px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                />
              </div>
            </>
          )}

          {/* 4. Volume inputs */}
          {indicator.type === 'VOL' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '13px', color: '#b2b5be' }}>Volume MA Period</label>
              <input
                type="number"
                min="1"
                max="100"
                value={params.maPeriod ?? 20}
                onChange={(e) => updateParam('maPeriod', parseInt(e.target.value, 10) || 20)}
                style={inputStyle}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: '1px solid #2a2e39',
            }}
          >
            <button
              type="button"
              onClick={handleResetDefaults}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#787b86',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '4px 6px',
              }}
            >
              Defaults
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#2a2e39',
                  border: 'none',
                  color: '#d1d4dc',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  background: '#2962ff',
                  border: 'none',
                  color: '#ffffff',
                  padding: '6px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  backgroundColor: '#131722',
  border: '1px solid #363a45',
  borderRadius: '4px',
  color: '#f0f3fa',
  padding: '5px 10px',
  fontSize: '13px',
  width: '100px',
  outline: 'none',
};

import React, { useState } from 'react';
import type { Alert } from '../alerts/Alert';
import { ALERT_CONDITIONS, type AlertConditionType } from '../alerts/AlertCondition';
import type { Timeframe } from '../chart/models/Candle';

export interface AlertsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Alert[];
  currentSymbol: string;
  currentTimeframe: Timeframe;
  currentPrice: number;
  onCreateAlert: (params: {
    symbol: string;
    timeframe: Timeframe;
    condition: AlertConditionType;
    value: number;
  }) => void;
  onToggleAlert: (id: string) => void;
  onDeleteAlert: (id: string) => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  isOpen,
  onClose,
  alerts,
  currentSymbol,
  currentTimeframe,
  currentPrice,
  onCreateAlert,
  onToggleAlert,
  onDeleteAlert,
}) => {
  const [symbol, setSymbol] = useState(currentSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>(currentTimeframe);
  const [condition, setCondition] = useState<AlertConditionType>('cross_above');
  const [targetValue, setTargetValue] = useState<string>(
    currentPrice > 0 ? currentPrice.toFixed(2) : '150.00'
  );

  // Keep state updated when currentSymbol or currentPrice changes and panel is opened
  React.useEffect(() => {
    if (isOpen) {
      setSymbol(currentSymbol);
      setTimeframe(currentTimeframe);
      if (currentPrice > 0) {
        setTargetValue(currentPrice.toFixed(2));
      }
    }
  }, [isOpen, currentSymbol, currentTimeframe, currentPrice]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(targetValue);
    if (isNaN(val) || val <= 0) return;

    onCreateAlert({
      symbol: symbol.toUpperCase().trim(),
      timeframe,
      condition,
      value: val,
    });
  };

  return (
    <aside
      className="alerts-panel"
      style={{
        width: '320px',
        backgroundColor: '#1e222d',
        borderLeft: '1px solid #2a2e39',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        color: '#d1d4dc',
        userSelect: 'none',
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #2a2e39',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>⏰</span>
          <span style={{ fontWeight: 600, fontSize: '14px', color: '#f0f3fa' }}>Alerts</span>
          <span
            style={{
              fontSize: '11px',
              backgroundColor: '#2a2e39',
              padding: '2px 6px',
              borderRadius: '10px',
              color: '#787b86',
            }}
          >
            {alerts.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="alerts-close-btn"
          title="Close Alerts Panel"
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

      {/* Create Alert Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #2a2e39',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          backgroundColor: '#131722',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#787b86', textTransform: 'uppercase' }}>
          Create New Alert
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '11px', color: '#787b86', display: 'block', marginBottom: '3px' }}>
              Symbol
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="alert-symbol-input"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: '#1e222d',
                border: '1px solid #363a45',
                borderRadius: '4px',
                padding: '5px 8px',
                color: '#f0f3fa',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ width: '80px' }}>
            <label style={{ fontSize: '11px', color: '#787b86', display: 'block', marginBottom: '3px' }}>
              Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as Timeframe)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: '#1e222d',
                border: '1px solid #363a45',
                borderRadius: '4px',
                padding: '5px 4px',
                color: '#f0f3fa',
                fontSize: '12px',
                outline: 'none',
              }}
            >
              {['1m', '5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M'].map((tf) => (
                <option key={tf} value={tf}>
                  {tf}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '11px', color: '#787b86', display: 'block', marginBottom: '3px' }}>
            Condition
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as AlertConditionType)}
            className="alert-condition-select"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: '#1e222d',
              border: '1px solid #363a45',
              borderRadius: '4px',
              padding: '5px 8px',
              color: '#f0f3fa',
              fontSize: '12px',
              outline: 'none',
            }}
          >
            {ALERT_CONDITIONS.map((c) => (
              <option key={c.type} value={c.type}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '11px', color: '#787b86', display: 'block', marginBottom: '3px' }}>
            Trigger Price ($)
          </label>
          <input
            type="number"
            step="0.01"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            className="alert-value-input"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              backgroundColor: '#1e222d',
              border: '1px solid #363a45',
              borderRadius: '4px',
              padding: '5px 8px',
              color: '#f0f3fa',
              fontSize: '12px',
              outline: 'none',
            }}
          />
        </div>

        <button
          type="submit"
          className="create-alert-btn"
          style={{
            backgroundColor: '#2962ff',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            padding: '7px 12px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            marginTop: '4px',
          }}
        >
          Create Alert
        </button>
      </form>

      {/* Alerts List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#787b86',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          Active Triggers ({alerts.length})
        </div>

        {alerts.length === 0 ? (
          <div
            style={{
              color: '#787b86',
              fontSize: '12px',
              textAlign: 'center',
              padding: '24px 8px',
              lineHeight: 1.5,
            }}
          >
            No active alerts configured.
            <br />
            Create one above to monitor mock prices.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {alerts.map((alert) => {
              const meta = ALERT_CONDITIONS.find((c) => c.type === alert.condition);
              return (
                <div
                  key={alert.id}
                  className="alert-item"
                  style={{
                    backgroundColor: alert.enabled ? '#2a2e39' : '#1a1d24',
                    border: '1px solid #363a45',
                    borderRadius: '4px',
                    padding: '8px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: alert.enabled ? 1 : 0.6,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: '#f0f3fa' }}>
                        {alert.symbol}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          backgroundColor: '#1e222d',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          color: '#787b86',
                        }}
                      >
                        {alert.timeframe}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#2962ff' }}>
                      {meta?.label || alert.condition} ${alert.value.toFixed(2)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Toggle button */}
                    <button
                      type="button"
                      onClick={() => onToggleAlert(alert.id)}
                      className="alert-toggle-btn"
                      title={alert.enabled ? 'Disable Alert' : 'Enable Alert'}
                      style={{
                        background: alert.enabled ? '#10b981' : '#4b5563',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '2px 8px',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {alert.enabled ? 'ON' : 'OFF'}
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => onDeleteAlert(alert.id)}
                      className="alert-delete-btn"
                      title="Delete Alert"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '2px 4px',
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};

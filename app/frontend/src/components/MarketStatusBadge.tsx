import React, { useEffect, useState } from 'react';
import type { MarketStatus } from '../data/providers/MarketDataProvider';
import { marketDataService } from '../data/services/MarketDataService';

export interface MarketStatusBadgeProps {
  status?: MarketStatus;
}

export const MarketStatusBadge: React.FC<MarketStatusBadgeProps> = ({ status: propStatus }) => {
  const [status, setStatus] = useState<MarketStatus>(
    propStatus || marketDataService.getMarketStatus()
  );

  useEffect(() => {
    if (propStatus) {
      setStatus(propStatus);
      return;
    }
    const unsub = marketDataService.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });
    return unsub;
  }, [propStatus]);

  const config = {
    MOCK: {
      label: 'MOCK',
      dotColor: '#00bcd4',
      bg: 'rgba(0, 188, 212, 0.12)',
      border: '1px solid rgba(0, 188, 212, 0.35)',
      tooltip: 'Market Data: MOCK (MockMarketDataProvider)',
    },
    LIVE: {
      label: 'LIVE',
      dotColor: '#10b981',
      bg: 'rgba(16, 185, 129, 0.12)',
      border: '1px solid rgba(16, 185, 129, 0.35)',
      tooltip: 'Market Data: LIVE feed connected',
    },
    CONNECTING: {
      label: 'CONNECTING',
      dotColor: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: '1px solid rgba(245, 158, 11, 0.35)',
      tooltip: 'Market Data: Connecting to provider...',
    },
    OFFLINE: {
      label: 'OFFLINE',
      dotColor: '#787b86',
      bg: 'rgba(120, 123, 134, 0.12)',
      border: '1px solid rgba(120, 123, 134, 0.35)',
      tooltip: 'Market Data: Disconnected / Offline',
    },
    ERROR: {
      label: 'ERROR',
      dotColor: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      border: '1px solid rgba(239, 68, 68, 0.35)',
      tooltip: 'Market Data: Provider connection error',
    },
  }[status] || {
    label: status,
    dotColor: '#787b86',
    bg: 'rgba(120, 123, 134, 0.12)',
    border: '1px solid #363a45',
    tooltip: `Market Data: ${status}`,
  };

  return (
    <div
      className={`market-status-badge market-status-${status.toLowerCase()}`}
      title={config.tooltip}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2px 8px',
        borderRadius: '12px',
        backgroundColor: config.bg,
        border: config.border,
        fontSize: '10px',
        fontWeight: 700,
        color: config.dotColor,
        letterSpacing: '0.5px',
        userSelect: 'none',
        lineHeight: 1.4,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: config.dotColor,
          display: 'inline-block',
          boxShadow: `0 0 6px ${config.dotColor}`,
        }}
      />
      <span>{config.label}</span>
    </div>
  );
};

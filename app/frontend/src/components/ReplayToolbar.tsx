import React from 'react';

export interface ReplayToolbarProps {
  isActive: boolean;
  isPlaying: boolean;
  currentIndex: number;
  totalCandles: number;
  speed: number;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onChangeSpeed: (speed: number) => void;
  onExit: () => void;
}

export const ReplayToolbar: React.FC<ReplayToolbarProps> = ({
  isActive,
  isPlaying,
  currentIndex,
  totalCandles,
  speed,
  onTogglePlay,
  onStepForward,
  onReset,
  onChangeSpeed,
  onExit,
}) => {
  if (!isActive) return null;

  return (
    <div
      className="replay-control-bar"
      style={{
        position: 'absolute',
        top: '52px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#1e222d',
        border: '1px solid #2962ff',
        borderRadius: '24px',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
        zIndex: 90,
        color: '#d1d4dc',
        userSelect: 'none',
        fontSize: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: '#2962ff', fontSize: '14px' }}>⏪</span>
        <span style={{ fontWeight: 600, color: '#f0f3fa' }}>Replay</span>
        <span
          className="replay-progress-text"
          style={{
            backgroundColor: '#131722',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            color: '#787b86',
          }}
        >
          {currentIndex} / {totalCandles}
        </span>
      </div>

      <div style={{ width: '1px', height: '16px', backgroundColor: '#363a45' }} />

      {/* Reset */}
      <button
        type="button"
        className="replay-reset-btn"
        onClick={onReset}
        title="Reset Replay to Starting Point"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#d1d4dc',
          cursor: 'pointer',
          fontSize: '14px',
          padding: '4px',
        }}
      >
        ⏮
      </button>

      {/* Play / Pause */}
      <button
        type="button"
        className="replay-play-btn"
        onClick={onTogglePlay}
        title={isPlaying ? 'Pause Replay' : 'Play Replay'}
        style={{
          backgroundColor: '#2962ff',
          border: 'none',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Step Forward */}
      <button
        type="button"
        className="replay-step-btn"
        onClick={onStepForward}
        title="Step Forward One Candle"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#d1d4dc',
          cursor: 'pointer',
          fontSize: '14px',
          padding: '4px',
        }}
      >
        ⏭
      </button>

      <div style={{ width: '1px', height: '16px', backgroundColor: '#363a45' }} />

      {/* Speed controls */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1, 2, 4].map((s) => (
          <button
            key={s}
            type="button"
            className={`replay-speed-btn replay-speed-${s}x`}
            onClick={() => onChangeSpeed(s)}
            style={{
              background: speed === s ? '#2a2e39' : 'transparent',
              color: speed === s ? '#2962ff' : '#787b86',
              border: speed === s ? '1px solid #2962ff' : '1px solid transparent',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {s}x
          </button>
        ))}
      </div>

      <div style={{ width: '1px', height: '16px', backgroundColor: '#363a45' }} />

      {/* Exit */}
      <button
        type="button"
        className="replay-exit-btn"
        onClick={onExit}
        title="Exit Replay Mode"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#787b86',
          cursor: 'pointer',
          fontSize: '14px',
          padding: '4px',
        }}
      >
        ✕
      </button>
    </div>
  );
};

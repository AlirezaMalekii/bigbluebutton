import React, { useId } from 'react';
import Styled from './styles';

type ConnectionLevel = 'critical' | 'danger' | 'warning' | 'normal';

interface SkyroomConnectionIconProps {
  level?: ConnectionLevel;
  connected?: boolean;
}

/** Arc tiers open upward from the base dot (Wi‑Fi style, Skyroom-themed). */
const SIGNAL_ARCS = [
  { d: 'M10.25 16.25 A2.25 2.25 0 0 1 13.75 16.25', tier: 1 },
  { d: 'M8.25 14.25 A4.25 4.25 0 0 1 15.75 14.25', tier: 2 },
  { d: 'M6.25 12.25 A6.25 6.25 0 0 1 17.75 12.25', tier: 3 },
  { d: 'M4.25 10.25 A8.25 8.25 0 0 1 19.75 10.25', tier: 4 },
] as const;

const ACTIVE_TIERS: Record<ConnectionLevel, number> = {
  critical: 1,
  danger: 2,
  warning: 3,
  normal: 4,
};

const SkyroomConnectionIcon: React.FC<SkyroomConnectionIconProps> = ({
  level = 'normal',
  connected = true,
}) => {
  const gradId = useId().replace(/:/g, '');
  const glowId = useId().replace(/:/g, '');

  const statusClass = !connected ? 'disconnected' : level;
  const activeCount = connected ? ACTIVE_TIERS[level] ?? 4 : 0;

  return (
    <Styled.Wrap
      className={`skyroom-conn-icon skyroom-conn-icon--${statusClass}`}
      data-level={level}
      data-connected={connected ? 'true' : 'false'}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="6" y1="20" x2="18" y2="8">
            <stop offset="0%" stopColor="var(--skyroom-conn-grad-from, #14a99e)" />
            <stop offset="100%" stopColor="var(--skyroom-conn-grad-to, #3fd9cf)" />
          </linearGradient>
          <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.65" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient plate */}
        <circle
          cx="12"
          cy="12"
          r="9.5"
          className="skyroom-conn-icon__plate"
        />

        {SIGNAL_ARCS.map(({ d, tier }) => (
          <path
            key={d}
            d={d}
            className="skyroom-conn-icon__arc"
            stroke={tier <= activeCount ? `url(#${gradId})` : 'currentColor'}
            strokeWidth="1.85"
            strokeLinecap="round"
            data-tier={tier}
            data-active={tier <= activeCount ? 'true' : 'false'}
          />
        ))}

        <circle
          cx="12"
          cy="17.35"
          r="1.65"
          className="skyroom-conn-icon__dot"
          fill={connected ? `url(#${gradId})` : 'currentColor'}
          filter={connected && level === 'normal' ? `url(#${glowId})` : undefined}
        />

        {!connected && (
          <line
            x1="6.5"
            y1="17.5"
            x2="17.5"
            y2="6.5"
            className="skyroom-conn-icon__slash"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        )}
      </svg>
    </Styled.Wrap>
  );
};

export default SkyroomConnectionIcon;

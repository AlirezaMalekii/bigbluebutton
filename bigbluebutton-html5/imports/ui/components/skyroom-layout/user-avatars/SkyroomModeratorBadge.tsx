import React, { useId } from 'react';
import Styled from './styles';

interface SkyroomModeratorBadgeProps {
  color?: string;
}

const SkyroomModeratorBadge: React.FC<SkyroomModeratorBadgeProps> = ({ color }) => {
  const gradId = useId().replace(/:/g, '');
  const glowId = `${gradId}-glow`;

  return (
    <Styled.Badge
      data-skyroom-role="moderator"
      data-skyroom-avatar="true"
      $role="moderator"
      $accent={color}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="5" y1="3" x2="19" y2="21" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8ef0e8" />
            <stop offset="50%" stopColor="#3fd9cf" />
            <stop offset="100%" stopColor="#0d887e" />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="0.55" floodColor="#20c7bb" floodOpacity="0.4" />
          </filter>
        </defs>
        <g filter={`url(#${glowId})`}>
          <path
            d="M12 2.75L5.5 5.5v5.35c0 3.95 2.75 7.35 6.5 8.65 3.75-1.3 6.5-4.7 6.5-8.65V5.5L12 2.75z"
            stroke={`url(#${gradId})`}
            strokeWidth="1.5"
            strokeLinejoin="round"
            fill="rgba(32, 199, 187, 0.12)"
          />
          <circle cx="12" cy="10.1" r="2.15" fill={`url(#${gradId})`} />
          <path
            d="M9.1 15.05c.85-1.75 1.95-2.55 2.9-2.55s2.05.8 2.9 2.55"
            stroke={`url(#${gradId})`}
            strokeWidth="1.55"
            strokeLinecap="round"
          />
        </g>
      </svg>
    </Styled.Badge>
  );
};

export default SkyroomModeratorBadge;

import React, { useId } from 'react';
import Styled from './styles';

interface SkyroomPresenterBadgeProps {
  color?: string;
}

const SkyroomPresenterBadge: React.FC<SkyroomPresenterBadgeProps> = ({ color }) => {
  const gradId = useId().replace(/:/g, '');
  const glowId = `${gradId}-glow`;

  return (
    <Styled.Badge
      data-skyroom-role="presenter"
      data-skyroom-avatar="true"
      $role="moderator"
      $accent={color}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f5d87a" />
            <stop offset="50%" stopColor="#e8b84a" />
            <stop offset="100%" stopColor="#c9922e" />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="0.55" floodColor="#e8b84a" floodOpacity="0.45" />
          </filter>
        </defs>
        <g filter={`url(#${glowId})`}>
          <rect
            x="4.5"
            y="6.5"
            width="15"
            height="11"
            rx="2"
            stroke={`url(#${gradId})`}
            strokeWidth="1.5"
            fill="rgba(232, 184, 74, 0.14)"
          />
          <path
            d="M9 15.5h6M12 6.5v3"
            stroke={`url(#${gradId})`}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12.5" r="2" fill={`url(#${gradId})`} />
        </g>
      </svg>
    </Styled.Badge>
  );
};

export default SkyroomPresenterBadge;

import React, { useId } from 'react';
import Styled from './styles';

interface SkyroomViewerBadgeProps {
  color?: string;
}

const SkyroomViewerBadge: React.FC<SkyroomViewerBadgeProps> = ({ color }) => {
  const gradId = useId().replace(/:/g, '');

  return (
    <Styled.Badge
      data-skyroom-role="viewer"
      data-skyroom-avatar="true"
      $role="viewer"
      $accent={color}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="7" y1="5" x2="17" y2="19" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(238, 244, 251, 0.96)" />
            <stop offset="100%" stopColor="rgba(176, 190, 208, 0.78)" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="8.75" r="2.9" fill={`url(#${gradId})`} />
        <path
          d="M6.75 17.85c1.05-2.55 2.95-3.85 5.25-3.85s4.2 1.3 5.25 3.85"
          stroke={`url(#${gradId})`}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </Styled.Badge>
  );
};

export default SkyroomViewerBadge;

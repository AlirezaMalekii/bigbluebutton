import React from 'react';
import Styled from './styles';

interface SkyroomViewerBadgeProps {
  color?: string;
}

/** Simple gray person icon for regular users. */
const SkyroomViewerBadge: React.FC<SkyroomViewerBadgeProps> = () => (
  <Styled.Badge
    data-skyroom-role="viewer"
    data-skyroom-avatar="true"
    $role="viewer"
    aria-hidden
  >
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="8.4"
        r="3.35"
        fill="rgba(148, 163, 184, 0.92)"
      />
      <path
        d="M5.9 18.35c1.2-3.05 3.35-4.55 6.1-4.55s4.9 1.5 6.1 4.55"
        stroke="rgba(148, 163, 184, 0.92)"
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  </Styled.Badge>
);

export default SkyroomViewerBadge;

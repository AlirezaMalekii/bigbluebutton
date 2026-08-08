import React from 'react';
import Styled from './styles';

interface SkyroomModeratorBadgeProps {
  color?: string;
}

/** Simple person icon in theme primary/accent for moderators. */
const SkyroomModeratorBadge: React.FC<SkyroomModeratorBadgeProps> = () => (
  <Styled.Badge
    data-skyroom-role="moderator"
    data-skyroom-avatar="true"
    $role="moderator"
    aria-hidden
  >
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="8.4"
        r="3.35"
        fill="var(--color-primary, var(--skyroom-accent, #20c7bb))"
      />
      <path
        d="M5.9 18.35c1.2-3.05 3.35-4.55 6.1-4.55s4.9 1.5 6.1 4.55"
        stroke="var(--color-primary, var(--skyroom-accent, #20c7bb))"
        strokeWidth="2.1"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  </Styled.Badge>
);

export default SkyroomModeratorBadge;

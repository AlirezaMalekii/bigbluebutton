import React from 'react';
import Styled from './styles';
import PersonSilhouette from './PersonSilhouette';

interface SkyroomModeratorBadgeProps {
  color?: string;
}

/** Filled person icon in theme primary for moderators (no circle). */
const SkyroomModeratorBadge: React.FC<SkyroomModeratorBadgeProps> = () => (
  <Styled.Badge
    data-skyroom-role="moderator"
    data-skyroom-avatar="true"
    $role="moderator"
    aria-hidden
  >
    <PersonSilhouette />
  </Styled.Badge>
);

export default SkyroomModeratorBadge;

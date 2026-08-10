import React from 'react';
import Styled from './styles';
import PersonSilhouette from './PersonSilhouette';

interface SkyroomViewerBadgeProps {
  color?: string;
}

/** Filled gray person icon for regular users (no circle). */
const SkyroomViewerBadge: React.FC<SkyroomViewerBadgeProps> = () => (
  <Styled.Badge
    data-skyroom-role="viewer"
    data-skyroom-avatar="true"
    $role="viewer"
    aria-hidden
  >
    <PersonSilhouette />
  </Styled.Badge>
);

export default SkyroomViewerBadge;

import React from 'react';
import Styled from './styles';
import PersonSilhouette from './PersonSilhouette';

interface SkyroomPresenterBadgeProps {
  color?: string;
}

/** Filled amber person icon for non-moderator presenters (no circle). */
const SkyroomPresenterBadge: React.FC<SkyroomPresenterBadgeProps> = () => (
  <Styled.Badge
    data-skyroom-role="presenter"
    data-skyroom-avatar="true"
    $role="presenter"
    aria-hidden
  >
    <PersonSilhouette />
  </Styled.Badge>
);

export default SkyroomPresenterBadge;

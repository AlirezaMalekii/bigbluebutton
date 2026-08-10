import React from 'react';
import Styled from './styles';
import PersonSilhouette from './PersonSilhouette';

/** Filled soft-sky person icon for guests (no circle). */
const SkyroomGuestBadge: React.FC = () => (
  <Styled.Badge
    data-skyroom-role="guest"
    data-skyroom-avatar="true"
    $role="guest"
    aria-hidden
  >
    <PersonSilhouette />
  </Styled.Badge>
);

export default SkyroomGuestBadge;

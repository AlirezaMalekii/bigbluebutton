import React from 'react';
import Styled from '../styles';

const renderNoUserWaitingItem = (message: string) => (
  <Styled.PendingUsers data-skyroom-section="empty">
    <Styled.SkyroomEmptyState className="skyroom-gw-empty">
      <Styled.NoPendingUsers>{message}</Styled.NoPendingUsers>
    </Styled.SkyroomEmptyState>
  </Styled.PendingUsers>
);

export default renderNoUserWaitingItem;

import React from 'react';
import { defineMessages, useIntl } from 'react-intl';
import styled from 'styled-components';
import Icon from '/imports/ui/components/common/icon/component';
import { useScreenShareChatOverlayControls } from './container';

const intlMessages = defineMessages({
  open: {
    id: 'app.screenShareChatOverlay.open',
    description: 'Open floating chat on shared screen',
  },
  focus: {
    id: 'app.screenShareChatOverlay.focus',
    description: 'Focus floating chat overlay window',
  },
});

const HeaderIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: rgba(45, 90, 135, 0.12);
  color: #2d5a87;
  cursor: pointer;
  flex-shrink: 0;

  &:hover {
    background: rgba(45, 90, 135, 0.2);
  }
`;

const ScreenShareChatOverlayHeaderButton: React.FC = () => {
  const intl = useIntl();
  const {
    isSharing,
    isOverlayOpen,
    reopen,
    focus,
    overlayVisibility,
  } = useScreenShareChatOverlayControls();

  if (!isSharing) return null;

  const handleClick = () => {
    if (overlayVisibility === 'closed' || !isOverlayOpen) {
      reopen();
      return;
    }
    focus();
  };

  const label = overlayVisibility === 'closed' || !isOverlayOpen
    ? intl.formatMessage(intlMessages.open)
    : intl.formatMessage(intlMessages.focus);

  return (
    <HeaderIconButton
      type="button"
      aria-label={label}
      title={label}
      data-test="screenShareChatOverlayHeaderButton"
      onClick={handleClick}
    >
      <Icon iconName="popout_window" />
    </HeaderIconButton>
  );
};

export default ScreenShareChatOverlayHeaderButton;

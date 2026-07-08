import React from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { layoutSelect } from '/imports/ui/components/layout/context';
import { Layout } from '/imports/ui/components/layout/layoutTypes';
import Icon from '/imports/ui/components/common/icon/component';
import { useScreenShareChatOverlayControls } from './container';
import { ReopenBanner, ReopenButton } from './styles';

const intlMessages = defineMessages({
  reopenLabel: {
    id: 'app.screenShareChatOverlay.reopen',
    description: 'Reopen floating chat on shared screen',
  },
  openLabel: {
    id: 'app.screenShareChatOverlay.open',
    description: 'Open floating chat on shared screen',
  },
  bannerText: {
    id: 'app.screenShareChatOverlay.bannerText',
    description: 'Banner text when overlay is closed during screen share',
  },
});

const ScreenShareChatOverlayButton: React.FC = () => {
  const intl = useIntl();
  const isRTL = layoutSelect((i: Layout) => i.isRTL);
  const {
    isSharing,
    overlayVisibility,
    isOverlayOpen,
    open,
    reopen,
  } = useScreenShareChatOverlayControls();

  if (!isSharing) return null;

  const handleClick = () => {
    if (overlayVisibility === 'closed' || !isOverlayOpen) {
      reopen();
    } else {
      open();
    }
  };

  if (overlayVisibility !== 'closed' && isOverlayOpen) {
    return null;
  }

  return (
    <ReopenBanner $isRTL={isRTL} data-test="screenShareChatOverlayReopen">
      <span>{intl.formatMessage(intlMessages.bannerText)}</span>
      <ReopenButton type="button" onClick={handleClick}>
        <Icon iconName="chat" />
        {intl.formatMessage(
          overlayVisibility === 'closed' ? intlMessages.reopenLabel : intlMessages.openLabel,
        )}
      </ReopenButton>
    </ReopenBanner>
  );
};

export default ScreenShareChatOverlayButton;

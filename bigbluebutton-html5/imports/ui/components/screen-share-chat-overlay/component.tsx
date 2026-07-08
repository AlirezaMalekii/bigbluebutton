import React from 'react';
import { useReactiveVar } from '@apollo/client';
import OverlayChatMessages from './overlay-chat-messages';
import OverlayChatForm from './overlay-chat-form';
import OverlayHeaderBar from './overlay-header';
import ScreenShareChatReactionOverlay from './reaction-overlay';
import { overlayVisibilityVar } from './service';
import {
  OverlayShell,
  OverlayBody,
  OverlayChatPanel,
} from './styles';

interface ScreenShareChatOverlayPanelProps {
  isRTL: boolean;
}

const ScreenShareChatOverlayPanel: React.FC<ScreenShareChatOverlayPanelProps> = ({
  isRTL,
}) => {
  const visibility = useReactiveVar(overlayVisibilityVar);
  const collapsed = visibility === 'hidden';
  const compact = visibility === 'compact';

  return (
    <OverlayShell
      $isRTL={isRTL}
      $compact={compact}
      data-test="screenShareChatOverlay"
    >
      <OverlayHeaderBar isRTL={isRTL} />
      {!collapsed && (
        <OverlayBody $compact={compact}>
          <OverlayChatPanel $isRTL={isRTL} $compact={compact}>
            <OverlayChatMessages compact={compact} />
            {!compact && <OverlayChatForm isRTL={isRTL} />}
            <ScreenShareChatReactionOverlay />
          </OverlayChatPanel>
        </OverlayBody>
      )}
    </OverlayShell>
  );
};

export default ScreenShareChatOverlayPanel;

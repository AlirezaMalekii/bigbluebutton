import React from 'react';
import { useReactiveVar } from '@apollo/client';
import ChatMessageListContainer from '/imports/ui/components/chat/chat-graphql/chat-message-list/component';
import ChatMessageFormContainer from '/imports/ui/components/chat/chat-graphql/chat-message-form/component';
import ChatTypingIndicatorContainer from '/imports/ui/components/chat/chat-graphql/chat-typing-indicator/component';
import { SkyroomChatMessageFilterProvider } from '/imports/ui/components/skyroom-layout/chat-message-filter/context';
import { isSkyroomColumnLayout } from '/imports/ui/components/skyroom-layout/panel-toggles';
import OverlayHeaderBar from './overlay-header';
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
  const skyroomColumn = isSkyroomColumnLayout();

  const chatBody = (
    <>
      <ChatMessageListContainer />
      <ChatTypingIndicatorContainer />
      <ChatMessageFormContainer />
    </>
  );

  return (
    <OverlayShell $isRTL={isRTL} data-test="screenShareChatOverlay">
      <OverlayHeaderBar isRTL={isRTL} collapsed={collapsed} />
      {!collapsed && (
        <OverlayBody>
          <OverlayChatPanel $isRTL={isRTL}>
            {skyroomColumn ? (
              <SkyroomChatMessageFilterProvider>
                {chatBody}
              </SkyroomChatMessageFilterProvider>
            ) : chatBody}
          </OverlayChatPanel>
        </OverlayBody>
      )}
    </OverlayShell>
  );
};

export default ScreenShareChatOverlayPanel;

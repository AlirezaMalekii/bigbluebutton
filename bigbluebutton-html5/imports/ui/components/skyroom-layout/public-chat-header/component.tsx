import React from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { layoutDispatch, layoutSelectInput } from '/imports/ui/components/layout/context';
import { Input } from '/imports/ui/components/layout/layoutTypes';
import {
  isSkyroomColumnLayout,
  toggleSkyroomPublicChat,
} from '/imports/ui/components/skyroom-layout/panel-toggles';
import SkyroomChatHeaderActions from '../chat-header-actions/component';
import ScreenShareChatOverlayHeaderButton from '/imports/ui/components/screen-share-chat-overlay/overlay-header-button';
import Styled from './styles';

const intlMessages = defineMessages({
  titlePublic: {
    id: 'app.chat.titlePublic',
    description: 'Public chat title',
  },
});

interface SkyroomPublicChatHeaderProps {
  title?: string;
}

const SkyroomPublicChatHeader: React.FC<SkyroomPublicChatHeaderProps> = ({ title: titleProp }) => {
  const intl = useIntl();
  const layoutContextDispatch = layoutDispatch();
  const sidebarContent = layoutSelectInput((i: Input) => i.sidebarContent);
  const title = titleProp ?? intl.formatMessage(intlMessages.titlePublic);

  return (
    <Styled.Container data-test="chatTitle">
      <Styled.SmallTitle>
        <Styled.TitleButton
          type="button"
          data-test="hidePublicChat"
          aria-label={title}
          onClick={() => {
            if (isSkyroomColumnLayout()) {
              toggleSkyroomPublicChat(
                layoutContextDispatch,
                sidebarContent,
              );
            }
          }}
        >
          <Styled.TitleText>{title}</Styled.TitleText>
        </Styled.TitleButton>
      </Styled.SmallTitle>
      <ScreenShareChatOverlayHeaderButton />
      <SkyroomChatHeaderActions />
    </Styled.Container>
  );
};

export default SkyroomPublicChatHeader;

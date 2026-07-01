import React, { useEffect } from 'react';
import injectNotify from '/imports/ui/components/common/toast/inject-notify/component';
import { PANELS, ACTIONS } from '/imports/ui/components/layout/enums';
import {
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
  openSkyroomPrivateChat,
} from '/imports/ui/components/skyroom-layout/panel-toggles';

interface ChatPushAlertProps {
  notify: (...args: unknown[]) => void;
  chatId: string;
  title: React.ReactNode;
  content: React.ReactNode;
  alertDuration: number;
  layoutContextDispatch: (...args: unknown[]) => void;
}

const ChatPushAlert: React.FC<ChatPushAlertProps> = (props) => {
  useEffect(() => {
    showNotify();
  });

  const link = (title: React.ReactNode, chatId: string) => {
    const { layoutContextDispatch } = props;

    return (
      <div
        key={chatId}
        role="button"
        tabIndex={0}
        onClick={() => {
          // On a Skyroom phone the bottom zone shows one box at a time; route the tap through
          // the mobile helper so it switches to the chat box (and closes users/notes) and opens
          // this conversation. Otherwise the toast would open the chat panel but keep the wrong
          // box visible, so the receiver could never reach the private message.
          if (isSkyroomColumnLayout() && isSkyroomMobileViewport()) {
            openSkyroomPrivateChat(layoutContextDispatch, chatId);
            return;
          }
          layoutContextDispatch({
            type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN,
            value: true,
          });
          layoutContextDispatch({
            type: ACTIONS.SET_ID_CHAT_OPEN,
            value: chatId,
          });
          layoutContextDispatch({
            type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL,
            value: PANELS.CHAT,
          });
        }}
        onKeyDown={() => null}
      >
        {title}
      </div>
    );
  };

  const showNotify = () => {
    const {
      notify,
      chatId,
      title,
      content,
      alertDuration,
    } = props;

    return notify(
      link(title, chatId),
      'info',
      'chat',
      { autoClose: alertDuration },
      link(content, chatId),
      true,
    );
  };

  return null;
};

export default injectNotify(ChatPushAlert);

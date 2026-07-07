import React, { useEffect } from 'react';
import injectNotify from '/imports/ui/components/common/toast/inject-notify/component';
import {
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
  openSkyroomPublicChat,
} from '/imports/ui/components/skyroom-layout/panel-toggles';
import {
  openPrivateChatConversation,
  reopenPrivateChatFromClosed,
} from '/imports/ui/components/chat/private-chat-navigation';

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

  const openChat = (chatId: string) => {
    const { layoutContextDispatch } = props;
    const PUBLIC_CHAT_ID = window.meetingClientSettings.public.chat.public_id;
    const isPublicChat = chatId === PUBLIC_CHAT_ID;

    if (!isPublicChat) {
      reopenPrivateChatFromClosed(chatId);
    }

    if (isSkyroomColumnLayout() && isSkyroomMobileViewport() && isPublicChat) {
      openSkyroomPublicChat(layoutContextDispatch);
      return;
    }

    openPrivateChatConversation(layoutContextDispatch, chatId);
  };

  const link = (title: React.ReactNode, chatId: string) => (
    <div
      key={chatId}
      role="button"
      tabIndex={0}
      onClick={() => openChat(chatId)}
      onKeyDown={() => null}
    >
      {title}
    </div>
  );

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

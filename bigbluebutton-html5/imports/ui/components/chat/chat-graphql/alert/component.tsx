import React, { useCallback, useEffect, useRef } from 'react';
import { isEqual } from 'radash';
import { defineMessages, useIntl } from 'react-intl';
import { layoutSelect, layoutSelectInput, layoutDispatch } from '/imports/ui/components/layout/context';
import { Input, Layout } from '/imports/ui/components/layout/layoutTypes';
import { PANELS } from '/imports/ui/components/layout/enums';
import usePreviousValue from '/imports/ui/hooks/usePreviousValue';
import { stripTags, unescapeHtml } from '/imports/utils/string-utils';
import { ChatMessageType } from '/imports/ui/core/enums/chat';
import {
  CHAT_MESSAGE_STREAM,
  ChatMessageStreamResponse,
  Message,
} from './queries';
import ChatPushAlert from './push-alert/component';
import Styled from './styles';
import Service from './service';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import useSettings from '/imports/ui/services/settings/hooks/useSettings';
import { SETTINGS } from '/imports/ui/services/settings/enums';
import Auth from '/imports/ui/services/auth';

const intlMessages = defineMessages({
  appToastChatPublic: {
    id: 'app.toast.chat.public',
    description: 'when entry various message',
  },
  appToastChatPrivate: {
    id: 'app.toast.chat.private',
    description: 'when entry various message',
  },
  appToastChatPrivateFrom: {
    id: 'app.toast.chat.privateFrom',
    description: 'private chat toast title with sender name',
  },
  appToastChatSystem: {
    id: 'app.toast.chat.system',
    description: 'system for use',
  },
  publicChatClear: {
    id: 'app.chat.clearPublicChatMessage',
    description: 'message of when clear the public chat',
  },
  publicChatMsg: {
    id: 'app.toast.chat.public',
    description: 'public chat toast message title',
  },
  privateChatMsg: {
    id: 'app.toast.chat.private',
    description: 'private chat toast message title',
  },
  pollResults: {
    id: 'app.toast.chat.poll',
    description: 'chat toast message for polls',
  },
  pollResultsClick: {
    id: 'app.toast.chat.pollClick',
    description: 'chat toast click message for polls',
  },
  userAway: {
    id: 'app.chat.away',
    description: 'message when user is away',
  },
  userNotAway: {
    id: 'app.chat.notAway',
    description: 'message when user is no longer away',
  },
});

const ALERT_DURATION = 4000; // 4 seconds

interface ChatAlertGraphqlProps {
  idChatOpen: string;
  layoutContextDispatch: () => void;
  chatUnreadMessages: Array<Message> | null;
  publicAudioAlertEnabled: boolean;
  publicPushAlertEnabled: boolean;
}

const ChatAlertGraphql: React.FC<ChatAlertGraphqlProps> = (props) => {
  const {
    publicAudioAlertEnabled,
    idChatOpen,
    layoutContextDispatch,
    publicPushAlertEnabled,
    chatUnreadMessages,
  } = props;
  const intl = useIntl();
  const history = useRef(new Set<string>());
  const prevChatUnreadMessages = usePreviousValue(chatUnreadMessages);
  const chatMessagesDidChange = !isEqual(prevChatUnreadMessages, chatUnreadMessages);
  const shouldRenderChatAlerts = chatMessagesDidChange
    && !!chatUnreadMessages
    && chatUnreadMessages.length > 0;

  const CHAT_CONFIG = window.meetingClientSettings.public.chat;
  const PUBLIC_CHAT_ID = CHAT_CONFIG.public_id;
  const PUBLIC_GROUP_CHAT_ID = CHAT_CONFIG.public_group_id;

  const isPublicStreamMessage = useCallback(
    (m: Message) => m.chatId === PUBLIC_GROUP_CHAT_ID,
    [PUBLIC_GROUP_CHAT_ID],
  );

  const shouldPlayAudioAlert = useCallback(
    (m: Message) => {
      if (m.senderId === Auth.userID) return false;
      if (m.chatId === idChatOpen) return false;
      if (history.current.has(m.messageId)) return false;
      if (isPublicStreamMessage(m)) return publicAudioAlertEnabled;
      return true;
    },
    [history.current, idChatOpen, isPublicStreamMessage, publicAudioAlertEnabled],
  );

  useEffect(() => {
    if (shouldRenderChatAlerts) {
      chatUnreadMessages.forEach((m) => {
        history.current.add(m.messageId);
      });
    }
  });

  let playAudioAlert = false;

  if (shouldRenderChatAlerts) {
    playAudioAlert = chatUnreadMessages.some(shouldPlayAudioAlert);
  }

  if (playAudioAlert) {
    Service.playAlertSound();
  }

  const mapTextContent = (msg: Message) => {
    if (msg.messageType === ChatMessageType.USER_AWAY_STATUS_MSG) {
      const { away } = JSON.parse(msg.messageMetadata as string);

      return away
        ? intl.formatMessage(intlMessages.userAway)
        : intl.formatMessage(intlMessages.userNotAway);
    }

    if (msg.messageType === ChatMessageType.CHAT_CLEAR) {
      return intl.formatMessage(intlMessages.publicChatClear);
    }

    return unescapeHtml(stripTags(msg.messageAsHtml));
  };

  const createMessage = (msg: Message) => (
    <Styled.PushMessageContent>
      <Styled.UserNameMessage>{msg.senderName}</Styled.UserNameMessage>
      <Styled.ContentMessage>
        {mapTextContent(msg)}
      </Styled.ContentMessage>
    </Styled.PushMessageContent>
  );

  const createPollMessage = () => (
    <Styled.PushMessageContent>
      <Styled.UserNameMessage>
        {intl.formatMessage(intlMessages.pollResults)}
      </Styled.UserNameMessage>
      <Styled.ContentMessagePoll>
        {intl.formatMessage(intlMessages.pollResultsClick)}
      </Styled.ContentMessagePoll>
    </Styled.PushMessageContent>
  );

  const renderToast = (message: Message) => {
    if (history.current.has(message.messageId)) return null;
    if (message.chatId === idChatOpen) return null;

    const messageChatId = message.chatId === PUBLIC_GROUP_CHAT_ID ? PUBLIC_CHAT_ID : message.chatId;
    const isPublicMessage = messageChatId === PUBLIC_CHAT_ID;
    if (isPublicMessage && !publicPushAlertEnabled) return null;

    const isPollResult = message.messageType === ChatMessageType.POLL;
    let content;

    if (isPollResult) {
      content = createPollMessage();
    } else {
      content = createMessage(message);
    }

    const privateTitle = message.senderName
      ? intl.formatMessage(intlMessages.appToastChatPrivateFrom, {
        senderName: message.senderName,
      })
      : intl.formatMessage(intlMessages.appToastChatPrivate);

    return (
      <ChatPushAlert
        key={`${message.messageId}-${messageChatId}`}
        chatId={messageChatId}
        content={content}
        title={
          isPublicMessage
            ? <span>{intl.formatMessage(intlMessages.appToastChatPublic)}</span>
            : <span>{privateTitle}</span>
        }
        alertDuration={ALERT_DURATION}
        layoutContextDispatch={layoutContextDispatch}
      />
    );
  };

  if (!shouldRenderChatAlerts) return null;

  return chatUnreadMessages.map(renderToast);
};

const ChatAlertContainerGraphql: React.FC = () => {
  const {
    chatAudioAlerts,
    chatPushAlerts,
  } = useSettings(SETTINGS.APPLICATION) as {
    chatAudioAlerts: boolean;
    chatPushAlerts: boolean;
  };

  const cursor = useRef(new Date());

  const { data: chatMessages } = useDeduplicatedSubscription<ChatMessageStreamResponse>(
    CHAT_MESSAGE_STREAM,
    {
      variables: {
        createdAt: cursor.current.toISOString(),
      },
    },
  );

  const idChatOpen = layoutSelect((i: Layout) => i.idChatOpen);
  const sidebarContent = layoutSelectInput((i: Input) => i.sidebarContent);
  const { sidebarContentPanel } = sidebarContent;
  const layoutContextDispatch = layoutDispatch();

  const idChat = sidebarContentPanel === PANELS.CHAT ? idChatOpen : '';

  if (!chatMessages) return null;

  return (
    <ChatAlertGraphql
      publicAudioAlertEnabled={chatAudioAlerts}
      idChatOpen={idChat}
      layoutContextDispatch={layoutContextDispatch}
      publicPushAlertEnabled={chatPushAlerts}
      chatUnreadMessages={chatMessages?.chat_message_stream ?? null}
    />
  );
};

export default ChatAlertContainerGraphql;

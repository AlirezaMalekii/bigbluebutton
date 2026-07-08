import React, { useEffect, useMemo, useRef } from 'react';
import { defineMessages, FormattedTime, useIntl } from 'react-intl';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import useChat from '/imports/ui/core/hooks/useChat';
import { Message } from '/imports/ui/Types/message';
import { GraphqlDataHookSubscriptionResponse } from '/imports/ui/Types/hook';
import { Chat as ChatType } from '/imports/ui/Types/chat';
import {
  CHAT_MESSAGE_PUBLIC_SUBSCRIPTION,
  ChatMessageSubscriptionResponse,
} from '/imports/ui/components/chat/chat-graphql/chat-message-list/page/queries';
import ChatMessageTextContent from '/imports/ui/components/chat/chat-graphql/chat-message-list/page/chat-message/message-content/text-content/component';
import { ChatMessageType } from '/imports/ui/core/enums/chat';
import {
  OVERLAY_COMPACT_MESSAGE_LIMIT,
  OVERLAY_FULL_MESSAGE_LIMIT,
} from './types';
import {
  OverlayMessageList,
  OverlayMessageItem,
  OverlayMessageMeta,
  OverlayMessageAuthor,
  OverlayMessageTime,
  OverlayEmptyState,
} from './styles';

const intlMessages = defineMessages({
  empty: {
    id: 'app.screenShareChatOverlay.empty',
    description: 'Empty state for overlay chat',
  },
  loading: {
    id: 'app.screenShareChatOverlay.loading',
    description: 'Loading state for overlay chat',
  },
});

interface OverlayChatMessagesProps {
  compact?: boolean;
}

const isRenderableMessage = (message: Message): boolean => {
  return message.messageType === ChatMessageType.TEXT
    || Boolean(message.messageAsHtml || message.message);
};

const OverlayChatMessages: React.FC<OverlayChatMessagesProps> = ({
  compact = false,
}) => {
  const intl = useIntl();
  const listRef = useRef<HTMLDivElement>(null);
  const CHAT_CONFIG = window.meetingClientSettings.public.chat;
  const publicGroupChatId = CHAT_CONFIG.public_group_id;

  // Always subscribe to the same full window so compact/expand does not
  // create a second GraphQL subscription (dedupe key stays stable).
  const { data: chatMeta } = useChat((chat) => ({
    totalMessages: chat.totalMessages,
  }), publicGroupChatId) as GraphqlDataHookSubscriptionResponse<Partial<ChatType>[]>;

  const totalMessages = chatMeta?.[0]?.totalMessages ?? 0;
  const offset = Math.max(0, totalMessages - OVERLAY_FULL_MESSAGE_LIMIT);

  const variables = useMemo(() => ({
    limit: OVERLAY_FULL_MESSAGE_LIMIT,
    offset,
  }), [offset]);

  const { data, loading } = useDeduplicatedSubscription<ChatMessageSubscriptionResponse>(
    CHAT_MESSAGE_PUBLIC_SUBSCRIPTION,
    { variables },
  );

  const messages = useMemo(() => {
    if (!data || !('chat_message_public' in data)) return [];
    const filtered = data.chat_message_public.filter(isRenderableMessage);
    if (!compact) return filtered;
    return filtered.slice(-OVERLAY_COMPACT_MESSAGE_LIMIT);
  }, [compact, data]);

  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    listEl.scrollTop = listEl.scrollHeight;
  }, [messages.length, messages[messages.length - 1]?.messageId, compact]);

  if (loading && messages.length === 0) {
    return (
      <OverlayEmptyState>
        {intl.formatMessage(intlMessages.loading)}
      </OverlayEmptyState>
    );
  }

  if (messages.length === 0) {
    return (
      <OverlayEmptyState>
        {intl.formatMessage(intlMessages.empty)}
      </OverlayEmptyState>
    );
  }

  return (
    <OverlayMessageList
      ref={listRef}
      role="log"
      aria-live="polite"
      $compact={compact}
    >
      {messages.map((message) => {
        const author = message.senderName || message.user?.name || '';
        const content = message.messageAsHtml || message.message || '';

        return (
          <OverlayMessageItem key={message.messageId} $compact={compact}>
            <OverlayMessageMeta>
              <OverlayMessageAuthor>{author}</OverlayMessageAuthor>
            </OverlayMessageMeta>
            <ChatMessageTextContent text={content} dataTest="overlayMessageContent" />
            <OverlayMessageTime>
              <FormattedTime value={new Date(message.createdAt)} />
            </OverlayMessageTime>
          </OverlayMessageItem>
        );
      })}
    </OverlayMessageList>
  );
};

export default OverlayChatMessages;

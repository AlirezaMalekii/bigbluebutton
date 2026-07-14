import { makeVar, useReactiveVar } from '@apollo/client';
import { useEffect, useMemo, useRef } from 'react';
import useChat from '/imports/ui/core/hooks/useChat';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import { GraphqlDataHookSubscriptionResponse } from '/imports/ui/Types/hook';
import { Chat } from '/imports/ui/Types/chat';
import Auth from '/imports/ui/services/auth';
import { isPrivateChatId } from '/imports/ui/components/chat/private-chat-privacy';
import {
  CHAT_MESSAGE_STREAM,
  ChatMessageStreamResponse,
  Message,
} from '/imports/ui/components/chat/chat-graphql/alert/queries';

export interface UnreadPrivateChatSender {
  unread: number;
  lastActivityAt: number;
}

const unreadPrivateChatsBySenderVar = makeVar<Map<string, UnreadPrivateChatSender>>(new Map());

const buildMapFromChats = (
  chats: Partial<Chat>[] | undefined,
  previousMap: Map<string, UnreadPrivateChatSender>,
): Map<string, UnreadPrivateChatSender> => {
  const nextMap = new Map<string, UnreadPrivateChatSender>();

  (chats ?? []).forEach((chat) => {
    if (chat.public || !chat.participant?.userId) return;

    const unread = chat.totalUnread ?? 0;
    if (unread <= 0) return;

    const { userId } = chat.participant;
    const previous = previousMap.get(userId);
    nextMap.set(userId, {
      unread,
      lastActivityAt: previous?.lastActivityAt ?? Date.now(),
    });
  });

  return nextMap;
};

export const useUnreadPrivateChatsBySender = (): Map<string, UnreadPrivateChatSender> => (
  useReactiveVar(unreadPrivateChatsBySenderVar)
);

export const useUnreadPrivateChatsBySenderSync = (): null => {
  const cursor = useRef(new Date());
  const previousUnreadRef = useRef<Map<string, number>>(new Map());
  const processedMessageIds = useRef(new Set<string>());

  const { data: chats } = useChat((chat) => ({
    chatId: chat.chatId,
    public: chat.public,
    totalUnread: chat.totalUnread,
    participant: chat.participant,
  })) as GraphqlDataHookSubscriptionResponse<Partial<Chat>[]>;

  const { data: chatMessages } = useDeduplicatedSubscription<ChatMessageStreamResponse>(
    CHAT_MESSAGE_STREAM,
    {
      variables: {
        createdAt: cursor.current.toISOString(),
      },
    },
  );

  const privateChats = useMemo(
    () => (chats ?? []).filter((chat) => !chat.public && (chat.totalUnread ?? 0) > 0),
    [chats],
  );

  useEffect(() => {
    const previousMap = unreadPrivateChatsBySenderVar();
    const nextMap = buildMapFromChats(privateChats, previousMap);

    privateChats.forEach((chat) => {
      const userId = chat.participant?.userId;
      if (!userId) return;

      const unread = chat.totalUnread ?? 0;
      const previousUnread = previousUnreadRef.current.get(userId) ?? 0;
      const existing = nextMap.get(userId);

      if (existing && unread > previousUnread) {
        nextMap.set(userId, {
          unread,
          lastActivityAt: Date.now(),
        });
      }
    });

    previousUnreadRef.current = new Map(
      privateChats.map((chat) => [chat.participant!.userId!, chat.totalUnread ?? 0]),
    );

    unreadPrivateChatsBySenderVar(nextMap);
  }, [privateChats]);

  useEffect(() => {
    const stream = chatMessages?.chat_message_stream ?? [];
    if (stream.length === 0) return;

    const processedIds = processedMessageIds.current;

    stream.forEach((message: Message) => {
      if (processedIds.has(message.messageId)) return;
      processedIds.add(message.messageId);

      if (message.senderId === Auth.userID) return;
      if (!isPrivateChatId(message.chatId)) return;

      const createdAt = new Date(message.createdAt).getTime();
      if (!Number.isFinite(createdAt)) return;

      const { senderId } = message;
      if (!senderId) return;

      const currentMap = unreadPrivateChatsBySenderVar();
      const existing = currentMap.get(senderId);

      if (existing && createdAt <= existing.lastActivityAt) return;

      const nextMap = new Map(currentMap);
      nextMap.set(senderId, {
        unread: existing?.unread ?? 1,
        lastActivityAt: createdAt,
      });
      unreadPrivateChatsBySenderVar(nextMap);
    });
  }, [chatMessages]);

  return null;
};

export default useUnreadPrivateChatsBySender;

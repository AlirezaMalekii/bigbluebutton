import { useEffect, useRef } from 'react';
import { layoutSelect, layoutDispatch } from '/imports/ui/components/layout/context';
import { Layout } from '/imports/ui/components/layout/layoutTypes';
import useChat from '/imports/ui/core/hooks/useChat';
import { Chat } from '/imports/ui/Types/chat';
import { GraphqlDataHookSubscriptionResponse } from '/imports/ui/Types/hook';
import {
  isPrivateChatSuppressed,
  openPrivateChatConversation,
} from '/imports/ui/components/chat/private-chat-navigation';

const usePrivateChatIncomingHandler = (): null => {
  const idChatOpen = layoutSelect((i: Layout) => i.idChatOpen);
  const layoutContextDispatch = layoutDispatch();
  const autoOpenedChats = useRef(new Set<string>());

  const { data: chats } = useChat((chat) => ({
    chatId: chat.chatId,
    public: chat.public,
    totalMessages: chat.totalMessages,
    totalUnread: chat.totalUnread,
    participant: chat.participant,
  })) as GraphqlDataHookSubscriptionResponse<Partial<Chat>[]>;

  useEffect(() => {
    if (!chats?.length) return;

    chats.forEach((chat) => {
      if (!chat.chatId || chat.public) return;
      if ((chat.totalUnread ?? 0) <= 0) return;
      if ((chat.totalMessages ?? 0) !== 1) return;
      if (isPrivateChatSuppressed(chat.chatId)) return;
      if (idChatOpen === chat.chatId) return;
      if (autoOpenedChats.current.has(chat.chatId)) return;

      autoOpenedChats.current.add(chat.chatId);
      openPrivateChatConversation(layoutContextDispatch, chat.chatId);
    });
  }, [chats, idChatOpen, layoutContextDispatch]);

  return null;
};

export default usePrivateChatIncomingHandler;

import { ACTIONS, PANELS } from '/imports/ui/components/layout/enums';
import Storage from '/imports/ui/services/storage/session';
import { indexOf, without } from '/imports/utils/array-utils';
import {
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
  openSkyroomPrivateChat,
} from '/imports/ui/components/skyroom-layout/panel-toggles';

export const CLOSED_CHAT_LIST_KEY = 'closedChatList';

type LayoutDispatch = (action: { type: string; value: unknown }) => void;

export const isPrivateChatSuppressed = (chatId: string): boolean => {
  const currentClosedChats = (Storage.getItem(CLOSED_CHAT_LIST_KEY) || []) as string[];
  return indexOf(currentClosedChats, chatId) > -1;
};

export const reopenPrivateChatFromClosed = (chatId: string): void => {
  if (!chatId) return;
  const currentClosedChats = (Storage.getItem(CLOSED_CHAT_LIST_KEY) || []) as string[];
  if (indexOf(currentClosedChats, chatId) > -1) {
    Storage.setItem(CLOSED_CHAT_LIST_KEY, without(currentClosedChats, chatId));
  }
};

export const openPrivateChatConversation = (
  layoutContextDispatch: LayoutDispatch,
  chatId: string,
): void => {
  if (isSkyroomColumnLayout() && isSkyroomMobileViewport()) {
    openSkyroomPrivateChat(layoutContextDispatch, chatId);
    return;
  }

  layoutContextDispatch({
    type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN,
    value: true,
  });
  layoutContextDispatch({
    type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL,
    value: PANELS.CHAT,
  });
  layoutContextDispatch({
    type: ACTIONS.SET_ID_CHAT_OPEN,
    value: chatId,
  });
};

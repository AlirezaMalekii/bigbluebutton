import { ACTIONS, PANELS } from '/imports/ui/components/layout/enums';
import { SKYROOM_COLUMN_ATTR } from './column-layout';

export const isSkyroomColumnLayout = () => {
  const layoutEl = document.getElementById('layout');
  return Boolean(layoutEl?.hasAttribute(SKYROOM_COLUMN_ATTR));
};

export const getPublicChatId = () => window.meetingClientSettings.public.chat.public_group_id;

export const isPublicChatOpen = (sidebarContent) => (
  sidebarContent.isOpen && sidebarContent.sidebarContentPanel === PANELS.CHAT
);

export const openSkyroomPublicChat = (layoutContextDispatch) => {
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
    value: getPublicChatId(),
  });
};

/** Leave private chat UI but keep the public chat panel open (Skyroom column). */
export const returnToSkyroomPublicChat = (layoutContextDispatch) => {
  openSkyroomPublicChat(layoutContextDispatch);
  window.dispatchEvent(new Event('resize'));
};

export const openSkyroomUserList = (layoutContextDispatch) => {
  layoutContextDispatch({
    type: ACTIONS.SET_SIDEBAR_NAVIGATION_IS_OPEN,
    value: true,
  });
  layoutContextDispatch({
    type: ACTIONS.SET_SIDEBAR_NAVIGATION_PANEL,
    value: PANELS.USERLIST,
  });
};

export const restoreSkyroomSplitLayout = (layoutContextDispatch) => {
  openSkyroomUserList(layoutContextDispatch);
  openSkyroomPublicChat(layoutContextDispatch);
};

export const toggleSkyroomUserList = (layoutContextDispatch, sidebarNavigation) => {
  if (sidebarNavigation.isOpen) {
    layoutContextDispatch({
      type: ACTIONS.SET_SIDEBAR_NAVIGATION_IS_OPEN,
      value: false,
    });
    layoutContextDispatch({
      type: ACTIONS.SET_SIDEBAR_NAVIGATION_PANEL,
      value: PANELS.NONE,
    });
    return;
  }

  layoutContextDispatch({
    type: ACTIONS.SET_SIDEBAR_NAVIGATION_IS_OPEN,
    value: true,
  });
  layoutContextDispatch({
    type: ACTIONS.SET_SIDEBAR_NAVIGATION_PANEL,
    value: PANELS.USERLIST,
  });
};

export const toggleSkyroomPublicChat = (layoutContextDispatch, sidebarContent) => {
  if (isPublicChatOpen(sidebarContent)) {
    layoutContextDispatch({
      type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN,
      value: false,
    });
    layoutContextDispatch({
      type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL,
      value: PANELS.NONE,
    });
    layoutContextDispatch({
      type: ACTIONS.SET_ID_CHAT_OPEN,
      value: '',
    });
    return;
  }

  openSkyroomPublicChat(layoutContextDispatch);
};

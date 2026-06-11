import { ACTIONS, PANELS } from '/imports/ui/components/layout/enums';
import { SKYROOM_COLUMN_ATTR } from './column-layout';
import {
  clearSkyroomNotesLocalDismiss,
  dismissSkyroomNotesLocally,
  getSkyroomNotesGlobalOpen,
  getSkyroomNotesLocallyDismissed,
  getSkyroomNotesOpen,
  setSkyroomNotesGlobalOpen,
} from './notes-panel-state';
import { broadcastSkyroomNotesGlobalOpen } from './notes-panel-sync/useSkyroomNotesPanelSync';

export const isSkyroomColumnLayout = () => {
  const layoutEl = document.getElementById('layout');
  return Boolean(layoutEl?.hasAttribute(SKYROOM_COLUMN_ATTR));
};

/** True during bootstrap before #layout mounts (see main.html data-skyroom). */
export const isSkyroomTheme = () => {
  if (isSkyroomColumnLayout()) return true;
  return document.documentElement.getAttribute('data-skyroom') === 'true';
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

export const isSkyroomNotesOpen = () => getSkyroomNotesOpen();

/** Moderator nav-bar toggle: opens/closes shared notes for every participant. */
export const toggleSkyroomSharedNotesGlobally = () => {
  if (getSkyroomNotesLocallyDismissed()) {
    clearSkyroomNotesLocalDismiss();
    return;
  }

  const next = !getSkyroomNotesGlobalOpen();
  setSkyroomNotesGlobalOpen(next, { clearDismiss: true });
  broadcastSkyroomNotesGlobalOpen(next);
};

/** Per-user close/reopen when the panel is globally shared. */
export const toggleSkyroomSharedNotesLocally = () => {
  if (getSkyroomNotesLocallyDismissed()) {
    clearSkyroomNotesLocalDismiss();
    return;
  }
  if (getSkyroomNotesGlobalOpen()) {
    dismissSkyroomNotesLocally();
  }
};

/** Panel header close button — hides notes only for the current user. */
export const dismissSkyroomSharedNotes = () => {
  dismissSkyroomNotesLocally();
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

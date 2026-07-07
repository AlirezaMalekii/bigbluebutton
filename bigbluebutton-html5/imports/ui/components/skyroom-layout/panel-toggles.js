import { ACTIONS, PANELS } from '/imports/ui/components/layout/enums';
import { isMobile as layoutIsMobile } from '/imports/ui/components/layout/utils';
import { SKYROOM_COLUMN_ATTR } from './column-layout';
import {
  clearSkyroomNotesLocalDismiss,
  dismissSkyroomNotesLocally,
  getSkyroomNotesGlobalOpen,
  getSkyroomNotesLocallyDismissed,
  getSkyroomNotesLocallyOpen,
  getSkyroomNotesOpen,
  setSkyroomNotesGlobalOpen,
  setSkyroomNotesLocallyOpen,
} from './notes-panel-state';
import { broadcastSkyroomNotesGlobalOpen } from './notes-panel-sync/useSkyroomNotesPanelSync';
import { setSkyroomMobileActiveBox } from './mobile-bottom-state';
import { dispatchSkyroomLayoutResize, dispatchSkyroomLayoutResizeNextFrame } from './layout-resize';
import {
  closeGuestWaitingModal,
  openGuestWaitingModal,
  toggleGuestWaitingModal,
} from './guest-waiting-modal/state';

/** Phone breakpoint — matches layout/utils.js isMobile (clientWidth <= 599). */
export const isSkyroomMobileViewport = () => typeof window !== 'undefined'
  && layoutIsMobile();

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
  dispatchSkyroomLayoutResize();
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

/* ---------------------------------------------------------------------------
   Mobile bottom zone — exactly one box at a time {webcams|chat|users|notes}.
   Used by the bottom tab bar and by the navbar toggles when on a phone.
   --------------------------------------------------------------------------- */
const closeSkyroomUsers = (dispatch) => {
  dispatch({ type: ACTIONS.SET_SIDEBAR_NAVIGATION_IS_OPEN, value: false });
  dispatch({ type: ACTIONS.SET_SIDEBAR_NAVIGATION_PANEL, value: PANELS.NONE });
};

const closeSkyroomChat = (dispatch) => {
  dispatch({ type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN, value: false });
  dispatch({ type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL, value: PANELS.NONE });
  dispatch({ type: ACTIONS.SET_ID_CHAT_OPEN, value: '' });
};

const closeSkyroomNotes = () => {
  if (getSkyroomNotesGlobalOpen()) {
    if (!getSkyroomNotesLocallyDismissed()) dismissSkyroomNotesLocally();
  } else {
    setSkyroomNotesLocallyOpen(false);
  }
};

const openSkyroomNotes = () => {
  if (getSkyroomNotesGlobalOpen()) {
    if (getSkyroomNotesLocallyDismissed()) clearSkyroomNotesLocalDismiss();
  } else {
    setSkyroomNotesLocallyOpen(true);
  }
};

/** Breakout shares the content sidebar with chat; open it as the BREAKOUT content panel. */
const openSkyroomBreakoutContent = (dispatch) => {
  dispatch({ type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN, value: true });
  dispatch({ type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL, value: PANELS.BREAKOUT });
};

/** Guest waiting room shares the content sidebar with chat/breakout. */
const openSkyroomWaitingUsersContent = (dispatch) => {
  dispatch({ type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN, value: true });
  dispatch({ type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL, value: PANELS.WAITING_USERS });
};

const isSkyroomContentSidebarBox = (box) => box === 'chat' || box === 'breakout' || box === 'waiting';

/** Show one box in the mobile bottom zone; `null` closes everything. */
export const openSkyroomMobileBox = (layoutContextDispatch, box) => {
  // Explicit single source of truth — set first so the resolver/tab bar reflect the
  // choice immediately, before the per-panel state settles.
  setSkyroomMobileActiveBox(box);

  if (box !== 'users') closeSkyroomUsers(layoutContextDispatch);
  // chat, breakout, and waiting-users share the content sidebar.
  if (!isSkyroomContentSidebarBox(box)) closeSkyroomChat(layoutContextDispatch);
  if (box !== 'notes') closeSkyroomNotes();

  if (box === 'users') openSkyroomUserList(layoutContextDispatch);
  else if (box === 'chat') openSkyroomPublicChat(layoutContextDispatch);
  else if (box === 'breakout') openSkyroomBreakoutContent(layoutContextDispatch);
  else if (box === 'waiting') openSkyroomWaitingUsersContent(layoutContextDispatch);
  else if (box === 'notes') openSkyroomNotes();

  // The layout engine gates each panel's OUTPUT display on the BBB sidebar isOpen
  // flags, which update asynchronously. One coalesced recompute on the next frame
  // makes the first tab tap reliably reveal the new box without a resize storm.
  dispatchSkyroomLayoutResizeNextFrame();
};

/**
 * Open a specific PRIVATE chat in the mobile bottom zone.
 *
 * Unlike `openSkyroomMobileBox(_, 'chat')` — which always targets the public group chat —
 * this keeps the caller's `chatId`. Pass '' to let `ChatContainer` resolve a freshly created
 * chat through `pendingChat` and set `idChatOpen` itself. Switches the bottom zone to the chat
 * box and closes the other boxes (mobile shows exactly one box at a time), which is why simply
 * dispatching the CHAT panel from the user menu was not enough to leave the users tab.
 */
export const openSkyroomPrivateChat = (layoutContextDispatch, chatId = '') => {
  setSkyroomMobileActiveBox('chat');
  closeSkyroomUsers(layoutContextDispatch);
  closeSkyroomNotes();

  layoutContextDispatch({ type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN, value: true });
  layoutContextDispatch({ type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL, value: PANELS.CHAT });
  layoutContextDispatch({ type: ACTIONS.SET_ID_CHAT_OPEN, value: chatId });

  dispatchSkyroomLayoutResizeNextFrame();
};

/** Show the breakout management/join panel in the mobile bottom zone (moderator or invitee). */
export const openSkyroomBreakout = (layoutContextDispatch) => {
  openSkyroomMobileBox(layoutContextDispatch, 'breakout');
};

/** Open breakout panel on desktop content sidebar or mobile bottom zone. */
export const openSkyroomBreakoutPanel = (layoutContextDispatch) => {
  if (isSkyroomMobileViewport()) {
    openSkyroomBreakout(layoutContextDispatch);
    return;
  }
  layoutContextDispatch({ type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN, value: true });
  layoutContextDispatch({ type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL, value: PANELS.BREAKOUT });
  dispatchSkyroomLayoutResize();
};

export const isSkyroomBreakoutOpen = (sidebarContent) => (
  sidebarContent.isOpen && sidebarContent.sidebarContentPanel === PANELS.BREAKOUT
);

/** Toggle breakout management panel (Skyroom desktop + mobile). */
export const toggleSkyroomBreakout = (layoutContextDispatch, sidebarContent) => {
  const isOpen = isSkyroomBreakoutOpen(sidebarContent);
  if (isSkyroomMobileViewport()) {
    openSkyroomMobileBox(layoutContextDispatch, isOpen ? null : 'breakout');
    return;
  }
  if (isOpen) {
    layoutContextDispatch({ type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN, value: false });
    layoutContextDispatch({ type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL, value: PANELS.NONE });
    dispatchSkyroomLayoutResize();
    return;
  }
  openSkyroomBreakoutPanel(layoutContextDispatch);
};

/** Show the guest waiting-room approval panel in the mobile bottom zone (moderator). */
export const openSkyroomWaitingUsers = (layoutContextDispatch) => {
  openSkyroomMobileBox(layoutContextDispatch, 'waiting');
};

/** Open guest waiting-room panel on desktop (centered modal). */
// eslint-disable-next-line no-unused-vars
export const openSkyroomWaitingUsersDesktop = (layoutContextDispatch) => {
  openGuestWaitingModal();
};

/** Toggle guest waiting modal on desktop. */
export const toggleSkyroomWaitingUsersDesktop = () => {
  toggleGuestWaitingModal();
};

export { closeGuestWaitingModal, openGuestWaitingModal };

export const toggleSkyroomUserList = (layoutContextDispatch, sidebarNavigation) => {
  if (isSkyroomMobileViewport()) {
    openSkyroomMobileBox(layoutContextDispatch, sidebarNavigation.isOpen ? null : 'users');
    return;
  }
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

/** Viewer nav-bar toggle — local open/close; follows moderator global state when shared. */
export const toggleSkyroomSharedNotesLocally = () => {
  if (getSkyroomNotesGlobalOpen()) {
    if (getSkyroomNotesLocallyDismissed()) {
      clearSkyroomNotesLocalDismiss();
    } else {
      dismissSkyroomNotesLocally();
    }
    return;
  }

  setSkyroomNotesLocallyOpen(!getSkyroomNotesLocallyOpen());
};

/** Panel header close button — hides notes only for the current user. */
export const dismissSkyroomSharedNotes = () => {
  dismissSkyroomNotesLocally();
};

export const toggleSkyroomPublicChat = (layoutContextDispatch, sidebarContent) => {
  if (isSkyroomMobileViewport()) {
    openSkyroomMobileBox(layoutContextDispatch, isPublicChatOpen(sidebarContent) ? null : 'chat');
    return;
  }
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

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
  cleanupWebcamMenuOverlayArtifacts,
  syncWebcamFullscreenAttribute,
} from './webcam-fullscreen/webcam-fullscreen';

const getMobileCameraDockWrappers = () => {
  if (typeof document === 'undefined') return [];
  return Array.from(document.querySelectorAll('.react-draggable')).filter((el) => (
    el instanceof HTMLElement && el.querySelector('#cameraDock')
  ));
};

/**
 * Keep the mobile camera dock interactive only while it owns a zone.
 * Leaving the webcams tab can race the layout engine and leave a fixed live
 * video layer eating every tap (UI feels fully frozen).
 *
 * @param {'webcams'|null|string|boolean} boxOrVisible
 *   - 'webcams' / true → dock may receive taps
 *   - false → neither zone; force dock fully inert
 *   - other box key → clear bottom-webcams; inert only if top-zone cams are off
 */
export const syncSkyroomMobileWebcamDockVisibility = (boxOrVisible) => {
  const layoutEl = typeof document !== 'undefined'
    ? document.getElementById('layout')
    : null;
  if (!layoutEl?.hasAttribute('data-skyroom-mobile')) return;

  const docks = getMobileCameraDockWrappers();
  const setDockInert = (inert) => {
    docks.forEach((el) => {
      if (inert) {
        el.style.setProperty('pointer-events', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
      } else {
        el.style.removeProperty('pointer-events');
        el.style.removeProperty('visibility');
      }
    });
  };

  if (boxOrVisible === 'webcams' || boxOrVisible === true) {
    setDockInert(false);
    return;
  }

  if (boxOrVisible === false) {
    layoutEl.removeAttribute('data-skyroom-mobile-bottom-webcams');
    layoutEl.removeAttribute('data-skyroom-mobile-top-webcams');
    setDockInert(true);
    return;
  }

  // Tab switch away from webcams while a stage is shared: drop bottom ownership.
  // When nothing is shared, cams stay in the top zone under chat/users — keep them.
  layoutEl.removeAttribute('data-skyroom-mobile-bottom-webcams');
  if (!layoutEl.hasAttribute('data-skyroom-mobile-top-webcams')) {
    setDockInert(true);
  }
};

/** Phone breakpoint — matches layout/utils.js isMobile (clientWidth <= 599). */
export const isSkyroomMobileViewport = () => typeof window !== 'undefined'
  && layoutIsMobile();

export const isSkyroomColumnLayout = () => {
  const layoutEl = document.getElementById('layout');
  return Boolean(layoutEl?.hasAttribute(SKYROOM_COLUMN_ATTR));
};

/** Scaled TLDraw bottom toolbar height reserved inside the whiteboard on phone. */
export const getSkyroomMobileWbToolbarReserve = () => {
  const layoutEl = document.getElementById('layout');
  if (!layoutEl) return 32;
  const styles = getComputedStyle(layoutEl);
  const scale = parseFloat(styles.getPropertyValue('--skyroom-wb-scale')) || 1;
  const gap = parseFloat(styles.getPropertyValue('--skyroom-wb-toolbar-gap')) || 1;
  // Compact 24px tools + padding + gap above slide-nav.
  return Math.ceil(30 * scale) + Math.max(0, Math.round(gap));
};

/** Top floating chrome (undo/redo + options) over the canvas on phone. */
export const getSkyroomMobileWbTopChromeReserve = () => {
  const layoutEl = document.getElementById('layout');
  if (!layoutEl) return 32;
  const styles = getComputedStyle(layoutEl);
  const btn = parseFloat(styles.getPropertyValue('--skyroom-wb-btn-size')) || 24;
  // Chip height + top offset + breathing room under the chips.
  return Math.ceil(btn + 10);
};

/**
 * Height used for camera fit on Skyroom phone — canvas minus slide-nav and the
 * floating top/bottom chrome so the whole slide stays visible.
 */
export const getSkyroomMobileCameraFitHeight = (boundsHeight, slideToolbarH = 0) => {
  const top = getSkyroomMobileWbTopChromeReserve();
  const bottom = getSkyroomMobileWbToolbarReserve();
  return Math.max(80, (boundsHeight || 0) - (slideToolbarH || 0) - top - bottom);
};

/**
 * After equal letterbox-centering in the live canvas, shift camera.y so the
 * slide sits in the safe band between top chrome and the pen bar.
 * (More negative y moves content down in tldraw page-space.)
 */
export const adjustSkyroomMobileCameraYOffset = (yOffset, zoom) => {
  if (!(isSkyroomColumnLayout() && isSkyroomMobileViewport())) return yOffset;
  if (!(Number.isFinite(zoom) && zoom > 0) || !Number.isFinite(yOffset)) return yOffset;
  const top = getSkyroomMobileWbTopChromeReserve();
  const bottom = getSkyroomMobileWbToolbarReserve();
  return yOffset - (top - bottom) / (2 * zoom);
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
  // Set chat id first so ChatContainer never paints a stuck <ChatLoading>
  // between panel-open and id assignment (common on slow mobile tab switches).
  layoutContextDispatch({
    type: ACTIONS.SET_ID_CHAT_OPEN,
    value: getPublicChatId(),
  });
  layoutContextDispatch({
    type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL,
    value: PANELS.CHAT,
  });
  layoutContextDispatch({
    type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN,
    value: true,
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

  // Hide the fixed camera dock synchronously when leaving webcams so it cannot
  // keep intercepting taps while the coalesced layout pass is pending.
  syncSkyroomMobileWebcamDockVisibility(box);
  // MUI menus / webcam-FS leftovers can leave aria-hidden/inert on #app.
  if (box !== 'webcams') {
    syncWebcamFullscreenAttribute();
  }
  cleanupWebcamMenuOverlayArtifacts();

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

  // Layout's attribute pass can re-enable the dock a frame later — re-assert inert
  // after that pass so chat/users never sit under a live video hit-target.
  if (box !== 'webcams' && typeof window !== 'undefined') {
    window.requestAnimationFrame(() => {
      syncSkyroomMobileWebcamDockVisibility(box);
      cleanupWebcamMenuOverlayArtifacts();
    });
  }
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
    // Set explicit selection first, then open content — same order as tab taps.
    openSkyroomBreakout(layoutContextDispatch);
    // Coalesce once more after React applies panel flags (avoids empty first paint).
    dispatchSkyroomLayoutResizeNextFrame();
    return;
  }
  layoutContextDispatch({ type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN, value: true });
  layoutContextDispatch({ type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL, value: PANELS.BREAKOUT });
  dispatchSkyroomLayoutResize();
};

export const isSkyroomBreakoutOpen = (sidebarContent) => (
  sidebarContent.isOpen && sidebarContent.sidebarContentPanel === PANELS.BREAKOUT
);

/** Close breakout management panel and restore the chat content box (Skyroom). */
export const closeSkyroomBreakoutPanel = (layoutContextDispatch) => {
  if (isSkyroomMobileViewport()) {
    openSkyroomMobileBox(layoutContextDispatch, 'chat');
    return;
  }
  openSkyroomPublicChat(layoutContextDispatch);
  dispatchSkyroomLayoutResize();
};

/** Toggle breakout management panel (Skyroom desktop + mobile). */
export const toggleSkyroomBreakout = (layoutContextDispatch, sidebarContent) => {
  const isOpen = isSkyroomBreakoutOpen(sidebarContent);
  if (isSkyroomMobileViewport()) {
    openSkyroomMobileBox(layoutContextDispatch, isOpen ? 'chat' : 'breakout');
    return;
  }
  if (isOpen) {
    closeSkyroomBreakoutPanel(layoutContextDispatch);
    return;
  }
  openSkyroomBreakoutPanel(layoutContextDispatch);
};

/** Show the guest waiting-room approval panel in the mobile bottom zone (moderator). */
export const openSkyroomWaitingUsers = (layoutContextDispatch) => {
  openSkyroomMobileBox(layoutContextDispatch, 'waiting');
};

/** Open guest waiting-room panel in the content sidebar (desktop Skyroom + stock BBB). */
export const openSkyroomWaitingUsersDesktop = (layoutContextDispatch) => {
  openSkyroomWaitingUsersContent(layoutContextDispatch);
  dispatchSkyroomLayoutResize();
};

export const isSkyroomWaitingUsersOpen = (sidebarContent) => (
  sidebarContent.isOpen && sidebarContent.sidebarContentPanel === PANELS.WAITING_USERS
);

/** Toggle guest waiting panel — BBB sidebar on desktop, bottom zone on mobile. */
export const toggleSkyroomWaitingUsers = (layoutContextDispatch, sidebarContent) => {
  const isOpen = isSkyroomWaitingUsersOpen(sidebarContent);
  if (isSkyroomMobileViewport()) {
    openSkyroomMobileBox(layoutContextDispatch, isOpen ? null : 'waiting');
    return;
  }
  if (isOpen) {
    layoutContextDispatch({ type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN, value: false });
    layoutContextDispatch({ type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL, value: PANELS.NONE });
    dispatchSkyroomLayoutResize();
    return;
  }
  openSkyroomWaitingUsersDesktop(layoutContextDispatch);
};

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

import { makeVar } from '@apollo/client';
import { Root } from 'react-dom/client';
import logger from '/imports/startup/client/logger';
import browserInfo from '/imports/utils/browserInfo';
import {
  sfuScreenShareBridge,
} from '/imports/api/screenshare/client/bridge';
import {
  OverlayMode,
  OverlayOpenOptions,
  OverlayVisibility,
  OVERLAY_COMPACT_HEIGHT,
  OVERLAY_COMPACT_WIDTH,
  OVERLAY_COLLAPSED_HEIGHT,
  OVERLAY_DEFAULT_HEIGHT,
  OVERLAY_DEFAULT_WIDTH,
  OVERLAY_POPUP_NAME,
} from './types';
import copyStylesToWindow from './copy-styles';
import {
  getOverlayCornerPosition,
  resolveSharedScreenPlacement,
} from './placement';

export const overlayVisibilityVar = makeVar<OverlayVisibility>('closed');
export const overlayModeVar = makeVar<OverlayMode>(null);

let externalWindow: Window | null = null;
let reactRoot: Root | null = null;
let renderOverlayRoot: ((targetWindow: Window, rootEl: HTMLElement, options: OverlayOpenOptions) => Root) | null = null;
let lastOpenOptions: OverlayOpenOptions | null = null;

const OVERLAY_POSITION_STORAGE_KEY = 'bbb-screen-share-chat-overlay-position';

const setVisibility = (visibility: OverlayVisibility) => {
  overlayVisibilityVar(visibility);
};

const setMode = (mode: OverlayMode) => {
  overlayModeVar(mode);
};

export const isDocumentPiPSupported = (): boolean => {
  return 'documentPictureInPicture' in window
    && typeof (window as Window & {
      documentPictureInPicture?: { requestWindow: (options?: object) => Promise<Window> },
    }).documentPictureInPicture?.requestWindow === 'function';
};

export const getExternalOverlayWindow = (): Window | null => externalWindow;

export const registerOverlayRenderer = (
  renderer: (targetWindow: Window, rootEl: HTMLElement, options: OverlayOpenOptions) => Root,
): void => {
  renderOverlayRoot = renderer;
};

export const getOverlayVisibility = (): OverlayVisibility => overlayVisibilityVar();

export const isOverlayOpen = (): boolean => {
  const visibility = overlayVisibilityVar();
  return visibility === 'open' || visibility === 'compact' || visibility === 'hidden';
};

const getCaptureStreamForPlacement = (): MediaStream | null => {
  const fromSfu = sfuScreenShareBridge?.gdmStream;
  if (fromSfu) return fromSfu;

  // LiveKit gdmStream is private — use local/preview media element when present
  const mediaEl = document.getElementById('screenshareVideo') as HTMLVideoElement | null;
  const src = mediaEl?.srcObject;
  return src instanceof MediaStream ? src : null;
};

const applyWindowChrome = (targetWindow: Window): void => {
  try {
    const { document: doc } = targetWindow;
    doc.documentElement.style.background = '#0b1220';
    doc.body.style.background = '#0b1220';
    doc.body.style.margin = '0';
    doc.body.style.overflow = 'hidden';
  } catch {
    // ignore
  }
};

const mountOverlayContent = (targetWindow: Window, options: OverlayOpenOptions): void => {
  if (!renderOverlayRoot) {
    throw new Error('Screen share chat overlay renderer is not registered');
  }

  copyStylesToWindow(targetWindow);
  applyWindowChrome(targetWindow);

  const rootEl = targetWindow.document.createElement('div');
  rootEl.id = 'screen-share-chat-overlay-root';
  targetWindow.document.body.appendChild(rootEl);

  reactRoot = renderOverlayRoot(targetWindow, rootEl, options);
};

const markOverlayClosedFromExternalWindow = (): void => {
  reactRoot = null;
  externalWindow = null;
  setMode(null);
  setVisibility('closed');
  window.dispatchEvent(new CustomEvent('bbb-screen-share-chat-overlay-closed'));
};

const resizeOverlayWindow = (width: number, height: number): void => {
  if (!externalWindow || externalWindow.closed) return;

  try {
    externalWindow.resizeTo(width, height);
  } catch (error) {
    logger.debug({
      logCode: 'screen_share_chat_overlay_resize_failed',
      extraInfo: {
        errorName: (error as Error).name,
        errorMessage: (error as Error).message,
      },
    }, 'Could not resize screen share chat overlay window');
  }
};

const moveOverlayWindow = (left: number, top: number): void => {
  if (!externalWindow || externalWindow.closed) return;
  try {
    externalWindow.moveTo(Math.round(left), Math.round(top));
  } catch (error) {
    logger.debug({
      logCode: 'screen_share_chat_overlay_move_failed',
      extraInfo: {
        errorName: (error as Error).name,
        errorMessage: (error as Error).message,
      },
    }, 'Could not move screen share chat overlay window');
  }
};

const getStoredOverlayPosition = (): { left: number; top: number } | null => {
  try {
    const raw = window.localStorage.getItem(OVERLAY_POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { left?: unknown; top?: unknown };
    if (typeof parsed.left === 'number' && typeof parsed.top === 'number') {
      return { left: parsed.left, top: parsed.top };
    }
  } catch {
    // ignore corrupt storage
  }
  return null;
};

export const rememberOverlayPosition = (): void => {
  if (!externalWindow || externalWindow.closed) return;
  try {
    window.localStorage.setItem(
      OVERLAY_POSITION_STORAGE_KEY,
      JSON.stringify({
        left: externalWindow.screenX,
        top: externalWindow.screenY,
      }),
    );
  } catch {
    // localStorage can be unavailable in restrictive browser modes
  }
};

const placeOnSharedScreen = async (isRTL: boolean): Promise<void> => {
  const storedPosition = getStoredOverlayPosition();
  if (storedPosition) {
    moveOverlayWindow(storedPosition.left, storedPosition.top);
    return;
  }

  const stream = getCaptureStreamForPlacement();
  const placement = await resolveSharedScreenPlacement(stream);
  if (!placement) return;

  const { left, top } = getOverlayCornerPosition(
    placement,
    OVERLAY_DEFAULT_WIDTH,
    OVERLAY_DEFAULT_HEIGHT,
    isRTL,
  );
  moveOverlayWindow(left, top);
};

const cleanupOverlay = ({ notifyParent = false }: { notifyParent?: boolean } = {}): void => {
  if (reactRoot) {
    try {
      reactRoot.unmount();
    } catch (error) {
      logger.debug({
        logCode: 'screen_share_chat_overlay_unmount_failed',
        extraInfo: {
          errorName: (error as Error).name,
          errorMessage: (error as Error).message,
        },
      }, 'Failed to unmount screen share chat overlay');
    }
    reactRoot = null;
  }

  if (externalWindow && !externalWindow.closed) {
    try {
      externalWindow.close();
    } catch {
      // Window may already be closing
    }
  }

  externalWindow = null;
  setMode(null);
  setVisibility('closed');

  if (notifyParent) {
    window.dispatchEvent(new CustomEvent('bbb-screen-share-chat-overlay-closed'));
  }
};

const bindWindowLifecycle = (targetWindow: Window): void => {
  targetWindow.addEventListener('pagehide', () => {
    if (externalWindow === targetWindow) {
      markOverlayClosedFromExternalWindow();
    }
  });
};

const emitVisibility = (visibility: OverlayVisibility): void => {
  window.dispatchEvent(new CustomEvent('bbb-screen-share-chat-overlay-visibility', {
    detail: { visibility },
  }));
};

const openDocumentPiP = async (): Promise<Window> => {
  const pipApi = (window as unknown as {
    documentPictureInPicture: {
      requestWindow: (opts?: {
        width?: number;
        height?: number;
        preferInitialWindowPlacement?: boolean;
      }) => Promise<Window>,
    },
  }).documentPictureInPicture;

  return pipApi.requestWindow({
    width: OVERLAY_DEFAULT_WIDTH,
    height: OVERLAY_DEFAULT_HEIGHT,
    preferInitialWindowPlacement: true,
  });
};

const openPopupWindow = async (options: OverlayOpenOptions): Promise<Window | null> => {
  const stream = getCaptureStreamForPlacement();
  const placement = await resolveSharedScreenPlacement(stream);
  const storedPosition = getStoredOverlayPosition();

  const pos = storedPosition || (placement
    ? getOverlayCornerPosition(
      placement,
      OVERLAY_DEFAULT_WIDTH,
      OVERLAY_DEFAULT_HEIGHT,
      options.isRTL,
    )
    : {
      left: Math.max(0, window.screenX + window.outerWidth - OVERLAY_DEFAULT_WIDTH - 24),
      top: Math.max(0, window.screenY + 80),
    });

  const features = [
    `width=${OVERLAY_DEFAULT_WIDTH}`,
    `height=${OVERLAY_DEFAULT_HEIGHT}`,
    `left=${Math.round(pos.left)}`,
    `top=${Math.round(pos.top)}`,
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'resizable=yes',
    'scrollbars=no',
  ].join(',');

  const popup = window.open(
    'about:blank',
    OVERLAY_POPUP_NAME,
    features,
  );

  if (!popup) return null;

  try {
    popup.document.title = options.messages['app.screenShareChatOverlay.title']
      || 'Meeting Chat';
  } catch {
    // Cross-origin guard — should not happen for about:blank
  }

  return popup;
};

export const focusOverlay = (): void => {
  if (externalWindow && !externalWindow.closed) {
    externalWindow.focus();
  }
};

export const openOverlay = async (options: OverlayOpenOptions): Promise<boolean> => {
  if (isOverlayOpen()) {
    if (overlayVisibilityVar() === 'hidden') {
      return showOverlay();
    }
    focusOverlay();
    return true;
  }

  lastOpenOptions = options;

  try {
    let targetWindow: Window | null = null;
    let mode: OverlayMode = null;

    if (isDocumentPiPSupported()) {
      targetWindow = await openDocumentPiP();
      mode = 'pip';
    } else {
      targetWindow = await openPopupWindow(options);
      mode = 'popup';
    }

    if (!targetWindow) {
      logger.warn({
        logCode: 'screen_share_chat_overlay_open_blocked',
      }, 'Screen share chat overlay could not be opened (popup blocked or PiP denied)');
      return false;
    }

    externalWindow = targetWindow;
    setMode(mode);
    setVisibility('open');
    bindWindowLifecycle(targetWindow);
    mountOverlayContent(targetWindow, options);

    // Document PiP ignores left/top on create — reposition after mount
    await placeOnSharedScreen(options.isRTL);

    logger.info({
      logCode: 'screen_share_chat_overlay_opened',
      extraInfo: { mode, browser: browserInfo.browserName },
    }, `Screen share chat overlay opened (${mode})`);

    return true;
  } catch (error) {
    logger.error({
      logCode: 'screen_share_chat_overlay_open_failed',
      extraInfo: {
        errorName: (error as Error).name,
        errorMessage: (error as Error).message,
      },
    }, 'Failed to open screen share chat overlay');

    cleanupOverlay();
    return false;
  }
};

export const closeOverlay = (): void => {
  cleanupOverlay();
};

export const hideOverlay = (): void => {
  if (!isOverlayOpen() || overlayVisibilityVar() === 'hidden') return;

  setVisibility('hidden');
  resizeOverlayWindow(OVERLAY_DEFAULT_WIDTH, OVERLAY_COLLAPSED_HEIGHT);
  emitVisibility('hidden');
};

export const compactOverlay = (): void => {
  if (!isOverlayOpen()) return;

  setVisibility('compact');
  resizeOverlayWindow(OVERLAY_COMPACT_WIDTH, OVERLAY_COMPACT_HEIGHT);
  emitVisibility('compact');
};

export const expandOverlay = (): void => {
  if (!externalWindow || externalWindow.closed) {
    if (lastOpenOptions) {
      openOverlay(lastOpenOptions);
    }
    return;
  }

  setVisibility('open');
  resizeOverlayWindow(OVERLAY_DEFAULT_WIDTH, OVERLAY_DEFAULT_HEIGHT);
  emitVisibility('open');
  externalWindow.focus();
};

export const toggleCompactOverlay = (): void => {
  if (overlayVisibilityVar() === 'compact') {
    expandOverlay();
    return;
  }
  compactOverlay();
};

export const showOverlay = (): boolean => {
  if (!externalWindow || externalWindow.closed) {
    if (lastOpenOptions) {
      openOverlay(lastOpenOptions);
      return true;
    }
    return false;
  }

  setVisibility('open');
  resizeOverlayWindow(OVERLAY_DEFAULT_WIDTH, OVERLAY_DEFAULT_HEIGHT);
  emitVisibility('open');
  externalWindow.focus();
  return true;
};

export const reopenOverlay = async (options: OverlayOpenOptions): Promise<boolean> => {
  closeOverlay();
  return openOverlay(options);
};

export const closeOverlayOnScreenshareEnd = (): void => {
  if (isOverlayOpen()) {
    closeOverlay();
  }
};

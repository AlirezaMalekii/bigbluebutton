import { makeVar } from '@apollo/client';
import { Root } from 'react-dom/client';
import logger from '/imports/startup/client/logger';
import browserInfo from '/imports/utils/browserInfo';
import {
  OverlayMode,
  OverlayOpenOptions,
  OverlayVisibility,
  OVERLAY_COLLAPSED_HEIGHT,
  OVERLAY_DEFAULT_HEIGHT,
  OVERLAY_DEFAULT_WIDTH,
  OVERLAY_POPUP_NAME,
} from './types';
import copyStylesToWindow from './copy-styles';

export const overlayVisibilityVar = makeVar<OverlayVisibility>('closed');
export const overlayModeVar = makeVar<OverlayMode>(null);

let externalWindow: Window | null = null;
let reactRoot: Root | null = null;
let renderOverlayRoot: ((targetWindow: Window, rootEl: HTMLElement, options: OverlayOpenOptions) => Root) | null = null;
let lastOpenOptions: OverlayOpenOptions | null = null;

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

export const isOverlaySupported = (): boolean => isDocumentPiPSupported() || true;

export const getExternalOverlayWindow = (): Window | null => externalWindow;

export const registerOverlayRenderer = (
  renderer: (targetWindow: Window, rootEl: HTMLElement, options: OverlayOpenOptions) => Root,
): void => {
  renderOverlayRoot = renderer;
};

export const useOverlayVisibility = () => overlayVisibilityVar();

export const getOverlayVisibility = (): OverlayVisibility => overlayVisibilityVar();

export const isOverlayOpen = (): boolean => {
  const visibility = overlayVisibilityVar();
  return visibility === 'open' || visibility === 'hidden';
};

const mountOverlayContent = (targetWindow: Window, options: OverlayOpenOptions): void => {
  if (!renderOverlayRoot) {
    throw new Error('Screen share chat overlay renderer is not registered');
  }

  copyStylesToWindow(targetWindow);

  const rootEl = targetWindow.document.createElement('div');
  rootEl.id = 'screen-share-chat-overlay-root';
  targetWindow.document.body.appendChild(rootEl);

  reactRoot = renderOverlayRoot(targetWindow, rootEl, options);
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

const bindWindowLifecycle = (targetWindow: Window): void => {
  targetWindow.addEventListener('pagehide', () => {
    if (externalWindow === targetWindow) {
      cleanupOverlay({ notifyParent: true });
    }
  });
};

const openDocumentPiP = async (): Promise<Window> => {
  const pipApi = (window as unknown as {
    documentPictureInPicture: {
      requestWindow: (opts?: { width?: number; height?: number }) => Promise<Window>,
    },
  }).documentPictureInPicture;

  const pipWindow = await pipApi.requestWindow({
    width: OVERLAY_DEFAULT_WIDTH,
    height: OVERLAY_DEFAULT_HEIGHT,
  });

  return pipWindow;
};

const openPopupWindow = (options: OverlayOpenOptions): Window | null => {
  const features = [
    `width=${OVERLAY_DEFAULT_WIDTH}`,
    `height=${OVERLAY_DEFAULT_HEIGHT}`,
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'resizable=yes',
    'scrollbars=no',
  ].join(',');

  const left = Math.max(0, window.screenX + window.outerWidth - OVERLAY_DEFAULT_WIDTH - 24);
  const top = Math.max(0, window.screenY + 80);

  const popup = window.open(
    'about:blank',
    OVERLAY_POPUP_NAME,
    `${features},left=${left},top=${top}`,
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
      targetWindow = openPopupWindow(options);
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
  window.dispatchEvent(new CustomEvent('bbb-screen-share-chat-overlay-visibility', {
    detail: { visibility: 'hidden' },
  }));
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
  window.dispatchEvent(new CustomEvent('bbb-screen-share-chat-overlay-visibility', {
    detail: { visibility: 'open' },
  }));
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

import { ACTIONS } from '/imports/ui/components/layout/enums';
import { dispatchSkyroomLayoutResize } from '/imports/ui/components/skyroom-layout/layout-resize';

const LAYOUT_FS_ATTR = 'data-skyroom-webcam-fullscreen';
const HTML_FS_CLASS = 'skyroom-webcam-fs';

/** Apply/clear the layout attribute immediately (do not wait for useEffect). */
export const syncWebcamFullscreenAttribute = (cameraId?: string) => {
  const layoutEl = document.getElementById('layout');
  const root = document.documentElement;

  if (cameraId) {
    layoutEl?.setAttribute(LAYOUT_FS_ATTR, cameraId);
    root.classList.add(HTML_FS_CLASS);
  } else {
    layoutEl?.removeAttribute(LAYOUT_FS_ATTR);
    root.classList.remove(HTML_FS_CLASS);
  }
};

/**
 * MUI Menu can leave aria-hidden / inert on the app after a menu→fullscreen race
 * (chrome is hidden while the modal is still closing). That blocks all clicks
 * even after webcam fullscreen exits. Clear those markers safely.
 */
export const cleanupWebcamMenuOverlayArtifacts = () => {
  const restore = (el: Element | null) => {
    if (!(el instanceof HTMLElement)) return;
    if (el.getAttribute('aria-hidden') === 'true') {
      el.removeAttribute('aria-hidden');
    }
    if (el.getAttribute('data-aria-hidden') === 'true') {
      el.removeAttribute('data-aria-hidden');
    }
    if (el.hasAttribute('inert')) {
      el.removeAttribute('inert');
    }
  };

  restore(document.getElementById('app'));
  restore(document.getElementById('layout'));
  restore(document.getElementById('container'));
  restore(document.querySelector('#app-container'));
  restore(document.querySelector('[data-reactroot]'));

  // Any closed/hidden MUI modal (webcam menu, chat overflow, etc.) must not
  // keep capturing taps after a tab switch on mobile.
  document.querySelectorAll('.MuiModal-root').forEach((modal) => {
    if (!(modal instanceof HTMLElement)) return;
    const hidden = modal.getAttribute('aria-hidden') === 'true'
      || modal.hasAttribute('aria-hidden');
    if (hidden) {
      modal.style.setProperty('pointer-events', 'none');
    }
  });

  if (document.body.style.paddingRight && !document.querySelector('.MuiModal-root[aria-hidden="false"]')) {
    document.body.style.paddingRight = '';
  }
};

const refreshLayoutAfterFullscreenChange = () => {
  dispatchSkyroomLayoutResize();
  window.requestAnimationFrame(() => {
    dispatchSkyroomLayoutResize();
    cleanupWebcamMenuOverlayArtifacts();
  });
};

export const exitWebcamFullscreen = (layoutContextDispatch: (...args: unknown[]) => void) => {
  // Clear overlay markers synchronously so full-viewport CSS cannot linger
  // after React clears fullscreen state (blocks all taps on mobile/desktop).
  syncWebcamFullscreenAttribute();
  cleanupWebcamMenuOverlayArtifacts();
  layoutContextDispatch({
    type: ACTIONS.SET_FULLSCREEN_ELEMENT,
    value: {
      element: '',
      group: '',
    },
  });
  refreshLayoutAfterFullscreenChange();
};

export const toggleWebcamFullscreen = ({
  cameraId,
  isFullscreenContext,
  layoutContextDispatch,
}: {
  cameraId: string;
  isFullscreenContext: boolean;
  layoutContextDispatch: (...args: unknown[]) => void;
}) => {
  if (isFullscreenContext) {
    exitWebcamFullscreen(layoutContextDispatch);
    return;
  }

  cleanupWebcamMenuOverlayArtifacts();
  syncWebcamFullscreenAttribute(cameraId);
  layoutContextDispatch({
    type: ACTIONS.SET_FULLSCREEN_ELEMENT,
    value: {
      element: cameraId,
      group: 'webcams',
    },
  });
  refreshLayoutAfterFullscreenChange();
};

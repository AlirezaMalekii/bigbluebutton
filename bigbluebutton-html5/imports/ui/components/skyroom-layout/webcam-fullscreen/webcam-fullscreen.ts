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

const refreshLayoutAfterFullscreenChange = () => {
  dispatchSkyroomLayoutResize();
  // Second pass after paint — mobile dock transforms/overflow need a reflow
  // or leftover hit-targets can keep blocking taps after exit.
  window.requestAnimationFrame(() => {
    dispatchSkyroomLayoutResize();
  });
};

export const exitWebcamFullscreen = (layoutContextDispatch: (...args: unknown[]) => void) => {
  // Clear overlay markers synchronously so full-viewport CSS cannot linger
  // after React clears fullscreen state (blocks all taps on mobile/desktop).
  syncWebcamFullscreenAttribute();
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

import FullscreenService from '/imports/ui/components/common/fullscreen-button/service';
import { ACTIONS } from '/imports/ui/components/layout/enums';
import {
  getSkyroomMobileZoneFullscreen,
  toggleSkyroomMobileZoneFullscreen,
} from '/imports/ui/components/skyroom-layout/mobile-zone-fullscreen-state';
import {
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
} from '/imports/ui/components/skyroom-layout/panel-toggles';
import deviceInfo from '/imports/utils/deviceInfo';

const LAYOUT_FS_ATTR = 'data-skyroom-presentation-fullscreen';

export const isSkyroomMobilePresentation = () => (
  isSkyroomColumnLayout() && isSkyroomMobileViewport()
);

/**
 * Phone/tablet, including iOS/Android "Request Desktop Website".
 * The browser Fullscreen API is unreliable there: a second tap often
 * requests fullscreen again instead of exiting, and the user gets stuck.
 */
export const shouldUseLayoutOnlyPresentationFullscreen = () => {
  if (deviceInfo.isMobile) return true;
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(pointer: coarse)')?.matches);
};

export const syncPresentationFullscreenAttribute = (active = false) => {
  const layoutEl = typeof document !== 'undefined'
    ? document.getElementById('layout')
    : null;
  if (!layoutEl) return;
  if (active) {
    layoutEl.setAttribute(LAYOUT_FS_ATTR, 'true');
  } else {
    layoutEl.removeAttribute(LAYOUT_FS_ATTR);
  }
};

export const isPresentationFullscreenActive = ({
  fullscreenContext,
  currentElement,
  elementId,
}) => {
  if (isSkyroomMobilePresentation()) {
    return getSkyroomMobileZoneFullscreen() === 'top';
  }
  const layoutActive = Boolean(
    fullscreenContext || (currentElement && currentElement === elementId),
  );
  return layoutActive || Boolean(FullscreenService.getFullscreenElement());
};

const exitPresentationFullscreen = (layoutContextDispatch) => {
  if (FullscreenService.getFullscreenElement()) {
    FullscreenService.cancelFullScreen();
  }
  syncPresentationFullscreenAttribute(false);
  layoutContextDispatch({
    type: ACTIONS.SET_FULLSCREEN_ELEMENT,
    value: {
      element: '',
      group: '',
    },
  });
};

export const togglePresentationFullscreen = ({
  fullscreenRef,
  elementId,
  currentElement,
  layoutContextDispatch,
}) => {
  if (isSkyroomMobilePresentation()) {
    toggleSkyroomMobileZoneFullscreen('top');
    return;
  }

  const layoutActive = Boolean(currentElement && currentElement === elementId);
  const browserActive = Boolean(FullscreenService.getFullscreenElement());

  if (layoutActive || browserActive) {
    exitPresentationFullscreen(layoutContextDispatch);
    return;
  }

  // Touch / phone-desktop-mode: layout overlay only. Browser Fullscreen API
  // cannot be trusted to toggle off on these devices.
  if (!shouldUseLayoutOnlyPresentationFullscreen()) {
    FullscreenService.toggleFullScreen(fullscreenRef);
  }

  syncPresentationFullscreenAttribute(true);
  layoutContextDispatch({
    type: ACTIONS.SET_FULLSCREEN_ELEMENT,
    value: {
      element: elementId,
      group: '',
    },
  });
};

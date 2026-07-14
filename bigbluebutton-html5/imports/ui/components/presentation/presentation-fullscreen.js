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

export const isSkyroomMobilePresentation = () => (
  isSkyroomColumnLayout() && isSkyroomMobileViewport()
);

export const isPresentationFullscreenActive = ({
  fullscreenContext,
  currentElement,
  elementId,
}) => {
  if (isSkyroomMobilePresentation()) {
    return getSkyroomMobileZoneFullscreen() === 'top';
  }
  return Boolean(fullscreenContext || (currentElement && currentElement === elementId));
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

  FullscreenService.toggleFullScreen(fullscreenRef);
  const newElement = (elementId === currentElement) ? '' : elementId;

  layoutContextDispatch({
    type: ACTIONS.SET_FULLSCREEN_ELEMENT,
    value: {
      element: newElement,
      group: '',
    },
  });
};

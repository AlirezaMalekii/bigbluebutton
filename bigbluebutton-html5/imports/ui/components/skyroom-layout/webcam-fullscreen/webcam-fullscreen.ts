import { ACTIONS } from '/imports/ui/components/layout/enums';

export const exitWebcamFullscreen = (layoutContextDispatch: (...args: unknown[]) => void) => {
  layoutContextDispatch({
    type: ACTIONS.SET_FULLSCREEN_ELEMENT,
    value: {
      element: '',
      group: '',
    },
  });
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
  layoutContextDispatch({
    type: ACTIONS.SET_FULLSCREEN_ELEMENT,
    value: {
      element: isFullscreenContext ? '' : cameraId,
      group: isFullscreenContext ? '' : 'webcams',
    },
  });
};

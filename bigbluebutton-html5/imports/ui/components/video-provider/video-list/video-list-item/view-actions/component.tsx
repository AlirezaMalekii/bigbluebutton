import React, { MutableRefObject, useEffect } from 'react';
import { ACTIONS } from '/imports/ui/components/layout/enums';
import FullscreenButtonContainer from '/imports/ui/components/common/fullscreen-button/container';
import Styled from './styles';

interface ViewActionsProps {
  name: string;
  cameraId: string;
  videoContainer: MutableRefObject<HTMLDivElement | null>;
  isFullscreenContext: boolean;
  layoutContextDispatch: (...args: unknown[]) => void;
  isStream: boolean;
}

const ViewActions: React.FC<ViewActionsProps> = (props) => {
  const {
    name, cameraId, videoContainer, isFullscreenContext, layoutContextDispatch, isStream,
  } = props;

  const isIphone = !!(navigator.userAgent.match(/iPhone/i));
  const allowFullscreen = window.meetingClientSettings?.public?.app?.allowFullscreen;

  useEffect(() => () => {
    if (isFullscreenContext) {
      layoutContextDispatch({
        type: ACTIONS.SET_FULLSCREEN_ELEMENT,
        value: {
          element: '',
          group: '',
        },
      });
    }
  }, []);

  if (!allowFullscreen || !isStream || isIphone) return null;

  return (
    <Styled.FullscreenWrapper className="skyroom-webcam-fullscreen-btn">
      <FullscreenButtonContainer
        dataTest="webcamsFullscreenButton"
        fullscreenRef={videoContainer?.current}
        elementName={name}
        elementId={cameraId}
        elementGroup="webcams"
        isFullscreen={isFullscreenContext}
        dark
      />
    </Styled.FullscreenWrapper>
  );
};

export default ViewActions;

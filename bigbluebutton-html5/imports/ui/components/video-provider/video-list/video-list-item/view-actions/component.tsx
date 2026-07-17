import React, { MutableRefObject, useEffect } from 'react';
import FullscreenButtonContainer from '/imports/ui/components/common/fullscreen-button/container';
import { exitWebcamFullscreen } from '/imports/ui/components/skyroom-layout/webcam-fullscreen/webcam-fullscreen';
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
      exitWebcamFullscreen(layoutContextDispatch);
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

import React from 'react';
import { defineMessages, useIntl } from 'react-intl';
import Styled from './styles';
import { VideoItem } from '/imports/ui/components/video-provider/types';
import { useIsVideoPinEnabledForCurrentUser } from '/imports/ui/components/video-provider/hooks';
import { VIDEO_TYPES } from '/imports/ui/components/video-provider/enums';

const intlMessages = defineMessages({
  unpinLabel: {
    id: 'app.videoDock.webcamUnpinLabel',
  },
  unpinLabelDisabled: {
    id: 'app.videoDock.webcamUnpinLabelDisabled',
  },
  presenterLabel: {
    id: 'app.videoDock.webcamPresenterLabel',
  },
});

interface PinAreaProps {
  stream: VideoItem;
  amIModerator: boolean;
  setCameraPinned: (userId: string, pinned: boolean) => void;
}

const PinArea: React.FC<PinAreaProps> = (props) => {
  const intl = useIntl();

  const { stream, amIModerator, setCameraPinned } = props;
  const { userId, type } = stream;
  const pinned = type === VIDEO_TYPES.STREAM && stream.user?.pinned;
  const presenter = type === VIDEO_TYPES.STREAM && stream.user?.presenter;
  const videoPinActionAvailable = useIsVideoPinEnabledForCurrentUser(amIModerator);

  if (!pinned && !presenter) return <Styled.PinButtonWrapper />;

  return (
    <Styled.PinButtonWrapper>
      {presenter && (
        <Styled.PresenterButton
          color="primary"
          icon="presentation"
          size="sm"
          onClick={(e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          label={intl.formatMessage(intlMessages.presenterLabel)}
          hideLabel
          data-test="presenterVideoButton"
        />
      )}
      {pinned && (
        <Styled.PinButton
          color="default"
          icon={!pinned ? 'pin-video_on' : 'pin-video_off'}
          size="sm"
          onClick={() => {
            setCameraPinned(userId, false);
          }}
          label={videoPinActionAvailable
            ? intl.formatMessage(intlMessages.unpinLabel)
            : intl.formatMessage(intlMessages.unpinLabelDisabled)}
          hideLabel
          disabled={!videoPinActionAvailable}
          data-test="pinVideoButton"
        />
      )}
    </Styled.PinButtonWrapper>
  );
};

export default PinArea;

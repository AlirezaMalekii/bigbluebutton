import React from 'react';
import PropTypes from 'prop-types';
import { UpdatedDataForUserCameraDomElement } from 'bigbluebutton-html-plugin-sdk/dist/cjs/dom-element-manipulation/user-camera/types';

import Auth from '/imports/ui/services/auth';
import DraggableVideoListItem, { VideoListItem, VideoListItemProps } from './component';
import { VideoItem } from '/imports/ui/components/video-provider/types';
import { VIDEO_TYPES } from '/imports/ui/components/video-provider/enums';
import { UserCameraHelperAreas } from '../../../plugins-engine/extensible-areas/components/user-camera-helper/types';
import { VideoPlaybackState } from '/imports/ui/components/video-provider/video-playback-utils';
import { useVideoListSharedState } from '../shared-state-context';

interface VideoListItemContainerProps {
  numOfStreams: number;
  cameraId: string | null;
  pluginUserCameraHelperPerPosition: UserCameraHelperAreas;
  userCameraDomElementRequested: boolean;
  userId: string;
  name: string;
  focused: boolean;
  isStream: boolean;
  onHandleVideoFocus: ((id: string) => void) | null;
  stream: VideoItem;
  setUserCamerasRequestedFromPlugin: React.Dispatch<React.SetStateAction<UpdatedDataForUserCameraDomElement[]>>;
  onVideoItemUnmount: (stream: string) => void;
  onVideoPlaybackStateChange: (state: VideoPlaybackState) => void;
  onVirtualBgDrop: (type: string, name: string, data: string) => void;
  onVideoItemMount: (ref: HTMLVideoElement) => void;
}

const VideoListItemContainer: React.FC<VideoListItemContainerProps> = (props) => {
  const {
    cameraId,
    focused,
    isStream,
    name,
    numOfStreams,
    onHandleVideoFocus,
    onVideoItemMount,
    onVideoItemUnmount,
    onVideoPlaybackStateChange,
    onVirtualBgDrop,
    setUserCamerasRequestedFromPlugin,
    stream,
    userId,
    pluginUserCameraHelperPerPosition,
    userCameraDomElementRequested,
  } = props;

  const fullscreenElement = useVideoListSharedState((state) => state.fullscreenElement);
  const isFullscreenContext = fullscreenElement === cameraId;
  const layoutContextDispatch = useVideoListSharedState((state) => state.layoutContextDispatch);
  const isRTL = useVideoListSharedState((state) => state.isRTL);
  const settingsSelfViewDisable = useVideoListSharedState(
    (state) => state.settingsSelfViewDisable,
  );
  const currentUser = useVideoListSharedState((state) => (
    stream.type === VIDEO_TYPES.CONNECTING ? state.currentUser : null
  ));
  const amIModerator = useVideoListSharedState((state) => state.amIModerator);
  const disabledCams = useVideoListSharedState((state) => state.disabledCams);
  const talking = useVideoListSharedState((state) => state.talkingUsers[userId]);
  const unmuted = useVideoListSharedState((state) => state.unmutedUsers[userId]);
  const raisedHandPosition = useVideoListSharedState(
    (state) => state.raisedHandPositions[userId] || 0,
  );
  const hideNotifications = useVideoListSharedState((state) => state.hideNotifications);
  const userCameraDropdownItems = useVideoListSharedState(
    (state) => state.userCameraDropdownItems,
  );
  const setCameraPinned = useVideoListSharedState((state) => state.setCameraPinned);
  const voiceUser = stream.type !== VIDEO_TYPES.CONNECTING && stream.voice ? {
    ...stream.voice,
    talking: Boolean(talking),
    muted: !unmuted,
    deafened: Boolean((stream.voice as { deafened?: boolean }).deafened),
  } : {
    muted: true,
    listenOnly: false,
    talking: false,
    joined: false,
    deafened: false,
  };

  const cameraItemProps = {
    isFullscreenContext,
    layoutContextDispatch,
    isRTL,
    amIModerator,
    pluginUserCameraHelperPerPosition,
    userCameraDomElementRequested,
    setUserCamerasRequestedFromPlugin,
    cameraId,
    disabledCams,
    focused,
    isStream,
    name,
    numOfStreams,
    onHandleVideoFocus,
    onVideoItemMount,
    onVideoItemUnmount,
    onVideoPlaybackStateChange,
    settingsSelfViewDisable,
    stream,
    voiceUser,
    currentUser,
    raisedHandPosition,
    userCameraDropdownItems,
    setCameraPinned,
  } as VideoListItemProps;

  // Only the local, active camera can accept a virtual-background file drop.
  // Rendering the upstream drag/file/modal wrapper for every remote tile adds
  // global listeners and modal registrations with no usable functionality.
  if (stream.type === VIDEO_TYPES.STREAM && userId === Auth.userID) {
    return (
      <DraggableVideoListItem
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...cameraItemProps}
        onVirtualBgDrop={onVirtualBgDrop}
        hideNotificationToasts={hideNotifications}
      />
    );
  }

  // eslint-disable-next-line react/jsx-props-no-spreading
  return <VideoListItem {...cameraItemProps} />;
};

export default VideoListItemContainer;

VideoListItemContainer.propTypes = {
  cameraId: PropTypes.string.isRequired,
};

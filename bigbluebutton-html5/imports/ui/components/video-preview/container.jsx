import React from 'react';
import PropTypes from 'prop-types';
import { useMutation } from '@apollo/client';
import Service from './service';
import VideoPreview from '/imports/ui/components/video-preview/component';
import VideoService from '/imports/ui/components/video-provider/service';
import * as ScreenShareService from '/imports/ui/components/screenshare/service';
import logger from '/imports/startup/client/logger';
import { SCREENSHARING_ERRORS } from '/imports/api/screenshare/client/bridge/errors';
import { EXTERNAL_VIDEO_STOP } from '../external-video-player/mutations';
import {
  useSharedDevices, useHasVideoStream, useHasCapReached, useIsUserLocked, useStreams,
  useExitVideo,
  useStopVideo,
} from '/imports/ui/components/video-provider/hooks';
import { useStorageKey } from '../../services/storage/hooks';
import { useIsCustomVirtualBackgroundsEnabled, useIsVirtualBackgroundsEnabled } from '../../services/features';
import { SET_AWAY } from '../user-list/user-list-content/user-participants/user-list-participants/user-actions/mutations';
import useCurrentUser from '../../core/hooks/useCurrentUser';
import { layoutSelectInput } from '../layout/context';
import getFromUserSettings from '/imports/ui/services/users-settings';

const VideoPreviewContainer = (props) => {
  const {
    callbackToClose,
    setIsOpen,
    isVisualEffects,
    forceOpen,
    priority,
    isOpen,
    ...rest
  } = props;
  const cameraAsContentDeviceId = ScreenShareService.useCameraAsContentDeviceIdType();
  const [stopExternalVideoShare] = useMutation(EXTERNAL_VIDEO_STOP);
  const [setAway] = useMutation(SET_AWAY);
  const streams = useStreams();
  const exitVideo = useExitVideo();
  const stopVideo = useStopVideo();
  const sharedDevices = useSharedDevices();
  const hasVideoStream = useHasVideoStream();
  const camCapReached = useHasCapReached();
  const isCamLocked = useIsUserLocked();
  const settingsStorage = window.meetingClientSettings.public.app.userSettingsStorage;
  const webcamDeviceId = useStorageKey('WebcamDeviceId', settingsStorage);
  const isVirtualBackgroundsEnabled = useIsVirtualBackgroundsEnabled();
  const isCustomVirtualBackgroundsEnabled = useIsCustomVirtualBackgroundsEnabled();
  const isCameraAsContentBroadcasting = ScreenShareService.useIsCameraAsContentBroadcasting();
  const { data: currentUser } = useCurrentUser((u) => ({
    away: u.away,
  }));
  const { hideNotificationToasts } = layoutSelectInput((i) => i.notificationsBar);
  const hideNotifications = hideNotificationToasts
    || getFromUserSettings('bbb_hide_notifications', false);
  const stopSharing = (deviceId) => {
    callbackToClose();
    setIsOpen(false);
    if (deviceId) {
      const streamId = VideoService.getMyStreamId(deviceId, streams);
      if (streamId) stopVideo(streamId);
    } else {
      exitVideo();
    }
  };

  const startSharingCameraAsContent = (deviceId) => {
    callbackToClose();
    setIsOpen(false);
    const handleFailure = (error) => {
      const {
        errorCode = SCREENSHARING_ERRORS.UNKNOWN_ERROR.errorCode,
        errorMessage = error.message,
      } = error;

      logger.error({
        logCode: 'camera_as_content_failed',
        extraInfo: { errorCode, errorMessage },
      }, `Sharing camera as content failed: ${errorMessage} (code=${errorCode})`);

      ScreenShareService.screenshareHasEnded();
    };

    // Prefer public mediaStream getter; never fall through to getDisplayMedia
    // (that path marks content as screenshare and auto-opens floating chat).
    const storedStream = Service.getStream(deviceId);
    const mediaStream = storedStream?.mediaStream || storedStream?._mediaStream || null;
    if (!mediaStream) {
      handleFailure({
        errorCode: SCREENSHARING_ERRORS.UNKNOWN_ERROR.errorCode,
        message: 'Camera as content stream is not available',
      });
      return;
    }

    // Mark before shareScreen so floating-chat auto-open can exclude this path.
    ScreenShareService.setCameraAsContentDeviceId(deviceId);
    ScreenShareService.shareScreen(
      isCameraAsContentBroadcasting,
      stopExternalVideoShare,
      true,
      handleFailure,
      { stream: mediaStream },
    );
  };

  const startSharing = (deviceId) => {
    callbackToClose();
    setIsOpen(false);
    VideoService.joinVideo(deviceId, isCamLocked);
  };

  const stopSharingCameraAsContent = () => {
    callbackToClose();
    setIsOpen(false);
    ScreenShareService.screenshareHasEnded();
  };

  const closeModal = () => {
    callbackToClose();
    setIsOpen(false);
  };

  return (
    <VideoPreview
      {...{
        stopSharingCameraAsContent,
        closeModal,
        startSharing,
        cameraAsContentDeviceId,
        startSharingCameraAsContent,
        stopSharing,
        sharedDevices,
        hasVideoStream,
        camCapReached,
        isCamLocked,
        webcamDeviceId,
        isVirtualBackgroundsEnabled,
        isCustomVirtualBackgroundsEnabled,
        setAway,
        isAway: currentUser?.away ?? false,
        hideNotificationToasts: hideNotifications,
        isVisualEffects,
        forceOpen,
        priority,
        isOpen,
        ...rest,
      }}
    />
  );
};

VideoPreviewContainer.propTypes = {
  callbackToClose: PropTypes.func.isRequired,
  setIsOpen: PropTypes.func.isRequired,
  isVisualEffects: PropTypes.bool,
  forceOpen: PropTypes.bool,
  priority: PropTypes.string,
  isOpen: PropTypes.bool,
};

VideoPreviewContainer.defaultProps = {
  isVisualEffects: false,
  forceOpen: false,
  priority: 'low',
  isOpen: false,
};

export default VideoPreviewContainer;

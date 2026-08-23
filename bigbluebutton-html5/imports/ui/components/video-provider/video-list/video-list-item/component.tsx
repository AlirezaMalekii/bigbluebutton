import React, { useEffect, useRef, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { UserCameraDropdownInterface, UserCameraHelperButton } from 'bigbluebutton-html-plugin-sdk';
import { UpdatedDataForUserCameraDomElement } from 'bigbluebutton-html-plugin-sdk/dist/cjs/dom-element-manipulation/user-camera/types';
import Session from '/imports/ui/services/storage/in-memory';
import UserActions from '/imports/ui/components/video-provider/video-list/video-list-item/user-actions/component';
import ViewActions from '/imports/ui/components/video-provider/video-list/video-list-item/view-actions/component';
import UserStatus from '/imports/ui/components/video-provider/video-list/video-list-item/user-status/component';
import PinArea from '/imports/ui/components/video-provider/video-list/video-list-item/pin-area/component';
import UserAvatarVideo from '/imports/ui/components/video-provider/video-list/video-list-item/user-avatar/component';
import {
  isStreamStateHealthy,
  isStreamStateUnhealthy,
  subscribeToStreamStateChange,
  unsubscribeFromStreamStateChange,
} from '/imports/ui/services/bbb-webrtc-sfu/stream-state-service';
import { getSettingsSingletonInstance } from '/imports/ui/services/settings';
import VideoService from '/imports/ui/components/video-provider/service';
import Icon from '/imports/ui/components/common/icon/component';
import Styled from './styles';
import withDragAndDrop from './drag-and-drop/component';
import Auth from '/imports/ui/services/auth';
import { VideoItem } from '/imports/ui/components/video-provider/types';
import { VIDEO_TYPES } from '/imports/ui/components/video-provider/enums';
import PluginButtonContainer from '../../../plugins/plugin-button/container';
import { UserCameraHelperAreas } from '../../../plugins-engine/extensible-areas/components/user-camera-helper/types';
import PluginMenuActions from './plugin-menu-actions/component';
import {
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
} from '/imports/ui/components/skyroom-layout/panel-toggles';
import { dispatchSkyroomLayoutResize } from '/imports/ui/components/skyroom-layout/layout-resize';
import {
  videoHasRenderableFrame,
  VideoPlaybackState,
  VIDEO_PLAYBACK_STALL_GRACE_MS,
} from '/imports/ui/components/video-provider/video-playback-utils';
import {
  isVideoPlaybackPageActive,
  subscribeToVideoPlaybackPageLifecycle,
} from '/imports/ui/components/video-provider/video-playback-page-lifecycle';
import { VideoListCurrentUser } from '../shared-state-context';

const intlMessages = defineMessages({
  disableDesc: {
    id: 'app.videoDock.webcamDisableDesc',
  },
});

const VIDEO_CONTAINER_WIDTH_BOUND = 125;
const VIDEO_CONTAINER_PLUGIN_HELPERS_WIDTH_BOUND = 175;

export interface VideoListItemProps {
  pluginUserCameraHelperPerPosition: UserCameraHelperAreas;
  userCameraDomElementRequested: boolean;
  isFullscreenContext: boolean;
  setUserCamerasRequestedFromPlugin: React.Dispatch<React.SetStateAction<UpdatedDataForUserCameraDomElement[]>>;
  layoutContextDispatch: (...args: unknown[]) => void;
  isRTL: boolean;
  amIModerator: boolean;
  cameraId: string;
  disabledCams: string[];
  currentUser: VideoListCurrentUser | null;
  userCameraDropdownItems: UserCameraDropdownInterface[];
  setCameraPinned: (userId: string, pinned: boolean) => void;
  focused: boolean;
  isStream: boolean;
  name: string;
  numOfStreams: number;
  onHandleVideoFocus: ((id: string) => void) | null;
  onVideoItemMount: (ref: HTMLVideoElement) => void;
  onVideoItemUnmount: (stream: string) => void;
  onVideoPlaybackStateChange: (state: VideoPlaybackState) => void;
  settingsSelfViewDisable: boolean;
  stream: VideoItem;
  makeDragOperations?: (userId?: string) => {
    onDragOver?: (e: DragEvent) => void,
    onDrop?: (e: DragEvent) => void,
    onDragLeave?: (e: DragEvent) => void,
  };
  dragging?: boolean;
  draggingOver?: boolean;
  voiceUser: {
    muted: boolean;
    listenOnly: boolean;
    talking: boolean;
    joined: boolean;
    deafened: boolean;
  };
  raisedHandPosition: number;
}

const renderPluginItems = (
  streamId: string, userId: string,
  pluginItems: UserCameraHelperButton[],
  bottom: boolean, right: boolean,
  isVideoSqueezed: boolean, isRTL: boolean,
) => {
  if (pluginItems !== undefined && pluginItems.length > 0) {
    const cameraHelperItemsCountLimit = isVideoSqueezed ? 2 : 3;

    const indexOfSlice = (pluginItems.length <= cameraHelperItemsCountLimit)
      ? cameraHelperItemsCountLimit : cameraHelperItemsCountLimit - 1;
    return (
      <>
        {
          pluginItems.slice(0, indexOfSlice).filter(
            (pluginItem) => (pluginItem.displayFunction?.({ userId, streamId }) ?? true),
          ).map((pluginItem) => {
            const pluginButton = pluginItem;
            const returnComponent = (
              <PluginButtonContainer
                key={`${pluginButton.type}-${pluginButton.id}-${pluginButton.label}`}
                dark
                bottom={bottom}
                right={right}
                icon={pluginButton.icon}
                label={pluginButton.label}
                onClick={({ browserClickEvent }) => pluginButton.onClick({ browserClickEvent, streamId, userId })}
                dataTest={pluginButton.dataTest}
              />
            );
            return returnComponent;
          })
        }
        {pluginItems.length > cameraHelperItemsCountLimit && (
          <PluginMenuActions
            pluginCameraHelperItems={pluginItems.slice(indexOfSlice)}
            userId={userId}
            streamId={streamId}
            isRTL={isRTL}
          />
        )}
      </>
    );
  }
  return (<></>);
};

type DragOperations = {
  onDragOver?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
  onDragLeave?: (e: DragEvent) => void;
};

const noDragOperations = (): DragOperations => ({});

export const VideoListItem: React.FC<VideoListItemProps> = (props) => {
  const {
    name, voiceUser, isFullscreenContext, layoutContextDispatch, onHandleVideoFocus,
    cameraId, numOfStreams, focused, onVideoItemMount, onVideoItemUnmount,
    onVideoPlaybackStateChange, isRTL, isStream, settingsSelfViewDisable,
    disabledCams, amIModerator, stream, currentUser, setUserCamerasRequestedFromPlugin,
    userCameraDropdownItems, setCameraPinned,
    pluginUserCameraHelperPerPosition, userCameraDomElementRequested, raisedHandPosition,
    makeDragOperations = noDragOperations, dragging = false, draggingOver = false,
  } = props;

  const intl = useIntl();

  const [playbackState, setPlaybackState] = useState<VideoPlaybackState>('waiting');
  const [isStreamHealthy, setIsStreamHealthy] = useState(false);
  const [isMirrored, setIsMirrored] = useState<boolean>(VideoService.mirrorOwnWebcam(stream.userId));
  const [isVideoSqueezed, setIsVideoSqueezed] = useState(false);
  const [isVideoPluginHelperSqueezed, setIsVideoPluginHelperSqueezed] = useState(false);
  const [isSelfViewDisabled, setIsSelfViewDisabled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const videoTag = useRef<HTMLVideoElement | null>(null);
  const videoContainer = useRef<HTMLDivElement | null>(null);
  const webcamMenuRef = useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackInterruptTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoFrameCallbackRef = useRef<number | null>(null);
  const playbackStateRef = useRef<VideoPlaybackState>('waiting');
  const playbackDisabledRef = useRef(false);

  useEffect(() => {
    if (!userCameraDomElementRequested || !videoContainer.current) return undefined;

    setUserCamerasRequestedFromPlugin((userCamera) => {
      if (!userCamera.some((uc) => uc.streamId === cameraId)) {
        return [...userCamera, {
          streamId: cameraId,
          userCameraDomElement: videoContainer.current!,
        }];
      }
      return userCamera;
    });

    return () => {
      setUserCamerasRequestedFromPlugin((userCamera) => (
        userCamera.filter((camera) => camera.streamId !== cameraId)
      ));
    };
  }, [cameraId, setUserCamerasRequestedFromPlugin, userCameraDomElementRequested]);

  const videoDataLoaded = playbackState === 'playing';
  const videoIsReady = isStreamHealthy && videoDataLoaded && !isSelfViewDisabled;
  const Settings = getSettingsSingletonInstance();
  const { animations, webcamBorderHighlightColor } = Settings.application;
  const { talking } = voiceUser;
  const raiseHand = (stream.type === VIDEO_TYPES.GRID && stream?.raiseHand)
    || (stream.type === VIDEO_TYPES.STREAM && stream.user?.raiseHand);
  let user;
  let streamId = '';
  switch (stream.type) {
    case VIDEO_TYPES.STREAM: {
      user = stream.user;
      streamId = stream.stream;
      break;
    }
    case VIDEO_TYPES.GRID: {
      user = stream;
      break;
    }
    case VIDEO_TYPES.AUDIO_ONLY: {
      user = stream.user;
      streamId = stream.stream;
      break;
    }
    case VIDEO_TYPES.CONNECTING:
    default: {
      user = currentUser ?? {};
      streamId = stream.stream;
      break;
    }
  }
  const isModeratorWebcam = Boolean(
    user?.isModerator || user?.role === VideoService.getRoleModerator(),
  );

  const onStreamStateChange = (e: CustomEvent) => {
    const { streamState } = e.detail;
    e.stopPropagation();

    if (isStreamStateHealthy(streamState)) {
      setIsStreamHealthy(true);
    } else if (isStreamStateUnhealthy(streamState)) {
      setIsStreamHealthy(false);
    }
  };

  const reportPlaybackState = (state: VideoPlaybackState) => {
    if (playbackStateRef.current === state) return;
    playbackStateRef.current = state;
    setPlaybackState(state);
    onVideoPlaybackStateChange(state);
  };

  const playElement = (elem: HTMLVideoElement) => {
    if (elem.paused) {
      elem.play().catch((error) => {
        if (error.name === 'NotAllowedError') {
          const tagFailedEvent = new CustomEvent('videoPlayFailed', { detail: { mediaElement: elem } });
          window.dispatchEvent(tagFailedEvent);
        }
      });
    }
  };

  // Attach listeners before srcObject so a local MediaStream that already has
  // frames cannot fire loadeddata before we observe it (stuck avatar overlay).
  useEffect(() => {
    const hasVideoMedia = stream.type === VIDEO_TYPES.STREAM
      || stream.type === VIDEO_TYPES.CONNECTING;
    const videoEl = videoTag.current;
    let lastObservedCurrentTime = videoEl?.currentTime || 0;

    const clearPlaybackInterruptTimeout = () => {
      if (playbackInterruptTimeoutRef.current) {
        clearTimeout(playbackInterruptTimeoutRef.current);
        playbackInterruptTimeoutRef.current = null;
      }
    };

    const clearVideoFrameCallback = () => {
      if (videoEl && videoFrameCallbackRef.current != null
        && typeof videoEl.cancelVideoFrameCallback === 'function') {
        videoEl.cancelVideoFrameCallback(videoFrameCallbackRef.current);
      }
      videoFrameCallbackRef.current = null;
    };

    // A decoded frame is not a permanent health signal. Browsers may keep the
    // MediaStream live while frames silently stop (notably after mobile
    // backgrounding or an SFU subscriber hiccup), so every real frame rearms
    // this bounded liveness check.
    const armPlaybackLivenessTimeout = () => {
      clearPlaybackInterruptTimeout();
      playbackInterruptTimeoutRef.current = setTimeout(() => {
        playbackInterruptTimeoutRef.current = null;
        if (!isVideoPlaybackPageActive() || playbackDisabledRef.current) return;

        // requestVideoFrameCallback can be throttled in a background browser
        // tab even while MediaStream playback is healthy. currentTime is the
        // compatible secondary signal and prevents destructive reconnect
        // churn when frames are still progressing.
        if (videoEl && !videoEl.paused && videoHasRenderableFrame(videoEl)
          && videoEl.currentTime > lastObservedCurrentTime) {
          lastObservedCurrentTime = videoEl.currentTime;
          reportPlaybackState('playing');
          armPlaybackLivenessTimeout();
          return;
        }

        reportPlaybackState('stalled');
      }, VIDEO_PLAYBACK_STALL_GRACE_MS);
    };

    const markDecodedFrame = () => {
      if (!videoHasRenderableFrame(videoEl)) return;
      clearVideoFrameCallback();
      lastObservedCurrentTime = videoEl?.currentTime || lastObservedCurrentTime;
      const wasPlaying = playbackStateRef.current === 'playing';
      // A decoded frame is stronger evidence than a connection-state event and
      // also covers the race where that event fired before this tile mounted.
      setIsStreamHealthy(true);
      reportPlaybackState('playing');
      armPlaybackLivenessTimeout();

      if (!wasPlaying) {
        // Mobile Skyroom uses fixed zone bounds; avoid resize storms that freeze phones.
        if (!isSkyroomMobileViewport() || !isSkyroomColumnLayout()) {
          dispatchSkyroomLayoutResize();
        }

        /* Used when re-sharing cameras after leaving a breakout room. It is
        needed when the user has multiple active cameras so the second share
        starts only after the first has decoded a real frame. */
        Session.setItem('canConnect', true);
      }
    };

    const confirmDecodedFrame = () => {
      if (!videoEl?.srcObject) return;
      clearVideoFrameCallback();

      if (typeof videoEl.requestVideoFrameCallback === 'function') {
        videoFrameCallbackRef.current = videoEl.requestVideoFrameCallback(() => {
          videoFrameCallbackRef.current = null;
          markDecodedFrame();
        });
      } else {
        markDecodedFrame();
      }
    };

    const onLoadedMetadata = () => {
      if (videoEl && !playbackDisabledRef.current) playElement(videoEl);
    };

    const onPlaybackCandidate = () => {
      confirmDecodedFrame();
    };

    const onPlaybackInterrupted = () => {
      if (!videoEl || !isVideoPlaybackPageActive()
        || playbackDisabledRef.current) return;
      clearPlaybackInterruptTimeout();
      const previousTime = videoEl.currentTime;
      playbackInterruptTimeoutRef.current = setTimeout(() => {
        playbackInterruptTimeoutRef.current = null;
        if (!isVideoPlaybackPageActive()
          || playbackDisabledRef.current) return;

        if (!videoEl.paused && videoEl.currentTime > previousTime) {
          confirmDecodedFrame();
        } else {
          reportPlaybackState('stalled');
        }
      }, VIDEO_PLAYBACK_STALL_GRACE_MS);
    };

    const onPlaybackEnded = () => {
      clearPlaybackInterruptTimeout();
      clearVideoFrameCallback();
      playbackInterruptTimeoutRef.current = setTimeout(() => {
        playbackInterruptTimeoutRef.current = null;
        if (isVideoPlaybackPageActive()
          && !playbackDisabledRef.current) reportPlaybackState('ended');
      }, VIDEO_PLAYBACK_STALL_GRACE_MS);
    };

    const handlePageLifecycleChange = () => {
      if (!videoEl || !isVideoPlaybackPageActive() || playbackDisabledRef.current) {
        clearPlaybackInterruptTimeout();
        clearVideoFrameCallback();
        return;
      }
      reportPlaybackState('waiting');
      onVideoItemMount(videoEl);
      if (!videoEl.srcObject) return;
      playElement(videoEl);
      confirmDecodedFrame();
    };

    const onTimeUpdate = () => {
      // While playing, the bounded liveness watchdog verifies currentTime.
      // Avoid canceling/re-registering a frame callback on every timeupdate
      // event for every visible camera.
      if (playbackStateRef.current !== 'playing') confirmDecodedFrame();
    };

    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect?.width;
        if (typeof width !== 'number') return;
        setIsVideoSqueezed(width < VIDEO_CONTAINER_WIDTH_BOUND);
        setIsVideoPluginHelperSqueezed(width < VIDEO_CONTAINER_PLUGIN_HELPERS_WIDTH_BOUND);
      })
      : null;
    let unsubscribePageLifecycle = () => {};

    if (hasVideoMedia && videoEl) {
      subscribeToStreamStateChange(cameraId, onStreamStateChange);
      videoEl.addEventListener('loadeddata', onPlaybackCandidate);
      videoEl.addEventListener('loadedmetadata', onLoadedMetadata);
      videoEl.addEventListener('canplay', onPlaybackCandidate);
      videoEl.addEventListener('playing', onPlaybackCandidate);
      videoEl.addEventListener('timeupdate', onTimeUpdate);
      videoEl.addEventListener('waiting', onPlaybackInterrupted);
      videoEl.addEventListener('stalled', onPlaybackInterrupted);
      videoEl.addEventListener('emptied', onPlaybackInterrupted);
      videoEl.addEventListener('ended', onPlaybackEnded);
      unsubscribePageLifecycle = subscribeToVideoPlaybackPageLifecycle(handlePageLifecycleChange);
      onVideoPlaybackStateChange('waiting');
      onVideoItemMount(videoEl);
      if (videoEl.srcObject) confirmDecodedFrame();
    }

    if (videoContainer.current) {
      resizeObserver?.observe(videoContainer.current);
    }

    return () => {
      if (hasVideoMedia && videoEl) {
        unsubscribeFromStreamStateChange(cameraId, onStreamStateChange);
        videoEl.removeEventListener('loadeddata', onPlaybackCandidate);
        videoEl.removeEventListener('loadedmetadata', onLoadedMetadata);
        videoEl.removeEventListener('canplay', onPlaybackCandidate);
        videoEl.removeEventListener('playing', onPlaybackCandidate);
        videoEl.removeEventListener('timeupdate', onTimeUpdate);
        videoEl.removeEventListener('waiting', onPlaybackInterrupted);
        videoEl.removeEventListener('stalled', onPlaybackInterrupted);
        videoEl.removeEventListener('emptied', onPlaybackInterrupted);
        videoEl.removeEventListener('ended', onPlaybackEnded);
        unsubscribePageLifecycle();
        clearPlaybackInterruptTimeout();
        clearVideoFrameCallback();
        onVideoItemUnmount(cameraId);
      }
      resizeObserver?.disconnect();
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  playbackDisabledRef.current = (isSelfViewDisabled && stream.userId === Auth.userID)
    || disabledCams?.includes(cameraId);

  useEffect(() => {
    if (!playbackDisabledRef.current && videoTag.current?.srcObject) {
      playElement(videoTag.current!);
    }
    if (playbackDisabledRef.current) {
      videoTag.current?.pause?.();
    }
  }, [isSelfViewDisabled, disabledCams, playbackState]);

  useEffect(() => {
    setIsSelfViewDisabled(settingsSelfViewDisable);
  }, [settingsSelfViewDisable]);

  const renderSqueezedButton = () => (
    <UserActions
      name={name}
      stream={stream}
      videoContainer={videoContainer}
      menuTriggerRef={webcamMenuRef}
      isVideoSqueezed={isVideoSqueezed}
      cameraId={cameraId}
      numOfStreams={numOfStreams}
      onHandleVideoFocus={onHandleVideoFocus}
      focused={focused}
      onHandleMirror={() => setIsMirrored((value) => !value)}
      isMirrored={isMirrored}
      isRTL={isRTL}
      isStream={isStream}
      onHandleDisableCam={() => setIsSelfViewDisabled((value) => !value)}
      isSelfViewDisabled={isSelfViewDisabled}
      amIModerator={amIModerator}
      userCameraDropdownItems={userCameraDropdownItems}
      setCameraPinned={setCameraPinned}
      isFullscreenContext={isFullscreenContext}
      layoutContextDispatch={layoutContextDispatch}
    />
  );

  const renderSqueezedName = () => (
    <Styled.BottomBar>
      <Styled.SqueezedName>{name}</Styled.SqueezedName>
    </Styled.BottomBar>
  );

  const renderRaiseHandElement = () => {
    if (!raiseHand) return null;

    return (
      <Styled.RaiseHand>
        {raisedHandPosition > 0 && <Styled.RaiseHandNumber>{raisedHandPosition}</Styled.RaiseHandNumber>}
        <Styled.RaiseHandEmoji>✋</Styled.RaiseHandEmoji>
      </Styled.RaiseHand>
    );
  };

  const renderWebcamConnecting = () => (
    <Styled.WebcamConnecting
      data-test="webcamConnecting"
      animations={animations}
      talking={talking}
      customHighlight={webcamBorderHighlightColor}
    >
      <UserAvatarVideo
        user={user}
        stream={stream}
        voiceUser={voiceUser}
        unhealthyStream={videoDataLoaded && !isStreamHealthy}
        squeezed={false}
      />
    </Styled.WebcamConnecting>
  );

  const renderWebcamConnectingSqueezed = () => (
    <Styled.WebcamConnecting
      data-test="webcamConnectingSqueezed"
      animations={animations}
      talking={talking}
      customHighlight={webcamBorderHighlightColor}
    >
      <UserAvatarVideo
        user={user}
        stream={stream}
        unhealthyStream={videoDataLoaded && !isStreamHealthy}
        squeezed
      />
    </Styled.WebcamConnecting>
  );

  const renderDefaultButtons = () => (
    <>
      <Styled.TopBar>
        {renderRaiseHandElement()}
        <PinArea
          stream={stream}
          amIModerator={amIModerator}
          setCameraPinned={setCameraPinned}
        />
      </Styled.TopBar>
      <Styled.BottomBar>
        <UserActions
          name={name}
          stream={stream}
          cameraId={cameraId}
          numOfStreams={numOfStreams}
          onHandleVideoFocus={onHandleVideoFocus}
          focused={focused}
          onHandleMirror={() => setIsMirrored((value) => !value)}
          isMirrored={isMirrored}
          isRTL={isRTL}
          isStream={isStream}
          onHandleDisableCam={() => setIsSelfViewDisabled((value) => !value)}
          isSelfViewDisabled={isSelfViewDisabled}
          amIModerator={amIModerator}
          videoContainer={videoContainer}
          menuTriggerRef={webcamMenuRef}
          isFullscreenContext={isFullscreenContext}
          layoutContextDispatch={layoutContextDispatch}
          userCameraDropdownItems={userCameraDropdownItems}
          setCameraPinned={setCameraPinned}
        />
        <UserStatus
          voiceUser={voiceUser}
          user={user}
          stream={stream}
        />
      </Styled.BottomBar>
    </>
  );

  const renderCameraHelperButtons = () => {
    const {
      userCameraHelperTopLeft: topLeftPluginItems,
      userCameraHelperTopRight: topRightPluginItems,
      userCameraHelperBottomLeft: bottomLeftPluginItems,
      userCameraHelperBottomRight: bottomRightPluginItems,
    } = pluginUserCameraHelperPerPosition;
    const { userId } = stream;

    // when squeezed we move the bottom left items to top right and vice versa
    const topRightPluginItemsRender = isVideoSqueezed
      ? []
      : [...(topRightPluginItems ?? []), ...(bottomLeftPluginItems ?? [])];
    const topLeftPluginItemsRender = topLeftPluginItems;
    const bottomRightPluginItemsRender = bottomRightPluginItems;
    const bottomLeftPluginItemsRender = !isVideoSqueezed
      ? []
      : [...(bottomLeftPluginItems ?? []), ...(topRightPluginItems ?? [])];
    return (
      <>
        <Styled.UserCameraButtonsContainerWrapper
          positionYAxis="top"
          positionXAxis="left"
        >
          <ViewActions
            name={name}
            cameraId={cameraId}
            videoContainer={videoContainer}
            isFullscreenContext={isFullscreenContext}
            layoutContextDispatch={layoutContextDispatch}
            isStream={isStream}
          />
          {renderPluginItems(
            cameraId, userId, topLeftPluginItemsRender, false, false, isVideoPluginHelperSqueezed, isRTL,
          )}
        </Styled.UserCameraButtonsContainerWrapper>
        <Styled.UserCameraButtonsContainerWrapper
          positionYAxis="top"
          positionXAxis="right"
        >
          {renderPluginItems(
            cameraId, userId, topRightPluginItemsRender, false, true, isVideoPluginHelperSqueezed, isRTL,
          )}
        </Styled.UserCameraButtonsContainerWrapper>
        <Styled.UserCameraButtonsContainerWrapper
          positionYAxis="bottom"
          positionXAxis="left"
        >
          {renderPluginItems(
            cameraId, userId, bottomLeftPluginItemsRender, true, false, isVideoPluginHelperSqueezed, isRTL,
          )}
        </Styled.UserCameraButtonsContainerWrapper>
        <Styled.UserCameraButtonsContainerWrapper
          positionYAxis="bottom"
          positionXAxis="right"
        >
          {renderPluginItems(
            cameraId, userId, bottomRightPluginItemsRender, true, true, isVideoPluginHelperSqueezed, isRTL,
          )}
        </Styled.UserCameraButtonsContainerWrapper>
      </>
    );
  };

  const {
    onDragLeave,
    onDragOver,
    onDrop,
  } = makeDragOperations(stream.userId);

  return (
    // @ts-expect-error -> Upstream drag wrapper uses DOM DragEvent handlers.
    <Styled.Content
      ref={videoContainer}
      talking={talking}
      customHighlight={webcamBorderHighlightColor}
      /* Skyroom uses layout CSS overlay (data attr); BBB fixed styles block taps after exit. */
      fullscreen={isSkyroomColumnLayout() ? false : isFullscreenContext}
      data-skyroom-webcam-fs-active={isFullscreenContext ? 'true' : undefined}
      data-skyroom-moderator-webcam={isModeratorWebcam ? 'true' : undefined}
      data-test={talking ? 'webcamItemTalkingUser' : 'webcamItem'}
      animations={animations}
      isStream={isStream}
      onMouseEnter={() => {
        if (!isVideoSqueezed) return;
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        if (!isVideoSqueezed) return;
        setIsHovered(false);
      }}
      onTouchStart={() => {
        if (!isVideoSqueezed) return;
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => {
          setIsHovered(true);
          hoverTimeoutRef.current = setTimeout(() => setIsHovered(false), 3000);
        }, 300);
      }}
      onTouchMove={() => {
        if (!isVideoSqueezed) return;
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovered(false);
      }}
      {...{
        onDragLeave,
        onDragOver,
        onDrop,
        dragging,
        draggingOver,
      }}
    >
      {stream.type !== VIDEO_TYPES.AUDIO_ONLY && (
        <Styled.VideoContainer
          className="videoContainer"
          data-stream={streamId}
          $selfViewDisabled={(isSelfViewDisabled && stream.userId === Auth.userID)
            || disabledCams.includes(cameraId)}
        >
          <Styled.Video
            mirrored={isMirrored}
            unhealthyStream={videoDataLoaded && !isStreamHealthy}
            data-test={isMirrored ? 'mirroredVideoContainer' : 'videoContainer'}
            data-current-user-stream={stream.userId === Auth.userID ? 'true' : 'false'}
            data-local-stream={VideoService.isLocalStream(cameraId) ? 'true' : 'false'}
            ref={videoTag}
            muted
            autoPlay
            playsInline
          />
        </Styled.VideoContainer>
      )}

      {isStream && ((isSelfViewDisabled && stream.userId === Auth.userID)
      || disabledCams.includes(cameraId)) && (
        <Styled.VideoDisabled
          data-test="webcamSelfViewDisabled"
          $compact={isVideoSqueezed}
          title={intl.formatMessage(intlMessages.disableDesc)}
        >
          <Icon iconName="video_off" />
          {!isVideoSqueezed && (
            <span>{intl.formatMessage(intlMessages.disableDesc)}</span>
          )}
        </Styled.VideoDisabled>
      )}

      {isVideoSqueezed ? renderSqueezedButton() : renderDefaultButtons()}
      {isVideoSqueezed && isHovered && renderSqueezedName()}
      {stream.type === VIDEO_TYPES.AUDIO_ONLY && (
        isVideoSqueezed ? renderWebcamConnectingSqueezed() : renderWebcamConnecting()
      )}
      {!videoIsReady && (!isSelfViewDisabled || !isStream) && stream.type !== VIDEO_TYPES.AUDIO_ONLY && (
        isVideoSqueezed ? renderWebcamConnectingSqueezed() : renderWebcamConnecting()
      )}
      {((isSelfViewDisabled && stream.userId === Auth.userID) || disabledCams.includes(cameraId))
      && renderWebcamConnecting()}
      {stream.type !== VIDEO_TYPES.AUDIO_ONLY && renderCameraHelperButtons()}
    </Styled.Content>
  );
};

// @ts-expect-error -> Until everything in Typescript.
export default withDragAndDrop(VideoListItem);

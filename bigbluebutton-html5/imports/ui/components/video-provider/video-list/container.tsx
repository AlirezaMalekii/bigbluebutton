import React, {
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  UserCameraDropdownInterface,
  UserCameraHelperButton,
  UserCameraHelperInterface,
  UserCameraHelperItemPosition,
} from 'bigbluebutton-html-plugin-sdk';
import VideoList from '/imports/ui/components/video-provider/video-list/component';
import { layoutSelect, layoutDispatch } from '/imports/ui/components/layout/context';
import { useNumberOfPages } from '/imports/ui/components/video-provider/hooks';
import { VideoItem } from '/imports/ui/components/video-provider/types';
import { Layout, Output } from '/imports/ui/components/layout/layoutTypes';
import { PluginsContext } from '/imports/ui/components/components-data/plugin-context/context';
import { UpdatedDataForUserCameraDomElement } from 'bigbluebutton-html-plugin-sdk/dist/cjs/dom-element-manipulation/user-camera/types';
import { HookEvents } from 'bigbluebutton-html-plugin-sdk/dist/cjs/core/enum';
import { DomElementManipulationHooks } from 'bigbluebutton-html-plugin-sdk/dist/cjs/dom-element-manipulation/enums';
import { UpdatedEventDetails } from 'bigbluebutton-html-plugin-sdk/dist/cjs/core/types';
import { VideoPlaybackState } from '../video-playback-utils';
import { VideoListSharedStateProvider } from './shared-state-context';

interface VideoListContainerProps {
  streams: VideoItem[];
  currentVideoPageIndex: number;
  cameraDock: Output['cameraDock'];
  focusedId: string;
  handleVideoFocus: (id: string) => void;
  isGridEnabled: boolean;
  overflowCount: number;
  webcamsVisible: boolean;
  onVideoItemMount: (stream: string, video: HTMLVideoElement) => void;
  onVideoItemUnmount: (stream: string) => void;
  onVideoPlaybackStateChange: (stream: string, state: VideoPlaybackState) => void;
  onVideoVisibilityChange?: (changes: { stream: string; visible: boolean }[]) => void;
  onVirtualBgDrop: (stream: string, type: string, name: string, data: string) => Promise<unknown>;
}

const EMPTY_USER_CAMERA_DROPDOWN_ITEMS: UserCameraDropdownInterface[] = [];
const EMPTY_USER_CAMERA_DOM_ELEMENT_IDS: string[] = [];

const VideoListContainer: React.FC<VideoListContainerProps> = (props) => {
  const layoutType = layoutSelect((i: Layout) => i.layoutType);
  const layoutContextDispatch = layoutDispatch();
  const {
    streams,
    cameraDock,
    currentVideoPageIndex,
    focusedId,
    handleVideoFocus,
    isGridEnabled,
    overflowCount,
    webcamsVisible,
    onVideoItemMount,
    onVideoItemUnmount,
    onVideoPlaybackStateChange,
    onVideoVisibilityChange,
    onVirtualBgDrop,
  } = props;
  const numberOfPages = useNumberOfPages();

  const {
    pluginsExtensibleAreasAggregatedState,
    domElementManipulationIdentifiers,
  } = useContext(PluginsContext);

  const [userCamerasRequestedFromPlugin, setUserCamerasRequestedFromPlugin] = useState<
    UpdatedDataForUserCameraDomElement[]>([]);
  useEffect(() => {
    const dataToSend = userCamerasRequestedFromPlugin.filter((
      userCamera,
    ) => domElementManipulationIdentifiers.USER_CAMERA?.includes(userCamera.streamId));
    window.dispatchEvent(
      new CustomEvent<UpdatedEventDetails<UpdatedDataForUserCameraDomElement[]>>(HookEvents.BBB_CORE_SENT_NEW_DATA, {
        detail: {
          hook: DomElementManipulationHooks.USER_CAMERA,
          data: dataToSend,
        },
      }),
    );
  }, [domElementManipulationIdentifiers, userCamerasRequestedFromPlugin]);

  const pluginUserCameraHelperPerPosition = useMemo(() => (
    (pluginsExtensibleAreasAggregatedState.userCameraHelperItems || [])
      .reduce((acc, current: UserCameraHelperInterface) => {
        const state = { ...acc };
        const currentButton = current as UserCameraHelperButton;
        switch (current.position) {
          case UserCameraHelperItemPosition.TOP_LEFT:
            state.userCameraHelperTopLeft.push(currentButton);
            break;
          case UserCameraHelperItemPosition.BOTTOM_LEFT:
            state.userCameraHelperBottomLeft.push(currentButton);
            break;
          case UserCameraHelperItemPosition.TOP_RIGHT:
            state.userCameraHelperTopRight.push(currentButton);
            break;
          case UserCameraHelperItemPosition.BOTTOM_RIGHT:
            state.userCameraHelperBottomRight.push(currentButton);
            break;
          default:
            break;
        }
        return state;
      }, {
        userCameraHelperTopLeft: [] as UserCameraHelperButton[],
        userCameraHelperTopRight: [] as UserCameraHelperButton[],
        userCameraHelperBottomLeft: [] as UserCameraHelperButton[],
        userCameraHelperBottomRight: [] as UserCameraHelperButton[],
      })
  ), [pluginsExtensibleAreasAggregatedState.userCameraHelperItems]);
  const userCameraDropdownItems = (
    pluginsExtensibleAreasAggregatedState.userCameraDropdownItems
      || EMPTY_USER_CAMERA_DROPDOWN_ITEMS
  ) as UserCameraDropdownInterface[];

  return (
    !streams.length
      ? null
      : (
        <VideoListSharedStateProvider
          layoutContextDispatch={layoutContextDispatch}
          userCameraDropdownItems={userCameraDropdownItems}
        >
          <VideoList
            pluginUserCameraHelperPerPosition={pluginUserCameraHelperPerPosition}
            userCameraDomElementIds={domElementManipulationIdentifiers.USER_CAMERA
              || EMPTY_USER_CAMERA_DOM_ELEMENT_IDS}
            webcamsVisible={webcamsVisible}
            layoutType={layoutType}
            setUserCamerasRequestedFromPlugin={setUserCamerasRequestedFromPlugin}
            layoutContextDispatch={layoutContextDispatch}
            numberOfPages={numberOfPages}
            currentVideoPageIndex={currentVideoPageIndex}
            cameraDock={cameraDock}
            focusedId={focusedId}
            handleVideoFocus={handleVideoFocus}
            isGridEnabled={isGridEnabled}
            overflowCount={overflowCount}
            streams={streams}
            onVideoItemMount={onVideoItemMount}
            onVideoItemUnmount={onVideoItemUnmount}
            onVideoPlaybackStateChange={onVideoPlaybackStateChange}
            onVideoVisibilityChange={onVideoVisibilityChange}
            onVirtualBgDrop={onVirtualBgDrop}
          />
        </VideoListSharedStateProvider>
      )
  );
};

export default VideoListContainer;

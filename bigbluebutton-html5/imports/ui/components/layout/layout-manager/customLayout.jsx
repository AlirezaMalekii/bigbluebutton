/* eslint-disable react/prop-types, no-console */
import { useEffect, useRef, useState } from 'react';
import { throttle } from '/imports/utils/throttle';
import { layoutSelect, layoutSelectInput, layoutDispatch } from '/imports/ui/components/layout/context';
import DEFAULT_VALUES from '/imports/ui/components/layout/defaultValues';
import { INITIAL_INPUT_STATE } from '/imports/ui/components/layout/initState';
import {
  ACTIONS, CAMERADOCK_POSITION, LAYOUT_TYPE, PANELS,
} from '../enums';
import Storage from '/imports/ui/services/storage/session';
import { defaultsDeep } from '/imports/utils/array-utils';
import Session from '/imports/ui/services/storage/in-memory';
import adjustSkyroomColumnLayout, {
  SKYROOM_FOOTER_H,
  SKYROOM_MOBILE_EDGE,
  SKYROOM_NAVBAR_H,
  SKYROOM_STAGE_Z_INDEX,
} from '/imports/ui/components/skyroom-layout/column-layout';
import {
  setSkyroomWebcamLayout,
  clearSkyroomWebcamLayout,
} from '/imports/ui/components/skyroom-layout/webcam-bounds-store';
import { SKYROOM_MOBILE_ZONE_FS_EVENT } from '/imports/ui/components/skyroom-layout/mobile-zone-fullscreen-state';
import { SKYROOM_MOBILE_STATUS_RAIL_EVENT } from '/imports/ui/components/skyroom-layout/mobile-status-rail-state';
import { SKYROOM_MOBILE_TALKING_RAIL_EVENT } from '/imports/ui/components/skyroom-layout/mobile-talking-rail-state';
import { SKYROOM_WEBCAM_LAYOUT_EVENT } from '/imports/ui/components/skyroom-layout/webcam-zone-store';
import { useVideoStreams } from '/imports/ui/components/video-provider/hooks';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import {
  getSkyroomNotesOpen,
  subscribeSkyroomNotesOpen,
} from '/imports/ui/components/skyroom-layout/notes-panel-state';
import { isSkyroomColumnLayout } from '/imports/ui/components/skyroom-layout/panel-toggles';

const windowWidth = () => window.document.documentElement.clientWidth;
const windowHeight = () => window.document.documentElement.clientHeight;
const min = (value1, value2) => (value1 <= value2 ? value1 : value2);
const max = (value1, value2) => (value1 >= value2 ? value1 : value2);

const CustomLayout = (props) => {
  /* eslint-disable no-use-before-define -- layout helpers are defined below in BBB style */
  const {
    bannerAreaHeight, calculatesActionbarHeight, calculatesNavbarHeight, isMobile,
    prevLayout,
  } = props;

  function usePrevious(value) {
    const ref = useRef();
    useEffect(() => {
      ref.current = value;
    });
    return ref.current;
  }

  const input = layoutSelect((i) => i.input);
  const deviceType = layoutSelect((i) => i.deviceType);
  const isRTL = layoutSelect((i) => i.isRTL);
  const fullscreen = layoutSelect((i) => i.fullscreen);
  const fontSize = layoutSelect((i) => i.fontSize);
  const currentPanelType = layoutSelect((i) => i.currentPanelType);

  const presentationInput = layoutSelectInput((i) => i.presentation);
  const externalVideoInput = layoutSelectInput((i) => i.externalVideo);
  const genericMainContentInput = layoutSelectInput((i) => i.genericMainContent);
  const screenShareInput = layoutSelectInput((i) => i.screenShare);
  const sharedNotesInput = layoutSelectInput((i) => i.sharedNotes);

  const sidebarNavigationInput = layoutSelectInput((i) => i.sidebarNavigation);
  const sidebarContentInput = layoutSelectInput((i) => i.sidebarContent);
  const cameraDockInput = layoutSelectInput((i) => i.cameraDock);
  const actionbarInput = layoutSelectInput((i) => i.actionBar);
  const navbarInput = layoutSelectInput((i) => i.navBar);
  const layoutContextDispatch = layoutDispatch();
  const { streams: videoStreams = [] } = useVideoStreams();
  const videoStreamLayoutKey = videoStreams
    .map((s) => `${s.type}:${s.stream ?? s.userId ?? ''}`)
    .join('|');
  const { data: meetingData } = useMeeting((m) => ({
    hasScreenshare: m.componentsFlags?.hasScreenshare,
  }));
  const { data: currentUser } = useCurrentUser((u) => ({
    presenter: u.presenter,
    isModerator: u.isModerator,
  }));
  const localUserIsPrivileged = Boolean(currentUser?.presenter || currentUser?.isModerator);

  const { isResizing } = cameraDockInput;
  const hasActiveScreenShare = screenShareInput.hasScreenShare
    || Boolean(meetingData?.hasScreenshare);

  const prevDeviceType = usePrevious(deviceType);
  const prevIsResizing = usePrevious(isResizing);
  const { isPresentationEnabled } = props;
  const [skyroomNotesOpen, setSkyroomNotesOpen] = useState(getSkyroomNotesOpen);
  const calculatesLayoutRef = useRef(() => {});
  const calculatesLayoutPendingRef = useRef(false);

  useEffect(() => subscribeSkyroomNotesOpen(setSkyroomNotesOpen), []);

  useEffect(() => {
    const refreshSkyroomLayout = () => {
      if (!document.getElementById('layout')?.hasAttribute('data-skyroom-column')) return;
      calculatesLayoutRef.current();
      window.requestAnimationFrame(() => calculatesLayoutRef.current());
    };

    window.addEventListener(SKYROOM_WEBCAM_LAYOUT_EVENT, refreshSkyroomLayout);
    window.addEventListener(SKYROOM_MOBILE_ZONE_FS_EVENT, refreshSkyroomLayout);
    window.addEventListener(SKYROOM_MOBILE_STATUS_RAIL_EVENT, refreshSkyroomLayout);
    window.addEventListener(SKYROOM_MOBILE_TALKING_RAIL_EVENT, refreshSkyroomLayout);

    const layoutEl = document.getElementById('layout');
    const columnObserver = layoutEl
      ? new MutationObserver((mutations) => {
        if (mutations.some((m) => m.attributeName === 'data-skyroom-column')) {
          calculatesLayoutRef.current();
        }
      })
      : null;
    if (layoutEl && columnObserver) {
      columnObserver.observe(layoutEl, {
        attributes: true,
        attributeFilter: ['data-skyroom-column'],
      });
    }

    return () => {
      window.removeEventListener(SKYROOM_WEBCAM_LAYOUT_EVENT, refreshSkyroomLayout);
      window.removeEventListener(SKYROOM_MOBILE_ZONE_FS_EVENT, refreshSkyroomLayout);
      window.removeEventListener(SKYROOM_MOBILE_STATUS_RAIL_EVENT, refreshSkyroomLayout);
      window.removeEventListener(SKYROOM_MOBILE_TALKING_RAIL_EVENT, refreshSkyroomLayout);
      columnObserver?.disconnect();
    };
  }, []);

  const throttledCalculatesLayout = throttle(() => calculatesLayout(),
    50, { trailing: true, leading: true });

  useEffect(() => {
    window.addEventListener('resize', () => {
      layoutContextDispatch({
        type: ACTIONS.SET_BROWSER_SIZE,
        value: {
          width: window.document.documentElement.clientWidth,
          height: window.document.documentElement.clientHeight,
        },
      });
    });
  }, []);

  useEffect(() => {
    if (deviceType === null) return undefined;

    if (deviceType !== prevDeviceType) {
      // reset layout if deviceType changed
      // not all options is supported in all devices
      init();
    } else {
      throttledCalculatesLayout();
    }
    return undefined;
  }, [
    input,
    deviceType,
    isRTL,
    fontSize,
    fullscreen,
    isPresentationEnabled,
    videoStreams.length,
    skyroomNotesOpen,
  ]);

  // Screenshare + new webcams: run layout immediately (throttle alone leaves full-height share)
  useEffect(() => {
    if (deviceType === null) return undefined;
    const layoutEl = document.getElementById('layout');
    if (!layoutEl?.hasAttribute('data-skyroom-column')) return undefined;
    if (!hasActiveScreenShare && cameraDockInput.numCameras === 0) return undefined;

    calculatesLayout();
    const raf = window.requestAnimationFrame(() => calculatesLayout());
    return () => window.cancelAnimationFrame(raf);
  }, [
    hasActiveScreenShare,
    videoStreams.length,
    videoStreamLayoutKey,
    cameraDockInput.numCameras,
    presentationInput.isOpen,
    deviceType,
  ]);

  const calculatesDropAreas = (sidebarNavWidth, sidebarContentWidth, cameraDockBounds) => {
    const { height: actionBarHeight } = calculatesActionbarHeight();
    const mediaAreaHeight = windowHeight() - (DEFAULT_VALUES.navBarHeight + actionBarHeight);
    const mediaAreaWidth = windowWidth() - (sidebarNavWidth + sidebarContentWidth);
    const DROP_ZONE_DEFAUL_SIZE = 100;
    const dropZones = {};
    const sidebarSize = sidebarNavWidth + sidebarContentWidth;

    dropZones[CAMERADOCK_POSITION.CONTENT_TOP] = {
      top: DEFAULT_VALUES.navBarHeight,
      left: !isRTL ? sidebarSize : null,
      right: isRTL ? sidebarSize : null,
      width: mediaAreaWidth,
      height: DROP_ZONE_DEFAUL_SIZE,
      zIndex: cameraDockBounds.zIndex,
    };

    dropZones[CAMERADOCK_POSITION.CONTENT_RIGHT] = {
      top: DEFAULT_VALUES.navBarHeight + DROP_ZONE_DEFAUL_SIZE,
      left: !isRTL ? windowWidth() - DROP_ZONE_DEFAUL_SIZE : 0,
      height: mediaAreaHeight - 2 * DROP_ZONE_DEFAUL_SIZE,
      width: DROP_ZONE_DEFAUL_SIZE,
      zIndex: cameraDockBounds.zIndex,
    };

    dropZones[CAMERADOCK_POSITION.CONTENT_BOTTOM] = {
      top: DEFAULT_VALUES.navBarHeight + mediaAreaHeight - DROP_ZONE_DEFAUL_SIZE,
      left: !isRTL ? sidebarSize : null,
      right: isRTL ? sidebarSize : null,
      width: mediaAreaWidth,
      height: DROP_ZONE_DEFAUL_SIZE,
      zIndex: cameraDockBounds.zIndex,
    };

    dropZones[CAMERADOCK_POSITION.CONTENT_LEFT] = {
      top: DEFAULT_VALUES.navBarHeight + DROP_ZONE_DEFAUL_SIZE,
      left: !isRTL ? sidebarSize : null,
      right: isRTL ? sidebarSize : null,
      height: mediaAreaHeight - 2 * DROP_ZONE_DEFAUL_SIZE,
      width: DROP_ZONE_DEFAUL_SIZE,
      zIndex: cameraDockBounds.zIndex,
    };

    dropZones[CAMERADOCK_POSITION.SIDEBAR_CONTENT_BOTTOM] = {
      top: windowHeight() - DROP_ZONE_DEFAUL_SIZE,
      left: !isRTL ? sidebarNavWidth : null,
      right: isRTL ? sidebarNavWidth : null,
      width: sidebarContentWidth,
      height: DROP_ZONE_DEFAUL_SIZE,
      zIndex: cameraDockBounds.zIndex,
    };

    return dropZones;
  };

  const init = () => {
    const hasLayoutEngineLoadedOnce = Session.getItem('hasLayoutEngineLoadedOnce');
    if (isMobile) {
      layoutContextDispatch({
        type: ACTIONS.SET_LAYOUT_INPUT,
        value: (prevInput) => {
          const {
            sidebarNavigation, sidebarContent, presentation, cameraDock,
            externalVideo, genericMainContent, screenShare, sharedNotes,
          } = prevInput;
          const { sidebarContentPanel } = sidebarContent;
          const skyroomColumn = isSkyroomColumnLayout();
          const keepUsersOpenWithContent = !skyroomColumn
            && sidebarContentPanel !== PANELS.NONE;
          return defaultsDeep(
            {
              sidebarNavigation: {
                isOpen:
                  sidebarNavigation.isOpen || keepUsersOpenWithContent || false,
                sidebarNavPanel: sidebarNavigation.sidebarNavPanel,
              },
              sidebarContent: {
                isOpen: sidebarContentPanel !== PANELS.NONE,
                sidebarContentPanel: sidebarContent.sidebarContentPanel,
              },
              presentation: {
                isOpen: presentation.isOpen,
                slidesLength: presentation.slidesLength,
                currentSlide: {
                  ...presentation.currentSlide,
                },
              },
              cameraDock: {
                position: cameraDock.position || DEFAULT_VALUES.cameraPosition,
                numCameras: cameraDock.numCameras,
              },
              externalVideo: {
                hasExternalVideo: externalVideo.hasExternalVideo,
              },
              genericMainContent: {
                genericContentId: genericMainContent.genericContentId,
              },
              screenShare: {
                hasScreenShare: screenShare.hasScreenShare,
                width: screenShare.width,
                height: screenShare.height,
              },
              sharedNotes: {
                isPinned: sharedNotes.isPinned,
              },
            },
            hasLayoutEngineLoadedOnce ? prevInput : INITIAL_INPUT_STATE,
          );
        },
      });
    } else {
      layoutContextDispatch({
        type: ACTIONS.SET_LAYOUT_INPUT,
        value: (prevInput) => {
          const {
            sidebarNavigation, sidebarContent, presentation, cameraDock,
            externalVideo, genericMainContent, screenShare, sharedNotes,
          } = prevInput;
          const { sidebarContentPanel } = sidebarContent;
          const skyroomColumn = isSkyroomColumnLayout();
          const keepUsersOpenWithContent = !skyroomColumn
            && sidebarContentPanel !== PANELS.NONE;
          let sidebarContentPanelOverride = sidebarContentPanel;
          let overrideOpenSidebarPanel = sidebarContentPanel !== PANELS.NONE;
          let overrideOpenSidebarNavigation = sidebarNavigation.isOpen
            || keepUsersOpenWithContent || false;
          if (prevLayout === LAYOUT_TYPE.CAMERAS_ONLY
            || prevLayout === LAYOUT_TYPE.PRESENTATION_ONLY
            || prevLayout === LAYOUT_TYPE.MEDIA_ONLY) {
            overrideOpenSidebarNavigation = true;
            overrideOpenSidebarPanel = true;
            sidebarContentPanelOverride = PANELS.CHAT;
          }
          return defaultsDeep(
            {
              sidebarNavigation: {
                isOpen: overrideOpenSidebarNavigation,
              },
              sidebarContent: {
                isOpen: overrideOpenSidebarPanel,
                sidebarContentPanel: sidebarContentPanelOverride,
              },
              presentation: {
                isOpen: presentation.isOpen,
                slidesLength: presentation.slidesLength,
                currentSlide: {
                  ...presentation.currentSlide,
                },
              },
              cameraDock: {
                position: cameraDock.position || DEFAULT_VALUES.cameraPosition,
                numCameras: cameraDock.numCameras,
              },
              externalVideo: {
                hasExternalVideo: externalVideo.hasExternalVideo,
              },
              genericMainContent: {
                genericContentId: genericMainContent.genericContentId,
              },
              screenShare: {
                hasScreenShare: screenShare.hasScreenShare,
                width: screenShare.width,
                height: screenShare.height,
              },
              sharedNotes: {
                isPinned: sharedNotes.isPinned,
              },
            },
            hasLayoutEngineLoadedOnce ? prevInput : INITIAL_INPUT_STATE,
          );
        },
      });
    }
    Session.setItem('layoutReady', true);
    throttledCalculatesLayout();
  };

  const calculatesSidebarContentHeight = (cameraDockHeight) => {
    const { isOpen, slidesLength } = presentationInput;
    const { hasExternalVideo } = externalVideoInput;
    const { genericContentId } = genericMainContentInput;
    const { hasScreenShare } = screenShareInput;
    const { isPinned: isSharedNotesPinned } = sharedNotesInput;

    const hasPresentation = isPresentationEnabled && slidesLength !== 0;
    const isGeneralMediaOff = !hasPresentation && !hasExternalVideo
      && !hasScreenShare && !isSharedNotesPinned && !genericContentId;

    let sidebarContentHeight = 0;
    if (sidebarContentInput.isOpen) {
      if (isMobile) {
        sidebarContentHeight = windowHeight() - DEFAULT_VALUES.navBarHeight;
      } else if (
        cameraDockInput.numCameras > 0
        && cameraDockInput.position === CAMERADOCK_POSITION.SIDEBAR_CONTENT_BOTTOM
        && isOpen
        && !isGeneralMediaOff
      ) {
        sidebarContentHeight = windowHeight() - cameraDockHeight;
      } else {
        sidebarContentHeight = windowHeight();
      }
      sidebarContentHeight -= bannerAreaHeight();
    }
    return sidebarContentHeight;
  };

  const calculatesCameraDockBounds = (sidebarNavWidth, sidebarContentWidth, mediaAreaBounds) => {
    const { baseCameraDockBounds } = props;
    const sidebarSize = sidebarNavWidth + sidebarContentWidth;

    const baseBounds = baseCameraDockBounds(mediaAreaBounds, sidebarSize);

    // do not proceed if using values from LayoutEngine
    if (Object.keys(baseBounds).length > 0) {
      return baseBounds;
    }

    const {
      camerasMargin,
      cameraDockMinHeight,
      cameraDockMinWidth,
      presentationToolbarMinWidth,
    } = DEFAULT_VALUES;

    const navBarHeight = calculatesNavbarHeight();

    const cameraDockBounds = {};

    let cameraDockHeight = 0;
    let cameraDockWidth = 0;

    const lastSize = Storage.getItem('webcamSize') || { width: 0, height: 0 };
    let { width: lastWidth, height: lastHeight } = lastSize;

    if (cameraDockInput.isDragging) cameraDockBounds.zIndex = 99;
    else cameraDockBounds.zIndex = 1;

    const isCameraTop = cameraDockInput.position === CAMERADOCK_POSITION.CONTENT_TOP;
    const isCameraBottom = cameraDockInput.position === CAMERADOCK_POSITION.CONTENT_BOTTOM;
    const isCameraLeft = cameraDockInput.position === CAMERADOCK_POSITION.CONTENT_LEFT;
    const isCameraRight = cameraDockInput.position === CAMERADOCK_POSITION.CONTENT_RIGHT;
    const isCameraSidebar = cameraDockInput.position === CAMERADOCK_POSITION.SIDEBAR_CONTENT_BOTTOM;

    const stoppedResizing = prevIsResizing && !isResizing;
    if (stoppedResizing) {
      const isCameraTopOrBottom = cameraDockInput.position === CAMERADOCK_POSITION.CONTENT_TOP
        || cameraDockInput.position === CAMERADOCK_POSITION.CONTENT_BOTTOM;

      Storage.setItem('webcamSize', {
        width: isCameraTopOrBottom || isCameraSidebar ? lastWidth : cameraDockInput.width,
        height: isCameraTopOrBottom || isCameraSidebar ? cameraDockInput.height : lastHeight,
      });

      const updatedLastSize = Storage.getItem('webcamSize');
      lastWidth = updatedLastSize.width;
      lastHeight = updatedLastSize.height;
    }

    if (isCameraTop || isCameraBottom) {
      if ((lastHeight === 0 && !isResizing) || (isCameraTop && isMobile)) {
        cameraDockHeight = min(
          max(mediaAreaBounds.height * 0.2, cameraDockMinHeight),
          mediaAreaBounds.height - cameraDockMinHeight,
        );
      } else {
        const height = isResizing ? cameraDockInput.height : lastHeight;
        cameraDockHeight = min(
          max(height, cameraDockMinHeight),
          mediaAreaBounds.height - cameraDockMinHeight,
        );
      }

      cameraDockBounds.top = navBarHeight + bannerAreaHeight();
      cameraDockBounds.left = mediaAreaBounds.left;
      cameraDockBounds.right = isRTL ? sidebarSize : null;
      cameraDockBounds.minWidth = mediaAreaBounds.width;
      cameraDockBounds.width = mediaAreaBounds.width;
      cameraDockBounds.maxWidth = mediaAreaBounds.width;
      cameraDockBounds.minHeight = cameraDockMinHeight;
      cameraDockBounds.height = cameraDockHeight;
      cameraDockBounds.maxHeight = mediaAreaBounds.height * 0.8;

      if (isCameraBottom) {
        cameraDockBounds.top += mediaAreaBounds.height - cameraDockHeight;
      }

      return cameraDockBounds;
    }

    if (isCameraLeft || isCameraRight) {
      if (lastWidth === 0 && !isResizing) {
        cameraDockWidth = min(
          max(mediaAreaBounds.width * 0.2, cameraDockMinWidth),
          mediaAreaBounds.width - cameraDockMinWidth,
        );
      } else {
        const width = isResizing ? cameraDockInput.width : lastWidth;
        cameraDockWidth = min(
          max(width, cameraDockMinWidth),
          mediaAreaBounds.width - cameraDockMinWidth,
        );
      }

      cameraDockBounds.top = navBarHeight + bannerAreaHeight();
      cameraDockBounds.minWidth = cameraDockMinWidth;
      cameraDockBounds.width = cameraDockWidth;
      cameraDockBounds.maxWidth = mediaAreaBounds.width * 0.8;
      cameraDockBounds.presenterMaxWidth = mediaAreaBounds.width
        - presentationToolbarMinWidth - camerasMargin;
      cameraDockBounds.minHeight = cameraDockMinHeight;
      cameraDockBounds.height = mediaAreaBounds.height;
      cameraDockBounds.maxHeight = mediaAreaBounds.height;
      // button size in vertical position
      cameraDockBounds.height -= 20;

      if (isCameraRight) {
        const sizeValue = mediaAreaBounds.left + mediaAreaBounds.width - cameraDockWidth;
        cameraDockBounds.left = !isRTL ? sizeValue - camerasMargin : 0;
        cameraDockBounds.right = isRTL ? sizeValue + sidebarSize - camerasMargin : null;
      } else if (isCameraLeft) {
        cameraDockBounds.left = mediaAreaBounds.left + camerasMargin;
        cameraDockBounds.right = isRTL ? sidebarSize + camerasMargin * 2 : null;
      }

      return cameraDockBounds;
    }

    if (isCameraSidebar) {
      if (lastHeight === 0 && !isResizing) {
        cameraDockHeight = min(
          max(windowHeight() * 0.2, cameraDockMinHeight),
          windowHeight() - cameraDockMinHeight,
        );
      } else {
        const height = isResizing ? cameraDockInput.height : lastHeight;
        cameraDockHeight = min(
          max(height, cameraDockMinHeight),
          windowHeight() - cameraDockMinHeight,
        );
      }

      cameraDockBounds.top = windowHeight() - cameraDockHeight - bannerAreaHeight();
      cameraDockBounds.left = !isRTL ? sidebarNavWidth : 0;
      cameraDockBounds.right = isRTL ? sidebarNavWidth : 0;
      cameraDockBounds.minWidth = sidebarContentWidth;
      cameraDockBounds.width = sidebarContentWidth;
      cameraDockBounds.maxWidth = sidebarContentWidth;
      cameraDockBounds.minHeight = cameraDockMinHeight;
      cameraDockBounds.height = cameraDockHeight;
      cameraDockBounds.maxHeight = windowHeight() * 0.8;
    }
    return cameraDockBounds;
  };

  const calculatesMediaBounds = (sidebarNavWidth, sidebarContentWidth, cameraDockBounds) => {
    const { isOpen, slidesLength } = presentationInput;
    const { hasExternalVideo } = externalVideoInput;
    const { genericContentId } = genericMainContentInput;
    const { hasScreenShare } = screenShareInput;
    const { isPinned: isSharedNotesPinned } = sharedNotesInput;

    const { height: actionBarHeight } = calculatesActionbarHeight();
    const navBarHeight = calculatesNavbarHeight();
    const mediaAreaHeight = windowHeight()
      - (DEFAULT_VALUES.navBarHeight + actionBarHeight + bannerAreaHeight());
    const mediaAreaWidth = windowWidth() - (sidebarNavWidth + sidebarContentWidth);
    const mediaBounds = {};
    const { element: fullscreenElement } = fullscreen;
    const { camerasMargin } = DEFAULT_VALUES;

    const hasPresentation = (isPresentationEnabled && slidesLength !== 0) || isOpen;
    const isGeneralMediaOff = !hasPresentation && !hasExternalVideo
      && !hasScreenShare && !isSharedNotesPinned && !genericContentId;

    const hasAlternateStageMedia = hasScreenShare || hasExternalVideo
      || isSharedNotesPinned || genericContentId;

    if ((!isOpen && !hasAlternateStageMedia) || isGeneralMediaOff) {
      mediaBounds.width = 0;
      mediaBounds.height = 0;
      mediaBounds.top = 0;
      mediaBounds.left = !isRTL ? 0 : null;
      mediaBounds.right = isRTL ? 0 : null;
      mediaBounds.zIndex = 0;
      return mediaBounds;
    }

    if (
      fullscreenElement === 'Presentation'
      || fullscreenElement === 'Screenshare'
      || fullscreenElement === 'ExternalVideo'
      || fullscreenElement === 'GenericContent'
    ) {
      mediaBounds.width = windowWidth();
      mediaBounds.height = windowHeight();
      mediaBounds.top = 0;
      mediaBounds.left = !isRTL ? 0 : null;
      mediaBounds.right = isRTL ? 0 : null;
      mediaBounds.zIndex = 99;
      return mediaBounds;
    }

    const sidebarSize = sidebarNavWidth + sidebarContentWidth;

    if (cameraDockInput.numCameras > 0 && !cameraDockInput.isDragging) {
      switch (cameraDockInput.position) {
        case CAMERADOCK_POSITION.CONTENT_TOP: {
          mediaBounds.width = mediaAreaWidth;
          mediaBounds.height = mediaAreaHeight - cameraDockBounds.height - camerasMargin;
          mediaBounds.top = navBarHeight + cameraDockBounds.height
            + camerasMargin + bannerAreaHeight();
          mediaBounds.left = !isRTL ? sidebarSize : null;
          mediaBounds.right = isRTL ? sidebarSize : null;
          break;
        }
        case CAMERADOCK_POSITION.CONTENT_RIGHT: {
          mediaBounds.width = mediaAreaWidth - cameraDockBounds.width - camerasMargin * 2;
          mediaBounds.height = mediaAreaHeight;
          mediaBounds.top = navBarHeight + bannerAreaHeight();
          mediaBounds.left = !isRTL ? sidebarSize : null;
          mediaBounds.right = isRTL ? sidebarSize - camerasMargin * 2 : null;
          break;
        }
        case CAMERADOCK_POSITION.CONTENT_BOTTOM: {
          mediaBounds.width = mediaAreaWidth;
          mediaBounds.height = mediaAreaHeight - cameraDockBounds.height - camerasMargin;
          mediaBounds.top = navBarHeight - camerasMargin + bannerAreaHeight();
          mediaBounds.left = !isRTL ? sidebarSize : null;
          mediaBounds.right = isRTL ? sidebarSize : null;
          break;
        }
        case CAMERADOCK_POSITION.CONTENT_LEFT: {
          mediaBounds.width = mediaAreaWidth - cameraDockBounds.width - camerasMargin * 2;
          mediaBounds.height = mediaAreaHeight;
          mediaBounds.top = navBarHeight + bannerAreaHeight();
          const sizeValue = sidebarNavWidth + sidebarContentWidth
            + mediaAreaWidth - mediaBounds.width;
          mediaBounds.left = !isRTL ? sizeValue : null;
          mediaBounds.right = isRTL ? sidebarSize : null;
          break;
        }
        case CAMERADOCK_POSITION.SIDEBAR_CONTENT_BOTTOM: {
          mediaBounds.width = mediaAreaWidth;
          mediaBounds.height = mediaAreaHeight;
          mediaBounds.top = navBarHeight + bannerAreaHeight();
          mediaBounds.left = !isRTL ? sidebarSize : null;
          mediaBounds.right = isRTL ? sidebarSize : null;
          break;
        }
        default: {
          console.log('presentation - camera default');
        }
      }
      mediaBounds.zIndex = 1;
    } else {
      mediaBounds.width = mediaAreaWidth;
      mediaBounds.height = mediaAreaHeight;
      mediaBounds.top = navBarHeight + bannerAreaHeight();
      mediaBounds.left = !isRTL ? sidebarSize : null;
      mediaBounds.right = isRTL ? sidebarSize : null;
    }

    return mediaBounds;
  };

  const calculatesLayoutImmediate = () => {
    const {
      calculatesNavbarBounds,
      calculatesActionbarBounds,
      calculatesSidebarNavWidth,
      calculatesSidebarNavHeight,
      calculatesSidebarNavBounds,
      calculatesSidebarContentWidth,
      calculatesSidebarContentBounds,
      calculatesMediaAreaBounds,
      isTablet,
    } = props;
    const { position: cameraPosition } = cameraDockInput;
    const { camerasMargin, captionsMargin } = DEFAULT_VALUES;

    const sidebarNavWidth = calculatesSidebarNavWidth();
    const sidebarNavHeight = calculatesSidebarNavHeight();
    const sidebarContentWidth = calculatesSidebarContentWidth();
    const sidebarNavBounds = calculatesSidebarNavBounds();
    const sidebarContentBounds = calculatesSidebarContentBounds(sidebarNavWidth.width);
    const mediaAreaBounds = calculatesMediaAreaBounds(
      sidebarNavWidth.width,
      sidebarContentWidth.width,
    );
    const navbarBounds = calculatesNavbarBounds(mediaAreaBounds);
    const actionbarBounds = calculatesActionbarBounds(mediaAreaBounds);
    const cameraDockBounds = calculatesCameraDockBounds(
      sidebarNavWidth.width,
      sidebarContentWidth.width,
      mediaAreaBounds,
    );
    const dropZoneAreas = calculatesDropAreas(
      sidebarNavWidth.width,
      sidebarContentWidth.width,
      cameraDockBounds,
    );
    const sidebarContentHeight = calculatesSidebarContentHeight(cameraDockBounds.height);
    const mediaBounds = calculatesMediaBounds(
      sidebarNavWidth.width,
      sidebarContentWidth.width,
      cameraDockBounds,
    );
    const sidebarSize = sidebarContentWidth.width + sidebarNavWidth.width;
    const { height: actionBarHeight } = calculatesActionbarHeight();

    let horizontalCameraDiff = 0;

    if (cameraPosition === CAMERADOCK_POSITION.CONTENT_LEFT) {
      horizontalCameraDiff = cameraDockBounds.width + camerasMargin * 2;
    }

    if (cameraPosition === CAMERADOCK_POSITION.CONTENT_RIGHT) {
      horizontalCameraDiff = camerasMargin * 2;
    }

    let layoutSidebarNavHeight = sidebarNavHeight;
    let layoutSidebarContentHeight = sidebarContentHeight;
    let layoutSidebarSize = sidebarSize;
    let layoutNavbarBounds = navbarBounds;
    let layoutActionbarBounds = actionbarBounds;
    let layoutMediaAreaBounds = mediaAreaBounds;
    let layoutMediaBounds = mediaBounds;
    let layoutCameraDockBounds = cameraDockBounds;
    let skyroomColumnActive = false;

    const skyroomLayout = adjustSkyroomColumnLayout({
      isMobile,
      isRTL,
      bannerAreaHeight,
      windowWidth,
      windowHeight,
      sidebarNavigationInput,
      sidebarContentInput,
      cameraDockInput,
      sidebarNavWidth,
      sidebarNavHeight,
      sidebarNavBounds,
      sidebarContentWidth,
      sidebarContentBounds,
      sidebarContentHeight,
      mediaAreaBounds,
      cameraDockBounds,
      videoStreams,
      presentationIsOpen: presentationInput.isOpen,
      hasScreenShare: hasActiveScreenShare,
      numCameras: cameraDockInput.numCameras,
      localUserIsPrivileged,
    });

    if (skyroomLayout) {
      skyroomColumnActive = true;
      layoutSidebarNavHeight = skyroomLayout.sidebarNavHeight;
      layoutSidebarContentHeight = skyroomLayout.sidebarContentHeight;
      layoutSidebarSize = skyroomLayout.sidebarSize;
      layoutNavbarBounds = {
        ...navbarBounds,
        ...skyroomLayout.navbarFullWidth,
      };
      layoutActionbarBounds = {
        ...actionbarBounds,
        ...skyroomLayout.actionbarFullWidth,
      };
      layoutMediaAreaBounds = skyroomLayout.mediaAreaBounds;
      if (skyroomLayout.cameraDockPosition) {
        layoutContextDispatch({
          type: ACTIONS.SET_CAMERA_DOCK_POSITION,
          value: skyroomLayout.cameraDockPosition,
        });
      }
      if (skyroomLayout.cameraDockBounds) {
        layoutCameraDockBounds = skyroomLayout.cameraDockBounds;
      }
      if (skyroomLayout.screenshareMinimized) {
        layoutMediaBounds = {
          width: 0,
          height: 0,
          top: skyroomLayout.mediaAreaBounds.top,
          left: !isRTL ? skyroomLayout.mediaAreaBounds.left : null,
          right: isRTL ? skyroomLayout.mediaAreaBounds.right : null,
          zIndex: 0,
        };
      } else {
        layoutMediaBounds = {
          width: skyroomLayout.mediaAreaBounds.width,
          height: skyroomLayout.mediaAreaBounds.height,
          top: skyroomLayout.mediaAreaBounds.top,
          left: !isRTL ? skyroomLayout.mediaAreaBounds.left : null,
          right: isRTL ? skyroomLayout.mediaAreaBounds.right : null,
          zIndex: SKYROOM_STAGE_Z_INDEX,
        };
      }

      const layoutEl = document.getElementById('layout');
      // Mobile split (<600px) ⇒ flag it so layout.css gates desktop geometry off and
      // responsive.css positions the phone zones; desktop/tablet ⇒ clear the flag.
      if (skyroomLayout.isMobileSplit) {
        layoutEl?.setAttribute('data-skyroom-mobile', 'true');
        layoutEl?.setAttribute(
          'data-skyroom-mobile-has-top',
          skyroomLayout.mobileHasTopZone ? 'true' : 'false',
        );
        layoutEl?.setAttribute(
          'data-skyroom-mobile-has-bottom',
          skyroomLayout.mobileHasBottomZone ? 'true' : 'false',
        );
        if (skyroomLayout.mobileZoneFullscreen) {
          layoutEl?.setAttribute('data-skyroom-mobile-zone-fs', skyroomLayout.mobileZoneFullscreen);
        } else {
          layoutEl?.removeAttribute('data-skyroom-mobile-zone-fs');
        }
        layoutEl.style.setProperty('--skyroom-mobile-edge', `${SKYROOM_MOBILE_EDGE}px`);
        const bottomRect = skyroomLayout.mobileBottomRect;
        if (bottomRect) {
          layoutEl.style.setProperty('--skyroom-mobile-bottom-top', `${bottomRect.top}px`);
          layoutEl.style.setProperty('--skyroom-mobile-bottom-height', `${bottomRect.height}px`);
          layoutEl.style.setProperty('--skyroom-mobile-bottom-width', `${bottomRect.width}px`);
          if (bottomRect.left != null) {
            layoutEl.style.setProperty('--skyroom-mobile-bottom-left', `${bottomRect.left}px`);
            layoutEl.style.removeProperty('--skyroom-mobile-bottom-right');
          } else if (bottomRect.right != null) {
            layoutEl.style.setProperty('--skyroom-mobile-bottom-right', `${bottomRect.right}px`);
            layoutEl.style.removeProperty('--skyroom-mobile-bottom-left');
          }
        } else {
          layoutEl.style.removeProperty('--skyroom-mobile-bottom-top');
          layoutEl.style.removeProperty('--skyroom-mobile-bottom-height');
          layoutEl.style.removeProperty('--skyroom-mobile-bottom-width');
          layoutEl.style.removeProperty('--skyroom-mobile-bottom-left');
          layoutEl.style.removeProperty('--skyroom-mobile-bottom-right');
        }
        if (skyroomLayout.mobileCamerasInBottom) {
          layoutEl?.setAttribute('data-skyroom-mobile-bottom-webcams', 'true');
        } else {
          layoutEl?.removeAttribute('data-skyroom-mobile-bottom-webcams');
        }
        if (skyroomLayout.mobileCamerasInTop) {
          layoutEl?.setAttribute('data-skyroom-mobile-top-webcams', 'true');
          const topRect = skyroomLayout.mobileTopRect;
          if (topRect) {
            layoutEl.style.setProperty('--skyroom-mobile-top-top', `${topRect.top}px`);
            layoutEl.style.setProperty('--skyroom-mobile-top-height', `${topRect.height}px`);
            layoutEl.style.setProperty('--skyroom-mobile-top-width', `${topRect.width}px`);
            if (topRect.left != null) {
              layoutEl.style.setProperty('--skyroom-mobile-top-left', `${topRect.left}px`);
              layoutEl.style.removeProperty('--skyroom-mobile-top-right');
            } else if (topRect.right != null) {
              layoutEl.style.setProperty('--skyroom-mobile-top-right', `${topRect.right}px`);
              layoutEl.style.removeProperty('--skyroom-mobile-top-left');
            }
          }
        } else {
          layoutEl?.removeAttribute('data-skyroom-mobile-top-webcams');
          layoutEl.style.removeProperty('--skyroom-mobile-top-top');
          layoutEl.style.removeProperty('--skyroom-mobile-top-height');
          layoutEl.style.removeProperty('--skyroom-mobile-top-width');
          layoutEl.style.removeProperty('--skyroom-mobile-top-left');
          layoutEl.style.removeProperty('--skyroom-mobile-top-right');
        }
        if (skyroomLayout.mobileTalkingRailOffset > 0) {
          layoutEl.setAttribute('data-skyroom-mobile-talking-rail', 'true');
          layoutEl.style.setProperty(
            '--skyroom-mobile-talking-rail-top',
            `${skyroomLayout.mobileTalkingRailTop}px`,
          );
          layoutEl.style.setProperty(
            '--skyroom-mobile-talking-rail-offset',
            `${skyroomLayout.mobileTalkingRailOffset}px`,
          );
        } else {
          layoutEl.removeAttribute('data-skyroom-mobile-talking-rail');
          layoutEl.style.removeProperty('--skyroom-mobile-talking-rail-top');
          layoutEl.style.removeProperty('--skyroom-mobile-talking-rail-offset');
        }
        if (skyroomLayout.mobileStatusRailOffset > 0) {
          layoutEl.setAttribute('data-skyroom-mobile-status-rail', 'true');
          layoutEl.style.setProperty(
            '--skyroom-mobile-status-rail-top',
            `${skyroomLayout.mobileStatusRailTop}px`,
          );
          layoutEl.style.setProperty(
            '--skyroom-mobile-status-rail-offset',
            `${skyroomLayout.mobileStatusRailOffset}px`,
          );
        } else {
          layoutEl.removeAttribute('data-skyroom-mobile-status-rail');
          layoutEl.style.removeProperty('--skyroom-mobile-status-rail-top');
          layoutEl.style.removeProperty('--skyroom-mobile-status-rail-offset');
        }
      } else {
        layoutEl?.removeAttribute('data-skyroom-mobile');
        layoutEl?.removeAttribute('data-skyroom-mobile-has-top');
        layoutEl?.removeAttribute('data-skyroom-mobile-has-bottom');
        layoutEl?.removeAttribute('data-skyroom-mobile-zone-fs');
        layoutEl?.style.removeProperty('--skyroom-mobile-edge');
        layoutEl?.style.removeProperty('--skyroom-mobile-bottom-top');
        layoutEl?.style.removeProperty('--skyroom-mobile-bottom-height');
        layoutEl?.style.removeProperty('--skyroom-mobile-bottom-width');
        layoutEl?.style.removeProperty('--skyroom-mobile-bottom-left');
        layoutEl?.style.removeProperty('--skyroom-mobile-bottom-right');
        layoutEl?.removeAttribute('data-skyroom-mobile-bottom-webcams');
        layoutEl?.removeAttribute('data-skyroom-mobile-top-webcams');
        layoutEl?.style.removeProperty('--skyroom-mobile-top-top');
        layoutEl?.style.removeProperty('--skyroom-mobile-top-height');
        layoutEl?.style.removeProperty('--skyroom-mobile-top-width');
        layoutEl?.style.removeProperty('--skyroom-mobile-top-left');
        layoutEl?.style.removeProperty('--skyroom-mobile-top-right');
        layoutEl?.removeAttribute('data-skyroom-mobile-talking-rail');
        layoutEl?.style.removeProperty('--skyroom-mobile-talking-rail-top');
        layoutEl?.style.removeProperty('--skyroom-mobile-talking-rail-offset');
        layoutEl?.removeAttribute('data-skyroom-mobile-status-rail');
        layoutEl?.style.removeProperty('--skyroom-mobile-status-rail-top');
        layoutEl?.style.removeProperty('--skyroom-mobile-status-rail-offset');
      }
      if (layoutEl) {
        const stageTop = layoutMediaBounds.top ?? skyroomLayout.mediaAreaBounds.top ?? 0;
        const stageHeight = layoutMediaBounds.height ?? skyroomLayout.mediaAreaBounds.height ?? 0;
        const stageWidth = layoutMediaBounds.width
          ?? skyroomLayout.mediaAreaBounds.width
          ?? 0;
        let stageLeft = !isRTL
          ? (layoutMediaBounds.left ?? skyroomLayout.mediaAreaBounds.left)
          : null;
        if (stageLeft == null && isRTL) {
          const stageRight = layoutMediaBounds.right ?? skyroomLayout.mediaAreaBounds.right ?? 0;
          stageLeft = windowWidth - stageRight - stageWidth;
        }
        stageLeft = stageLeft ?? 0;
        const actionbarTop = layoutActionbarBounds.top
          ?? (windowHeight - (layoutActionbarBounds.height
            ?? layoutActionbarBounds.innerHeight
            ?? 56));
        layoutEl.style.setProperty('--skyroom-stage-top', `${stageTop}px`);
        layoutEl.style.setProperty('--skyroom-stage-bottom', `${stageTop + stageHeight}px`);
        layoutEl.style.setProperty('--skyroom-stage-left', `${stageLeft}px`);
        layoutEl.style.setProperty('--skyroom-stage-width', `${stageWidth}px`);
        // Unitless companion (no px) so CSS can derive a proportional scale for the
        // whiteboard chrome via calc()/clamp() — recomputes on resize + panel changes.
        layoutEl.style.setProperty('--skyroom-stage-width-num', `${stageWidth}`);
        layoutEl.style.setProperty('--skyroom-actionbar-top', `${actionbarTop}px`);

        const notesBounds = skyroomLayout.notesColumnBounds;
        if (notesBounds) {
          layoutEl.style.setProperty('--skyroom-notes-top', `${notesBounds.top}px`);
          layoutEl.style.setProperty('--skyroom-notes-width', `${notesBounds.width}px`);
          layoutEl.style.setProperty('--skyroom-notes-height', `${notesBounds.height}px`);
          if (notesBounds.left != null) {
            layoutEl.style.setProperty('--skyroom-notes-left', `${notesBounds.left}px`);
            layoutEl.style.removeProperty('--skyroom-notes-right');
          } else if (notesBounds.right != null) {
            layoutEl.style.setProperty('--skyroom-notes-right', `${notesBounds.right}px`);
            layoutEl.style.removeProperty('--skyroom-notes-left');
          }
        } else {
          layoutEl.style.removeProperty('--skyroom-notes-top');
          layoutEl.style.removeProperty('--skyroom-notes-left');
          layoutEl.style.removeProperty('--skyroom-notes-right');
          layoutEl.style.removeProperty('--skyroom-notes-width');
          layoutEl.style.removeProperty('--skyroom-notes-height');
        }
      }
      const hasStageWebcamStrip = (skyroomLayout.stageWebcamStripHeight ?? 0) > 0;
      if (layoutEl) {
        const shareTop = layoutMediaBounds.top ?? 0;
        const shareHeight = layoutMediaBounds.height ?? 0;
        layoutEl.style.setProperty('--skyroom-screenshare-top', `${shareTop}px`);
        layoutEl.style.setProperty('--skyroom-screenshare-height', `${shareHeight}px`);
        layoutEl.style.setProperty(
          '--skyroom-stage-webcam-height',
          `${skyroomLayout.stageWebcamStripHeight ?? 0}px`,
        );

        const stageDock = hasStageWebcamStrip ? skyroomLayout.cameraDockBounds : null;
        if (stageDock?.height > 0) {
          layoutEl.style.setProperty('--skyroom-stage-webcam-top', `${stageDock.top}px`);
          if (stageDock.left != null) {
            layoutEl.style.setProperty('--skyroom-stage-webcam-left', `${stageDock.left}px`);
            layoutEl.style.removeProperty('--skyroom-stage-webcam-right');
          } else if (stageDock.right != null) {
            layoutEl.style.setProperty('--skyroom-stage-webcam-right', `${stageDock.right}px`);
            layoutEl.style.removeProperty('--skyroom-stage-webcam-left');
          }
          layoutEl.style.setProperty('--skyroom-stage-webcam-width', `${stageDock.width}px`);
          layoutEl.setAttribute('data-skyroom-stage-webcams', 'true');
        } else {
          layoutEl.style.removeProperty('--skyroom-stage-webcam-top');
          layoutEl.style.removeProperty('--skyroom-stage-webcam-left');
          layoutEl.style.removeProperty('--skyroom-stage-webcam-right');
          layoutEl.style.removeProperty('--skyroom-stage-webcam-width');
          layoutEl.removeAttribute('data-skyroom-stage-webcams');
        }
      }

      const hasSidebarWebcams = skyroomLayout.useSidebarWebcam;

      if (hasSidebarWebcams) {
        layoutEl?.setAttribute('data-skyroom-sidebar-webcam', 'true');
        if (skyroomLayout.useSplitCameras) {
          layoutEl?.setAttribute('data-skyroom-split-cameras', 'true');
        } else {
          layoutEl?.removeAttribute('data-skyroom-split-cameras');
        }
        const sidebarDock = skyroomLayout.sidebarCameraDockBounds;
        if (layoutEl && sidebarDock) {
          layoutEl.style.setProperty('--skyroom-sidebar-webcam-top', `${sidebarDock.top}px`);
          if (sidebarDock.left != null) {
            layoutEl.style.setProperty('--skyroom-sidebar-webcam-left', `${sidebarDock.left}px`);
            layoutEl.style.removeProperty('--skyroom-sidebar-webcam-right');
          } else if (sidebarDock.right != null) {
            layoutEl.style.setProperty('--skyroom-sidebar-webcam-right', `${sidebarDock.right}px`);
            layoutEl.style.removeProperty('--skyroom-sidebar-webcam-left');
          }
          layoutEl.style.setProperty('--skyroom-sidebar-webcam-width', `${sidebarDock.width}px`);
          layoutEl.style.setProperty('--skyroom-sidebar-webcam-height', `${sidebarDock.height}px`);
        }
      } else {
        layoutEl?.removeAttribute('data-skyroom-sidebar-webcam');
        layoutEl?.removeAttribute('data-skyroom-split-cameras');
        layoutEl?.style.removeProperty('--skyroom-sidebar-webcam-top');
        layoutEl?.style.removeProperty('--skyroom-sidebar-webcam-left');
        layoutEl?.style.removeProperty('--skyroom-sidebar-webcam-right');
        layoutEl?.style.removeProperty('--skyroom-sidebar-webcam-width');
        layoutEl?.style.removeProperty('--skyroom-sidebar-webcam-height');
      }

      layoutEl?.removeAttribute('data-skyroom-webcam-float');

      const hasWebcamLayout = Boolean(
        skyroomLayout.cameraDockBounds
        || skyroomLayout.centerWebcamBounds
        || skyroomLayout.sidebarWebcamDropEnabled
        || hasSidebarWebcams,
      );

      // Phone split uses BBB's default webcam grid (positioned via cameraDock bounds),
      // not the Skyroom drag zones — so clear the zone layout on mobile.
      if (hasWebcamLayout && !skyroomLayout.isMobileSplit) {
        setSkyroomWebcamLayout({
          hasSidebar: hasSidebarWebcams,
          split: Boolean(skyroomLayout.useSplitCameras && hasSidebarWebcams),
          sidebar: skyroomLayout.sidebarCameraDockBounds,
          sidebarDrop: skyroomLayout.sidebarWebcamDropBounds,
          sidebarDropEnabled: skyroomLayout.sidebarWebcamDropEnabled,
          stage: skyroomLayout.cameraDockBounds,
          stageStrip: skyroomLayout.stageStripBounds,
          center: skyroomLayout.centerWebcamBounds,
          centerDrop: skyroomLayout.centerDropBounds,
          centerDropEnabled: skyroomLayout.centerDropEnabled,
          stageMediaOpen: skyroomLayout.stageMediaOpen,
          sidebarStackVisible: Boolean(skyroomLayout.sidebarStackActive),
        });
      } else {
        clearSkyroomWebcamLayout();
      }
    } else {
      const layoutElOff = document.getElementById('layout');
      layoutElOff?.removeAttribute('data-skyroom-mobile');
      layoutElOff?.removeAttribute('data-skyroom-mobile-has-top');
      layoutElOff?.removeAttribute('data-skyroom-mobile-has-bottom');
      layoutElOff?.removeAttribute('data-skyroom-mobile-zone-fs');
      layoutElOff?.style.removeProperty('--skyroom-mobile-edge');
      layoutElOff?.style.removeProperty('--skyroom-mobile-bottom-top');
      layoutElOff?.style.removeProperty('--skyroom-mobile-bottom-height');
      layoutElOff?.removeAttribute('data-skyroom-mobile-talking-rail');
      layoutElOff?.style.removeProperty('--skyroom-mobile-talking-rail-top');
      layoutElOff?.style.removeProperty('--skyroom-mobile-talking-rail-offset');
      layoutElOff?.removeAttribute('data-skyroom-mobile-status-rail');
      layoutElOff?.style.removeProperty('--skyroom-mobile-status-rail-top');
      layoutElOff?.style.removeProperty('--skyroom-mobile-status-rail-offset');
      layoutElOff?.removeAttribute('data-skyroom-sidebar-webcam');
      layoutElOff?.removeAttribute('data-skyroom-split-cameras');
      layoutElOff?.removeAttribute('data-skyroom-webcam-float');
      layoutElOff?.style.removeProperty('--skyroom-stage-top');
      layoutElOff?.style.removeProperty('--skyroom-stage-bottom');
      layoutElOff?.style.removeProperty('--skyroom-stage-left');
      layoutElOff?.style.removeProperty('--skyroom-stage-width');
      layoutElOff?.style.removeProperty('--skyroom-actionbar-top');
      clearSkyroomWebcamLayout();
    }

    layoutContextDispatch({
      type: ACTIONS.SET_NAVBAR_OUTPUT,
      value: {
        display: navbarInput.hasNavBar,
        width: layoutNavbarBounds.width,
        height: layoutNavbarBounds.height,
        top: layoutNavbarBounds.top,
        left: layoutNavbarBounds.left,
        tabOrder: DEFAULT_VALUES.navBarTabOrder,
        zIndex: layoutNavbarBounds.zIndex,
      },
    });

    layoutContextDispatch({
      type: ACTIONS.SET_ACTIONBAR_OUTPUT,
      value: {
        display: actionbarInput.hasActionBar,
        width: layoutActionbarBounds.width,
        height: layoutActionbarBounds.height,
        innerHeight: layoutActionbarBounds.innerHeight,
        top: layoutActionbarBounds.top,
        left: layoutActionbarBounds.left,
        padding: layoutActionbarBounds.padding,
        tabOrder: DEFAULT_VALUES.actionBarTabOrder,
        zIndex: layoutActionbarBounds.zIndex,
      },
    });

    layoutContextDispatch({
      type: ACTIONS.SET_CAPTIONS_OUTPUT,
      value: {
        left: !isRTL ? layoutSidebarSize + captionsMargin : null,
        right: isRTL ? layoutSidebarSize + captionsMargin : null,
        maxWidth: layoutMediaAreaBounds.width - captionsMargin * 2,
      },
    });

    const sidebarNavigationDisplay = skyroomLayout?.isMobileSplit
      ? skyroomLayout.mobileActiveBox === 'users'
      : sidebarNavigationInput.isOpen;
    const sidebarContentDisplay = skyroomLayout?.isMobileSplit
      ? skyroomLayout.mobileActiveBox === 'chat'
      : sidebarContentInput.isOpen;

    layoutContextDispatch({
      type: ACTIONS.SET_SIDEBAR_NAVIGATION_OUTPUT,
      value: {
        display: sidebarNavigationDisplay,
        minWidth: sidebarNavWidth.minWidth,
        width: sidebarNavWidth.width,
        maxWidth: sidebarNavWidth.maxWidth,
        height: layoutSidebarNavHeight,
        top: sidebarNavBounds.top,
        left: sidebarNavBounds.left,
        right: sidebarNavBounds.right,
        tabOrder: DEFAULT_VALUES.sidebarNavTabOrder,
        isResizable: !skyroomColumnActive && !isMobile && !isTablet,
        zIndex: sidebarNavBounds.zIndex,
      },
    });

    layoutContextDispatch({
      type: ACTIONS.SET_SIDEBAR_NAVIGATION_RESIZABLE_EDGE,
      value: {
        top: false,
        right: !skyroomColumnActive && !isRTL,
        bottom: false,
        left: skyroomColumnActive ? false : isRTL,
      },
    });

    layoutContextDispatch({
      type: ACTIONS.SET_SIDEBAR_CONTENT_OUTPUT,
      value: {
        display: sidebarContentDisplay,
        minWidth: sidebarContentWidth.minWidth,
        width: sidebarContentWidth.width,
        maxWidth: sidebarContentWidth.maxWidth,
        height: layoutSidebarContentHeight,
        top: sidebarContentBounds.top,
        left: sidebarContentBounds.left,
        right: sidebarContentBounds.right,
        currentPanelType,
        tabOrder: DEFAULT_VALUES.sidebarContentTabOrder,
        isResizable: !skyroomColumnActive && !isMobile && !isTablet,
        zIndex: sidebarContentBounds.zIndex,
      },
    });

    layoutContextDispatch({
      type: ACTIONS.SET_SIDEBAR_CONTENT_RESIZABLE_EDGE,
      value: {
        top: false,
        right: !skyroomColumnActive && !isRTL,
        bottom: false,
        left: skyroomColumnActive ? false : isRTL,
      },
    });

    layoutContextDispatch({
      type: ACTIONS.SET_MEDIA_AREA_SIZE,
      value: {
        width: skyroomColumnActive
          ? windowWidth() - layoutSidebarSize
          : windowWidth() - sidebarNavWidth.width - sidebarContentWidth.width,
        height: windowHeight() - (skyroomColumnActive
          ? SKYROOM_NAVBAR_H + SKYROOM_FOOTER_H
          : DEFAULT_VALUES.navBarHeight + actionBarHeight),
      },
    });

    const isMediaOpen = layoutMediaBounds?.width > 0 && layoutMediaBounds?.height > 0;
    const skyroomCameraPosition = skyroomColumnActive
      ? skyroomLayout?.cameraDockPosition
      : null;
    const effectiveCameraPosition = skyroomCameraPosition || cameraDockInput.position;
    const dockBoundsSource = (skyroomColumnActive && skyroomLayout?.cameraDockBounds)
      ? skyroomLayout.cameraDockBounds
      : layoutCameraDockBounds;
    const safeCameraDockBounds = {
      minWidth: 0,
      width: 0,
      maxWidth: 0,
      presenterMaxWidth: 0,
      minHeight: 0,
      height: 0,
      maxHeight: 0,
      top: 0,
      left: 0,
      right: null,
      zIndex: 1,
      ...cameraDockBounds,
      ...dockBoundsSource,
    };

    layoutContextDispatch({
      type: ACTIONS.SET_CAMERA_DOCK_OUTPUT,
      value: {
        display: cameraDockInput.numCameras > 0,
        position: effectiveCameraPosition,
        minWidth: safeCameraDockBounds.minWidth,
        width: safeCameraDockBounds.width,
        maxWidth: safeCameraDockBounds.maxWidth,
        presenterMaxWidth: safeCameraDockBounds.presenterMaxWidth,
        minHeight: safeCameraDockBounds.minHeight,
        height: safeCameraDockBounds.height,
        maxHeight: safeCameraDockBounds.maxHeight,
        top: safeCameraDockBounds.top,
        left: safeCameraDockBounds.left,
        right: safeCameraDockBounds.right,
        tabOrder: 4,
        isDraggable: skyroomColumnActive
          ? false
          : (!isMobile && !isTablet && isMediaOpen),
        resizableEdge: skyroomColumnActive
          ? {
            top: false, right: false, bottom: false, left: false,
          }
          : {
            top:
            isMediaOpen
              && (effectiveCameraPosition === CAMERADOCK_POSITION.CONTENT_BOTTOM
              || (effectiveCameraPosition === CAMERADOCK_POSITION.SIDEBAR_CONTENT_BOTTOM
              && input.sidebarContent.isOpen)),
            right:
              isMediaOpen
              && ((!isRTL && effectiveCameraPosition === CAMERADOCK_POSITION.CONTENT_LEFT)
              || (isRTL && effectiveCameraPosition === CAMERADOCK_POSITION.CONTENT_RIGHT)),
            bottom: isMediaOpen && effectiveCameraPosition === CAMERADOCK_POSITION.CONTENT_TOP,
            left:
              isMediaOpen
              && ((!isRTL && effectiveCameraPosition === CAMERADOCK_POSITION.CONTENT_RIGHT)
              || (isRTL && effectiveCameraPosition === CAMERADOCK_POSITION.CONTENT_LEFT)),
          },
        zIndex: safeCameraDockBounds.zIndex,
        focusedId: input.cameraDock.focusedId,
      },
    });

    layoutContextDispatch({
      type: ACTIONS.SET_DROP_AREAS,
      value: dropZoneAreas,
    });

    const hidePresentationForScreenshare = skyroomColumnActive
      && hasActiveScreenShare;

    layoutContextDispatch({
      type: ACTIONS.SET_PRESENTATION_OUTPUT,
      value: {
        display: hidePresentationForScreenshare ? false : presentationInput.isOpen,
        width: layoutMediaBounds.width,
        height: layoutMediaBounds.height,
        top: layoutMediaBounds.top,
        left: layoutMediaBounds.left,
        right: isRTL ? layoutMediaBounds.right + horizontalCameraDiff : null,
        tabOrder: DEFAULT_VALUES.presentationTabOrder,
        isResizable: false,
        zIndex: layoutMediaBounds.zIndex,
      },
    });

    layoutContextDispatch({
      type: ACTIONS.SET_SCREEN_SHARE_OUTPUT,
      value: {
        width: layoutMediaBounds.width,
        height: layoutMediaBounds.height,
        top: layoutMediaBounds.top,
        left: layoutMediaBounds.left,
        right: isRTL ? layoutMediaBounds.right + horizontalCameraDiff : null,
        zIndex: layoutMediaBounds.zIndex,
      },
    });

    layoutContextDispatch({
      type: ACTIONS.SET_EXTERNAL_VIDEO_OUTPUT,
      value: {
        display: externalVideoInput.hasExternalVideo,
        width: layoutMediaBounds.width,
        height: layoutMediaBounds.height,
        top: layoutMediaBounds.top,
        left: layoutMediaBounds.left,
        right: isRTL ? layoutMediaBounds.right + horizontalCameraDiff : null,
      },
    });

    layoutContextDispatch({
      type: ACTIONS.SET_GENERIC_CONTENT_OUTPUT,
      value: {
        width: layoutMediaBounds.width,
        height: layoutMediaBounds.height,
        top: layoutMediaBounds.top,
        left: layoutMediaBounds.left,
        right: isRTL ? layoutMediaBounds.right + horizontalCameraDiff : null,
      },
    });

    layoutContextDispatch({
      type: ACTIONS.SET_SHARED_NOTES_OUTPUT,
      value: {
        width: layoutMediaBounds.width,
        height: layoutMediaBounds.height,
        top: layoutMediaBounds.top,
        left: layoutMediaBounds.left,
        right: isRTL ? layoutMediaBounds.right + horizontalCameraDiff : null,
      },
    });
  };

  const calculatesLayout = () => {
    if (calculatesLayoutPendingRef.current) return;
    calculatesLayoutPendingRef.current = true;
    queueMicrotask(() => {
      calculatesLayoutPendingRef.current = false;
      calculatesLayoutImmediate();
    });
  };

  calculatesLayoutRef.current = calculatesLayout;

  /* eslint-enable no-use-before-define */
  return null;
};

export default CustomLayout;

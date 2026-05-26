import { PANELS, CAMERADOCK_POSITION } from '/imports/ui/components/layout/enums';
import DEFAULT_VALUES from '/imports/ui/components/layout/defaultValues';
import {
  classifySkyroomCameras,
  resolveSkyroomCameraPlacement,
  calcStageWebcamHeight,
  countStageWebcamSlots,
  PRIVILEGED_SIDEBAR_MAX,
  SKYROOM_SIDEBAR_WEBCAM_H,
  SKYROOM_STAGE_WEBCAM_MIN_H,
} from './camera-placement';

export const SKYROOM_COLUMN_ATTR = 'data-skyroom-column';

/** Match layout.css --skyroom-block-gap (header/footer/panel rhythm) */
export const SKYROOM_BLOCK_GAP = 22;
const GAP = 14;
const STAGE_GAP = SKYROOM_BLOCK_GAP;
/** Match layout.css --skyroom-footer-h */
export const SKYROOM_FOOTER_H = 56;
/** Two-row navbar (title + talking/timer). Match layout.css --skyroom-navbar-h */
export const SKYROOM_NAVBAR_H = 100;
/** @deprecated use SKYROOM_FOOTER_H */
export const SKYROOM_CHROME_H = SKYROOM_FOOTER_H;
/** Stage media (slides, whiteboard, screenshare) */
export const SKYROOM_STAGE_Z_INDEX = 6;
/** Stage webcam strip sits above screenshare while desktop is shared */
export const SKYROOM_STAGE_WEBCAM_Z_INDEX = 7;
const MIN_COLUMN = 292;
const MAX_COLUMN = 328;
const MIN_USERS = 180;
const MIN_CHAT = 160;
/** When users + chat are both open, chat gets the larger share */
const CHAT_PANEL_HEIGHT_RATIO = 0.6;

const isSkyroomColumnActive = () => {
  const layoutEl = document.getElementById('layout');
  return Boolean(layoutEl?.hasAttribute(SKYROOM_COLUMN_ATTR));
};

const buildSidebarCameraDockBounds = ({
  areaTop,
  columnW,
  isRTL,
  cameraDockBounds,
}) => ({
  ...cameraDockBounds,
  top: areaTop,
  left: isRTL ? null : 0,
  right: isRTL ? 0 : null,
  minWidth: columnW,
  width: columnW,
  maxWidth: columnW,
  minHeight: SKYROOM_SIDEBAR_WEBCAM_H,
  height: SKYROOM_SIDEBAR_WEBCAM_H,
  maxHeight: SKYROOM_SIDEBAR_WEBCAM_H,
  zIndex: 4,
});

const buildStageCameraDockBounds = ({
  stageWebcamTop,
  stageWebcamH,
  stageLeft,
  stageRight,
  stageWidth,
  cameraDockBounds,
}) => ({
  ...cameraDockBounds,
  top: stageWebcamTop,
  left: stageLeft,
  right: stageRight,
  minWidth: stageWidth,
  width: stageWidth,
  maxWidth: stageWidth,
  minHeight: stageWebcamH,
  height: stageWebcamH,
  maxHeight: stageWebcamH,
  zIndex: SKYROOM_STAGE_WEBCAM_Z_INDEX,
});

/**
 * Stacks webcam + users + chat in a single sidebar column (Skyroom-style).
 * Users and chat can be toggled independently; both hidden = full-width stage.
 */
const adjustSkyroomColumnLayout = ({
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
  mediaAreaBounds,
  cameraDockBounds,
  videoStreams = [],
  presentationIsOpen = true,
  hasScreenShare = false,
  numCameras = 0,
  localUserIsPrivileged = false,
}) => {
  /* eslint-disable no-param-reassign -- layout engine mutates bound objects in place */
  if (isMobile || !isSkyroomColumnActive()) return null;

  const usersOpen = sidebarNavigationInput.isOpen;
  const chatOpen = sidebarContentInput.isOpen
    && sidebarContentInput.sidebarContentPanel === PANELS.CHAT;
  const columnVisible = usersOpen || chatOpen;
  const screenshareMinimized = hasScreenShare && !presentationIsOpen;

  const viewportW = windowWidth();
  const viewportH = windowHeight();
  const banner = bannerAreaHeight();

  const columnW = columnVisible
    ? Math.min(MAX_COLUMN, Math.max(MIN_COLUMN, Math.round(viewportW * 0.21)))
    : 0;

  const areaTop = SKYROOM_NAVBAR_H + banner + SKYROOM_BLOCK_GAP;
  const footerReserve = SKYROOM_FOOTER_H + SKYROOM_BLOCK_GAP;
  const areaHeight = viewportH - areaTop - footerReserve;
  const columnBottom = areaTop + areaHeight;

  const {
    privilegedCount: classifiedPrivilegedCount,
    viewerCount,
    totalCount,
  } = classifySkyroomCameras(videoStreams);

  let privilegedCount = classifiedPrivilegedCount;
  if (privilegedCount <= 0 && localUserIsPrivileged && numCameras > 0) {
    privilegedCount = Math.min(numCameras, PRIVILEGED_SIDEBAR_MAX);
  }

  let useSidebar;
  let useStage;
  let useSplit;
  let stageCameraCount;

  const reserveStageWebcamStrip = hasScreenShare && !screenshareMinimized;

  if (screenshareMinimized && totalCount > 0) {
    useSidebar = false;
    useStage = true;
    useSplit = false;
    stageCameraCount = totalCount;
  } else if (reserveStageWebcamStrip) {
    const stageSlotCount = countStageWebcamSlots({
      privilegedCount,
      viewerCount,
      numCameras,
      localUserIsPrivileged,
    });
    ({
      useSidebar,
      useStage,
      useSplit,
      stageCameraCount,
    } = resolveSkyroomCameraPlacement({
      privilegedCount,
      viewerCount,
    }));
    if (stageSlotCount > 0) {
      useStage = true;
      stageCameraCount = Math.max(stageCameraCount, stageSlotCount);
      useSidebar = privilegedCount > 0;
      useSplit = useSidebar && useStage;
    }
  } else {
    ({
      useSidebar,
      useStage,
      useSplit,
      stageCameraCount,
    } = resolveSkyroomCameraPlacement({
      privilegedCount,
      viewerCount,
    }));
  }

  const sidebarWebcamH = useSidebar ? SKYROOM_SIDEBAR_WEBCAM_H : 0;
  let stageWebcamH = useStage ? calcStageWebcamHeight(stageCameraCount) : 0;

  const sidebarPanelTop = areaTop + sidebarWebcamH + (sidebarWebcamH ? GAP : 0);
  const sidebarPanelAreaHeight = areaHeight - sidebarWebcamH - (sidebarWebcamH ? GAP : 0);

  let usersH = 0;
  let chatH = 0;

  if (usersOpen && chatOpen) {
    const shared = sidebarPanelAreaHeight - GAP;
    chatH = Math.max(MIN_CHAT, Math.round(shared * CHAT_PANEL_HEIGHT_RATIO));
    usersH = Math.max(MIN_USERS, shared - chatH);
  } else if (usersOpen) {
    usersH = sidebarPanelAreaHeight;
  } else if (chatOpen) {
    chatH = sidebarPanelAreaHeight;
  }

  sidebarNavWidth.minWidth = columnVisible ? MIN_COLUMN : 0;
  sidebarNavWidth.width = columnW;
  sidebarNavWidth.maxWidth = columnVisible ? MAX_COLUMN : 0;

  sidebarContentWidth.minWidth = columnVisible ? MIN_COLUMN : 0;
  sidebarContentWidth.width = columnW;
  sidebarContentWidth.maxWidth = columnVisible ? MAX_COLUMN : 0;

  sidebarNavBounds.top = sidebarPanelTop;
  sidebarNavHeight = usersH;

  sidebarContentBounds.top = usersOpen && chatOpen
    ? sidebarPanelTop + usersH + GAP
    : sidebarPanelTop;
  sidebarContentBounds.left = sidebarNavBounds.left;
  sidebarContentBounds.right = sidebarNavBounds.right;

  const nextSidebarContentHeight = chatH;

  const stageWidth = columnVisible
    ? viewportW - columnW - STAGE_GAP * 2
    : viewportW - STAGE_GAP * 2;
  mediaAreaBounds.width = stageWidth;
  if (isRTL) {
    mediaAreaBounds.left = STAGE_GAP;
    mediaAreaBounds.right = columnVisible ? columnW + STAGE_GAP : STAGE_GAP;
  } else {
    mediaAreaBounds.left = columnVisible ? columnW + STAGE_GAP : STAGE_GAP;
    mediaAreaBounds.right = null;
  }

  let presentationTop = areaTop;
  if (usersOpen) {
    presentationTop = areaTop + SKYROOM_BLOCK_GAP;
  } else if (chatOpen) {
    presentationTop = areaTop;
  }

  let presentationHeight = columnBottom - presentationTop;
  let stageWebcamStripTop = presentationTop;

  if (screenshareMinimized && totalCount > 0) {
    stageWebcamH = Math.max(SKYROOM_STAGE_WEBCAM_MIN_H, presentationHeight);
    mediaAreaBounds.top = presentationTop;
    mediaAreaBounds.height = presentationHeight;
  } else if (screenshareMinimized) {
    mediaAreaBounds.top = presentationTop;
    mediaAreaBounds.height = 0;
    stageWebcamH = 0;
  } else if (useStage && stageWebcamH > 0) {
    stageWebcamStripTop = presentationTop;
    presentationTop = stageWebcamStripTop + stageWebcamH + GAP;
    presentationHeight = Math.max(120, columnBottom - presentationTop);
    mediaAreaBounds.top = presentationTop;
    mediaAreaBounds.height = presentationHeight;
  } else {
    mediaAreaBounds.top = presentationTop;
    mediaAreaBounds.height = presentationHeight;
  }

  let skyroomCameraDockBounds = null;
  let sidebarCameraDockBounds = null;
  let cameraDockPosition = cameraDockInput.position;

  if (useSidebar && columnVisible) {
    sidebarCameraDockBounds = buildSidebarCameraDockBounds({
      areaTop,
      columnW,
      isRTL,
      cameraDockBounds,
    });
  }

  if (useStage && stageWebcamH > 0) {
    const stageWebcamTop = screenshareMinimized ? presentationTop : stageWebcamStripTop;
    skyroomCameraDockBounds = buildStageCameraDockBounds({
      stageWebcamTop,
      stageWebcamH,
      stageLeft: !isRTL ? mediaAreaBounds.left : null,
      stageRight: isRTL ? mediaAreaBounds.right : null,
      stageWidth,
      cameraDockBounds,
    });
    cameraDockPosition = CAMERADOCK_POSITION.CONTENT_TOP;
  } else if (useSidebar && columnVisible && !useSplit) {
    skyroomCameraDockBounds = sidebarCameraDockBounds;
    cameraDockPosition = CAMERADOCK_POSITION.SIDEBAR_CONTENT_BOTTOM;
  }

  return {
    sidebarNavWidth,
    sidebarNavHeight,
    sidebarNavBounds,
    sidebarContentWidth,
    sidebarContentBounds,
    sidebarContentHeight: nextSidebarContentHeight,
    mediaAreaBounds,
    cameraDockBounds: skyroomCameraDockBounds,
    sidebarCameraDockBounds,
    cameraDockPosition,
    useSplitCameras: useSplit,
    screenshareMinimized,
    stageWebcamStripHeight: useStage ? stageWebcamH : 0,
    sidebarSize: columnW,
    usersOpen,
    chatOpen,
    stageFullWidth: !columnVisible,
    navbarFullWidth: {
      width: viewportW,
      left: 0,
      right: isRTL ? 0 : null,
      top: DEFAULT_VALUES.navBarTop + banner,
      height: SKYROOM_NAVBAR_H,
    },
    actionbarFullWidth: {
      width: viewportW,
      left: 0,
      right: isRTL ? 0 : null,
      height: SKYROOM_FOOTER_H,
    },
  };
  /* eslint-enable no-param-reassign */
};

export default adjustSkyroomColumnLayout;

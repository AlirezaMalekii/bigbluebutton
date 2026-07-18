import { PANELS, CAMERADOCK_POSITION } from '/imports/ui/components/layout/enums';
import DEFAULT_VALUES from '/imports/ui/components/layout/defaultValues';
import { getSkyroomNotesOpen } from './notes-panel-state';
import { resolveSkyroomMobileBox } from './mobile-bottom-state';
import { getSkyroomMobileZoneFullscreen, setSkyroomMobileZoneFullscreen } from './mobile-zone-fullscreen-state';
import { getSkyroomMobileStatusRailOffset } from './mobile-status-rail-state';
import { getSkyroomMobileTalkingRailOffset } from './mobile-talking-rail-state';
import {
  classifySkyroomCameras,
  calcStageWebcamHeight,
  partitionSkyroomStreams,
  SKYROOM_SIDEBAR_WEBCAM_H,
  SKYROOM_STAGE_WEBCAM_MIN_H,
} from './camera-placement';
import { getSkyroomWebcamDragPreview } from './webcam-zone-store';

export const SKYROOM_COLUMN_ATTR = 'data-skyroom-column';

/** Match tokens.css --space-page (edge + stage↔sidebar gutters) */
export const SKYROOM_BLOCK_GAP = 12;
/** Match tokens.css --space-column-stack (users ↔ chat / stacked sidebar gap) */
export const SKYROOM_COLUMN_STACK_GAP = 8;
const GAP = SKYROOM_COLUMN_STACK_GAP;
const STAGE_GAP = SKYROOM_BLOCK_GAP;
/** Match layout.css --skyroom-footer-h */
export const SKYROOM_FOOTER_H = 56;
/** Two-row navbar (title + talking/timer). Match layout.css --skyroom-navbar-h */
export const SKYROOM_NAVBAR_H = 60;
/** @deprecated use SKYROOM_FOOTER_H */
export const SKYROOM_CHROME_H = SKYROOM_FOOTER_H;
/** Stage media (slides, whiteboard, screenshare) */
export const SKYROOM_STAGE_Z_INDEX = 6;
/** Stage webcam strip sits above stage media (presentation / whiteboard / screenshare) */
export const SKYROOM_STAGE_WEBCAM_Z_INDEX = 8;
const MIN_COLUMN = 292;
const MAX_COLUMN = 328;
const MIN_USERS = 160;
const MIN_CHAT = 160;
/** When users + chat are both open, chat gets the larger share (compact users, taller chat) */
const CHAT_PANEL_HEIGHT_RATIO = 0.62;

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
  left: isRTL ? null : STAGE_GAP,
  right: isRTL ? STAGE_GAP : null,
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

/* Mobile (<600px): edge gap, gap between stacked zones, and the bottom tab-bar height.
   Exported so the tab-bar component can self-position with the same metrics. */
export const SKYROOM_MOBILE_EDGE = 8;
const SKYROOM_MOBILE_GAP = 8;
/** Gap between the floating footer chrome and the physical screen bottom (px). */
export const SKYROOM_MOBILE_FOOTER_LIFT = 8;
export const SKYROOM_MOBILE_TAB_H = 36;
/* The phone navbar is a single compact row (~48px), shorter than the desktop
   two-row navbar (SKYROOM_NAVBAR_H=60). Use this for both the reserved top space
   and the navbar bounds so the stage sits right under the navbar with no empty band. */
export const SKYROOM_MOBILE_NAVBAR_H = 48;

/**
 * Phone layout — a vertical split: a top "stage" zone (presentation / whiteboard /
 * screenshare / camera-as-content, or webcams when nothing is shared) and a bottom
 * zone that shows exactly ONE box at a time (webcams / chat / users / notes).
 * The split is dynamic: stage goes full-height when the bottom is empty, and the
 * bottom grows when nothing is actually shared on the stage.
 *
 * Returns the same shape adjustSkyroomColumnLayout returns (so customLayout's branch
 * consumes it unchanged), with webcam-zone features disabled — mobile uses BBB's
 * default webcam grid positioned via cameraDock bounds (isMobileSplit tells
 * customLayout to clear the Skyroom webcam zones).
 */
const buildSkyroomMobileLayout = ({
  isRTL,
  bannerAreaHeight,
  windowWidth,
  windowHeight,
  sidebarNavigationInput,
  sidebarContentInput,
  cameraDockInput,
  sidebarNavWidth,
  sidebarNavBounds,
  sidebarContentWidth,
  sidebarContentBounds,
  mediaAreaBounds,
  cameraDockBounds,
  videoStreams = [],
  presentationIsOpen = true,
  hasScreenShare = false,
  hasExternalVideo = false,
}) => {
  /* eslint-disable no-param-reassign -- layout engine mutates bound objects in place */
  const viewportW = windowWidth();
  const viewportH = windowHeight();
  const banner = bannerAreaHeight();

  const usersOpen = sidebarNavigationInput.isOpen;
  const chatOpen = sidebarContentInput.isOpen
    && sidebarContentInput.sidebarContentPanel === PANELS.CHAT;
  const breakoutOpen = sidebarContentInput.isOpen
    && sidebarContentInput.sidebarContentPanel === PANELS.BREAKOUT;
  const waitingUsersOpen = sidebarContentInput.isOpen
    && sidebarContentInput.sidebarContentPanel === PANELS.WAITING_USERS;
  const contentPanelOpen = chatOpen || breakoutOpen || waitingUsersOpen;
  const notesOpen = getSkyroomNotesOpen();
  const activeBox = resolveSkyroomMobileBox({
    usersOpen, chatOpen, notesOpen, breakoutOpen, waitingUsersOpen,
  });
  const panelBox = activeBox === 'users' || activeBox === 'chat'
    || activeBox === 'notes' || activeBox === 'breakout' || activeBox === 'waiting';
  const webcamsBox = activeBox === 'webcams';

  const { totalCount } = classifySkyroomCameras(videoStreams);
  const hasCameras = totalCount > 0 || cameraDockInput.numCameras > 0;
  const hasStage = Boolean(presentationIsOpen || hasScreenShare);

  const edge = SKYROOM_MOBILE_EDGE;
  const gap = SKYROOM_MOBILE_GAP;
  const lift = SKYROOM_MOBILE_FOOTER_LIFT;
  const tabBarH = SKYROOM_MOBILE_TAB_H;
  const areaTop = SKYROOM_MOBILE_NAVBAR_H + banner + edge;
  const areaBottom = viewportH - SKYROOM_FOOTER_H - edge - lift;
  const availH = Math.max(120, areaBottom - areaTop);

  const talkingOffset = getSkyroomMobileTalkingRailOffset();
  const statusOffset = getSkyroomMobileStatusRailOffset();
  const areaContentTop = areaTop + talkingOffset + statusOffset;
  const availAfterRail = Math.max(120, areaBottom - areaContentTop);
  // Reserve the persistent bottom tab bar (it self-positions just above the action bar).
  const contentH = Math.max(80, availAfterRail - tabBarH - gap);
  // Top-box height is computed as if the status rail were absent; bottom absorbs the offset.
  const splitHPreserveTop = Math.max(80, availH - tabBarH - gap);
  const fullW = viewportW - edge * 2;
  const zoneLeft = isRTL ? null : edge;
  const zoneRight = isRTL ? edge : null;

  // Cameras follow what's shared: top when nothing is shared, bottom when shared.
  const camerasInTop = hasCameras && !hasStage;
  const camerasInBottom = hasCameras && hasStage && webcamsBox;
  const bottomActive = panelBox || camerasInBottom;
  const topHasContent = hasStage || camerasInTop;

  let fsZone = getSkyroomMobileZoneFullscreen();
  if ((fsZone === 'top' && !topHasContent) || (fsZone === 'bottom' && !bottomActive)) {
    setSkyroomMobileZoneFullscreen(null);
    fsZone = null;
  }

  const expandH = availAfterRail;

  let topH;
  if (fsZone === 'top' && topHasContent) {
    topH = expandH;
  } else if (fsZone === 'bottom' && bottomActive) {
    topH = 0;
  } else if (topHasContent && bottomActive) {
    // Stage gets ~55% with a panel below; give webcams a more even 50/50 so a single
    // cam reads at a usable size. No stage (cameras-only top) → bottom grows.
    let topRatio = 0.46;
    if (!hasStage) topRatio = 0.35;
    else if (camerasInBottom) topRatio = 0.48;
    topH = Math.round((splitHPreserveTop - gap) * topRatio);
    const maxTopH = Math.max(0, contentH - gap);
    topH = Math.min(topH, maxTopH);
  } else if (topHasContent) {
    topH = contentH;
  } else if (bottomActive) {
    topH = 0;
  } else {
    topH = contentH;
  }

  let bottomH;
  if (fsZone === 'top' && topHasContent) {
    bottomH = 0;
  } else if (fsZone === 'bottom' && bottomActive) {
    bottomH = expandH;
  } else {
    bottomH = bottomActive ? contentH - topH - (topH > 0 ? gap : 0) : 0;
  }

  const topRect = {
    top: areaContentTop, left: zoneLeft, right: zoneRight, width: fullW, height: topH,
  };
  const bottomRect = {
    top: areaContentTop + (topH > 0 ? topH + gap : 0),
    left: zoneLeft,
    right: zoneRight,
    width: fullW,
    height: bottomH,
  };

  // Stage (presentation / screenshare) occupies the top zone when something is shared.
  mediaAreaBounds.top = topRect.top;
  mediaAreaBounds.left = topRect.left;
  mediaAreaBounds.right = topRect.right;
  mediaAreaBounds.width = topRect.width;
  mediaAreaBounds.height = hasStage ? topH : 0;

  // Only the active panel occupies the bottom zone; the others collapse to 0.
  const setPanel = (widthObj, boundsObj, isActive) => {
    widthObj.minWidth = isActive ? fullW : 0;
    widthObj.width = isActive ? fullW : 0;
    widthObj.maxWidth = isActive ? fullW : 0;
    boundsObj.top = bottomRect.top;
    boundsObj.left = bottomRect.left;
    boundsObj.right = bottomRect.right;
  };
  setPanel(sidebarNavWidth, sidebarNavBounds, activeBox === 'users');
  const contentSidebarActive = activeBox === 'chat' || activeBox === 'breakout' || activeBox === 'waiting';
  setPanel(sidebarContentWidth, sidebarContentBounds, contentSidebarActive);
  const sidebarNavHeightOut = activeBox === 'users' ? bottomH : 0;
  const sidebarContentHeightOut = contentSidebarActive ? bottomH : 0;

  const notesColumnBounds = activeBox === 'notes' ? {
    top: bottomRect.top,
    left: bottomRect.left,
    right: bottomRect.right,
    width: fullW,
    height: bottomH,
  } : null;

  // Cameras render in the default BBB grid, positioned into the chosen zone.
  let camRect = null;
  if (camerasInTop) camRect = topRect;
  else if (camerasInBottom) camRect = bottomRect;

  const cameraDockOut = camRect ? {
    ...cameraDockBounds,
    top: camRect.top,
    left: camRect.left,
    right: camRect.right,
    minWidth: camRect.width,
    width: camRect.width,
    maxWidth: camRect.width,
    minHeight: camRect.height,
    height: camRect.height,
    maxHeight: camRect.height,
    zIndex: camerasInBottom ? 5 : SKYROOM_STAGE_Z_INDEX,
  } : {
    ...cameraDockBounds,
    top: areaTop,
    left: zoneLeft,
    right: zoneRight,
    minWidth: 0,
    width: 0,
    maxWidth: 0,
    minHeight: 0,
    height: 0,
    maxHeight: 0,
    zIndex: 1,
  };

  return {
    isMobileSplit: true,
    sidebarNavHeight: sidebarNavHeightOut,
    sidebarContentHeight: sidebarContentHeightOut,
    sidebarSize: 0,
    mediaAreaBounds,
    cameraDockBounds: cameraDockOut,
    cameraDockPosition: CAMERADOCK_POSITION.CONTENT_TOP,
    screenshareMinimized: (hasScreenShare || hasExternalVideo) && !presentationIsOpen,
    useSplitCameras: false,
    useSidebarWebcam: false,
    sidebarCameraDockBounds: null,
    sidebarWebcamDropBounds: null,
    sidebarWebcamDropEnabled: false,
    centerWebcamBounds: null,
    centerDropBounds: null,
    stageStripBounds: null,
    stageMediaOpen: hasStage,
    centerDropEnabled: false,
    stageWebcamStripHeight: 0,
    usersOpen,
    chatOpen: contentPanelOpen,
    notesOpen,
    sidebarStackActive: false,
    notesColumnBounds,
    notesOffset: 0,
    stageFullWidth: true,
    mobileActiveBox: activeBox,
    mobileCamerasInBottom: camerasInBottom,
    mobileCamerasInTop: camerasInTop,
    mobileHasStage: hasStage,
    mobileHasCameras: hasCameras,
    mobileHasTopZone: topHasContent && topH > 0,
    mobileHasBottomZone: bottomActive && bottomH > 0,
    mobileBottomRect: bottomActive && bottomH > 0 ? bottomRect : null,
    mobileTopRect: camerasInTop && topH > 0 ? topRect : null,
    mobileZoneFullscreen: fsZone,
    mobileTalkingRailOffset: talkingOffset,
    mobileTalkingRailTop: areaTop,
    mobileStatusRailOffset: statusOffset,
    mobileStatusRailTop: areaTop + talkingOffset,
    navbarFullWidth: {
      width: viewportW,
      left: 0,
      right: isRTL ? 0 : null,
      top: DEFAULT_VALUES.navBarTop + banner,
      height: SKYROOM_MOBILE_NAVBAR_H,
    },
    actionbarFullWidth: {
      width: viewportW - edge * 2,
      left: isRTL ? null : edge,
      right: isRTL ? edge : null,
      top: viewportH - SKYROOM_FOOTER_H - lift,
      height: SKYROOM_FOOTER_H,
    },
  };
  /* eslint-enable no-param-reassign */
};

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
  hasExternalVideo = false,
}) => {
  /* eslint-disable no-param-reassign -- layout engine mutates bound objects in place */
  if (!isSkyroomColumnActive()) return null;

  // Phones get a dedicated top/bottom split instead of the desktop column.
  if (isMobile) {
    return buildSkyroomMobileLayout({
      isRTL,
      bannerAreaHeight,
      windowWidth,
      windowHeight,
      sidebarNavigationInput,
      sidebarContentInput,
      cameraDockInput,
      sidebarNavWidth,
      sidebarNavBounds,
      sidebarContentWidth,
      sidebarContentBounds,
      mediaAreaBounds,
      cameraDockBounds,
      videoStreams,
      presentationIsOpen,
      hasScreenShare,
      hasExternalVideo,
    });
  }

  const usersOpen = sidebarNavigationInput.isOpen;
  const chatOpen = sidebarContentInput.isOpen
    && sidebarContentInput.sidebarContentPanel === PANELS.CHAT;
  const breakoutOpen = sidebarContentInput.isOpen
    && sidebarContentInput.sidebarContentPanel === PANELS.BREAKOUT;
  const waitingUsersOpen = sidebarContentInput.isOpen
    && sidebarContentInput.sidebarContentPanel === PANELS.WAITING_USERS;
  const contentPanelOpen = chatOpen || breakoutOpen || waitingUsersOpen;
  const notesOpen = getSkyroomNotesOpen();
  const columnVisible = usersOpen || contentPanelOpen || notesOpen;
  const stageMediaMinimized = (hasScreenShare || hasExternalVideo) && !presentationIsOpen;

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

  const { totalCount } = classifySkyroomCameras(videoStreams);

  const stageMediaOpen = presentationIsOpen && !stageMediaMinimized;
  const centerDropEnabled = !stageMediaOpen;
  const sidebarStackActive = usersOpen || contentPanelOpen;

  const zonePartition = partitionSkyroomStreams(videoStreams, {
    centerDropEnabled,
    stageMediaOpen,
    // Notes column alone does not host sidebar webcams — only users/chat stack does.
    sidebarStackVisible: sidebarStackActive,
    dragPreview: getSkyroomWebcamDragPreview(),
    applyDragPreview: true,
  });
  const sidebarCount = zonePartition.sidebar.length;
  const stageCount = zonePartition.stage.length;
  const centerCount = zonePartition.center.length;

  const sidebarWebcamReserved = sidebarStackActive && sidebarCount > 0;
  const sidebarWebcamH = sidebarWebcamReserved ? SKYROOM_SIDEBAR_WEBCAM_H : 0;

  // Stage width must be known before strip height (columns drive 1 vs 2 reserved rows).
  const notesColumnW = notesOpen ? columnW : 0;
  const notesColumnGap = notesOpen ? STAGE_GAP : 0;
  const sidebarStackW = (usersOpen || contentPanelOpen) ? columnW : 0;
  const sidebarStackGap = sidebarStackW > 0 ? STAGE_GAP : 0;
  const notesOffset = sidebarStackW + sidebarStackGap + notesColumnGap;
  const totalLeftColumnsW = sidebarStackW + notesColumnW + (sidebarStackW > 0 ? sidebarStackGap : 0)
    + (notesOpen ? notesColumnGap : 0);

  const stageWidth = columnVisible
    ? viewportW - totalLeftColumnsW - STAGE_GAP * 2
    : viewportW - STAGE_GAP * 2;

  let stageStripH = stageCount > 0
    ? calcStageWebcamHeight(stageCount, stageWidth)
    : 0;

  const sidebarPanelTop = areaTop + sidebarWebcamH + (sidebarWebcamH ? GAP : 0);
  const sidebarPanelAreaHeight = areaHeight - sidebarWebcamH - (sidebarWebcamH ? GAP : 0);

  let usersH = 0;
  let chatH = 0;

  if (usersOpen && contentPanelOpen) {
    const shared = sidebarPanelAreaHeight - GAP;
    chatH = Math.max(MIN_CHAT, Math.round(shared * CHAT_PANEL_HEIGHT_RATIO));
    usersH = Math.max(MIN_USERS, shared - chatH);
  } else if (usersOpen) {
    usersH = sidebarPanelAreaHeight;
  } else if (contentPanelOpen) {
    chatH = sidebarPanelAreaHeight;
  }

  sidebarNavWidth.minWidth = usersOpen ? MIN_COLUMN : 0;
  sidebarNavWidth.width = usersOpen ? columnW : 0;
  sidebarNavWidth.maxWidth = usersOpen ? MAX_COLUMN : 0;

  sidebarContentWidth.minWidth = contentPanelOpen ? MIN_COLUMN : 0;
  sidebarContentWidth.width = contentPanelOpen ? columnW : 0;
  sidebarContentWidth.maxWidth = contentPanelOpen ? MAX_COLUMN : 0;

  const contentTop = sidebarPanelTop;

  sidebarNavBounds.top = contentTop;
  sidebarNavHeight = usersH;

  sidebarContentBounds.top = usersOpen && contentPanelOpen
    ? contentTop + usersH + GAP
    : contentTop;

  const panelStackBottom = (() => {
    if (usersOpen && contentPanelOpen) {
      return contentTop + usersH + GAP + chatH;
    }
    if (contentPanelOpen) return contentTop + chatH;
    if (usersOpen) return contentTop + usersH;
    return columnBottom;
  })();
  sidebarContentBounds.left = sidebarNavBounds.left;
  sidebarContentBounds.right = sidebarNavBounds.right;

  if (sidebarStackActive) {
    if (isRTL) {
      sidebarNavBounds.right = STAGE_GAP;
      sidebarNavBounds.left = null;
      sidebarContentBounds.right = STAGE_GAP;
      sidebarContentBounds.left = null;
    } else {
      sidebarNavBounds.left = STAGE_GAP;
      sidebarNavBounds.right = null;
      sidebarContentBounds.left = STAGE_GAP;
      sidebarContentBounds.right = null;
    }
  }

  const nextSidebarContentHeight = chatH;

  mediaAreaBounds.width = stageWidth;
  if (isRTL) {
    mediaAreaBounds.left = STAGE_GAP;
    mediaAreaBounds.right = columnVisible ? totalLeftColumnsW + STAGE_GAP : STAGE_GAP;
  } else {
    mediaAreaBounds.left = columnVisible ? totalLeftColumnsW + STAGE_GAP : STAGE_GAP;
    mediaAreaBounds.right = null;
  }

  // Notes column is a full-height stack beside users/chat — not offset by sidebar webcams.
  const notesColumnTop = areaTop;
  const notesColumnHeight = areaHeight;
  const notesColumnLeft = isRTL
    ? null
    : STAGE_GAP + sidebarStackW + sidebarStackGap;
  const notesColumnRight = isRTL
    ? STAGE_GAP + sidebarStackW + sidebarStackGap
    : null;

  // Bug fix: the presentation should start at areaTop regardless of whether
  // sidebar webcams exist. Sidebar webcams sit above the *users panel*, not
  // above the presentation, so presentationTop must not be offset by sidebarWebcamH.
  let presentationTop = areaTop;

  let presentationHeight = columnVisible
    ? Math.max(120, panelStackBottom - presentationTop)
    : columnBottom - presentationTop;
  let stageWebcamStripTop = presentationTop;

  if (stageMediaMinimized && totalCount > 0) {
    if (stageCount > 0) {
      stageStripH = calcStageWebcamHeight(stageCount, stageWidth);
      stageWebcamStripTop = presentationTop;
      presentationTop = stageWebcamStripTop + stageStripH + GAP;
      presentationHeight = Math.max(120, panelStackBottom - presentationTop);
    }
    mediaAreaBounds.top = presentationTop;
    mediaAreaBounds.height = presentationHeight;
  } else if (stageMediaMinimized) {
    mediaAreaBounds.top = presentationTop;
    mediaAreaBounds.height = 0;
    stageStripH = 0;
  } else if (stageStripH > 0) {
    stageWebcamStripTop = presentationTop;
    presentationTop = stageWebcamStripTop + stageStripH + GAP;
    presentationHeight = Math.max(
      120,
      panelStackBottom - presentationTop,
    );
    mediaAreaBounds.top = presentationTop;
    mediaAreaBounds.height = presentationHeight;
  } else {
    mediaAreaBounds.top = presentationTop;
    mediaAreaBounds.height = presentationHeight;
  }

  let skyroomCameraDockBounds = null;
  let sidebarCameraDockBounds = null;
  let cameraDockPosition = cameraDockInput.position;
  const useSidebarWebcam = sidebarCount > 0 && sidebarStackActive;
  const sidebarWebcamDropBounds = sidebarStackActive
    ? buildSidebarCameraDockBounds({
      areaTop,
      columnW,
      isRTL,
      cameraDockBounds,
    })
    : null;

  if (useSidebarWebcam) {
    sidebarCameraDockBounds = sidebarWebcamDropBounds;
  }

  const stageLeft = !isRTL ? mediaAreaBounds.left : null;
  const stageRight = isRTL ? mediaAreaBounds.right : null;

  const needsStageStripDock = stageCount > 0 && stageStripH > 0;

  if (needsStageStripDock) {
    const stageWebcamTop = stageStripH > 0 ? stageWebcamStripTop : areaTop;
    skyroomCameraDockBounds = buildStageCameraDockBounds({
      stageWebcamTop,
      stageWebcamH: stageStripH,
      stageLeft,
      stageRight,
      stageWidth,
      cameraDockBounds,
    });
    cameraDockPosition = CAMERADOCK_POSITION.CONTENT_TOP;
  } else if (useSidebarWebcam || centerCount > 0 || totalCount > 0) {
    // Keep provider mounted but hide the main dock — zone portals render webcams.
    skyroomCameraDockBounds = {
      ...cameraDockBounds,
      top: areaTop,
      left: isRTL ? null : STAGE_GAP,
      right: isRTL ? STAGE_GAP : null,
      minWidth: 0,
      width: 0,
      maxWidth: 0,
      minHeight: 0,
      height: 0,
      maxHeight: 0,
      zIndex: 1,
    };
    cameraDockPosition = CAMERADOCK_POSITION.CONTENT_TOP;
  }
  const mediaTop = mediaAreaBounds.top ?? areaTop;
  const mediaHeight = mediaAreaBounds.height ?? 0;
  const mediaLeft = mediaAreaBounds.left ?? null;
  const mediaRight = mediaAreaBounds.right ?? null;
  const mediaWidth = mediaAreaBounds.width ?? stageWidth;

  let stageStripBounds = null;
  if (stageMediaOpen || stageCount > 0) {
    const dropStripH = stageCount > 0
      ? stageStripH
      : SKYROOM_STAGE_WEBCAM_MIN_H;
    stageStripBounds = buildStageCameraDockBounds({
      stageWebcamTop: areaTop,
      stageWebcamH: dropStripH,
      stageLeft,
      stageRight,
      stageWidth,
      cameraDockBounds,
    });
  }

  let centerWebcamBounds = null;
  let centerDropBounds = null;
  let centerZoneHeight = 0;

  if (!stageMediaOpen && (centerCount > 0 || totalCount > 0)) {
    const layoutStripBottom = stageCount > 0 && stageStripH > 0
      ? areaTop + stageStripH
      : null;
    const centerZoneTop = layoutStripBottom != null ? layoutStripBottom + GAP : mediaTop;
    const mediaBottom = mediaTop + mediaHeight;
    centerZoneHeight = Math.max(0, mediaBottom - centerZoneTop);

    if (centerZoneHeight > 0) {
      const bounds = {
        top: centerZoneTop,
        left: mediaLeft,
        right: mediaRight,
        width: mediaWidth,
        height: centerZoneHeight,
        zIndex: SKYROOM_STAGE_WEBCAM_Z_INDEX,
      };
      centerDropBounds = bounds;
      if (centerCount > 0) {
        centerWebcamBounds = bounds;
      }
    }
  }

  const centerDropAllowed = !stageMediaOpen && centerZoneHeight > 0;

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
    useSplitCameras: zonePartition.split,
    useSidebarWebcam,
    sidebarWebcamDropBounds,
    sidebarWebcamDropEnabled: Boolean(sidebarStackActive && sidebarWebcamDropBounds),
    centerWebcamBounds,
    centerDropBounds,
    stageStripBounds,
    stageMediaOpen,
    centerDropEnabled: centerDropAllowed,
    stageMediaMinimized,
    stageWebcamStripHeight: needsStageStripDock ? stageStripH : 0,
    sidebarSize: columnW,
    usersOpen,
    chatOpen: contentPanelOpen,
    notesOpen,
    sidebarStackActive,
    notesColumnBounds: notesOpen ? {
      top: notesColumnTop,
      left: notesColumnLeft,
      right: notesColumnRight,
      width: notesColumnW,
      height: notesColumnHeight,
    } : null,
    notesOffset,
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

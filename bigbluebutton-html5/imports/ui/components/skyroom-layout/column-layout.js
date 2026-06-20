import { PANELS, CAMERADOCK_POSITION } from '/imports/ui/components/layout/enums';
import DEFAULT_VALUES from '/imports/ui/components/layout/defaultValues';
import { getSkyroomNotesOpen } from './notes-panel-state';
import {
  classifySkyroomCameras,
  calcStageWebcamHeight,
  partitionSkyroomStreams,
  SKYROOM_SIDEBAR_WEBCAM_H,
  SKYROOM_STAGE_WEBCAM_MIN_H,
} from './camera-placement';
import { getSkyroomWebcamDragPreview } from './webcam-zone-store';

export const SKYROOM_COLUMN_ATTR = 'data-skyroom-column';

/** Match tokens.css --space-page (header/footer/panel rhythm) */
export const SKYROOM_BLOCK_GAP = 22;
/** Match tokens.css --space-column-stack (users ↔ chat vertical gap) */
export const SKYROOM_COLUMN_STACK_GAP = 18;
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
/** Stage webcam strip sits above screenshare while desktop is shared */
export const SKYROOM_STAGE_WEBCAM_Z_INDEX = 7;
const MIN_COLUMN = 292;
const MAX_COLUMN = 328;
const MIN_USERS = 180;
const MIN_CHAT = 160;
/** When users + chat are both open, chat gets the larger share */
const CHAT_PANEL_HEIGHT_RATIO = 0.5;

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
}) => {
  /* eslint-disable no-param-reassign -- layout engine mutates bound objects in place */
  if (isMobile || !isSkyroomColumnActive()) return null;

  const usersOpen = sidebarNavigationInput.isOpen;
  const chatOpen = sidebarContentInput.isOpen
    && sidebarContentInput.sidebarContentPanel === PANELS.CHAT;
  const notesOpen = getSkyroomNotesOpen();
  const columnVisible = usersOpen || chatOpen || notesOpen;
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

  const { totalCount } = classifySkyroomCameras(videoStreams);

  const stageMediaOpen = presentationIsOpen && !screenshareMinimized;
  const centerDropEnabled = !stageMediaOpen;
  const sidebarStackActive = usersOpen || chatOpen;

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
  let stageStripH = stageCount > 0
    ? calcStageWebcamHeight(stageCount)
    : 0;

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

  sidebarNavWidth.minWidth = usersOpen ? MIN_COLUMN : 0;
  sidebarNavWidth.width = usersOpen ? columnW : 0;
  sidebarNavWidth.maxWidth = usersOpen ? MAX_COLUMN : 0;

  sidebarContentWidth.minWidth = chatOpen ? MIN_COLUMN : 0;
  sidebarContentWidth.width = chatOpen ? columnW : 0;
  sidebarContentWidth.maxWidth = chatOpen ? MAX_COLUMN : 0;

  const contentTop = sidebarPanelTop;

  sidebarNavBounds.top = contentTop;
  sidebarNavHeight = usersH;

  sidebarContentBounds.top = usersOpen && chatOpen
    ? contentTop + usersH + GAP
    : contentTop;

  const panelStackBottom = (() => {
    if (usersOpen && chatOpen) {
      return contentTop + usersH + GAP + chatH;
    }
    if (chatOpen) return contentTop + chatH;
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

  const notesColumnW = notesOpen ? columnW : 0;
  const notesColumnGap = notesOpen ? STAGE_GAP : 0;
  const sidebarStackW = (usersOpen || chatOpen) ? columnW : 0;
  const sidebarStackGap = sidebarStackW > 0 ? STAGE_GAP : 0;
  const notesOffset = sidebarStackW + sidebarStackGap + notesColumnGap;
  const totalLeftColumnsW = sidebarStackW + notesColumnW + (sidebarStackW > 0 ? sidebarStackGap : 0)
    + (notesOpen ? notesColumnGap : 0);

  const stageWidth = columnVisible
    ? viewportW - totalLeftColumnsW - STAGE_GAP * 2
    : viewportW - STAGE_GAP * 2;
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

  if (screenshareMinimized && totalCount > 0) {
    if (stageCount > 0) {
      stageStripH = calcStageWebcamHeight(stageCount);
      stageWebcamStripTop = presentationTop;
      presentationTop = stageWebcamStripTop + stageStripH + GAP;
      presentationHeight = Math.max(120, panelStackBottom - presentationTop);
    }
    mediaAreaBounds.top = presentationTop;
    mediaAreaBounds.height = presentationHeight;
  } else if (screenshareMinimized) {
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
    screenshareMinimized,
    stageWebcamStripHeight: needsStageStripDock ? stageStripH : 0,
    sidebarSize: columnW,
    usersOpen,
    chatOpen,
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

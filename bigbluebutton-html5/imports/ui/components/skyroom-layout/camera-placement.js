import { VIDEO_TYPES } from '/imports/ui/components/video-provider/enums';
import {
  SKYROOM_WEBCAM_ZONES,
  getSkyroomWebcamZoneOverrides,
} from './webcam-zone-store';

/** Max presenter/moderator webcams shown above the users panel (sidebar). */
export const PRIVILEGED_SIDEBAR_MAX = 2;

export const SKYROOM_SIDEBAR_WEBCAM_H = 100;
export const SKYROOM_STAGE_WEBCAM_MIN_H = 100;
export const SKYROOM_STAGE_WEBCAM_MAX_H = 160;

const WEBCAM_TILE_ASPECT = 4 / 3;

/** Fixed tile size for stage strip and sidebar (never grows with container). */
export const SKYROOM_WEBCAM_TILE_W = Math.floor(SKYROOM_SIDEBAR_WEBCAM_H * WEBCAM_TILE_ASPECT);
export const SKYROOM_WEBCAM_TILE_H = SKYROOM_SIDEBAR_WEBCAM_H;

export const isPrivilegedCameraUser = (user) => Boolean(
  user?.presenter || user?.isModerator,
);

const isActiveStream = (stream) => stream && stream.type !== VIDEO_TYPES.CONNECTING;

export const getSkyroomStreamKey = (item) => {
  if (item.type === VIDEO_TYPES.GRID) return `grid:${item.userId}`;
  if (item.type === VIDEO_TYPES.STREAM) return `stream:${item.stream}`;
  return `other:${item.userId}`;
};

export const isPrivilegedStream = (item) => {
  if (!item || item.type === VIDEO_TYPES.CONNECTING) return false;
  if (item.type === VIDEO_TYPES.GRID) {
    return Boolean(item.isModerator || item.presenter);
  }
  if (item.type === VIDEO_TYPES.STREAM) {
    return isPrivilegedCameraUser(item.user);
  }
  return false;
};

export const classifySkyroomCameras = (streams = []) => {
  const active = (streams || []).filter(isActiveStream);
  const privileged = active.filter(isPrivilegedStream);
  const viewers = active.filter((s) => !isPrivilegedStream(s));
  return {
    privileged,
    viewers,
    privilegedCount: privileged.length,
    viewerCount: viewers.length,
    totalCount: active.length,
  };
};

/**
 * Sidebar: up to 2 presenter/moderator cameras (can coexist with viewer stage dock).
 * Stage: viewer cameras and privileged cameras beyond the sidebar cap.
 */
/**
 * Stage slots above screenshare: viewers, excess privileged, and cameras
 * published before streams appear in videoStreams (CONNECTING).
 */
export const countStageWebcamSlots = ({
  privilegedCount,
  viewerCount,
  numCameras,
  localUserIsPrivileged = false,
}) => {
  const fromStreams = viewerCount + Math.max(0, privilegedCount - PRIVILEGED_SIDEBAR_MAX);
  const sidebarSlots = Math.min(privilegedCount, PRIVILEGED_SIDEBAR_MAX);
  let fromPublishedCount = 0;

  if (privilegedCount > 0 || viewerCount > 0) {
    fromPublishedCount = Math.max(0, numCameras - sidebarSlots);
  } else if (numCameras > 0 && !localUserIsPrivileged) {
    // Viewer camera published before stream leaves CONNECTING state.
    fromPublishedCount = numCameras;
  }

  return Math.max(fromStreams, fromPublishedCount);
};

export const resolveSkyroomCameraPlacement = ({ privilegedCount, viewerCount }) => {
  const sidebarPrivilegedCount = Math.min(privilegedCount, PRIVILEGED_SIDEBAR_MAX);
  const useSidebar = sidebarPrivilegedCount > 0;
  const stageCameraCount = viewerCount + Math.max(0, privilegedCount - PRIVILEGED_SIDEBAR_MAX);
  const useStage = stageCameraCount > 0;
  const useSplit = useSidebar && useStage;
  return {
    useSidebar,
    useStage,
    useSplit,
    sidebarPrivilegedCount,
    stageCameraCount,
  };
};

/** Fixed-height strip row — tile size matches sidebar webcams. */
export const calcStageWebcamHeight = (cameraCount) => {
  if (cameraCount <= 0) return 0;
  return SKYROOM_SIDEBAR_WEBCAM_H;
};

/**
 * Fixed-size tiles for sidebar and stage strip (same visual size).
 * Stage: single horizontal row. Sidebar: up to 2 columns, centered when fewer.
 * Tiles use a constant size and only shrink when the container is too small.
 */
export const computeSkyroomFixedTileGrid = (
  numItems,
  containerWidth,
  containerHeight,
  gutter = 4,
  { maxColumns = numItems, horizontal = true } = {},
) => {
  if (numItems < 1 || containerWidth < 1 || containerHeight < 1) return null;

  const columns = Math.min(numItems, maxColumns);
  const rows = horizontal ? 1 : Math.ceil(numItems / columns);
  const gutterW = (columns - 1) * gutter;
  const gutterH = (rows - 1) * gutter;

  const maxCellW = Math.floor((containerWidth - gutterW) / columns);
  const maxCellH = Math.floor((containerHeight - gutterH) / rows);
  const cellW = Math.min(SKYROOM_WEBCAM_TILE_W, maxCellW);
  const cellH = Math.min(
    SKYROOM_WEBCAM_TILE_H,
    maxCellH,
    Math.floor(cellW / WEBCAM_TILE_ASPECT),
  );

  return {
    columns,
    rows,
    cellWidth: cellW,
    cellHeight: cellH,
    width: (cellW * columns) + gutterW,
    height: (cellH * rows) + gutterH,
    filledArea: cellW * cellH * numItems,
  };
};

/** Inline grid style with fixed pixel tracks (prevents 1fr stretch in wide docks). */
export const buildSkyroomFixedGridStyle = (grid) => {
  if (!grid?.cellWidth || !grid?.cellHeight) return null;
  return {
    width: `${grid.width}px`,
    height: `${grid.height}px`,
    gridTemplateColumns: `repeat(${grid.columns}, ${grid.cellWidth}px)`,
    gridTemplateRows: `repeat(${grid.rows}, ${grid.cellHeight}px)`,
    flexShrink: 0,
  };
};

export const computeSkyroomStripGrid = (numItems, canvasWidth, canvasHeight, gutter = 4) => (
  computeSkyroomFixedTileGrid(numItems, canvasWidth, canvasHeight, gutter, {
    maxColumns: numItems,
    horizontal: true,
  })
);

export const computeSkyroomSidebarGrid = (numItems, canvasWidth, canvasHeight, gutter = 4) => (
  computeSkyroomFixedTileGrid(numItems, canvasWidth, canvasHeight, gutter, {
    maxColumns: PRIVILEGED_SIDEBAR_MAX,
    horizontal: true,
  })
);

const defaultZoneForStream = (stream, privilegedSidebarKeys, stageMediaOpen) => {
  if (privilegedSidebarKeys.has(getSkyroomStreamKey(stream))) {
    return SKYROOM_WEBCAM_ZONES.SIDEBAR;
  }
  if (!stageMediaOpen) {
    return SKYROOM_WEBCAM_ZONES.CENTER;
  }
  return SKYROOM_WEBCAM_ZONES.STAGE;
};

const buildDefaultSidebarKeys = (active) => {
  const privileged = active.filter(isPrivilegedStream);
  return new Set(
    privileged.slice(0, PRIVILEGED_SIDEBAR_MAX).map(getSkyroomStreamKey),
  );
};

const applyDragPreviewToZones = (sidebar, stage, center, active, dragPreview) => {
  if (!dragPreview?.streamKey) return;

  const { streamKey, targetZone } = dragPreview;
  const removeFrom = (arr) => {
    const idx = arr.findIndex((s) => getSkyroomStreamKey(s) === streamKey);
    if (idx >= 0) arr.splice(idx, 1);
  };

  removeFrom(sidebar);
  removeFrom(stage);
  removeFrom(center);

  if (!targetZone) return;

  const stream = active.find((s) => getSkyroomStreamKey(s) === streamKey);
  if (!stream) return;

  if (targetZone === SKYROOM_WEBCAM_ZONES.SIDEBAR) {
    sidebar.push(stream);
  } else if (targetZone === SKYROOM_WEBCAM_ZONES.CENTER) {
    center.push(stream);
  } else {
    stage.push(stream);
  }
};

export const findSkyroomStreamZone = (streamKey, partition) => {
  if (!streamKey || !partition) return null;
  if (partition.sidebar.some((s) => getSkyroomStreamKey(s) === streamKey)) {
    return SKYROOM_WEBCAM_ZONES.SIDEBAR;
  }
  if (partition.center.some((s) => getSkyroomStreamKey(s) === streamKey)) {
    return SKYROOM_WEBCAM_ZONES.CENTER;
  }
  if (partition.stage.some((s) => getSkyroomStreamKey(s) === streamKey)) {
    return SKYROOM_WEBCAM_ZONES.STAGE;
  }
  return null;
};

export const partitionSkyroomStreams = (
  streams = [],
  options = {},
) => {
  const {
    zoneOverrides = getSkyroomWebcamZoneOverrides(),
    centerDropEnabled = false,
    stageMediaOpen = true,
    sidebarStackVisible = true,
    dragPreview = null,
    applyDragPreview = false,
  } = options;
  const active = (streams || []).filter(isActiveStream);
  const defaultSidebarKeys = buildDefaultSidebarKeys(active);

  const sidebar = [];
  const stage = [];
  const center = [];

  active.forEach((stream) => {
    const key = getSkyroomStreamKey(stream);
    let override = zoneOverrides[key];

    if (override === SKYROOM_WEBCAM_ZONES.CENTER && (stageMediaOpen || !centerDropEnabled)) {
      override = null;
    }

    let zone = override
      || defaultZoneForStream(stream, defaultSidebarKeys, stageMediaOpen);

    if (!override && zone === SKYROOM_WEBCAM_ZONES.CENTER && !centerDropEnabled) {
      zone = defaultZoneForStream(stream, defaultSidebarKeys, stageMediaOpen);
    }

    if (zone === SKYROOM_WEBCAM_ZONES.SIDEBAR) {
      sidebar.push(stream);
    } else if (zone === SKYROOM_WEBCAM_ZONES.CENTER) {
      center.push(stream);
    } else {
      stage.push(stream);
    }
  });

  if (sidebar.length > PRIVILEGED_SIDEBAR_MAX) {
    const overflow = sidebar.splice(PRIVILEGED_SIDEBAR_MAX);
    stage.push(...overflow);
  }

  if (!sidebarStackVisible && (sidebar.length > 0 || center.length > 0)) {
    stage.push(...sidebar, ...center);
    sidebar.length = 0;
    center.length = 0;
  }

  if (applyDragPreview && dragPreview) {
    applyDragPreviewToZones(sidebar, stage, center, active, dragPreview);
    if (sidebar.length > PRIVILEGED_SIDEBAR_MAX) {
      const overflow = sidebar.splice(PRIVILEGED_SIDEBAR_MAX);
      stage.push(...overflow);
    }
  }

  return {
    sidebar,
    stage,
    center,
    split: sidebar.length > 0 && stage.length > 0,
  };
};

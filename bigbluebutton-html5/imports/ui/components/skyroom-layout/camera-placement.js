import { VIDEO_TYPES } from '/imports/ui/components/video-provider/enums';
import {
  SKYROOM_WEBCAM_ZONES,
  getSkyroomWebcamZoneOverrides,
} from './webcam-zone-store';

/** Max presenter/moderator webcams shown above the users panel (sidebar). */
export const PRIVILEGED_SIDEBAR_MAX = 2;

export const SKYROOM_SIDEBAR_WEBCAM_H = 100;
export const SKYROOM_STAGE_WEBCAM_MIN_H = 100;
/** @deprecated Prefer SKYROOM_STAGE_WEBCAM_MAX_ROWS; kept for max-height callers. */
export const SKYROOM_STAGE_WEBCAM_MAX_H = 160;
/** Desktop stage strip reserves at most this many rows; further cams scroll inside the dock. */
export const SKYROOM_STAGE_WEBCAM_MAX_ROWS = 2;
/** Default grid gap for stage strip height/column math (matches layout.css --space-2). */
export const SKYROOM_STAGE_WEBCAM_GUTTER = 8;

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

/** How many fixed-width tiles fit in one stage strip row. */
export const calcStageWebcamColumns = (
  containerWidth,
  gutter = SKYROOM_STAGE_WEBCAM_GUTTER,
) => {
  if (containerWidth < 1) return 1;
  const cols = Math.floor((containerWidth + gutter) / (SKYROOM_WEBCAM_TILE_W + gutter));
  return Math.max(1, cols);
};

/**
 * Dock height reserved above presentation: 1 or 2 tile rows based on count/width.
 * Content taller than 2 rows scrolls inside the dock (height stays capped).
 */
export const calcStageWebcamHeight = (
  cameraCount,
  containerWidth = 0,
  gutter = SKYROOM_STAGE_WEBCAM_GUTTER,
) => {
  if (cameraCount <= 0) return 0;
  const cols = calcStageWebcamColumns(containerWidth, gutter);
  const neededRows = Math.ceil(cameraCount / cols);
  const displayRows = Math.min(neededRows, SKYROOM_STAGE_WEBCAM_MAX_ROWS);
  return (displayRows * SKYROOM_WEBCAM_TILE_H) + ((displayRows - 1) * gutter);
};

/**
 * Fixed-size tiles for sidebar and stage strip (same visual size).
 * Stage: wrap across rows (capped dock height + scroll). Sidebar: up to 2 columns.
 * Tiles use a constant size and only shrink when the container is too small.
 */
export const computeSkyroomFixedTileGrid = (
  numItems,
  containerWidth,
  containerHeight,
  gutter = 4,
  {
    maxColumns = numItems,
    horizontal = true,
    /** When true, keep fixed tile size even if container height is only 1–2 rows (scroll case). */
    preserveTileSize = false,
  } = {},
) => {
  if (numItems < 1 || containerWidth < 1 || containerHeight < 1) return null;

  const columns = Math.min(numItems, maxColumns);
  const rows = horizontal ? 1 : Math.ceil(numItems / columns);
  const gutterW = (columns - 1) * gutter;
  const gutterH = (rows - 1) * gutter;

  const maxCellW = Math.floor((containerWidth - gutterW) / columns);
  const cellW = Math.min(SKYROOM_WEBCAM_TILE_W, maxCellW);

  let cellH;
  if (preserveTileSize) {
    // Prefer exact sidebar tile height when full width fits; avoid floor(133/(4/3))=99.
    cellH = cellW >= SKYROOM_WEBCAM_TILE_W
      ? SKYROOM_WEBCAM_TILE_H
      : Math.min(SKYROOM_WEBCAM_TILE_H, Math.floor(cellW / WEBCAM_TILE_ASPECT));
  } else {
    const maxCellH = Math.floor((containerHeight - gutterH) / rows);
    cellH = Math.min(
      SKYROOM_WEBCAM_TILE_H,
      maxCellH,
      Math.floor(cellW / WEBCAM_TILE_ASPECT),
    );
  }

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

/**
 * Stage strip grid: wrap to multiple rows using fixed tile size.
 * Pass the dock's reserved height as canvasHeight; when content rows exceed
 * the dock, grid height grows and the dock scrolls.
 */
export const computeSkyroomStripGrid = (
  numItems,
  canvasWidth,
  canvasHeight,
  gutter = SKYROOM_STAGE_WEBCAM_GUTTER,
) => {
  const maxColumns = calcStageWebcamColumns(canvasWidth, gutter);
  // Use at least the content height so preserveTileSize math has a valid container.
  const contentRows = Math.ceil(numItems / Math.max(1, Math.min(numItems, maxColumns)));
  const contentHeight = (contentRows * SKYROOM_WEBCAM_TILE_H)
    + (Math.max(0, contentRows - 1) * gutter);
  const effectiveHeight = Math.max(canvasHeight || 0, contentHeight, SKYROOM_WEBCAM_TILE_H);

  return computeSkyroomFixedTileGrid(
    numItems,
    canvasWidth,
    effectiveHeight,
    gutter,
    {
      maxColumns,
      horizontal: false,
      preserveTileSize: true,
    },
  );
};

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

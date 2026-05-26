import { VIDEO_TYPES } from '/imports/ui/components/video-provider/enums';

/** Max presenter/moderator webcams shown above the users panel (sidebar). */
export const PRIVILEGED_SIDEBAR_MAX = 2;

export const SKYROOM_SIDEBAR_WEBCAM_H = 100;
export const SKYROOM_STAGE_WEBCAM_MIN_H = 100;
export const SKYROOM_STAGE_WEBCAM_MAX_H = 160;

export const isPrivilegedCameraUser = (user) => Boolean(
  user?.presenter || user?.isModerator,
);

const isActiveStream = (stream) => stream && stream.type !== VIDEO_TYPES.CONNECTING;

const streamKey = (item) => {
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

export const calcStageWebcamHeight = (cameraCount) => {
  if (cameraCount <= 0) return 0;
  return Math.min(
    SKYROOM_STAGE_WEBCAM_MAX_H,
    Math.max(SKYROOM_STAGE_WEBCAM_MIN_H, 72 + cameraCount * 28),
  );
};

export const partitionSkyroomStreams = (streams = []) => {
  const active = (streams || []).filter(isActiveStream);
  const { privilegedCount, viewerCount } = classifySkyroomCameras(active);
  const { useSidebar, useStage, useSplit } = resolveSkyroomCameraPlacement({
    privilegedCount,
    viewerCount,
  });

  if (!useSidebar && !useStage) {
    return { sidebar: [], stage: [], split: false };
  }

  if (useSidebar && !useStage) {
    return {
      sidebar: active.filter(isPrivilegedStream).slice(0, PRIVILEGED_SIDEBAR_MAX),
      stage: [],
      split: false,
    };
  }

  if (useStage && !useSidebar) {
    return { sidebar: [], stage: active, split: false };
  }

  const sidebar = active.filter(isPrivilegedStream).slice(0, PRIVILEGED_SIDEBAR_MAX);
  const sidebarKeys = new Set(sidebar.map(streamKey));
  const stage = active.filter((s) => !sidebarKeys.has(streamKey(s)));

  return { sidebar, stage, split: useSplit };
};

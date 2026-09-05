export type ViewportRect = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

export type ViewportBudgetStream = {
  focused?: boolean;
  floor?: boolean;
  local: boolean;
  pinned?: boolean;
  presenter?: boolean;
  stream: string;
};

export {
  intersectRectArea,
  isTileVisibleInClip,
  resolveStableViewportSelection,
  selectBootstrapRemoteIds,
  selectHardBudgetedRemoteIds,
  VIEWPORT_SELECTION_REASONS,
  WEBCAM_VIEWPORT_MIN_VISIBLE_RATIO,
} from '/imports/ui/components/video-provider/mobile-webcam-viewport-policy';

export const WEBCAM_VIEWPORT_CLIP_SELECTOR = [
  '#skyroom-stage-webcam-dock',
  '#skyroom-sidebar-webcam-dock',
  '#skyroom-center-webcam-dock',
  '#cameraDock',
].join(', ');

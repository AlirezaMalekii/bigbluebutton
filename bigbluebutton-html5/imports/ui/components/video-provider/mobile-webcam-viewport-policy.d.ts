export type ViewportBudgetStream = {
  focused?: boolean;
  floor?: boolean;
  local: boolean;
  pinned?: boolean;
  presenter?: boolean;
  stream: string;
};

export type ViewportRect = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

export const WEBCAM_VIEWPORT_MIN_VISIBLE_RATIO: number;

export const VIEWPORT_SELECTION_REASONS: {
  bootstrap: 'bootstrap';
  emptySnapshot: 'empty_snapshot_retained';
  tabHidden: 'tab_hidden_retained';
  visiblePriority: 'visible_priority';
  budgeted: 'budgeted';
  handoff: 'handoff';
};

export function intersectRectArea(a: ViewportRect, b: ViewportRect): number;

export function isTileVisibleInClip(
  targetRect: ViewportRect,
  clipRect: ViewportRect,
  overscan?: number,
  minRatio?: number,
): { area: number; visible: boolean };

export function selectBootstrapRemoteIds(args: {
  limit: number;
  streams: ViewportBudgetStream[];
}): Set<string>;

export function selectHardBudgetedRemoteIds(args: {
  candidateAreas: Map<string, number>;
  isMobile: boolean;
  limit: number;
  streams: ViewportBudgetStream[];
}): Set<string>;

export function resolveStableViewportSelection(args: {
  candidateAreas: Map<string, number>;
  hasSnapshot: boolean;
  isHidden?: boolean;
  isMobile: boolean;
  limit: number;
  previousRetained?: Set<string>;
  previousVisible?: Set<string>;
  streams: ViewportBudgetStream[];
}): {
  nextVisible: Set<string>;
  reason: string;
  retained: Set<string>;
};

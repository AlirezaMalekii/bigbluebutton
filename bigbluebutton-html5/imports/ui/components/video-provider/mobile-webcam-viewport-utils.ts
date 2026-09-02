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

export const WEBCAM_VIEWPORT_CLIP_SELECTOR = [
  '#skyroom-stage-webcam-dock',
  '#skyroom-sidebar-webcam-dock',
  '#skyroom-center-webcam-dock',
  '#cameraDock',
].join(', ');

/** A tile must cover at least this fraction of its own area inside the dock. */
export const WEBCAM_VIEWPORT_MIN_VISIBLE_RATIO = 0.12;

export const intersectRectArea = (a: ViewportRect, b: ViewportRect): number => {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  return Math.max(0, right - left) * Math.max(0, bottom - top);
};

export const isTileVisibleInClip = (
  targetRect: ViewportRect,
  clipRect: ViewportRect,
  overscan = 0,
  minRatio = WEBCAM_VIEWPORT_MIN_VISIBLE_RATIO,
): { area: number; visible: boolean } => {
  if (targetRect.width <= 0 || targetRect.height <= 0) {
    return { area: 0, visible: false };
  }

  const inflated: ViewportRect = {
    bottom: clipRect.bottom + overscan,
    height: clipRect.height + (overscan * 2),
    left: clipRect.left - overscan,
    right: clipRect.right + overscan,
    top: clipRect.top - overscan,
    width: clipRect.width + (overscan * 2),
  };
  const area = intersectRectArea(targetRect, inflated);
  const tileArea = targetRect.width * targetRect.height;
  return {
    area,
    visible: area > 0 && (area / tileArea) >= minRatio,
  };
};

/**
 * Pick the remote cameras that may decode under a hard budget.
 * Visible tiles win by on-screen area; off-screen tiles are dropped so
 * scrolled-in cameras can take the decoder slots.
 */
export const selectHardBudgetedRemoteIds = ({
  candidateAreas,
  isMobile,
  limit,
  streams,
}: {
  candidateAreas: Map<string, number>;
  isMobile: boolean;
  limit: number;
  streams: ViewportBudgetStream[];
}): Set<string> => {
  const localCount = streams.filter((item) => item.local).length;
  const remoteBudget = Math.max(0, Math.floor(limit) - localCount);
  if (remoteBudget <= 0) return new Set();

  const candidates = streams.filter((item) => (
    !item.local
    && (
      candidateAreas.has(item.stream)
      || (!isMobile && (item.focused || item.pinned || item.floor || item.presenter))
    )
  ));

  const score = (item: ViewportBudgetStream) => {
    const area = candidateAreas.get(item.stream) ?? 0;
    const visibleScore = area > 0 ? 1000 + area : 0;
    if (item.focused) return visibleScore + 40;
    if (item.pinned) return visibleScore + 30;
    if (item.floor || item.presenter) return visibleScore + 20;
    return visibleScore + 1;
  };

  return new Set(
    candidates
      .slice()
      .sort((left, right) => score(right) - score(left))
      .slice(0, remoteBudget)
      .map((item) => item.stream),
  );
};

export const WEBCAM_VIEWPORT_MIN_VISIBLE_RATIO = 0.12;

export const intersectRectArea = (a, b) => {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  return Math.max(0, right - left) * Math.max(0, bottom - top);
};

export const isTileVisibleInClip = (
  targetRect,
  clipRect,
  overscan = 0,
  minRatio = WEBCAM_VIEWPORT_MIN_VISIBLE_RATIO,
) => {
  if (targetRect.width <= 0 || targetRect.height <= 0) {
    return { area: 0, visible: false };
  }

  const inflated = {
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

export const VIEWPORT_SELECTION_REASONS = {
  bootstrap: 'bootstrap',
  emptySnapshot: 'empty_snapshot_retained',
  tabHidden: 'tab_hidden_retained',
  visiblePriority: 'visible_priority',
  budgeted: 'budgeted',
  handoff: 'handoff',
};

const privilegeScore = (item) => {
  if (item.focused) return 40;
  if (item.pinned) return 30;
  if (item.floor || item.presenter) return 20;
  return 1;
};

const remoteBudgetFromLimit = (streams, limit) => {
  const localCount = streams.filter((item) => item.local).length;
  return Math.max(0, Math.floor(limit) - localCount);
};

/**
 * Pick a bounded remote set before IntersectionObserver has a real snapshot.
 * Local cameras stay outside this set and remain subscribed separately.
 */
export const selectBootstrapRemoteIds = ({
  limit,
  streams,
}) => {
  const remoteBudget = remoteBudgetFromLimit(streams, limit);
  if (remoteBudget <= 0) return new Set();

  return new Set(
    streams
      .filter((item) => !item.local)
      .slice()
      .sort((left, right) => privilegeScore(right) - privilegeScore(left))
      .slice(0, remoteBudget)
      .map((item) => item.stream),
  );
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
}) => {
  const remoteBudget = remoteBudgetFromLimit(streams, limit);
  if (remoteBudget <= 0) return new Set();

  const candidates = streams.filter((item) => (
    !item.local
    && (
      candidateAreas.has(item.stream)
      || (!isMobile && (item.focused || item.pinned || item.floor || item.presenter))
    )
  ));

  const score = (item) => {
    const area = candidateAreas.get(item.stream) ?? 0;
    const visibleScore = area > 0 ? 1000 + area : 0;
    return visibleScore + privilegeScore(item);
  };

  return new Set(
    candidates
      .slice()
      .sort((left, right) => score(right) - score(left))
      .slice(0, remoteBudget)
      .map((item) => item.stream),
  );
};

const pickHandoffRetain = (previousVisible, nextVisible) => {
  const leaving = [];
  previousVisible.forEach((stream) => {
    if (!nextVisible.has(stream)) leaving.push(stream);
  });
  let entering = 0;
  nextVisible.forEach((stream) => {
    if (!previousVisible.has(stream)) entering += 1;
  });
  if (entering === 0 || leaving.length === 0) return null;
  return leaving[0];
};

/**
 * Stable viewport subscription: bootstrap before the first IO snapshot,
 * keep the last healthy set on an empty/hidden snapshot, give on-screen
 * tiles priority over the decoder cap, and retain one outgoing stream
 * while a replacement connects.
 */
export const resolveStableViewportSelection = ({
  candidateAreas,
  hasSnapshot,
  isHidden = false,
  isMobile,
  limit,
  previousRetained = new Set(),
  previousVisible = new Set(),
  streams,
}) => {
  if (isHidden && previousVisible.size > 0) {
    return {
      nextVisible: new Set(previousVisible),
      reason: VIEWPORT_SELECTION_REASONS.tabHidden,
      retained: new Set(previousRetained.size > 0 ? previousRetained : previousVisible),
    };
  }

  if (!hasSnapshot) {
    const bootstrap = selectBootstrapRemoteIds({ limit, streams });
    return {
      nextVisible: bootstrap,
      reason: VIEWPORT_SELECTION_REASONS.bootstrap,
      retained: new Set(bootstrap),
    };
  }

  if (candidateAreas.size === 0) {
    if (previousVisible.size > 0) {
      return {
        nextVisible: new Set(previousVisible),
        reason: VIEWPORT_SELECTION_REASONS.emptySnapshot,
        retained: new Set(previousRetained.size > 0 ? previousRetained : previousVisible),
      };
    }
    const bootstrap = selectBootstrapRemoteIds({ limit, streams });
    return {
      nextVisible: bootstrap,
      reason: VIEWPORT_SELECTION_REASONS.bootstrap,
      retained: new Set(bootstrap),
    };
  }

  const visibleRemotes = streams
    .filter((item) => !item.local && (candidateAreas.get(item.stream) ?? 0) > 0)
    .slice()
    .sort((left, right) => (
      (candidateAreas.get(right.stream) ?? 0) - (candidateAreas.get(left.stream) ?? 0)
    ));
  const remoteBudget = remoteBudgetFromLimit(streams, limit);

  let nextVisible;
  let reason;
  if (visibleRemotes.length > remoteBudget) {
    nextVisible = new Set(visibleRemotes.map((item) => item.stream));
    reason = VIEWPORT_SELECTION_REASONS.visiblePriority;
  } else {
    nextVisible = selectHardBudgetedRemoteIds({
      candidateAreas,
      isMobile,
      limit,
      streams,
    });
    visibleRemotes.forEach((item) => nextVisible.add(item.stream));
    reason = VIEWPORT_SELECTION_REASONS.budgeted;
  }

  const retained = new Set(nextVisible);
  const overlap = pickHandoffRetain(previousVisible, nextVisible);
  if (overlap) {
    retained.add(overlap);
    reason = VIEWPORT_SELECTION_REASONS.handoff;
  }

  return { nextVisible, reason, retained };
};

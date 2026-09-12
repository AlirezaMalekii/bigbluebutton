export const WEBCAM_VIEWPORT_MIN_VISIBLE_RATIO = 0.12;

// Android tablets report a mobile user agent even when SafeMeet renders its
// desktop layout. BBB's mobile page size must only apply to the actual SafeMeet
// phone grid; otherwise a tablet can be stuck on a two-camera page with no
// applicable mobile navigation UI.
export const shouldUseMobileCameraPagination = ({
  isMobileEndpoint,
  isSkyroom,
  skyroomColumnLayout,
  skyroomMobileViewport,
}) => Boolean(isMobileEndpoint && (
  !isSkyroom || (skyroomColumnLayout && skyroomMobileViewport)
));

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
  // The local camera is accounted for outside the remote budget and therefore
  // always wins. An explicit user selection may temporarily replace a remote
  // slot; otherwise instructors/moderators receive the first remote slots.
  if (item.focused) return 60;
  if (item.moderator || item.presenter) return 50;
  if (item.pinned) return 40;
  if (item.floor) return 30;
  return 1;
};

// A selected/pinned camera must survive a viewport budget. The area then
// decides between cameras in the same priority class.
const selectionScore = (item, area) => (privilegeScore(item) * 1000000000) + area;

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
      || item.focused
      || item.moderator
      || item.pinned
      || item.presenter
      || (!isMobile && item.floor)
    )
  ));

  const score = (item) => {
    const area = candidateAreas.get(item.stream) ?? 0;
    return selectionScore(item, area);
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
 * keep the last healthy set on an empty observer snapshot, release remote
 * cameras while hidden, keep the selected camera inside a strict decoder cap,
 * and retain one outgoing stream
 * while a replacement connects.
 */
export const resolveStableViewportSelection = ({
  candidateAreas,
  hasSnapshot,
  isHidden = false,
  isMobile,
  limit,
  previousVisible = new Set(),
  streams,
}) => {
  if (isHidden) {
    return {
      nextVisible: new Set(),
      reason: VIEWPORT_SELECTION_REASONS.tabHidden,
      retained: new Set(),
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
      const remoteBudget = remoteBudgetFromLimit(streams, limit);
      const boundedPrevious = new Set(
        streams
          .filter((item) => !item.local && previousVisible.has(item.stream))
          .slice()
          .sort((left, right) => privilegeScore(right) - privilegeScore(left))
          .slice(0, remoteBudget)
          .map((item) => item.stream),
      );
      return {
        nextVisible: boundedPrevious,
        reason: VIEWPORT_SELECTION_REASONS.emptySnapshot,
        retained: new Set(boundedPrevious),
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

  const nextVisible = selectHardBudgetedRemoteIds({
    candidateAreas,
    isMobile,
    limit,
    streams,
  });
  let reason = visibleRemotes.length > remoteBudget
    ? VIEWPORT_SELECTION_REASONS.visiblePriority
    : VIEWPORT_SELECTION_REASONS.budgeted;

  const retained = new Set(nextVisible);
  const overlap = pickHandoffRetain(previousVisible, nextVisible);
  if (overlap) {
    retained.add(overlap);
    reason = VIEWPORT_SELECTION_REASONS.handoff;
  }

  return { nextVisible, reason, retained };
};

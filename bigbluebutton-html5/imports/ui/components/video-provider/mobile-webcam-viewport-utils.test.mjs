import assert from 'node:assert/strict';

const intersectRectArea = (a, b) => {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  return Math.max(0, right - left) * Math.max(0, bottom - top);
};

const isTileVisibleInClip = (targetRect, clipRect, overscan = 0, minRatio = 0.12) => {
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

const selectHardBudgetedRemoteIds = ({
  candidateAreas,
  isMobile,
  limit,
  streams,
}) => {
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

  const score = (item) => {
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

const rect = (top, left, width, height) => ({
  top,
  left,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

assert.equal(intersectRectArea(rect(0, 0, 100, 100), rect(50, 50, 100, 100)), 2500);
assert.equal(intersectRectArea(rect(0, 0, 100, 100), rect(200, 200, 50, 50)), 0);

const dock = rect(0, 0, 200, 400);
assert.equal(isTileVisibleInClip(rect(0, 0, 100, 200), dock).visible, true);
assert.equal(isTileVisibleInClip(rect(400, 0, 100, 200), dock).visible, false);
assert.equal(isTileVisibleInClip(rect(390, 0, 100, 200), dock, 0, 0.12).visible, false);

const selected = selectHardBudgetedRemoteIds({
  candidateAreas: new Map([
    ['cam-1', 20000],
    ['cam-2', 19000],
    ['cam-3', 18000],
    ['cam-4', 17000],
    ['cam-5', 500],
  ]),
  isMobile: true,
  limit: 4,
  streams: [
    { stream: 'local', local: true },
    { stream: 'cam-1', local: false },
    { stream: 'cam-2', local: false },
    { stream: 'cam-3', local: false },
    { stream: 'cam-4', local: false },
    { stream: 'cam-5', local: false },
    { stream: 'cam-6', local: false },
  ],
});
assert.deepEqual([...selected].sort(), ['cam-1', 'cam-2', 'cam-3']);

const scrolled = selectHardBudgetedRemoteIds({
  candidateAreas: new Map([
    ['cam-3', 16000],
    ['cam-4', 18000],
    ['cam-5', 20000],
    ['cam-6', 21000],
  ]),
  isMobile: true,
  limit: 4,
  streams: [
    { stream: 'local', local: true },
    { stream: 'cam-1', local: false },
    { stream: 'cam-2', local: false },
    { stream: 'cam-3', local: false },
    { stream: 'cam-4', local: false },
    { stream: 'cam-5', local: false },
    { stream: 'cam-6', local: false },
  ],
});
assert.deepEqual([...scrolled].sort(), ['cam-4', 'cam-5', 'cam-6']);

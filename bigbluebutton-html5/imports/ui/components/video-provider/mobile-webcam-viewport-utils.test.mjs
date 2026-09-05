import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const loadProductionModule = async (relativePath) => {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
  return import(moduleUrl);
};

const {
  computeMobileScrollableWebcamGrid,
} = await loadProductionModule('./mobile-webcam-grid-policy.js');
const {
  intersectRectArea,
  isTileVisibleInClip,
  resolveStableViewportSelection,
  selectBootstrapRemoteIds,
  selectHardBudgetedRemoteIds,
  VIEWPORT_SELECTION_REASONS,
} = await loadProductionModule('./mobile-webcam-viewport-policy.js');

const toBudgetStreams = (ids, extras = {}) => ids.map((stream) => ({
  local: stream === 'local',
  stream,
  ...extras[stream],
}));

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
  streams: toBudgetStreams(['local', 'cam-1', 'cam-2', 'cam-3', 'cam-4', 'cam-5', 'cam-6']),
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
  streams: toBudgetStreams(['local', 'cam-1', 'cam-2', 'cam-3', 'cam-4', 'cam-5', 'cam-6']),
});
assert.deepEqual([...scrolled].sort(), ['cam-4', 'cam-5', 'cam-6']);

const bootstrap = selectBootstrapRemoteIds({
  limit: 4,
  streams: toBudgetStreams(
    ['local', 'cam-1', 'cam-2', 'cam-3', 'cam-4', 'cam-5'],
    { 'cam-2': { presenter: true } },
  ),
});
assert.equal(bootstrap.has('cam-2'), true);
assert.equal(bootstrap.has('local'), false);
assert.equal(bootstrap.size, 3);

const bootstrapped = resolveStableViewportSelection({
  candidateAreas: new Map(),
  hasSnapshot: false,
  isMobile: true,
  limit: 4,
  streams: toBudgetStreams(['local', 'cam-1', 'cam-2', 'cam-3', 'cam-4', 'cam-5']),
});
assert.equal(bootstrapped.reason, VIEWPORT_SELECTION_REASONS.bootstrap);
assert.equal(bootstrapped.nextVisible.size, 3);
assert.equal(bootstrapped.nextVisible.has('local'), false);

const emptySnapshot = resolveStableViewportSelection({
  candidateAreas: new Map(),
  hasSnapshot: true,
  isMobile: true,
  limit: 4,
  previousVisible: new Set(['cam-1', 'cam-2', 'cam-3']),
  streams: toBudgetStreams(['local', 'cam-1', 'cam-2', 'cam-3', 'cam-4']),
});
assert.equal(emptySnapshot.reason, VIEWPORT_SELECTION_REASONS.emptySnapshot);
assert.deepEqual([...emptySnapshot.nextVisible].sort(), ['cam-1', 'cam-2', 'cam-3']);

const hiddenTab = resolveStableViewportSelection({
  candidateAreas: new Map([['cam-5', 100]]),
  hasSnapshot: true,
  isHidden: true,
  isMobile: true,
  limit: 4,
  previousVisible: new Set(['cam-1', 'cam-2', 'cam-3']),
  streams: toBudgetStreams(['local', 'cam-1', 'cam-2', 'cam-3', 'cam-4', 'cam-5']),
});
assert.equal(hiddenTab.reason, VIEWPORT_SELECTION_REASONS.tabHidden);
assert.deepEqual([...hiddenTab.nextVisible].sort(), ['cam-1', 'cam-2', 'cam-3']);

const fiveVisible = resolveStableViewportSelection({
  candidateAreas: new Map([
    ['cam-1', 20000],
    ['cam-2', 19000],
    ['cam-3', 18000],
    ['cam-4', 17000],
  ]),
  hasSnapshot: true,
  isMobile: true,
  limit: 4,
  previousVisible: new Set(['cam-1', 'cam-2', 'cam-3']),
  streams: toBudgetStreams(['local', 'cam-1', 'cam-2', 'cam-3', 'cam-4', 'cam-5']),
});
assert.equal(fiveVisible.reason, VIEWPORT_SELECTION_REASONS.visiblePriority);
assert.deepEqual([...fiveVisible.nextVisible].sort(), ['cam-1', 'cam-2', 'cam-3', 'cam-4']);
assert.equal(fiveVisible.retained.has('cam-4'), true);

const handoff = resolveStableViewportSelection({
  candidateAreas: new Map([
    ['cam-3', 16000],
    ['cam-4', 18000],
    ['cam-5', 20000],
  ]),
  hasSnapshot: true,
  isMobile: true,
  limit: 4,
  previousVisible: new Set(['cam-1', 'cam-2', 'cam-3']),
  streams: toBudgetStreams(['local', 'cam-1', 'cam-2', 'cam-3', 'cam-4', 'cam-5']),
});
assert.equal(handoff.reason, VIEWPORT_SELECTION_REASONS.handoff);
assert.deepEqual([...handoff.nextVisible].sort(), ['cam-3', 'cam-4', 'cam-5']);
assert.equal(handoff.retained.size, 4);
assert.equal(
  [...handoff.retained].some((stream) => !handoff.nextVisible.has(stream)),
  true,
);

const localOnlyBudget = selectBootstrapRemoteIds({
  limit: 1,
  streams: toBudgetStreams(['local', 'cam-1', 'cam-2']),
});
assert.equal(localOnlyBudget.size, 0);

const one = computeMobileScrollableWebcamGrid(1, 390, 220, 4);
assert.equal(one.columns, 1);
assert.equal(one.rows, 1);
assert.equal(one.height, 220);

const pair = computeMobileScrollableWebcamGrid(2, 390, 220, 4);
assert.equal(pair.columns, 2);
assert.equal(pair.rows, 1);
assert.equal(pair.height, 220);

const twoByTwo = computeMobileScrollableWebcamGrid(4, 390, 220, 4);
assert.equal(twoByTwo.columns, 2);
assert.equal(twoByTwo.rows, 2);
assert.ok(twoByTwo.height >= 220);

const overflow = computeMobileScrollableWebcamGrid(5, 390, 220, 4);
assert.equal(overflow.columns, 2);
assert.equal(overflow.rows, 3);
assert.ok(overflow.height > 220);
assert.equal(overflow.cellHeight, twoByTwo.cellHeight);

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
  shouldUseMobileCameraPagination,
  VIEWPORT_SELECTION_REASONS,
} = await loadProductionModule('./mobile-webcam-viewport-policy.js');

assert.equal(shouldUseMobileCameraPagination({
  isMobileEndpoint: true,
  isSkyroom: true,
  skyroomColumnLayout: false,
  skyroomMobileViewport: false,
}), false, 'SafeMeet tablet desktop layout must not inherit BBB mobile page size');
assert.equal(shouldUseMobileCameraPagination({
  isMobileEndpoint: true,
  isSkyroom: true,
  skyroomColumnLayout: true,
  skyroomMobileViewport: true,
}), true, 'SafeMeet phone grid keeps mobile pagination semantics');
assert.equal(shouldUseMobileCameraPagination({
  isMobileEndpoint: true,
  isSkyroom: false,
  skyroomColumnLayout: false,
  skyroomMobileViewport: false,
}), true, 'upstream BBB mobile behavior remains compatible outside SafeMeet');

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

const privilegedBootstrap = selectBootstrapRemoteIds({
  limit: 3,
  streams: toBudgetStreams(
    ['local', 'viewer-1', 'moderator-1', 'viewer-2', 'presenter-1'],
    {
      'moderator-1': { moderator: true },
      'presenter-1': { presenter: true },
    },
  ),
});
assert.deepEqual(
  [...privilegedBootstrap].sort(),
  ['moderator-1', 'presenter-1'],
  'local camera consumes the first slot and privileged users receive the remaining slots',
);

const moderatorBeforeLargerViewer = selectHardBudgetedRemoteIds({
  candidateAreas: new Map([
    ['viewer-1', 50000],
    ['viewer-2', 40000],
  ]),
  isMobile: true,
  limit: 2,
  streams: toBudgetStreams(
    ['local', 'viewer-1', 'moderator-1', 'viewer-2'],
    { 'moderator-1': { moderator: true } },
  ),
});
assert.deepEqual(
  [...moderatorBeforeLargerViewer],
  ['moderator-1'],
  'a moderator keeps the privileged remote slot even before entering the observer snapshot',
);

const explicitlySelectedViewer = selectHardBudgetedRemoteIds({
  candidateAreas: new Map([
    ['viewer-1', 50000],
    ['moderator-1', 1000],
  ]),
  isMobile: true,
  limit: 2,
  streams: toBudgetStreams(
    ['local', 'viewer-1', 'moderator-1'],
    {
      'viewer-1': { focused: true },
      'moderator-1': { moderator: true },
    },
  ),
});
assert.deepEqual(
  [...explicitlySelectedViewer],
  ['viewer-1'],
  'an explicit selection swaps one remote slot without exceeding the budget',
);

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

const reducedBudgetOnEmptySnapshot = resolveStableViewportSelection({
  candidateAreas: new Map(),
  hasSnapshot: true,
  isMobile: true,
  limit: 3,
  previousRetained: new Set(['cam-1', 'cam-2', 'cam-3', 'cam-4']),
  previousVisible: new Set(['cam-1', 'cam-2', 'cam-3', 'cam-4']),
  streams: toBudgetStreams(
    ['local', 'cam-1', 'cam-2', 'cam-3', 'cam-4'],
    { 'cam-4': { focused: true } },
  ),
});
assert.equal(reducedBudgetOnEmptySnapshot.nextVisible.size, 2);
assert.equal(reducedBudgetOnEmptySnapshot.retained.size, 2);
assert.equal(reducedBudgetOnEmptySnapshot.nextVisible.has('cam-4'), true);

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
assert.equal(hiddenTab.nextVisible.size, 0);
assert.equal(hiddenTab.retained.size, 0);
const hiddenBeforeSnapshot = resolveStableViewportSelection({
  candidateAreas: new Map(),
  hasSnapshot: false,
  isHidden: true,
  isMobile: true,
  limit: 4,
  streams: toBudgetStreams(['local', 'cam-1', 'cam-2', 'cam-3']),
});
assert.equal(hiddenBeforeSnapshot.nextVisible.size, 0);

const visibleAgain = resolveStableViewportSelection({
  candidateAreas: new Map([
    ['cam-3', 16000],
    ['cam-4', 18000],
    ['cam-5', 20000],
  ]),
  hasSnapshot: true,
  isMobile: true,
  limit: 4,
  previousVisible: hiddenTab.nextVisible,
  streams: toBudgetStreams(['local', 'cam-1', 'cam-2', 'cam-3', 'cam-4', 'cam-5']),
});
assert.deepEqual([...visibleAgain.nextVisible].sort(), ['cam-3', 'cam-4', 'cam-5']);

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
assert.deepEqual([...fiveVisible.nextVisible].sort(), ['cam-1', 'cam-2', 'cam-3']);
assert.equal(fiveVisible.retained.size, 3);

const focusedOffscreen = selectHardBudgetedRemoteIds({
  candidateAreas: new Map([
    ['cam-1', 20000],
    ['cam-2', 19000],
    ['cam-3', 18000],
    ['cam-4', 17000],
  ]),
  isMobile: true,
  limit: 4,
  streams: toBudgetStreams(
    ['local', 'cam-1', 'cam-2', 'cam-3', 'cam-4', 'cam-5'],
    { 'cam-5': { focused: true } },
  ),
});
assert.equal(focusedOffscreen.size, 3);
assert.equal(focusedOffscreen.has('cam-5'), true);

const fiftyCameraIds = Array.from({ length: 50 }, (_, index) => `cam-${index + 1}`);
const fiftyCandidates = new Map(fiftyCameraIds.map((stream, index) => [stream, 50000 - index]));
const fiftyStreams = toBudgetStreams(
  ['local', ...fiftyCameraIds],
  { 'cam-50': { focused: true } },
);
const mobileFifty = selectHardBudgetedRemoteIds({
  candidateAreas: fiftyCandidates,
  isMobile: true,
  limit: 4,
  streams: fiftyStreams,
});
assert.equal(mobileFifty.size, 3);
assert.equal(mobileFifty.has('cam-50'), true);
const desktopLowPowerFifty = selectHardBudgetedRemoteIds({
  candidateAreas: fiftyCandidates,
  isMobile: false,
  limit: 6,
  streams: fiftyStreams,
});
assert.equal(desktopLowPowerFifty.size, 5);
assert.equal(desktopLowPowerFifty.has('cam-50'), true);

const twoHundredCameraIds = Array.from({ length: 200 }, (_, index) => `bulk-${index + 1}`);
const twoHundred = selectHardBudgetedRemoteIds({
  candidateAreas: new Map(twoHundredCameraIds.map((stream, index) => [stream, 200000 - index])),
  isMobile: false,
  limit: 3,
  streams: toBudgetStreams(['local', ...twoHundredCameraIds]),
});
assert.equal(twoHundred.size, 2);

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
assert.equal(pair.cellWidth, pair.cellHeight);
assert.ok(pair.height < 220);

const twoByTwo = computeMobileScrollableWebcamGrid(4, 390, 220, 4);
assert.equal(twoByTwo.columns, 2);
assert.equal(twoByTwo.rows, 2);
assert.equal(twoByTwo.cellWidth, twoByTwo.cellHeight);
assert.equal(twoByTwo.cellHeight, pair.cellHeight);

const overflow = computeMobileScrollableWebcamGrid(5, 390, 220, 4);
assert.equal(overflow.columns, 2);
assert.equal(overflow.rows, 3);
assert.ok(overflow.height > 220);
assert.equal(overflow.cellHeight, twoByTwo.cellHeight);

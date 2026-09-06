import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const loadProductionModule = async (relativePath) => {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
  return import(moduleUrl);
};

const {
  resolvePlaybackLiveness,
  shouldShowConnectingOverlay,
} = await loadProductionModule('./video-playback-policy.js');

assert.deepEqual(
  resolvePlaybackLiveness({
    paused: false,
    hasSrcObject: true,
    hasRenderableFrame: true,
    currentTime: 0,
    lastObservedCurrentTime: 0,
  }),
  { alive: true, attemptPlay: false },
  'decoded remote frames must stay alive even when currentTime is stuck at 0',
);

assert.deepEqual(
  resolvePlaybackLiveness({
    paused: true,
    hasSrcObject: true,
    hasRenderableFrame: true,
    currentTime: 0,
    lastObservedCurrentTime: 0,
  }),
  { alive: true, attemptPlay: true },
  'a paused element with a picture should play again, not cover the tile',
);

assert.deepEqual(
  resolvePlaybackLiveness({
    paused: false,
    hasSrcObject: true,
    hasRenderableFrame: false,
    currentTime: 1.2,
    lastObservedCurrentTime: 0.4,
  }),
  { alive: true, attemptPlay: false },
  'advancing currentTime still counts when rVFC is throttled',
);

assert.deepEqual(
  resolvePlaybackLiveness({
    paused: false,
    hasSrcObject: true,
    hasRenderableFrame: false,
    currentTime: 0,
    lastObservedCurrentTime: 0,
  }),
  { alive: false, attemptPlay: false },
);

assert.deepEqual(
  resolvePlaybackLiveness({
    paused: false,
    hasSrcObject: false,
    hasRenderableFrame: false,
  }),
  { alive: false, attemptPlay: false },
);

assert.equal(shouldShowConnectingOverlay({ hasRenderedFrame: false }), true);
assert.equal(shouldShowConnectingOverlay({ hasRenderedFrame: true }), false);
assert.equal(shouldShowConnectingOverlay({
  hasRenderedFrame: true,
  isSelfViewDisabled: true,
}), false);
assert.equal(shouldShowConnectingOverlay({ isAudioOnly: true, hasRenderedFrame: true }), true);

console.log('video-playback-policy tests passed');

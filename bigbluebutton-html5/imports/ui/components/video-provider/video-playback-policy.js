/**
 * Pure playback/overlay rules for webcam tiles.
 * Keep this file importable from Node tests (no DOM types).
 */

export const PLAYBACK_STATES = {
  waiting: 'waiting',
  playing: 'playing',
  stalled: 'stalled',
  ended: 'ended',
};

/**
 * Decide whether the 5s liveness watchdog should keep the tile in 'playing'.
 *
 * Remote MediaStreams — especially Firefox-published cameras viewed in Chrome —
 * often decode frames while HTMLVideoElement.currentTime stays at 0. Requiring
 * currentTime to advance was treating healthy feeds as stalled, covering them
 * with the avatar overlay and reconnecting the viewer every ~15s.
 */
export const resolvePlaybackLiveness = ({
  paused = false,
  hasSrcObject = false,
  hasRenderableFrame = false,
  currentTime = 0,
  lastObservedCurrentTime = 0,
} = {}) => {
  if (!hasSrcObject) {
    return { alive: false, attemptPlay: false };
  }

  if (paused) {
    return {
      alive: hasRenderableFrame,
      attemptPlay: true,
    };
  }

  if (hasRenderableFrame || currentTime > lastObservedCurrentTime) {
    return { alive: true, attemptPlay: false };
  }

  return { alive: false, attemptPlay: false };
};

/**
 * Hide the connecting avatar once a decoded frame has been shown.
 * Transient stall/unhealthy styling must not replace a working picture.
 */
export const shouldShowConnectingOverlay = ({
  hasRenderedFrame = false,
  isSelfViewDisabled = false,
  isAudioOnly = false,
} = {}) => {
  if (isAudioOnly) return true;
  if (isSelfViewDisabled) return false;
  return !hasRenderedFrame;
};

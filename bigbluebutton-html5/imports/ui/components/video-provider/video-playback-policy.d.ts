export const PLAYBACK_STATES: {
  waiting: 'waiting';
  playing: 'playing';
  stalled: 'stalled';
  ended: 'ended';
};

export function resolvePlaybackLiveness(input?: {
  paused?: boolean;
  hasSrcObject?: boolean;
  hasRenderableFrame?: boolean;
  currentTime?: number;
  lastObservedCurrentTime?: number;
}): {
  alive: boolean;
  attemptPlay: boolean;
};

export function shouldShowConnectingOverlay(input?: {
  hasRenderedFrame?: boolean;
  isSelfViewDisabled?: boolean;
  isAudioOnly?: boolean;
}): boolean;

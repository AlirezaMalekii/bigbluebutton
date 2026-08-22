export type VideoPlaybackState = 'waiting' | 'playing' | 'stalled' | 'ended';

export const VIDEO_PLAYBACK_STALL_GRACE_MS = 3000;

type MediaStreamIdentity = Pick<MediaStream, 'id'>;
type VideoAttachmentTarget = Pick<HTMLVideoElement, 'paused' | 'srcObject'>;
type RenderableVideo = Pick<HTMLVideoElement, 'readyState' | 'videoWidth' | 'videoHeight'>;

/**
 * Attach when the element has no source, points at another stream, or the
 * browser paused the current stream while the page/app was backgrounded.
 */
export const shouldAttachMediaStream = (
  stream: MediaStreamIdentity | null | undefined,
  videoElement: VideoAttachmentTarget | null | undefined,
): boolean => {
  if (!stream || !videoElement) return false;

  const attachedStream = videoElement.srcObject as MediaStreamIdentity | null;
  return !attachedStream || attachedStream.id !== stream.id || videoElement.paused;
};

/** loadedmetadata/live tracks are not enough: require decoded image data. */
export const videoHasRenderableFrame = (
  videoElement: RenderableVideo | null | undefined,
): boolean => Boolean(
  videoElement
  && videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
  && videoElement.videoWidth > 0
  && videoElement.videoHeight > 0,
);

export const getPlaybackRecoveryDelay = (
  state: VideoPlaybackState,
  baseTimeout: number,
): number => (
  state === 'stalled' || state === 'ended'
    ? VIDEO_PLAYBACK_STALL_GRACE_MS
    : baseTimeout
);

/** Only recreate publishers that were not already rebuilt by the stream update cycle. */
export const getMissingWebcamStreamsForRestore = (
  pendingStreams: Iterable<string>,
  activeStreams: Iterable<string>,
): string[] => {
  const activeStreamIds = new Set(activeStreams);
  return Array.from(pendingStreams).filter((stream) => !activeStreamIds.has(stream));
};

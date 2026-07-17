import logger from '/imports/startup/client/logger';
import {
  getAuthenticatedPresentationMediaPlaybackUrl,
  isMediaExtension,
} from './fileTypes';

export const resolvePresentationId = (item, propPresentations = []) => {
  if (!item) return '';

  if (item.presentationId
    && propPresentations.some((p) => p.presentationId === item.presentationId)) {
    return item.presentationId;
  }

  const tempId = item.uploadTemporaryId || item.presentationId;
  const byTemporaryId = propPresentations.find(
    (p) => p.uploadTemporaryId === tempId || p.uploadTemporaryId === item.presentationId,
  );
  if (byTemporaryId?.presentationId) return byTemporaryId.presentationId;

  const byName = propPresentations.find(
    (p) => p.name === item.name && p.uploadCompleted !== false,
  );
  if (byName?.presentationId) return byName.presentationId;

  if (item.id && propPresentations.some((p) => p.presentationId === item.id)) {
    return item.id;
  }

  return item.presentationId || '';
};

export const isPresentationMedia = (presentation) => (
  presentation?.isMedia || isMediaExtension(presentation?.name)
);

/**
 * Sync presentation selection with the external-video channel.
 * - Uploaded media files (mp4/mp3/...) → start authenticated media playback
 * - Documents/images/etc → stop any online/Aparat/external video so the
 *   whiteboard/presentation area can show again
 */
export const startPresentationMediaExternalVideo = (
  presentation,
  propPresentations = [],
  { startExternalVideo, stopExternalVideo } = {},
  { delayMs = 0 } = {},
) => {
  if (!presentation || !isPresentationMedia(presentation)) {
    stopExternalVideo?.();
    return false;
  }

  if (!startExternalVideo) {
    stopExternalVideo?.();
    return false;
  }

  const presentationId = resolvePresentationId(presentation, propPresentations);
  const authenticatedUrl = getAuthenticatedPresentationMediaPlaybackUrl(
    presentationId,
    presentation?.name,
  );

  if (!presentationId || !authenticatedUrl) {
    // Still stop Aparat/online video so the selected presentation can surface.
    stopExternalVideo?.();
    logger.warn({
      logCode: 'presentation_media_sync_skipped',
      extraInfo: {
        presentationId,
        authenticatedUrl,
        selectedName: presentation?.name,
      },
    }, 'Skipped presentation media external video sync');
    return false;
  }

  const start = () => {
    logger.debug({
      logCode: 'presentation_media_sync_start',
      extraInfo: { presentationId, playbackUrl: authenticatedUrl },
    }, 'Starting external video for presentation media');
    // Replace Aparat/online URL with the uploaded media playback URL.
    startExternalVideo(authenticatedUrl);
  };

  if (delayMs > 0) {
    window.setTimeout(start, delayMs);
  } else {
    start();
  }

  return true;
};

export const restorePresentationMediaExternalVideo = (
  presentations = [],
  { startExternalVideo, stopExternalVideo } = {},
  { delayMs = 150 } = {},
) => {
  const currentPresentation = presentations.find((p) => p?.current);
  if (!currentPresentation) return false;

  return startPresentationMediaExternalVideo(
    currentPresentation,
    presentations,
    { startExternalVideo, stopExternalVideo },
    { delayMs },
  );
};

export default {
  resolvePresentationId,
  isPresentationMedia,
  startPresentationMediaExternalVideo,
  restorePresentationMediaExternalVideo,
};

import { buildFileURL } from 'utils/data';

const SPURIOUS_RESET_MEDIA_SECONDS = 0.5;
const SPURIOUS_RESET_EXPECTED_SECONDS = 1.5;

const isWithinInterval = (item, time) => (
  Number.isFinite(item?.timestamp)
  && time >= item.timestamp
  && time < item.stopTimestamp
);

const getCurrentExternalMedia = (items = [], time = 0) => (
  items.find(item => isWithinInterval(item, time)) ?? null
);

/**
 * Drop ReactPlayer remount/buffer "play at t=0" anchors that restart media mid-share.
 * Later anchors that were recorded relative to that false restart are shifted forward.
 */
const sanitizeSyncEvents = (events = []) => {
  if (!Array.isArray(events) || events.length === 0) return [];

  const sorted = events
    .filter(event => event
      && Number.isFinite(event.at)
      && Number.isFinite(event.mediaTime))
    .map(event => ({
      at: event.at,
      mediaTime: Math.max(event.mediaTime, 0),
      playing: event.playing === true,
      rate: Number.isFinite(event.rate) && event.rate > 0 ? event.rate : 1,
    }))
    .sort((left, right) => left.at - right.at);

  if (sorted.length === 0) return [];

  const result = [];
  let timeOffset = 0;

  sorted.forEach((event) => {
    const adjustedMediaTime = Math.max(event.mediaTime + timeOffset, 0);
    const candidate = {
      ...event,
      mediaTime: adjustedMediaTime,
    };

    if (result.length === 0) {
      result.push(candidate);
      return;
    }

    const previous = result[result.length - 1];
    const expected = previous.playing
      ? previous.mediaTime + Math.max(candidate.at - previous.at, 0) * previous.rate
      : previous.mediaTime;
    const isSpuriousZeroReset = candidate.playing
      && previous.playing
      && candidate.mediaTime < SPURIOUS_RESET_MEDIA_SECONDS
      && expected > SPURIOUS_RESET_EXPECTED_SECONDS
      && (expected - candidate.mediaTime) > SPURIOUS_RESET_EXPECTED_SECONDS;

    if (isSpuriousZeroReset) {
      timeOffset += expected - event.mediaTime;
      return;
    }

    result.push(candidate);
  });

  return result;
};

const getExternalMediaState = (item, time) => {
  if (!item) return null;

  const events = sanitizeSyncEvents(
    Array.isArray(item.syncEvents) ? item.syncEvents : [],
  );
  let anchor = events[0] ?? {
    at: item.timestamp,
    mediaTime: 0,
    playing: true,
    rate: 1,
  };

  events.forEach(event => {
    if (event.at <= time && event.at >= anchor.at) anchor = event;
  });

  const rate = Number.isFinite(anchor.rate) && anchor.rate > 0 ? anchor.rate : 1;
  const elapsed = anchor.playing ? Math.max(time - anchor.at, 0) * rate : 0;

  return {
    mediaTime: Math.max((anchor.mediaTime || 0) + elapsed, 0),
    playing: anchor.playing === true,
    rate,
  };
};

const buildExternalMediaURL = (mediaUrl) => {
  if (!mediaUrl) return '';
  if (/^https?:\/\//i.test(mediaUrl)) return mediaUrl;

  return buildFileURL(mediaUrl.replace(/^\/+/, ''));
};

export {
  buildExternalMediaURL,
  getCurrentExternalMedia,
  getExternalMediaState,
  isWithinInterval,
  sanitizeSyncEvents,
};

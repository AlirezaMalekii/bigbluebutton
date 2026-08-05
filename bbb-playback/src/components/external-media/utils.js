import { buildFileURL } from 'utils/data';

const isWithinInterval = (item, time) => (
  Number.isFinite(item?.timestamp)
  && time >= item.timestamp
  && time < item.stopTimestamp
);

const getCurrentExternalMedia = (items = [], time = 0) => (
  items.find(item => isWithinInterval(item, time)) ?? null
);

const getExternalMediaState = (item, time) => {
  if (!item) return null;

  const events = Array.isArray(item.syncEvents) ? item.syncEvents : [];
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
};

import { buildFileURL } from 'utils/data';

const isWithinInterval = (item, time) => (
  Number.isFinite(item?.timestamp)
  && Number.isFinite(item?.stopTimestamp)
  && time >= item.timestamp
  && time < item.stopTimestamp
);

const getCurrentBackgroundMusic = (items = [], time = 0) => (
  items.find(item => isWithinInterval(item, time)) ?? null
);

const getBackgroundMusicState = (item, time) => {
  if (!item || !Array.isArray(item.syncEvents) || item.syncEvents.length === 0) return null;

  let anchor = item.syncEvents[0];
  item.syncEvents.forEach(event => {
    if (event.at <= time && event.at >= anchor.at) anchor = event;
  });

  const elapsed = anchor.status === 'playing' ? Math.max(time - anchor.at, 0) : 0;
  return {
    position: Math.max(anchor.position + elapsed, 0),
    status: anchor.status,
    volume: Math.min(Math.max(anchor.volume, 0), 1),
    loop: anchor.loop === true,
  };
};

const buildBackgroundMusicURL = mediaUrl => {
  if (!mediaUrl || !/^external-media\/[A-Za-z0-9._-]+$/.test(mediaUrl)) return '';
  return buildFileURL(mediaUrl);
};

export {
  buildBackgroundMusicURL,
  getBackgroundMusicState,
  getCurrentBackgroundMusic,
  isWithinInterval,
};

jest.mock('utils/data', () => ({
  buildFileURL: file => file,
}));

import {
  getCurrentExternalMedia,
  getExternalMediaState,
  isWithinInterval,
} from './utils';

const item = {
  timestamp: 10,
  stopTimestamp: 30,
  syncEvents: [
    { at: 10, mediaTime: 4, playing: true, rate: 1 },
    { at: 15, mediaTime: 9, playing: false, rate: 1 },
    { at: 20, mediaTime: 12, playing: true, rate: 2 },
  ],
};

it('selects external media only inside its explicit interval', () => {
  expect(isWithinInterval(item, 9.99)).toBe(false);
  expect(isWithinInterval(item, 10)).toBe(true);
  expect(isWithinInterval(item, 29.99)).toBe(true);
  expect(isWithinInterval(item, 30)).toBe(false);
  expect(getCurrentExternalMedia([item], 21)).toBe(item);
  expect(getCurrentExternalMedia([item], 31)).toBeNull();
});

it('calculates play, pause, seek and playback-rate positions from sync anchors', () => {
  expect(getExternalMediaState(item, 12)).toEqual({ mediaTime: 6, playing: true, rate: 1 });
  expect(getExternalMediaState(item, 18)).toEqual({ mediaTime: 9, playing: false, rate: 1 });
  expect(getExternalMediaState(item, 22.5)).toEqual({ mediaTime: 17, playing: true, rate: 2 });
});

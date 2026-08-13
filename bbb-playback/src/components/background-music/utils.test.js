import {
  buildBackgroundMusicURL,
  getBackgroundMusicState,
  getCurrentBackgroundMusic,
  isWithinInterval,
} from './utils';

jest.mock('utils/data', () => ({
  buildFileURL: file => `/recording/${file}`,
}));

const item = {
  timestamp: 10,
  stopTimestamp: 40,
  syncEvents: [
    { at: 10, position: 0, status: 'playing', volume: 0.35, loop: true },
    { at: 15, position: 5, status: 'paused', volume: 0.5, loop: true },
    { at: 20, position: 5, status: 'playing', volume: 0.5, loop: false },
    { at: 30, position: 0, status: 'stopped', volume: 0.2, loop: false },
  ],
};

it('selects background music only inside its recording interval', () => {
  expect(isWithinInterval(item, 9.99)).toBe(false);
  expect(isWithinInterval(item, 10)).toBe(true);
  expect(isWithinInterval(item, 39.99)).toBe(true);
  expect(isWithinInterval(item, 40)).toBe(false);
  expect(getCurrentBackgroundMusic([item], 24)).toBe(item);
  expect(getCurrentBackgroundMusic([item], 41)).toBeNull();
});

it('reconstructs play, pause, stop, volume and loop state at arbitrary seeks', () => {
  expect(getBackgroundMusicState(item, 12)).toEqual({
    position: 2,
    status: 'playing',
    volume: 0.35,
    loop: true,
  });
  expect(getBackgroundMusicState(item, 18)).toEqual({
    position: 5,
    status: 'paused',
    volume: 0.5,
    loop: true,
  });
  expect(getBackgroundMusicState(item, 24)).toEqual({
    position: 9,
    status: 'playing',
    volume: 0.5,
    loop: false,
  });
  expect(getBackgroundMusicState(item, 35)).toEqual({
    position: 0,
    status: 'stopped',
    volume: 0.2,
    loop: false,
  });
});

it('accepts only published local recording assets', () => {
  expect(buildBackgroundMusicURL('external-media/music.m4a'))
    .toBe('/recording/external-media/music.m4a');
  expect(buildBackgroundMusicURL('https://example.test/music.mp3')).toBe('');
  expect(buildBackgroundMusicURL('../secret.mp3')).toBe('');
});

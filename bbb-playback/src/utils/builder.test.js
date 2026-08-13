import {
  buildBackgroundMusic,
  buildStyle,
  buildVideos,
  getAttr,
  getId,
  getNumbers,
  mergeMessages,
} from './builder';

jest.mock('utils/tldraw', () => ({
  isTldrawWhiteboard: () => false,
}));

it('builds a validated background music playback timeline', () => {
  const items = buildBackgroundMusic([{
    schema_version: 1,
    timestamp: 12.5,
    stop_timestamp: 32.5,
    media_url: 'external-media/background.m4a',
    media_name: 'تمرکز',
    mime_type: 'audio/mp4',
    provider: 'background-music-default',
    available: true,
    sync_events: [
      { at: 12.5, position: 0, status: 'playing', volume: 0.35, loop: true },
      { at: 20, position: 7.5, status: 'paused', volume: 0.5, loop: false },
    ],
  }]);

  expect(items).toEqual([{
    schemaVersion: 1,
    timestamp: 12.5,
    stopTimestamp: 32.5,
    mediaUrl: 'external-media/background.m4a',
    mediaName: 'تمرکز',
    mimeType: 'audio/mp4',
    provider: 'background-music-default',
    available: true,
    syncEvents: [
      { at: 12.5, position: 0, status: 'playing', volume: 0.35, loop: true },
      { at: 20, position: 7.5, status: 'paused', volume: 0.5, loop: false },
    ],
  }]);
});

it('rejects remote background music URLs and malformed intervals', () => {
  const items = buildBackgroundMusic([
    {
      timestamp: 1,
      stop_timestamp: 5,
      media_url: 'https://example.test/music.mp3?token=secret',
      available: true,
      sync_events: [{ at: 1, position: 0, status: 'playing', volume: 0.2, loop: true }],
    },
    {
      timestamp: 9,
      stop_timestamp: 8,
      media_url: 'external-media/music.mp3',
      available: true,
      sync_events: [{ at: 9, position: 0, status: 'playing', volume: 0.2, loop: true }],
    },
  ]);

  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({ mediaUrl: '', available: false });
  expect(JSON.stringify(items)).not.toContain('token=secret');
});

it('builds synchronized external media schema v2 without exposing source URLs', () => {
  const items = buildVideos([{
    schema_version: 2,
    timestamp: 159.2,
    stop_timestamp: 238.9,
    media_url: 'external-media/asset.m4a',
    media_type: 'audio',
    media_name: 'صدای جلسه',
    mime_type: 'audio/mp4',
    provider: 'presentation',
    available: true,
    sync_events: [
      { at: 159.2, media_time: 0, playing: true, rate: 1 },
      { at: 170, media_time: 10.8, playing: false, rate: 1 },
    ],
  }]);

  expect(items).toEqual([{
    schemaVersion: 2,
    timestamp: 159.2,
    stopTimestamp: 238.9,
    mediaUrl: 'external-media/asset.m4a',
    mediaType: 'audio',
    mediaName: 'صدای جلسه',
    mimeType: 'audio/mp4',
    provider: 'presentation',
    available: true,
    syncEvents: [
      { at: 159.2, mediaTime: 0, playing: true, rate: 1 },
      { at: 170, mediaTime: 10.8, playing: false, rate: 1 },
    ],
  }]);
  expect(JSON.stringify(items)).not.toContain('sessionToken');
  expect(JSON.stringify(items)).not.toContain('wmsAuthSign');
});

it('keeps legacy external media readable', () => {
  const items = buildVideos([
    { timestamp: 10, external_video_url: 'https://example.test/audio.mp3' },
    { timestamp: 25, external_video_url: 'https://example.test/video.mp4' },
  ]);

  expect(items[0]).toMatchObject({
    schemaVersion: 1,
    timestamp: 10,
    stopTimestamp: 25,
    mediaType: 'audio',
    available: true,
  });
  expect(items[1].stopTimestamp).toBe(Number.POSITIVE_INFINITY);
});

it('rejects remote URLs and invalid intervals from schema v2', () => {
  const items = buildVideos([
    {
      schema_version: 2,
      timestamp: 10,
      stop_timestamp: 20,
      media_url: 'https://cdn.example/video.mp4?token=secret',
      available: true,
    },
    {
      schema_version: 2,
      timestamp: 30,
      stop_timestamp: 29,
      media_url: 'external-media/video.mp4',
      available: true,
    },
  ]);

  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({ mediaUrl: '', available: false });
});

it('merges and sorts messages arrays', () => {
  let chat = [
    { timestamp: 5.1, type: 'chat' },
    { timestamp: 11.9, type: 'chat' },
    { timestamp: 10.1, type: 'chat' },
  ];

  let polls = [
    { timestamp: 4.0, type: 'poll' },
    { timestamp: 16.9, type: 'poll' },
    { timestamp: 10.1, type: 'poll' },
  ];

  let videos = [
    { timestamp: 3.0, type: 'video' },
    { timestamp: 19.0, type: 'video' },
    { timestamp: 12.1, type: 'video' },
  ];


  expect(mergeMessages(chat, polls, videos)).toEqual([
    { timestamp: 3.0, type: 'video' },
    { timestamp: 4.0, type: 'poll' },
    { timestamp: 5.1, type: 'chat' },
    { timestamp: 10.1, type: 'chat' },
    { timestamp: 10.1, type: 'poll' },
    { timestamp: 11.9, type: 'chat' },
    { timestamp: 12.1, type: 'video' },
    { timestamp: 16.9, type: 'poll' },
    { timestamp: 19.0, type: 'video' },
  ]);
});

it('builds style object from a string', () => {
  let value = 'first: 1; second: two; visibility: hidden;';
  expect(buildStyle(value)).toEqual({ first: '1', second: 'two' });

  value = 'first: 1;';
  expect(buildStyle(value)).toEqual({ first: '1' });

  value = 'first: 1';
  expect(buildStyle(value)).toEqual({ first: '1' });

  value = '; second: two;';
  expect(buildStyle(value)).toEqual({ second: 'two' });

  value = 'visibility: hidden;';
  expect(buildStyle(value)).toEqual({});
});

it('gets attributes from a parsed xml node', () => {
  const attr = { first: 1, second: 'two' };

  expect(getAttr({ '$': attr })).toEqual(attr);
  expect(getAttr({ '$': attr, '%': null })).toEqual(attr);
  expect(getAttr({ '%': null })).toEqual({});
  expect(getAttr({})).toEqual({});
});

it('gets a numeric id from a string', () => {
  // Regular
  expect(getId('id1')).toEqual(1);
  expect(getId('1')).toEqual(1);
  expect(getId('id10')).toEqual(10);
  expect(getId('10')).toEqual(10);

  // Mixed
  expect(getId('0id1')).toEqual(1);
  expect(getId('00id11')).toEqual(11);

  // Invalid
  expect(getId('1id')).toEqual(-1);
  expect(getId('i1d')).toEqual(-1);
  expect(getId('id')).toEqual(-1);
  expect(getId('')).toEqual(-1);
  expect(getId()).toEqual(-1);
});

it('gets a numeric array from a string', () => {
  // Integer
  expect(getNumbers('1 2 3')).toEqual([1.0, 2.0, 3.0]);
  expect(getNumbers('1')).toEqual([1.0]);
  expect(getNumbers(' 1 ')).toEqual([1.0]);
  expect(getNumbers('1  2  3')).toEqual([1.0, 2.0, 3.0]);

  // Float
  expect(getNumbers('1.1 2.2 3.3')).toEqual([1.1, 2.2, 3.3]);
  expect(getNumbers('1.1')).toEqual([1.1]);
  expect(getNumbers(' 1.1 ')).toEqual([1.1]);
  expect(getNumbers('1.1  2.2  3.3')).toEqual([1.1, 2.2, 3.3]);

  // Invalid
  expect(getNumbers('')).toEqual([]);
  expect(getNumbers(' ')).toEqual([]);
  expect(getNumbers()).toEqual([]);
});

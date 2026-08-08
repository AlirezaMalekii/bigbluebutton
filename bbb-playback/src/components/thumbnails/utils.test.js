import {
  buildThumbnailItems,
  getThumbnailScrollAmount,
  getThumbnailScrollState,
} from './utils';

it('keeps thumbnail items in chronological left-to-right data order', () => {
  const items = buildThumbnailItems([
    { timestamp: 30, src: 'third.png' },
    { timestamp: 10, src: 'first.png' },
    { timestamp: 20, src: 'second.png' },
  ]);

  expect(items.map(item => item.src)).toEqual(['first.png', 'second.png', 'third.png']);
  expect(items.map(item => item.id)).toEqual([1, 2, 3]);
});

it('replaces blank media slides with audio and video thumbnail icons', () => {
  const items = buildThumbnailItems(
    [
      { timestamp: 0, src: 'book.png', alt: 'book' },
      { timestamp: 41.4, src: 'blank-audio.png', alt: '' },
      { timestamp: 85.5, src: 'blank-video.png', alt: '' },
    ],
    [],
    [],
    [
      {
        timestamp: 42.11,
        stopTimestamp: 85.365,
        mediaType: 'audio',
        mediaName: 'song.mp3',
      },
      {
        timestamp: 85.667,
        stopTimestamp: 111.672,
        mediaType: 'video',
        mediaName: 'clip.mp4',
      },
    ],
  );

  expect(items.map(item => item.src)).toEqual([
    'book.png',
    'external-audio',
    'external-video',
  ]);
  expect(items[1].alt).toBe('song.mp3');
  expect(items[2].alt).toBe('clip.mp4');
});

it('calculates physical arrow state at the start, middle and end', () => {
  expect(getThumbnailScrollState({ clientWidth: 400, scrollLeft: 0, scrollWidth: 1000 }))
    .toEqual({ canScrollLeft: false, canScrollRight: true });
  expect(getThumbnailScrollState({ clientWidth: 400, scrollLeft: 250, scrollWidth: 1000 }))
    .toEqual({ canScrollLeft: true, canScrollRight: true });
  expect(getThumbnailScrollState({ clientWidth: 400, scrollLeft: 600, scrollWidth: 1000 }))
    .toEqual({ canScrollLeft: true, canScrollRight: false });
});

it('scrolls about three quarters of the viewport with a touch-friendly minimum', () => {
  expect(getThumbnailScrollAmount(800)).toBe(600);
  expect(getThumbnailScrollAmount(200)).toBe(220);
});

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

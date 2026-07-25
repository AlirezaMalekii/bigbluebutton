/**
 * Resolve the visible stage media box from the live DOM.
 * Layout context left/right can be null in RTL skyroom, and CSS !important
 * geometry can diverge from presentation/externalVideo output bounds — so
 * measuring the painted stage element is the reliable source for overlays.
 *
 * When presentation/screenshare is minimized or hidden (webcam-as-stage,
 * webcam fullscreen, empty stage), fall back so reaction bubbles still paint.
 */

const STAGE_SELECTORS = [
  '[data-skyroom-stage-media="true"]',
  '[data-test="screenshareArea"]',
  '[data-test="presentationContainer"]',
];

/** Used when primary stage media is hidden/minimized. */
const FALLBACK_SELECTORS = [
  '[data-skyroom-webcam-fs-active="true"]',
  '#skyroom-stage-webcam-dock',
  '#skyroom-center-webcam-dock',
  '#cameraDock',
  '[data-test="cameraDock"]',
];

const toBounds = (rect) => ({
  top: rect.top,
  left: rect.left,
  width: rect.width,
  height: rect.height,
  right: rect.right,
  bottom: rect.bottom,
});

export const hasUsableStageBounds = (bounds) => (
  bounds
  && Number(bounds.width) > 0
  && Number(bounds.height) > 0
);

const isVisibleStageElement = (element) => {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
};

const resolveFromSelectors = (selectors) => {
  const selector = selectors.find((candidate) => (
    isVisibleStageElement(document.querySelector(candidate))
  ));
  if (!selector) return null;

  const element = document.querySelector(selector);
  if (!element) return null;

  return {
    element,
    bounds: toBounds(element.getBoundingClientRect()),
  };
};

/**
 * Stage geometry written by customLayout for skyroom column mode.
 * Survives presentation minimize (media may be visibility:hidden).
 */
const resolveCssStageBounds = () => {
  const layoutEl = document.getElementById('layout');
  if (!layoutEl) return null;

  const style = window.getComputedStyle(layoutEl);
  const top = parseFloat(style.getPropertyValue('--skyroom-stage-top'));
  const left = parseFloat(style.getPropertyValue('--skyroom-stage-left'));
  const width = parseFloat(style.getPropertyValue('--skyroom-stage-width'));
  const bottom = parseFloat(style.getPropertyValue('--skyroom-stage-bottom'));

  if (![top, left, width, bottom].every(Number.isFinite)) return null;

  const height = bottom - top;
  if (!hasUsableStageBounds({ width, height })) return null;

  return {
    element: layoutEl,
    bounds: {
      top,
      left,
      width,
      height,
      right: left + width,
      bottom,
    },
  };
};

const resolveViewportBounds = () => ({
  element: document.documentElement,
  bounds: {
    top: 0,
    left: 0,
    width: window.innerWidth,
    height: window.innerHeight,
    right: window.innerWidth,
    bottom: window.innerHeight,
  },
});

export const resolveStageDomBounds = () => (
  resolveFromSelectors(STAGE_SELECTORS)
  || resolveFromSelectors(FALLBACK_SELECTORS)
  || resolveCssStageBounds()
  || resolveViewportBounds()
);

export default resolveStageDomBounds;

/**
 * Resolve the visible stage media box from the live DOM.
 * Layout context left/right can be null in RTL skyroom, and CSS !important
 * geometry can diverge from presentation/externalVideo output bounds — so
 * measuring the painted stage element is the reliable source for overlays.
 *
 * When presentation/screenshare is minimized or hidden, do NOT fall back to
 * the stage webcam strip alone (short travel). Prefer the full central stage
 * (strip + media column) from skyroom CSS geometry.
 */

const STAGE_SELECTORS = [
  '[data-skyroom-stage-media="true"]',
  '[data-test="screenshareArea"]',
  '[data-test="presentationContainer"]',
];

const FULLSCREEN_WEBCAM_SELECTORS = [
  '[data-skyroom-webcam-fs-active="true"]',
];

/** Large stage fill when presentation is closed (not the top strip). */
const CENTER_STAGE_SELECTORS = [
  '#skyroom-center-webcam-dock',
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
 * Full central stage column from skyroom CSS vars.
 * Includes the viewer webcam strip top when present, down to stage bottom,
 * so hidden-presentation reactions travel the same tall path as before.
 */
const resolveFullCssStageBounds = () => {
  const layoutEl = document.getElementById('layout');
  if (!layoutEl) return null;

  const style = window.getComputedStyle(layoutEl);
  const stageTop = parseFloat(style.getPropertyValue('--skyroom-stage-top'));
  const stageLeft = parseFloat(style.getPropertyValue('--skyroom-stage-left'));
  const stageWidth = parseFloat(style.getPropertyValue('--skyroom-stage-width'));
  const stageBottom = parseFloat(style.getPropertyValue('--skyroom-stage-bottom'));
  const webcamTop = parseFloat(style.getPropertyValue('--skyroom-stage-webcam-top'));

  if (![stageLeft, stageWidth, stageBottom].every(Number.isFinite)) return null;

  let top = Number.isFinite(stageTop) ? stageTop : NaN;
  // Strip sits above media; union both so bubbles rise across the whole stage.
  if (Number.isFinite(webcamTop) && (!Number.isFinite(top) || webcamTop < top)) {
    top = webcamTop;
  }
  if (!Number.isFinite(top)) return null;

  const height = stageBottom - top;
  if (!hasUsableStageBounds({ width: stageWidth, height })) return null;

  return {
    element: layoutEl,
    bounds: {
      top,
      left: stageLeft,
      width: stageWidth,
      height,
      right: stageLeft + stageWidth,
      bottom: stageBottom,
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
  // Layout-fullscreen webcam covers the meeting surface.
  resolveFromSelectors(FULLSCREEN_WEBCAM_SELECTORS)
  // Visible presentation / screenshare / external stage media.
  || resolveFromSelectors(STAGE_SELECTORS)
  // Presentation hidden: full stage column (never strip-only).
  || resolveFullCssStageBounds()
  // Center webcam zone filling the former presentation hole.
  || resolveFromSelectors(CENTER_STAGE_SELECTORS)
  || resolveViewportBounds()
);

export default resolveStageDomBounds;

/**
 * Resolve the visible stage media box from the live DOM.
 * Layout context left/right can be null in RTL skyroom, and CSS !important
 * geometry can diverge from presentation/externalVideo output bounds — so
 * measuring the painted stage element is the reliable source for overlays.
 */

const STAGE_SELECTORS = [
  '[data-skyroom-stage-media="true"]',
  '[data-test="screenshareArea"]',
  '[data-test="presentationContainer"]',
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

export const resolveStageDomBounds = () => {
  const selector = STAGE_SELECTORS.find((candidate) => (
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

export default resolveStageDomBounds;

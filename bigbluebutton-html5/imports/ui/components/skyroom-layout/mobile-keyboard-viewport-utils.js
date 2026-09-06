/**
 * Pure helpers for mobile soft-keyboard viewport recovery.
 * Importable from Node tests (no DOM types).
 *
 * Android Chrome (and some WebViews) leave a leftover visualViewport offset
 * or a stale layout-viewport height after the keyboard closes. Meeting chrome
 * that is absolutely/fixed-positioned then sits in the middle of the screen.
 */

export const KEYBOARD_HEIGHT_THRESHOLD_PX = 120;
export const VIEWPORT_OFFSET_EPSILON_PX = 1;

export const measureKeyboardInset = ({
  layoutHeight = 0,
  visualHeight = 0,
  visualOffsetTop = 0,
} = {}) => {
  const layout = Number(layoutHeight) || 0;
  const visual = Number(visualHeight) || 0;
  const offset = Math.max(0, Number(visualOffsetTop) || 0);
  if (layout <= 0 || visual <= 0) return 0;
  const inset = Math.max(0, layout - visual - offset);
  return inset >= KEYBOARD_HEIGHT_THRESHOLD_PX ? Math.round(inset) : 0;
};

export const isSoftKeyboardOpen = (metrics = {}) => measureKeyboardInset(metrics) > 0;

export const hasStaleViewportOffset = ({
  scrollY = 0,
  visualOffsetTop = 0,
} = {}) => (
  Math.abs(Number(scrollY) || 0) > VIEWPORT_OFFSET_EPSILON_PX
  || Math.abs(Number(visualOffsetTop) || 0) > VIEWPORT_OFFSET_EPSILON_PX
);

export const shouldRestoreLayoutViewport = ({
  keyboardWasOpen = false,
  keyboardIsOpen = false,
  scrollY = 0,
  visualOffsetTop = 0,
} = {}) => {
  if (keyboardIsOpen) return false;
  return keyboardWasOpen || hasStaleViewportOffset({ scrollY, visualOffsetTop });
};

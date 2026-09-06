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
export const LAYOUT_WIDTH_CHANGE_THRESHOLD_PX = 80;

const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'radio',
  'file',
  'hidden',
  'reset',
  'submit',
  'range',
  'color',
  'image',
]);

export const isEditableFocusTarget = (target) => {
  if (!target || typeof target !== 'object') return false;
  const tag = String(target.nodeName || target.tagName || '').toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = String(target.type || 'text').toLowerCase();
    return !NON_TEXT_INPUT_TYPES.has(type);
  }
  return Boolean(target.isContentEditable);
};

export const shouldLockStableLayoutHeight = ({
  liveHeight = 0,
  cachedHeight = 0,
  liveWidth = 0,
  cachedWidth = 0,
  textInputFocused = false,
  visualInset = 0,
} = {}) => {
  if (textInputFocused) return true;
  if ((Number(visualInset) || 0) >= KEYBOARD_HEIGHT_THRESHOLD_PX) return true;
  const cachedW = Number(cachedWidth) || 0;
  const liveW = Number(liveWidth) || 0;
  if (cachedW > 0 && Math.abs(liveW - cachedW) >= LAYOUT_WIDTH_CHANGE_THRESHOLD_PX) {
    return false;
  }
  const cached = Number(cachedHeight) || 0;
  const live = Number(liveHeight) || 0;
  return cached > 0 && (cached - live) >= KEYBOARD_HEIGHT_THRESHOLD_PX;
};

export const resolveStableLayoutHeight = ({
  liveHeight = 0,
  cachedHeight = 0,
  lockToCached = false,
} = {}) => {
  const live = Math.max(0, Math.round(Number(liveHeight) || 0));
  const cached = Math.max(0, Math.round(Number(cachedHeight) || 0));
  if (lockToCached && cached > 0) return Math.max(cached, live);
  return live;
};

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

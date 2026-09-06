/**
 * Pure helpers for Skyroom phone keyboard viewport.
 * Importable from Node tests (no DOM types).
 *
 * The meeting layout must follow the *visible* viewport. On Android Chrome the
 * layout viewport (clientHeight / 100dvh) often stays full while the keyboard
 * covers the bottom. Sizing chrome from clientHeight leaves a gap above the
 * keyboard; after dismiss it can stay shrunk. visualViewport.height is the
 * packed "composer + tabs + actions above the keyboard" height.
 */

export const KEYBOARD_HEIGHT_THRESHOLD_PX = 120;
export const VIEWPORT_OFFSET_EPSILON_PX = 1;

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

export const resolveMobileLayoutHeight = ({
  visualHeight = 0,
  layoutHeight = 0,
} = {}) => {
  const visual = Math.max(0, Math.round(Number(visualHeight) || 0));
  const layout = Math.max(0, Math.round(Number(layoutHeight) || 0));
  return visual > 0 ? visual : layout;
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

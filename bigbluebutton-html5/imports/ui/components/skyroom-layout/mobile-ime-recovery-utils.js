/**
 * Pure helpers for recovering the SafeMeet phone viewport after the software
 * keyboard closes. Kept DOM-free so Android viewport event sequences can be
 * covered without a running meeting.
 */

export const SKYROOM_MOBILE_IME_SHRINK_PX = 80;
export const SKYROOM_MOBILE_VIEWPORT_OFFSET_EPSILON_PX = 1;

const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

export const isSkyroomMobileEditableTarget = (target) => {
  if (!target || typeof target !== 'object') return false;
  const tagName = String(target.tagName || target.nodeName || '').toUpperCase();
  if (tagName === 'TEXTAREA' || tagName === 'SELECT') return true;
  if (tagName === 'INPUT') {
    return !NON_TEXT_INPUT_TYPES.has(String(target.type || 'text').toLowerCase());
  }
  return Boolean(target.isContentEditable);
};

export const isSkyroomMobileImeOpen = ({
  fullHeight = 0,
  visualHeight = 0,
} = {}) => (
  Number(fullHeight) > 0
  && (Number(fullHeight) - Number(visualHeight)) >= SKYROOM_MOBILE_IME_SHRINK_PX
);

export const resolveSkyroomMobileLayoutHeight = ({
  liveHeight = 0,
  fullHeight = 0,
  visualHeight = 0,
} = {}) => {
  const live = Math.max(0, Number(liveHeight) || 0);
  const full = Math.max(0, Number(fullHeight) || 0);
  if (isSkyroomMobileImeOpen({ fullHeight: full, visualHeight })) return live;
  if ((full - live) >= SKYROOM_MOBILE_IME_SHRINK_PX) return full;
  return live;
};

export const hasSkyroomMobileViewportOffset = ({
  scrollY = 0,
  visualOffsetTop = 0,
} = {}) => (
  Math.abs(Number(scrollY) || 0) > SKYROOM_MOBILE_VIEWPORT_OFFSET_EPSILON_PX
  || Math.abs(Number(visualOffsetTop) || 0) > SKYROOM_MOBILE_VIEWPORT_OFFSET_EPSILON_PX
);

export const shouldRestoreSkyroomMobileViewport = ({
  keyboardWasOpen = false,
  keyboardIsOpen = false,
  scrollY = 0,
  visualOffsetTop = 0,
} = {}) => {
  if (keyboardIsOpen) return false;
  return keyboardWasOpen || hasSkyroomMobileViewportOffset({ scrollY, visualOffsetTop });
};

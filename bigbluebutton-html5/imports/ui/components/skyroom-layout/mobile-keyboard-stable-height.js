/**
 * Keep Skyroom phone layout geometry on the pre-keyboard viewport height
 * after the soft keyboard dismisses.
 *
 * With a live webcam, Android often fires resize while the keyboard is open
 * and the layout engine stores the shrunk `clientHeight`. After dismiss it
 * may not fire resize again, so chat/action-bar stay short while the CSS tab
 * bar stays pinned to the physical bottom.
 *
 * While a text field is focused we still follow the live height so the
 * composer stays above the keyboard. After blur, a leftover shrink is treated
 * as stale and replaced with the last full height.
 */

import {
  KEYBOARD_HEIGHT_THRESHOLD_PX,
  LAYOUT_WIDTH_CHANGE_THRESHOLD_PX,
  isEditableFocusTarget,
  measureKeyboardInset,
  resolveStableLayoutHeight,
  shouldLockStableLayoutHeight,
} from './mobile-keyboard-viewport-utils';

const SKYROOM_PHONE_MAX_WIDTH = 599;

let cachedHeight = 0;
let cachedWidth = 0;

const readLiveHeight = () => (
  typeof window === 'undefined'
    ? 0
    : (window.document.documentElement?.clientHeight || window.innerHeight || 0)
);

const readMaxViewportHeight = () => (
  typeof window === 'undefined'
    ? 0
    : Math.max(
      window.document.documentElement?.clientHeight || 0,
      window.innerHeight || 0,
    )
);

const readLiveWidth = () => (
  typeof window === 'undefined'
    ? 0
    : (window.document.documentElement?.clientWidth || window.innerWidth || 0)
);

const isSkyroomPhoneLayout = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (readLiveWidth() > SKYROOM_PHONE_MAX_WIDTH) return false;
  const layoutEl = document.getElementById('layout');
  return Boolean(
    layoutEl?.hasAttribute('data-skyroom-column')
    || layoutEl?.hasAttribute('data-skyroom-mobile'),
  );
};

const readVisualInset = () => {
  if (typeof window === 'undefined') return 0;
  const visual = window.visualViewport;
  if (!visual) return 0;
  const layoutHeight = Math.max(
    readLiveHeight(),
    Math.round((visual.height || 0) + (visual.offsetTop || 0)),
  );
  return measureKeyboardInset({
    layoutHeight,
    visualHeight: visual.height || 0,
    visualOffsetTop: visual.offsetTop || 0,
  });
};

export const isSkyroomMobileKeyboardActive = () => {
  if (!isSkyroomPhoneLayout()) return false;
  if (typeof document !== 'undefined' && isEditableFocusTarget(document.activeElement)) {
    return true;
  }
  return readVisualInset() >= KEYBOARD_HEIGHT_THRESHOLD_PX;
};

export const seedSkyroomStableLayoutHeight = (liveHeight, liveWidth) => {
  if (typeof window === 'undefined') return;
  const live = Math.max(0, Number(liveHeight) || readMaxViewportHeight());
  const width = Math.max(0, Number(liveWidth) || readLiveWidth());
  if (live > cachedHeight) cachedHeight = live;
  if (cachedHeight <= 0) cachedHeight = live;
  cachedWidth = width;
};

export const resetSkyroomStableLayoutHeight = (liveHeight, liveWidth) => {
  cachedHeight = Math.max(
    0,
    Number(liveHeight) || (typeof window === 'undefined' ? 0 : readMaxViewportHeight()),
  );
  cachedWidth = Math.max(
    0,
    Number(liveWidth) || (typeof window === 'undefined' ? 0 : readLiveWidth()),
  );
};

export const getSkyroomStableLayoutHeight = (liveHeight, liveWidth) => {
  const live = Math.max(
    0,
    Number(liveHeight) || (typeof window === 'undefined' ? 0 : readLiveHeight()),
  );
  const width = Math.max(
    0,
    Number(liveWidth) || (typeof window === 'undefined' ? 0 : readLiveWidth()),
  );
  if (typeof window === 'undefined' || !isSkyroomPhoneLayout()) {
    return live;
  }

  const focused = typeof document !== 'undefined'
    && isEditableFocusTarget(document.activeElement);
  const widthChanged = cachedWidth > 0
    && Math.abs(width - cachedWidth) >= LAYOUT_WIDTH_CHANGE_THRESHOLD_PX;

  if (widthChanged && !focused) {
    cachedHeight = live;
    cachedWidth = width;
    return live;
  }

  if (focused) {
    if (live > cachedHeight) cachedHeight = live;
    if (cachedHeight <= 0) cachedHeight = live;
    cachedWidth = width;
    return live;
  }

  const staleAfterDismiss = shouldLockStableLayoutHeight({
    liveHeight: live,
    cachedHeight,
    liveWidth: width,
    cachedWidth,
    textInputFocused: false,
    visualInset: readVisualInset(),
  });
  if (staleAfterDismiss && cachedHeight > 0) {
    return resolveStableLayoutHeight({
      liveHeight: live,
      cachedHeight,
      lockToCached: true,
    });
  }

  cachedHeight = live;
  cachedWidth = width;
  return live;
};

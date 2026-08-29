import deviceInfo from '/imports/utils/deviceInfo';

const PHONE_SHORT_SIDE_PX = 600;

const isPhoneClassDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (deviceInfo.isTablet) return false;
  if (!deviceInfo.isPhone) return false;
  const shortSide = Math.min(window.screen?.width || 0, window.screen?.height || 0);
  return shortSide > 0 && shortSide < PHONE_SHORT_SIDE_PX;
};

type OrientationWithLock = ScreenOrientation & {
  lock?: (type: string) => Promise<void>;
  unlock?: () => void;
};

type ScreenWithLegacy = Screen & {
  lockOrientation?: (type: string) => boolean;
  mozLockOrientation?: (type: string) => boolean;
  msLockOrientation?: (type: string) => boolean;
};

const tryNativeLock = (): boolean => {
  if (typeof window === 'undefined') return false;
  const orientation = window.screen?.orientation as OrientationWithLock | undefined;
  if (orientation && typeof orientation.lock === 'function') {
    orientation.lock('portrait').catch(() => {});
    return true;
  }
  const screenLegacy = window.screen as ScreenWithLegacy;
  const legacy = screenLegacy.lockOrientation
    || screenLegacy.mozLockOrientation
    || screenLegacy.msLockOrientation;
  if (typeof legacy === 'function') {
    try { legacy.call(window.screen, 'portrait'); return true; } catch { return false; }
  }
  return false;
};

const tryNativeUnlock = () => {
  const orientation = window.screen?.orientation as OrientationWithLock | undefined;
  if (orientation && typeof orientation.unlock === 'function') {
    try { orientation.unlock(); } catch { /* ignore */ }
  }
};

const LOCK_ATTR = 'data-skyroom-phone-portrait-lock';
const LANDSCAPE_ATTR = 'data-skyroom-phone-landscape';
const OVERLAY_ID = 'skyroom-phone-portrait-overlay';

/**
 * visualViewport shrinks to the keyboard viewport on mobile. Using its aspect
 * ratio here makes a portrait phone look landscape as soon as the chat input
 * opens. The orientation media query describes the physical/layout
 * orientation and is unaffected by the soft keyboard.
 */
export const isSkyroomPhoneLandscape = (): boolean => {
  const orientationQuery = window.matchMedia?.('(orientation: landscape)');
  return orientationQuery?.matches || false;
};

const getLockTarget = (): HTMLElement => document.body || document.documentElement;

const getOverlayMessage = (): string => {
  const lang = document.documentElement.lang || navigator.language || 'en';
  return lang.toLowerCase().startsWith('fa')
    ? 'برای ادامه جلسه، گوشی را عمودی نگه دارید'
    : 'To continue the meeting, keep your phone in portrait mode';
};

const ensureOverlay = (): HTMLElement | null => {
  if (typeof document === 'undefined' || !document.body) return null;
  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('role', 'status');
    document.body.appendChild(overlay);
  }
  overlay.textContent = getOverlayMessage();
  return overlay;
};

const applyVisualState = () => {
  const html = document.documentElement;
  const target = getLockTarget();
  const isLandscape = isSkyroomPhoneLandscape();

  if (isLandscape) {
    html.setAttribute(LOCK_ATTR, 'true');
    html.setAttribute(LANDSCAPE_ATTR, 'true');
    target.setAttribute(LOCK_ATTR, 'true');
    target.setAttribute(LANDSCAPE_ATTR, 'true');
    ensureOverlay();
    window.scrollTo(0, 0);
  } else {
    html.removeAttribute(LOCK_ATTR);
    html.removeAttribute(LANDSCAPE_ATTR);
    target.removeAttribute(LOCK_ATTR);
    target.removeAttribute(LANDSCAPE_ATTR);
    document.getElementById(OVERLAY_ID)?.remove();
  }
};

const clearVisualState = () => {
  const html = document.documentElement;
  const target = getLockTarget();
  html.removeAttribute(LOCK_ATTR);
  html.removeAttribute(LANDSCAPE_ATTR);
  target.removeAttribute(LOCK_ATTR);
  target.removeAttribute(LANDSCAPE_ATTR);
  const overlay = document.getElementById(OVERLAY_ID);
  overlay?.remove();
};

let cleanup: (() => void) | null = null;

export const startSkyroomPhonePortraitLock = () => {
  if (cleanup || typeof window === 'undefined') return;
  if (!isPhoneClassDevice()) return;

  tryNativeLock();
  applyVisualState();

  const mql = window.matchMedia('(orientation: landscape)');
  let debounceTimer: number | null = null;
  const onChange = () => {
    if (debounceTimer !== null) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      debounceTimer = null;
      applyVisualState();
    }, 120);
  };

  if (mql.addEventListener) {
    mql.addEventListener('change', onChange);
  } else if (mql.addListener) {
    mql.addListener(onChange);
  }

  cleanup = () => {
    if (mql.removeEventListener) {
      mql.removeEventListener('change', onChange);
    } else if (mql.removeListener) {
      mql.removeListener(onChange);
    }
    if (debounceTimer !== null) window.clearTimeout(debounceTimer);
    clearVisualState();
    tryNativeUnlock();
    cleanup = null;
  };
};

export const stopSkyroomPhonePortraitLock = () => {
  if (cleanup) cleanup();
};

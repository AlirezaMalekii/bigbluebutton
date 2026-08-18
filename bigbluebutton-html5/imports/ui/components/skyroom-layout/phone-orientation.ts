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

const getViewportSize = () => {
  const viewport = window.visualViewport;
  return {
    width: Math.round(viewport?.width || window.innerWidth),
    height: Math.round(viewport?.height || window.innerHeight),
  };
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
  const { width, height } = getViewportSize();
  const isLandscape = width > height;
  ensureOverlay();

  if (isLandscape) {
    html.setAttribute(LOCK_ATTR, 'true');
    target.setAttribute(LOCK_ATTR, 'true');
    target.setAttribute(LANDSCAPE_ATTR, 'true');
    window.scrollTo(0, 0);
  } else {
    target.removeAttribute(LANDSCAPE_ATTR);
  }
};

const clearVisualState = () => {
  const html = document.documentElement;
  const target = getLockTarget();
  html.removeAttribute(LOCK_ATTR);
  target.removeAttribute(LOCK_ATTR);
  target.removeAttribute(LANDSCAPE_ATTR);
  const overlay = document.getElementById(OVERLAY_ID);
  overlay?.remove();
};

let cleanup: (() => void) | null = null;

export const startSkyroomPhonePortraitLock = () => {
  if (cleanup || typeof window === 'undefined') return;
  if (!isPhoneClassDevice()) return;

  const html = document.documentElement;
  const target = getLockTarget();
  html.setAttribute(LOCK_ATTR, 'true');
  target.setAttribute(LOCK_ATTR, 'true');

  tryNativeLock();
  applyVisualState();

  const mql = window.matchMedia('(orientation: landscape)');
  const onChange = () => {
    tryNativeLock();
    applyVisualState();
  };

  if (mql.addEventListener) {
    mql.addEventListener('change', onChange);
  } else if (mql.addListener) {
    mql.addListener(onChange);
  }

  window.addEventListener('resize', onChange);
  window.visualViewport?.addEventListener('resize', onChange);
  window.visualViewport?.addEventListener('scroll', onChange);

  cleanup = () => {
    if (mql.removeEventListener) {
      mql.removeEventListener('change', onChange);
    } else if (mql.removeListener) {
      mql.removeListener(onChange);
    }
    window.removeEventListener('resize', onChange);
    window.visualViewport?.removeEventListener('resize', onChange);
    window.visualViewport?.removeEventListener('scroll', onChange);
    clearVisualState();
    tryNativeUnlock();
    cleanup = null;
  };
};

export const stopSkyroomPhonePortraitLock = () => {
  if (cleanup) cleanup();
};

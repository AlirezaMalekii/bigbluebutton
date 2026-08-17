import deviceInfo from '/imports/utils/deviceInfo';
import { dispatchSkyroomLayoutResize } from './layout-resize';

export const SKYROOM_PHONE_PORTRAIT_LOCK_ATTR = 'data-skyroom-phone-portrait-lock';
export const SKYROOM_PHONE_LANDSCAPE_ATTR = 'data-skyroom-phone-landscape';

const PHONE_SHORT_SIDE_PX = 600;

const isPhoneClassDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (deviceInfo.isTablet) return false;
  if (!deviceInfo.isPhone) return false;
  const shortSide = Math.min(window.screen?.width || 0, window.screen?.height || 0);
  return shortSide > 0 && shortSide < PHONE_SHORT_SIDE_PX;
};

const lockNativeOrientation = () => {
  if (typeof window === 'undefined' || !isPhoneClassDevice()) return;
  const orientation = window.screen?.orientation as (ScreenOrientation & {
    lock?: (orientation: string) => Promise<void>;
    unlock?: () => void;
  }) | undefined;
  if (orientation && typeof orientation.lock === 'function') {
    orientation.lock('portrait').catch(() => {});
    return;
  }
  const screenWithLegacy = window.screen as Screen & {
    lockOrientation?: (type: string) => boolean;
    mozLockOrientation?: (type: string) => boolean;
    msLockOrientation?: (type: string) => boolean;
  };
  const legacy = screenWithLegacy.lockOrientation
    || screenWithLegacy.mozLockOrientation
    || screenWithLegacy.msLockOrientation;
  if (typeof legacy === 'function') {
    try {
      legacy.call(window.screen, 'portrait');
    } catch (error) {
      // Browsers reject orientation lock outside fullscreen / installed PWA.
    }
  }
};

const applyVisualLock = () => {
  const html = document.documentElement;
  if (!isPhoneClassDevice()) {
    html.removeAttribute(SKYROOM_PHONE_PORTRAIT_LOCK_ATTR);
    html.removeAttribute(SKYROOM_PHONE_LANDSCAPE_ATTR);
    html.style.removeProperty('--skyroom-phone-lock-w');
    html.style.removeProperty('--skyroom-phone-lock-h');
    return;
  }

  html.setAttribute(SKYROOM_PHONE_PORTRAIT_LOCK_ATTR, 'true');
  const landscape = window.matchMedia('(orientation: landscape)').matches;
  if (!landscape) {
    if (html.hasAttribute(SKYROOM_PHONE_LANDSCAPE_ATTR)) {
      html.removeAttribute(SKYROOM_PHONE_LANDSCAPE_ATTR);
      html.style.removeProperty('--skyroom-phone-lock-w');
      html.style.removeProperty('--skyroom-phone-lock-h');
      dispatchSkyroomLayoutResize();
    }
    return;
  }

  const portraitWidth = `${window.innerHeight}px`;
  const portraitHeight = `${window.innerWidth}px`;
  const unchanged = html.getAttribute(SKYROOM_PHONE_LANDSCAPE_ATTR) === 'true'
    && html.style.getPropertyValue('--skyroom-phone-lock-w') === portraitWidth
    && html.style.getPropertyValue('--skyroom-phone-lock-h') === portraitHeight;
  if (unchanged) return;

  html.setAttribute(SKYROOM_PHONE_LANDSCAPE_ATTR, 'true');
  html.style.setProperty('--skyroom-phone-lock-w', portraitWidth);
  html.style.setProperty('--skyroom-phone-lock-h', portraitHeight);
  dispatchSkyroomLayoutResize();
};

let started = false;
let stopLock: (() => void) | null = null;

export const startSkyroomPhonePortraitLock = () => {
  if (started || typeof window === 'undefined') return;
  started = true;
  if (!isPhoneClassDevice()) return;

  const html = document.documentElement;
  html.setAttribute(SKYROOM_PHONE_PORTRAIT_LOCK_ATTR, 'true');
  lockNativeOrientation();
  applyVisualLock();

  const onOrientationChange = () => {
    lockNativeOrientation();
    applyVisualLock();
  };

  window.addEventListener('orientationchange', onOrientationChange);
  window.addEventListener('pointerdown', lockNativeOrientation, { passive: true, once: true });

  stopLock = () => {
    window.removeEventListener('orientationchange', onOrientationChange);
    html.removeAttribute(SKYROOM_PHONE_PORTRAIT_LOCK_ATTR);
    html.removeAttribute(SKYROOM_PHONE_LANDSCAPE_ATTR);
    html.style.removeProperty('--skyroom-phone-lock-w');
    html.style.removeProperty('--skyroom-phone-lock-h');
    const orientation = window.screen?.orientation as (ScreenOrientation & {
      unlock?: () => void;
    }) | undefined;
    if (orientation && typeof orientation.unlock === 'function') {
      try {
        orientation.unlock();
      } catch (error) {
        // Ignore unlock failures when the browser never granted the lock.
      }
    }
    started = false;
    stopLock = null;
  };
};

export const stopSkyroomPhonePortraitLock = () => {
  if (stopLock) stopLock();
  started = false;
};

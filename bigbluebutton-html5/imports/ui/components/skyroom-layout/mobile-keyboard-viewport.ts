import { dispatchSkyroomLayoutResize } from './layout-resize';
import { isSkyroomMobileViewport } from './panel-toggles';
import {
  isSoftKeyboardOpen,
  measureKeyboardInset,
  shouldRestoreLayoutViewport,
} from './mobile-keyboard-viewport-utils';

const KEYBOARD_ATTR = 'data-skyroom-keyboard';
const KEYBOARD_INSET_VAR = '--skyroom-keyboard-inset';
const RESTORE_FOLLOWUP_MS = 180;
const RESTORE_COOLDOWN_MS = 400;

let cleanup: (() => void) | null = null;
let keyboardWasOpen = false;
let restoreTimer: number | null = null;
let lastRestoreAt = 0;

const layoutViewportHeight = (): number => {
  const visual = window.visualViewport;
  const visualCover = visual
    ? Math.round(visual.height + visual.offsetTop)
    : 0;
  return Math.max(
    window.document.documentElement?.clientHeight || 0,
    window.innerHeight || 0,
    visualCover,
  );
};

const readMetrics = () => {
  const visual = window.visualViewport;
  return {
    layoutHeight: layoutViewportHeight(),
    visualHeight: visual?.height || window.innerHeight || 0,
    visualOffsetTop: visual?.offsetTop || 0,
    scrollY: window.scrollY || window.pageYOffset || 0,
  };
};

const resetDocumentScroll = () => {
  window.scrollTo(0, 0);
  const root = document.documentElement;
  const { body } = document;
  if (root) root.scrollTop = 0;
  if (body) body.scrollTop = 0;
};

const applyKeyboardInset = (inset: number) => {
  const html = document.documentElement;
  const layoutEl = document.getElementById('layout');
  const value = `${Math.max(0, inset)}px`;
  html.style.setProperty(KEYBOARD_INSET_VAR, value);
  layoutEl?.style.setProperty(KEYBOARD_INSET_VAR, value);
  if (inset > 0) {
    html.setAttribute(KEYBOARD_ATTR, 'true');
  } else {
    html.removeAttribute(KEYBOARD_ATTR);
  }
};

const restoreLayoutViewport = () => {
  lastRestoreAt = Date.now();
  resetDocumentScroll();
  applyKeyboardInset(0);
  dispatchSkyroomLayoutResize();
};

const scheduleRestore = () => {
  restoreLayoutViewport();
  if (restoreTimer !== null) window.clearTimeout(restoreTimer);
  restoreTimer = window.setTimeout(() => {
    restoreTimer = null;
    restoreLayoutViewport();
  }, RESTORE_FOLLOWUP_MS);
};

const syncViewport = () => {
  if (!isSkyroomMobileViewport()) {
    if (keyboardWasOpen || document.documentElement.hasAttribute(KEYBOARD_ATTR)) {
      keyboardWasOpen = false;
      restoreLayoutViewport();
    }
    return;
  }

  const metrics = readMetrics();
  const keyboardIsOpen = isSoftKeyboardOpen(metrics);
  applyKeyboardInset(measureKeyboardInset(metrics));

  if (
    shouldRestoreLayoutViewport({
      keyboardWasOpen,
      keyboardIsOpen,
      scrollY: metrics.scrollY,
      visualOffsetTop: metrics.visualOffsetTop,
    })
    && Date.now() - lastRestoreAt > RESTORE_COOLDOWN_MS
  ) {
    scheduleRestore();
  }

  keyboardWasOpen = keyboardIsOpen;
};

export const startSkyroomMobileKeyboardViewport = () => {
  if (cleanup || typeof window === 'undefined') return;

  syncViewport();

  const visual = window.visualViewport;
  visual?.addEventListener('resize', syncViewport);
  visual?.addEventListener('scroll', syncViewport);
  window.addEventListener('orientationchange', syncViewport);
  document.addEventListener('focusout', syncViewport);

  cleanup = () => {
    visual?.removeEventListener('resize', syncViewport);
    visual?.removeEventListener('scroll', syncViewport);
    window.removeEventListener('orientationchange', syncViewport);
    document.removeEventListener('focusout', syncViewport);
    if (restoreTimer !== null) window.clearTimeout(restoreTimer);
    restoreTimer = null;
    keyboardWasOpen = false;
    applyKeyboardInset(0);
    document.documentElement.removeAttribute(KEYBOARD_ATTR);
    cleanup = null;
  };
};

export const stopSkyroomMobileKeyboardViewport = () => {
  if (cleanup) cleanup();
};

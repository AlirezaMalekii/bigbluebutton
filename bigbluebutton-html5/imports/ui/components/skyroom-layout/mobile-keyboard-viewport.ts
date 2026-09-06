import { dispatchSkyroomLayoutResize } from './layout-resize';
import { isSkyroomMobileViewport } from './panel-toggles';
import { SKYROOM_WEBCAM_LAYOUT_EVENT } from './webcam-zone-store';
import {
  isEditableFocusTarget,
  isSoftKeyboardOpen,
  measureKeyboardInset,
  shouldRestoreLayoutViewport,
} from './mobile-keyboard-viewport-utils';

const KEYBOARD_ATTR = 'data-skyroom-keyboard';
const KEYBOARD_INSET_VAR = '--skyroom-keyboard-inset';
const RESTORE_FOLLOWUP_MS = [180, 450];
const RESTORE_COOLDOWN_MS = 350;

let cleanup: (() => void) | null = null;
let keyboardWasOpen = false;
let restoreTimers: number[] = [];
let lastPublishAt = 0;

const readMetrics = () => {
  const visual = window.visualViewport;
  const layoutHeight = window.document.documentElement?.clientHeight
    || window.innerHeight
    || 0;
  return {
    layoutHeight,
    visualHeight: visual?.height || window.innerHeight || 0,
    visualOffsetTop: visual?.offsetTop || 0,
    scrollY: window.scrollY || window.pageYOffset || 0,
  };
};

type VisualViewportWithScroll = VisualViewport & {
  scrollTo?: (x: number, y: number) => void;
};

const pinVisualViewport = () => {
  window.scrollTo(0, 0);
  const visual = window.visualViewport as VisualViewportWithScroll | null;
  if (typeof visual?.scrollTo === 'function') {
    visual.scrollTo(0, 0);
  }
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

const publishLayout = () => {
  dispatchSkyroomLayoutResize();
};

const restoreLayoutViewport = () => {
  lastPublishAt = Date.now();
  pinVisualViewport();
  applyKeyboardInset(0);
  dispatchSkyroomLayoutResize();
  window.dispatchEvent(new CustomEvent(SKYROOM_WEBCAM_LAYOUT_EVENT));
};

const scheduleRestore = () => {
  restoreLayoutViewport();
  restoreTimers.forEach((id) => window.clearTimeout(id));
  restoreTimers = RESTORE_FOLLOWUP_MS.map((ms) => window.setTimeout(() => {
    restoreLayoutViewport();
  }, ms));
};

const keyboardIsLikelyOpen = (metrics: ReturnType<typeof readMetrics>) => (
  isEditableFocusTarget(document.activeElement)
  || isSoftKeyboardOpen(metrics)
);

const syncViewport = () => {
  if (!isSkyroomMobileViewport()) {
    if (keyboardWasOpen || document.documentElement.hasAttribute(KEYBOARD_ATTR)) {
      keyboardWasOpen = false;
      restoreLayoutViewport();
    }
    return;
  }

  const metrics = readMetrics();
  const keyboardIsOpen = keyboardIsLikelyOpen(metrics);
  applyKeyboardInset(measureKeyboardInset(metrics));

  if (keyboardIsOpen) {
    pinVisualViewport();
    keyboardWasOpen = true;
    publishLayout();
    return;
  }

  if (
    shouldRestoreLayoutViewport({
      keyboardWasOpen,
      keyboardIsOpen: false,
      scrollY: metrics.scrollY,
      visualOffsetTop: metrics.visualOffsetTop,
    })
    && Date.now() - lastPublishAt > RESTORE_COOLDOWN_MS
  ) {
    scheduleRestore();
  }

  keyboardWasOpen = false;
};

const onVisualScroll = () => {
  if (!isSkyroomMobileViewport()) return;
  if (keyboardWasOpen || isEditableFocusTarget(document.activeElement)) {
    pinVisualViewport();
  }
};

const onFocusIn = () => {
  if (isEditableFocusTarget(document.activeElement)) {
    syncViewport();
  }
};

export const startSkyroomMobileKeyboardViewport = () => {
  if (cleanup || typeof window === 'undefined') return;

  syncViewport();

  const visual = window.visualViewport;
  visual?.addEventListener('resize', syncViewport);
  visual?.addEventListener('scroll', onVisualScroll);
  window.addEventListener('orientationchange', syncViewport);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', syncViewport);

  cleanup = () => {
    visual?.removeEventListener('resize', syncViewport);
    visual?.removeEventListener('scroll', onVisualScroll);
    window.removeEventListener('orientationchange', syncViewport);
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('focusout', syncViewport);
    restoreTimers.forEach((id) => window.clearTimeout(id));
    restoreTimers = [];
    keyboardWasOpen = false;
    applyKeyboardInset(0);
    document.documentElement.removeAttribute(KEYBOARD_ATTR);
    cleanup = null;
  };
};

export const stopSkyroomMobileKeyboardViewport = () => {
  if (cleanup) cleanup();
};

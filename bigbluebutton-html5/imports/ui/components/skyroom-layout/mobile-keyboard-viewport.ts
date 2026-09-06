import { dispatchSkyroomLayoutResize } from './layout-resize';
import {
  isSkyroomMobileKeyboardActive,
  resetSkyroomStableLayoutHeight,
  seedSkyroomStableLayoutHeight,
} from './mobile-keyboard-stable-height';
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
const RESTORE_COOLDOWN_MS = 400;

let cleanup: (() => void) | null = null;
let keyboardWasOpen = false;
let restoreTimers: number[] = [];
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
  // SET_BROWSER_SIZE no-ops when width/height already match. Webcam-driven
  // layout still has to recompute chat/action-bar against the restored height.
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
  isSkyroomMobileKeyboardActive() || isSoftKeyboardOpen(metrics)
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
  seedSkyroomStableLayoutHeight();
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

const onFocusIn = () => {
  seedSkyroomStableLayoutHeight();
  syncViewport();
};

const onPointerDown = (event: Event) => {
  if (isEditableFocusTarget(event.target as { tagName?: string } | null)) {
    seedSkyroomStableLayoutHeight();
  }
};

const onOrientationChange = () => {
  resetSkyroomStableLayoutHeight();
  syncViewport();
};

export const startSkyroomMobileKeyboardViewport = () => {
  if (cleanup || typeof window === 'undefined') return;

  seedSkyroomStableLayoutHeight();
  syncViewport();

  const visual = window.visualViewport;
  visual?.addEventListener('resize', syncViewport);
  visual?.addEventListener('scroll', syncViewport);
  window.addEventListener('orientationchange', onOrientationChange);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', syncViewport);

  cleanup = () => {
    visual?.removeEventListener('resize', syncViewport);
    visual?.removeEventListener('scroll', syncViewport);
    window.removeEventListener('orientationchange', onOrientationChange);
    document.removeEventListener('pointerdown', onPointerDown, true);
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

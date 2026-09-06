import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const loadProductionModule = async (relativePath) => {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
  return import(moduleUrl);
};

const {
  measureKeyboardInset,
  isSoftKeyboardOpen,
  shouldRestoreLayoutViewport,
  isEditableFocusTarget,
  shouldLockStableLayoutHeight,
  resolveStableLayoutHeight,
} = await loadProductionModule('./mobile-keyboard-viewport-utils.js');

assert.equal(
  measureKeyboardInset({ layoutHeight: 800, visualHeight: 800, visualOffsetTop: 0 }),
  0,
  'full visual viewport is not a keyboard inset',
);

assert.equal(
  measureKeyboardInset({ layoutHeight: 800, visualHeight: 430, visualOffsetTop: 0 }),
  370,
  'keyboard-shrunk visual viewport reports the inset',
);

assert.equal(
  isSoftKeyboardOpen({ layoutHeight: 800, visualHeight: 720, visualOffsetTop: 0 }),
  false,
  'browser chrome jitter below the threshold is not a keyboard',
);

assert.equal(
  shouldRestoreLayoutViewport({
    keyboardWasOpen: true,
    keyboardIsOpen: false,
    scrollY: 0,
    visualOffsetTop: 0,
  }),
  true,
  'closing the keyboard always restores layout chrome',
);

assert.equal(
  shouldRestoreLayoutViewport({
    keyboardWasOpen: false,
    keyboardIsOpen: true,
    scrollY: 240,
    visualOffsetTop: 180,
  }),
  false,
  'do not fight the keyboard while it is still open',
);

assert.equal(
  shouldRestoreLayoutViewport({
    keyboardWasOpen: false,
    keyboardIsOpen: false,
    scrollY: 0,
    visualOffsetTop: 180,
  }),
  true,
  'a leftover visualViewport offset after dismiss must restore',
);

assert.equal(
  shouldRestoreLayoutViewport({
    keyboardWasOpen: false,
    keyboardIsOpen: false,
    scrollY: 0,
    visualOffsetTop: 0,
  }),
  false,
  'a settled viewport does not need restore work',
);

assert.equal(
  isEditableFocusTarget({ tagName: 'TEXTAREA' }),
  true,
  'chat composer is a keyboard target',
);

assert.equal(
  isEditableFocusTarget({ tagName: 'INPUT', type: 'checkbox' }),
  false,
  'non-text inputs do not lock layout height',
);

assert.equal(
  shouldLockStableLayoutHeight({
    liveHeight: 430,
    cachedHeight: 800,
    liveWidth: 390,
    cachedWidth: 390,
    textInputFocused: false,
    visualInset: 0,
  }),
  true,
  'resizes-content keyboard shrink must lock even without a visual inset',
);

assert.equal(
  shouldLockStableLayoutHeight({
    liveHeight: 430,
    cachedHeight: 800,
    liveWidth: 844,
    cachedWidth: 390,
    textInputFocused: false,
    visualInset: 0,
  }),
  false,
  'orientation width changes must not freeze the portrait height',
);

assert.equal(
  shouldLockStableLayoutHeight({
    liveHeight: 800,
    cachedHeight: 800,
    liveWidth: 390,
    cachedWidth: 390,
    textInputFocused: true,
    visualInset: 0,
  }),
  true,
  'a focused chat field locks before the keyboard animation finishes',
);

assert.equal(
  resolveStableLayoutHeight({
    liveHeight: 430,
    cachedHeight: 800,
    lockToCached: true,
  }),
  800,
  'locked layout keeps the pre-keyboard height',
);

assert.equal(
  resolveStableLayoutHeight({
    liveHeight: 800,
    cachedHeight: 800,
    lockToCached: true,
  }),
  800,
  'closing the keyboard while still focused can grow back to full height',
);

assert.equal(
  resolveStableLayoutHeight({
    liveHeight: 430,
    cachedHeight: 800,
    lockToCached: false,
  }),
  430,
  'unlocked layout follows the live viewport',
);

console.log('mobile-keyboard-viewport-utils tests passed');

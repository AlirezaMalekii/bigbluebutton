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
  resolveMobileLayoutHeight,
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
  resolveMobileLayoutHeight({ visualHeight: 430, layoutHeight: 800 }),
  430,
  'phone layout follows the visible viewport while the keyboard is open',
);

assert.equal(
  resolveMobileLayoutHeight({ visualHeight: 800, layoutHeight: 800 }),
  800,
  'phone layout follows the visible viewport after the keyboard closes',
);

assert.equal(
  resolveMobileLayoutHeight({ visualHeight: 0, layoutHeight: 800 }),
  800,
  'layout viewport is the fallback when visualViewport is missing',
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
  'non-text inputs do not count as keyboard targets',
);

console.log('mobile-keyboard-viewport-utils tests passed');

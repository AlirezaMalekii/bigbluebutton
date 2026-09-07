/* eslint-disable no-console */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const run = async () => {
  const source = await readFile(
    new URL('./mobile-ime-recovery-utils.js', import.meta.url),
    'utf8',
  );
  const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
  const {
    isSkyroomMobileImeOpen,
    isSkyroomMobileEditableTarget,
    resetSkyroomMobileScrollTop,
    resolveSkyroomMobileLayoutHeight,
    shouldRestoreSkyroomMobileViewport,
  } = await import(moduleUrl);

  assert.equal(
    isSkyroomMobileEditableTarget({ tagName: 'TEXTAREA' }),
    true,
    'the chat composer is an editable IME target',
  );

  assert.equal(
    isSkyroomMobileEditableTarget({ tagName: 'INPUT', type: 'checkbox' }),
    false,
    'non-text controls do not start keyboard settle probes',
  );

  assert.equal(
    isSkyroomMobileImeOpen({ fullHeight: 800, visualHeight: 430 }),
    true,
    'a keyboard-sized visual viewport shrink is treated as an open IME',
  );

  assert.equal(
    isSkyroomMobileImeOpen({ fullHeight: 800, visualHeight: 750 }),
    false,
    'browser chrome jitter is not treated as an open IME',
  );

  assert.equal(
    resolveSkyroomMobileLayoutHeight({
      liveHeight: 430,
      fullHeight: 800,
      visualHeight: 430,
    }),
    430,
    'layout follows the live client height while the keyboard is open',
  );

  assert.equal(
    resolveSkyroomMobileLayoutHeight({
      liveHeight: 430,
      fullHeight: 800,
      visualHeight: 800,
    }),
    800,
    'a stale client height is replaced after the visual viewport restores',
  );

  assert.equal(
    shouldRestoreSkyroomMobileViewport({
      keyboardWasOpen: true,
      keyboardIsOpen: false,
      scrollY: 0,
      visualOffsetTop: 0,
    }),
    true,
    'the open-to-closed transition always restores the meeting viewport',
  );

  assert.equal(
    shouldRestoreSkyroomMobileViewport({
      keyboardWasOpen: true,
      keyboardIsOpen: true,
      scrollY: 240,
      visualOffsetTop: 180,
    }),
    false,
    'the browser remains free to expose the focused composer while the IME is open',
  );

  assert.equal(
    shouldRestoreSkyroomMobileViewport({
      keyboardWasOpen: false,
      keyboardIsOpen: false,
      scrollY: 0,
      visualOffsetTop: 160,
    }),
    true,
    'a stale visual viewport pan is repaired even if focusout arrived first',
  );

  assert.equal(
    shouldRestoreSkyroomMobileViewport({
      keyboardWasOpen: false,
      keyboardIsOpen: false,
      scrollY: 0,
      visualOffsetTop: 0,
    }),
    false,
    'a settled viewport does not trigger redundant layout work',
  );

  const appScrollContainer = { scrollTop: 269 };
  resetSkyroomMobileScrollTop(appScrollContainer);
  assert.equal(
    appScrollContainer.scrollTop,
    0,
    'the internally scrolled app container is restored after chat submit',
  );

  console.log('mobile IME recovery utility tests passed');
};

run();

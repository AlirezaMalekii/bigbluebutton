import { devices, expect } from '@playwright/test';

import { ELEMENT_WAIT_LONGER_TIME } from '../core/constants';
import { elements as e } from '../core/elements';
import { initializePages } from '../core/helpers';
import { test } from '../core/setup/fixtures';
import { Audio } from './audio';

const iPhone11 = devices['iPhone 11'];

test.describe.parallel('Audio', { tag: '@ci' }, () => {
  let audio: Audio;

  test.beforeEach(async ({ browser, context }, testInfo) => {
    audio = new Audio(browser, context);
    await initializePages(audio, browser, { isMultiUser: true, testInfo });
  });

  // https://docs.bigbluebutton.org/3.0/testing/release-testing/#listen-only-mode-automated
  test('Join audio with Listen Only', async () => {
    await audio.joinAudio();
  });

  // https://docs.bigbluebutton.org/3.0/testing/release-testing/#join-audio-automated
  test('Join audio with Microphone', async () => {
    await audio.joinMicrophone();
  });

  test('Change audio input and keep it connected', async ({ browserName }) => {
    test.skip(browserName === 'firefox', 'Firefox does not support fake audio to simulate de audio.');
    await audio.changeAudioInput();
  });

  // https://docs.bigbluebutton.org/3.0/testing/release-testing/#muteunmute
  test('Mute yourself by clicking the mute button', async () => {
    await audio.muteYourselfByButton();
  });

  // https://docs.bigbluebutton.org/3.0/testing/release-testing/#choosing-different-sources
  test('Keep the last mute state after rejoining audio', async () => {
    await audio.keepMuteStateOnRejoin();
  });

  // Talking Indicator
  // https://docs.bigbluebutton.org/3.0/testing/release-testing/#talking-indicator
  test('Mute yourself by clicking the talking indicator', async () => {
    await audio.muteYourselfByTalkingIndicator();
  });

  // https://docs.bigbluebutton.org/3.0/testing/release-testing/#talking-indicator
  test('Mute another user by clicking the talking indicator', async () => {
    await audio.muteAnotherUser();
  });
});

test.describe('Mobile audio', { tag: '@ci' }, () => {
  test.beforeEach(({ browserName }) => {
    test.skip(browserName === 'firefox', 'Touchscreen emulation is not available in Firefox');
  });

  test('opens the speaker device menu above mobile meeting layers', async ({ browser }, testInfo) => {
    const context = await browser.newContext({ ...iPhone11 });
    const page = await context.newPage();
    const mobileAudio = new Audio(browser, context);

    await mobileAudio.initModPage(page, { testInfo });
    await page.locator(e.joinAudio).tap();
    await page.locator(e.listenOnlyButton).tap();
    await mobileAudio.modPage.wasRemoved(
      e.establishingAudioLabel,
      'should establish listen-only audio on mobile',
      ELEMENT_WAIT_LONGER_TIME,
    );

    const speakerButton = page.locator(e.leaveListenOnly);
    await expect(speakerButton).toBeVisible();
    await speakerButton.tap();

    const audioDeviceMenu = page.locator('#audio-selector-dropdown-menu');
    const audioDevicePaper = audioDeviceMenu.locator('.MuiPaper-root');
    await expect(audioDeviceMenu).toBeVisible();
    await expect(audioDevicePaper).toBeVisible();
    await expect(audioDevicePaper).toBeInViewport();
    await expect
      .poll(async () => Number(await audioDeviceMenu.evaluate((element) => getComputedStyle(element).zIndex)))
      .toBeGreaterThan(1502);

    await audioDeviceMenu.locator(e.leaveAudio).tap();
    await expect(page.locator(e.joinAudio)).toBeVisible();
  });
});

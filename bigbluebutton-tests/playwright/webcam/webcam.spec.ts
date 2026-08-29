import { devices, expect } from '@playwright/test';

import { Page } from '../core/page';
import { test } from '../core/setup/fixtures';
import { MultiUsers } from '../user/multiusers';
import { Webcam } from './webcam';

const iPhone11 = devices['iPhone 11'];

test.describe.parallel('Webcam', { tag: '@ci' }, () => {
  test('Mobile decodes at most four webcams while scrolling', async ({ browser, context }, testInfo) => {
    const mobileContext = await browser.newContext({ ...iPhone11 });
    const mobilePlaywrightPage = await mobileContext.newPage();
    const mobile = new Page(browser, mobilePlaywrightPage, testInfo);
    await mobile.init(true, {
      fullName: 'MobileModerator',
      joinParameter: 'userdata-bbb_auto_join_audio=false',
      shouldCloseAudioModal: false,
      testInfo,
    });

    const remoteUsers: Page[] = [];
    for (let index = 0; index < 4; index += 1) {
      const remotePlaywrightPage = await context.newPage();
      const remote = new Page(browser, remotePlaywrightPage, testInfo);
      await remote.init(false, {
        fullName: `Camera${index + 1}`,
        joinParameter: 'userdata-bbb_auto_join_audio=false',
        meetingId: mobile.meetingId,
        shouldCloseAudioModal: false,
        testInfo,
      });
      await remote.shareWebcam({
        shouldWaitForRemoteVideoConnections: false,
        videoPreviewTimeout: 30000,
      });
      remoteUsers.push(remote);
    }
    await mobile.shareWebcam({
      shouldWaitForRemoteVideoConnections: false,
      videoPreviewTimeout: 30000,
    });
    await mobile.page.waitForTimeout(3000);

    const countActiveVideos = () =>
      mobile.page.locator('video').evaluateAll(
        (videos) =>
          videos.filter((video) => {
            const media = video as HTMLVideoElement;
            return media.srcObject && !media.paused && media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
          }).length,
      );

    await expect(mobile.page.locator('[data-test="webcamItem"], [data-test="webcamItemTalkingUser"]')).toHaveCount(5);
    const initialActiveVideos = await countActiveVideos();
    expect(initialActiveVideos, 'initial mobile decoder count').toBeGreaterThan(0);
    expect(initialActiveVideos, 'initial mobile decoder count').toBeLessThanOrEqual(4);
    await mobile.page.locator('#cameraDock').evaluate((dock) => {
      dock.scrollTo({ top: dock.scrollHeight });
    });
    await mobile.page.waitForTimeout(750);
    expect(await countActiveVideos(), 'decoder count after scrolling').toBeLessThanOrEqual(4);
    expect(remoteUsers).toHaveLength(4);
  });

  // https://docs.bigbluebutton.org/3.0/testing/release-testing/#joining-webcam-automated
  test('Shares webcam', async ({ browser, page }, testInfo) => {
    const webcam = new Webcam(browser, page);
    await webcam.init(true, { testInfo });
    await webcam.share();
  });

  test('Checks content of webcam', async ({ browser, page }, testInfo) => {
    const webcam = new Webcam(browser, page);
    await webcam.init(true, { testInfo });
    await webcam.checksContent();
  });

  test('Webcam talking indicator', async ({ browser, page }, testInfo) => {
    const webcam = new Webcam(browser, page);
    await webcam.init(true, { testInfo, shouldCloseAudioModal: false });
    await webcam.talkingIndicator();
  });

  test('Mirror webcam', async ({ browser, page }, testInfo) => {
    const webcam = new Webcam(browser, page);
    await webcam.init(true, { testInfo });
    await webcam.mirrorWebcam();
  });

  test('Pinning and unpinning webcams', async ({ browser, context, page, browserName }, testInfo) => {
    test.skip(browserName === 'firefox', 'It only works manually on Firefox');
    const webcam = new MultiUsers(browser, context);
    await webcam.initModPage(page, { testInfo });
    await webcam.initUserPage(context, { testInfo });
    await webcam.initModPage2(context, { testInfo });
    await webcam.pinningWebcams();
  });

  test('Change video quality', async ({ browser, page }, testInfo) => {
    const webcam = new Webcam(browser, page);
    await webcam.init(true, { testInfo });
    await webcam.changeVideoQuality();
  });

  test('Webcam fullscreen', async ({ browser, page }, testInfo) => {
    const webcam = new Webcam(browser, page);
    await webcam.init(true, { testInfo });
    await webcam.webcamFullscreen();
  });

  test('Disable Self-view', async ({ browser, page }, testInfo) => {
    const webcam = new Webcam(browser, page);
    await webcam.init(true, { testInfo });
    await webcam.disableSelfView();
  });

  test('Focus and Unfocus webcam', async ({ browser, context, page }, testInfo) => {
    const webcam = new MultiUsers(browser, context);
    await webcam.initModPage(page, { testInfo });
    await webcam.initUserPage(context, { testInfo });
    await webcam.initUserPage2(context, { testInfo });
    await webcam.focusUnfocusWebcam();
  });

  test('Resize webcam area', async ({ browser, page }, testInfo) => {
    const webcam = new Webcam(browser, page);
    await webcam.init(true, { testInfo });
    await webcam.resizeWebcamArea();
  });

  test('Drag and drop webcam in different areas', async ({ browser, page }, testInfo) => {
    const webcam = new Webcam(browser, page);
    await webcam.init(true, { testInfo });
    await webcam.dragAndDropWebcamInDifferentAreas();
  });

  test.describe('Webcam background', () => {
    test('Select one of the default backgrounds', async ({ browser, page }, testInfo) => {
      const webcam = new Webcam(browser, page);
      await webcam.init(true, { testInfo });
      await webcam.applyBackground();
    });

    // following test is throwing failures due to mis-comparison screenshot
    // as the emulated video is not static, we may add a mask in the middle part - where it moves the most
    test('Managing new background', async ({ browser, page }, testInfo) => {
      const webcam = new Webcam(browser, page);
      await webcam.init(true, { testInfo });
      await webcam.managingNewBackground();
    });

    test('Keep background when rejoin', async ({ browser, context, page }, testInfo) => {
      const webcam = new Webcam(browser, page);
      await webcam.init(true, { testInfo });
      await webcam.keepBackgroundWhenRejoin(context);
    });
  });
});

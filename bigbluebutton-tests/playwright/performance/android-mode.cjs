// Changes only the marked test session through the same settings UI as the user.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const mode = process.argv[2];
if (!['auto', 'low', 'standard'].includes(mode)) throw new Error('Expected auto, low or standard');
(async () => {
  const browser = await chromium.connectOverCDP(process.env.ANDROID_CDP || 'http://127.0.0.1:9222');
  const page = browser
    .contexts()
    .flatMap((context) => context.pages())
    .find((candidate) => candidate.url().includes('safemeetAndroidTest=1'));
  if (!page) throw new Error('Marked test tab unavailable');
  await page.locator('[data-test="optionsButton"]').click();
  await page.locator('[data-test="settings"]').click();
  await page.getByText('صرفه‌جویی در اینترنت', { exact: true }).first().click();
  await page.locator('[data-test="safemeetPerformanceMode"]').selectOption(mode);
  await page.locator('[data-test="modalConfirmButton"]').click();
  await page.waitForTimeout(7000);
  const result = await page.evaluate(async () => {
    const sample = await window.__safemeetPerfSample();
    return {
      stage: sample.protectionStage,
      activeCaptureTracks: sample.activeCaptureTracks,
      activeSenderTracks: sample.activeSenderTracks,
      activeReceiverTracks: sample.activeReceiverTracks,
      videos: sample.videos,
      media: sample.media,
      noticeVisible: Boolean(document.querySelector('.Toastify__toast')),
    };
  });
  const record = { at: new Date().toISOString(), mode, ...result };
  if (process.env.ANDROID_MODE_OUTPUT) {
    const destination = path.resolve(process.env.ANDROID_MODE_OUTPUT);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.appendFileSync(destination, `${JSON.stringify(record)}\n`);
  }
  console.log(JSON.stringify(record));
  process.exit(0);
})().catch((error) => {
  console.error(
    String(error.message)
      .replace(/https?:\S+/g, '[url]')
      .slice(0, 300),
  );
  process.exit(1);
});

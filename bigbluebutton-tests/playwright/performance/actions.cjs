const { expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

module.exports = async ({ pages, targetIndex, output, emit, sleep }) => {
  const target = pages[targetIndex];
  const results = [];
  const check = async (name, action) => {
    if (process.env.PERF_BASELINE === '1' && name.startsWith('performance-control-')) {
      results.push({ name, passed: null, skipped: 'New control is absent in baseline' });
      return;
    }
    try { const details = await action(); results.push({ name, passed: true, details }); }
    catch (error) {
      results.push({ name, passed: false, error: String(error.message).split('\n')[0].replace(/https?:\/\/\S+/g, '[url]') });
      await target.screenshot({ path: path.join(output, `failed-${name}.png`), timeout: 5000 }).catch(() => {});
    }
    fs.writeFileSync(path.join(output, 'actions.json'), JSON.stringify(results, null, 2));
    console.log(`${name}: ${results.at(-1).passed ? 'PASS' : 'FAIL'}`);
  };
  let presenter = pages[0];
  for (const page of pages.slice(0, 2)) {
    if (await page.locator('[data-test="startScreenShare"]').isVisible()) presenter = page;
  }
  const receiver = pages.find((page, index) => index >= 2 && page !== presenter) || pages.find((page) => page !== presenter);
  await check('chat-sync', async () => {
    const message = `آزمایش عملکرد SafeMeet ${Date.now()}`;
    await presenter.locator('#message-input').fill(message);
    const started = Date.now();
    await presenter.locator('[data-test="sendMessageButton"]').click();
    await expect(receiver.locator('[data-test="chatMessageItem"]').filter({ hasText: message }).first()).toBeVisible({ timeout: 15000 });
    const latencyMs = Date.now() - started;
    const ownMessage = presenter.locator('[data-test="chatMessageItem"]').filter({ hasText: message }).first();
    await ownMessage.hover();
    await ownMessage.locator('[data-test="deleteMessageButton"]').click();
    await presenter.locator('[data-test="confirmDeleteChatMessageButton"]').click();
    await expect(receiver.locator('[data-test="chatMessageItem"]').filter({ hasText: message })).toHaveCount(0);
    return { latencyMs, testMessageDeleted: true };
  });
  await check('whiteboard-sync-undo', async () => {
    const before = await receiver.locator('[data-shape-type="draw"]').count();
    await presenter.locator('[data-testid="tools.draw"]').click();
    const box = await presenter.locator('[data-testid="canvas"]').boundingBox();
    if (!box) throw new Error('Whiteboard canvas is not visible');
    const x = box.x + box.width * 0.4;
    const y = box.y + box.height * 0.5;
    const latencies = [];
    for (let stroke = 0; stroke < 5; stroke += 1) {
      await presenter.mouse.move(x, y + stroke * 15);
      await presenter.mouse.down();
      await presenter.mouse.move(x + 100, y + 10 + stroke * 15, { steps: 15 });
      const started = Date.now();
      await presenter.mouse.up();
      await expect(receiver.locator('[data-shape-type="draw"]')).toHaveCount(before + stroke + 1, { timeout: 15000 });
      latencies.push(Date.now() - started);
    }
    for (let stroke = 0; stroke < 5; stroke += 1) await presenter.keyboard.press('Control+z');
    await expect(receiver.locator('[data-shape-type="draw"]')).toHaveCount(before, { timeout: 15000 });
    return { latenciesMs: latencies, missingShapes: 0 };
  });
  await check('screenshare-synthetic-webrtc', async () => {
    const fixture = require('./screen-fixture.cjs');
    await fixture.start(presenter);
    try {
      await presenter.bringToFront();
      await presenter.locator('[data-test="startScreenShare"]').click();
      const video = receiver.locator('#screenshareVideo');
      await expect(video).toBeVisible({ timeout: 30000 });
      await sleep(4000);
      const first = await video.evaluate((item) => ({ time: item.currentTime, width: item.videoWidth, height: item.videoHeight }));
      await sleep(5000);
      const second = await video.evaluate((item) => ({ time: item.currentTime, width: item.videoWidth, height: item.videoHeight }));
      if (!(second.time > first.time && second.width > 0)) throw new Error('Screenshare did not advance');
      emit({ phase: 'screenshare', sample: await receiver.evaluate(() => window.__safemeetPerfSample()) });
      await receiver.screenshot({ path: path.join(output, 'screenshare.png') });
      await presenter.locator('[data-test="stopScreenShare"]').click();
      await expect(receiver.locator('[data-testid="canvas"]')).toBeVisible({ timeout: 15000 });
      return { first, second };
    } finally { await fixture.stop(presenter); }
  });
  await check('performance-control-responsive', async () => {
    const snapshots = [];
    for (const width of [390, 768, 1440]) {
      await target.setViewportSize({ width, height: 900 });
      await target.locator('[data-test="optionsButton"]').click();
      await target.locator('[data-test="settings"]').click();
      await target.locator('#dataSaving').click();
      const select = target.locator('[data-test="safemeetPerformanceMode"]');
      await expect(select).toBeVisible();
      await select.focus();
      await select.selectOption('standard');
      await target.locator('[data-test="modalConfirmButton"]').click();
      await expect(target.locator('html')).toHaveAttribute('data-skyroom-performance-tier', 'standard');
      await target.locator('[data-test="optionsButton"]').click();
      await target.locator('[data-test="settings"]').click();
      await target.locator('#dataSaving').click();
      await select.selectOption('auto');
      await target.screenshot({ path: path.join(output, `settings-${width}.png`) });
      await target.locator('[data-test="modalConfirmButton"]').click();
      if (width === 390) await expect(target.locator('html')).toHaveAttribute('data-skyroom-performance-tier', 'low');
      await sleep(500);
      snapshots.push(await target.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        direction: document.documentElement.dir })));
    }
    return snapshots;
  });
  await check('performance-control-cancel', async () => {
    await target.setViewportSize({ width: 390, height: 900 });
    await expect(target.locator('html')).toHaveAttribute('data-skyroom-performance-tier', 'low');
    await target.locator('[data-test="optionsButton"]').click();
    await target.locator('[data-test="settings"]').click();
    await target.locator('#dataSaving').click();
    const select = target.locator('[data-test="safemeetPerformanceMode"]');
    await select.focus();
    await select.press('End');
    await expect(select).toHaveValue('standard');
    await target.locator('[data-test="modalDismissButton"]').click();
    await expect(target.locator('html')).toHaveAttribute('data-skyroom-performance-tier', 'low');
    await target.setViewportSize({ width: 1440, height: 900 });
    return { keyboardSelection: true, unsavedChangeDiscarded: true };
  });
  await check('reconnect-video', async () => {
    await target.context().setOffline(true);
    await sleep(3000);
    await target.context().setOffline(false);
    await sleep(10000);
    const first = await target.evaluate(() => window.__safemeetPerfSample());
    await sleep(5000);
    const second = await target.evaluate(() => window.__safemeetPerfSample());
    const frames = (sample) => sample.media.filter((item) => item.kind === 'video' && item.type === 'inbound-rtp')
      .reduce((sum, item) => sum + (item.framesDecoded || 0), 0);
    if (frames(second) <= frames(first)) throw new Error('No advancing remote webcam after reconnect');
    return { before: frames(first), after: frames(second) };
  });
  await check('webcam-fullscreen-recovery', async () => {
    const button = target.locator('[data-test="webcamsFullscreenButton"]:visible').first();
    await button.click();
    await expect(target.locator('html')).toHaveClass(/skyroom-webcam-fs/);
    await sleep(5000);
    await target.screenshot({ path: path.join(output, 'webcam-fullscreen.png') });
    await target.locator('[data-test="skyroomWebcamFullscreenClose"]').click();
    await expect(target.locator('html')).not.toHaveClass(/skyroom-webcam-fs/);
    return { entered: true, exited: true };
  });
  await check('panel-lifecycle', async () => {
    const before = await target.evaluate(() => window.__safemeetPerfSample());
    for (let cycle = 0; cycle < 5; cycle += 1) {
      for (const selector of ['toggleUserList', 'togglePublicChatNav']) {
        await target.locator(`[data-test="${selector}"]`).click();
        await sleep(250);
        await target.locator(`[data-test="${selector}"]`).click();
      }
    }
    const after = await target.evaluate(() => window.__safemeetPerfSample());
    if (after.peers !== before.peers) throw new Error('Peer count changed after panel cycles');
    return { peersBefore: before.peers, peersAfter: after.peers, domBefore: before.domNodes, domAfter: after.domNodes };
  });
  if (results.some((result) => result.passed === false)) throw new Error('One or more interaction checks failed; see actions.json');
};

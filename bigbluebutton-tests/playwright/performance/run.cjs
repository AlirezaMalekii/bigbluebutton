// Reproducible real-WebRTC experiment using the repository's Playwright install.
// Defaults implement the full protocol. Short runs must be labelled exploratory.
const { chromium } = require('playwright');
const { createHash, randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { parseStringPromise } = require('xml2js');
const probe = require('./probe.cjs');
const nativeMetrics = require('./windows-metrics.cjs');

if (!process.env.BBB_SERVER) throw new Error('BBB_SERVER is required');
const apiOrigin = process.env.BBB_SERVER;
const client = process.env.PERF_CLIENT || 'http://localhost:3000/html5client/';
const loadClient = process.env.PERF_LOAD_CLIENT || client;
const meeting = process.env.PERF_MEETING_ID;
if (!meeting) throw new Error('PERF_MEETING_ID is required');
function readRemoteSecret() {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      const value = execFileSync('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8',
        'live51', 'sudo bbb-conf --secret'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
        .match(/Secret:\s*(\S+)/)?.[1];
      if (value) return value;
    } catch { /* A temporary SSH failure must not print command output or credentials. */ }
    if (attempt < 10) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000);
  }
  return null;
}
const secret = process.env.BBB_SECRET || readRemoteSecret();
if (!secret) throw new Error('BBB_SECRET unavailable');
const output = path.resolve(process.env.PERF_OUTPUT || 'test-results/performance');
fs.mkdirSync(output, { recursive: true });
const count = Number(process.env.PERF_USERS || 12);
const joinConcurrency = Number(process.env.PERF_JOIN_CONCURRENCY || 3);
const mediaConcurrency = Number(process.env.PERF_MEDIA_CONCURRENCY || 5);
const audioUsers = Number(process.env.PERF_AUDIO_USERS || count);
const targetUserIndex = Math.min(Number(process.env.PERF_TARGET || 2), count - 1);
const warmup = Number(process.env.PERF_WARMUP_SECONDS || 120);
const seconds = Number(process.env.PERF_SAMPLE_SECONDS || 300);
const repetitions = Number(process.env.PERF_REPETITIONS || 3);
const cameraCounts = (process.env.PERF_CAMERAS || '0,1,4,8,12').split(',').map(Number);
const screenCameraCounts = (process.env.PERF_SCREEN_CAMERAS || '').split(',').filter(Boolean).map(Number);
const soakSeconds = Number(process.env.PERF_SOAK_SECONDS || 0);
const abortHostCpu = Number(process.env.PERF_ABORT_HOST_CPU || 97);
const abortFreeMemoryMB = Number(process.env.PERF_ABORT_FREE_MEMORY_MB || 1024);
const apiAttempts = Number(process.env.PERF_API_ATTEMPTS || 3);
const clientPresenceFallback = process.env.PERF_CLIENT_PRESENCE_FALLBACK === '1';
const onlyScreenScenarios = process.env.PERF_ONLY_SCREEN === '1';
if (![count, joinConcurrency, mediaConcurrency, audioUsers, warmup, seconds, repetitions,
  ...cameraCounts, ...screenCameraCounts, soakSeconds, abortHostCpu, abortFreeMemoryMB, apiAttempts]
  .every((value) => Number.isFinite(value) && value >= 0)
  || count < 2 || !Number.isInteger(joinConcurrency) || joinConcurrency < 1
  || !Number.isInteger(mediaConcurrency) || mediaConcurrency < 1
  || !Number.isInteger(audioUsers) || audioUsers < 0 || audioUsers > count
  || !Number.isInteger(apiAttempts) || apiAttempts < 1 || apiAttempts > 20
  || repetitions < 1 || seconds < 5
  || [...cameraCounts, ...screenCameraCounts].some((value) => value > count)) {
  throw new Error('Invalid participant count, duration or camera count');
}
const browsers = [];
const pages = [];
const failures = [];
async function cleanup() {
  fs.writeFileSync(path.join(output, 'failures.json'), JSON.stringify(failures, null, 2));
  await Promise.allSettled(browsers.filter(Boolean).map((browser) => browser.close()));
}
process.once('SIGINT', async () => { await cleanup(); process.exit(130); });
process.once('SIGTERM', async () => { await cleanup(); process.exit(143); });
process.on('message', async (message) => {
  if (message?.type === 'stop-experiment') {
    failures.push({ error: 'Experiment stopped by local supervisor' });
    await cleanup(); process.exit(1);
  }
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const emit = (value) => fs.appendFileSync(path.join(output, 'samples.jsonl'), `${JSON.stringify(value)}\n`);
const safeError = (error) => String(error.message || error).split('\n')[0]
  .replace(/https?:\/\/\S+/g, '[url]').replace(/(?:sessionToken|checksum|token)=[^\s&]+/gi, '[redacted]');

async function api(name, parameters) {
  const query = new URLSearchParams(parameters).toString();
  const checksum = createHash('sha1').update(name + query + secret).digest('hex');
  let response;
  for (let attempt = 0; attempt < apiAttempts; attempt += 1) {
    try {
      response = await fetch(`${apiOrigin}/bigbluebutton/api/${name}?${query}&checksum=${checksum}`,
        { signal: AbortSignal.timeout(20000) });
      break;
    } catch {
      if (attempt === apiAttempts - 1) throw new Error(`API ${name}: connection failed after ${apiAttempts} attempts`);
      await sleep(Math.min(5000, 1000 * (attempt + 1)));
    }
  }
  if (!response.ok) throw new Error(`API ${name}: HTTP ${response.status}`);
  const data = (await parseStringPromise(await response.text(), { explicitArray: false })).response;
  if (data.returncode !== 'SUCCESS') throw new Error(`API ${name}: ${data.messageKey}`);
  return data;
}

async function ensureMeeting() {
  try { return await api('getMeetingInfo', { meetingID: meeting }); }
  catch (error) {
    if (!error.message.includes('notFound')) throw error;
    await api('create', { meetingID: meeting, name: 'SafeMeet performance test', record: 'false' });
    return api('getMeetingInfo', { meetingID: meeting });
  }
}

const testAttendees = (info) => {
  const attendees = info?.attendees?.attendee;
  return (Array.isArray(attendees) ? attendees : attendees ? [attendees] : [])
    .filter((attendee) => String(attendee.fullName || '').startsWith('Perf-'));
};

async function waitForPreviousTestClients() {
  const deadline = Date.now() + 180000;
  let info = await ensureMeeting();
  let previous = testAttendees(info);
  while (previous.length && Date.now() < deadline) {
    console.log(`Waiting for ${previous.length} previous test client(s) to leave`);
    await sleep(5000);
    info = await ensureMeeting();
    previous = testAttendees(info);
  }
  if (previous.length) throw new Error(`${previous.length} previous test client(s) still present after cleanup wait`);
  return info;
}

async function clickIfVisible(page, selector, timeout = 10000) {
  const item = page.locator(selector).first();
  if (await item.isVisible() && await item.isEnabled()) {
    try { await item.click({ timeout }); }
    catch { throw new Error(`Control could not be clicked: ${selector}`); }
    return true;
  }
  return false;
}

async function settleAudio(page, unmute = false) {
  // The custom client may open audio settings after silent join or on the first
  // unmute. Complete the existing echo-settings flow instead of closing it.
  const lastClick = new Map();
  const clickAudioControl = async (selector, cooldownMs = 8000) => {
    const now = Date.now();
    if (now - (lastClick.get(selector) || 0) < cooldownMs) return false;
    try {
      const item = page.locator(selector).first();
      if (!await item.isVisible() || !await item.isEnabled()) return false;
      // Mark before dispatch: a timed-out click may still have reached React.
      lastClick.set(selector, now);
      await item.click({ timeout: 1500 });
      return true;
    } catch { return false; }
  };
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (await clickAudioControl('[data-test="sessionDetailsModal"] [data-test="closeModal"]', 1000)) continue;
    if (await clickAudioControl('[data-test="joinEchoTestButton"]')) { await sleep(1000); continue; }
    if (await clickAudioControl('[data-test="microphoneBtn"]')) { await sleep(500); continue; }
    if (await clickAudioControl('[data-test="listenOnlyBtn"]')) { await sleep(1000); continue; }
    if (unmute && await clickAudioControl('[data-test="unmuteMicButton"]')) { await sleep(1000); continue; }
    const ready = page.locator(unmute ? '[data-test="muteMicButton"]'
      : '[data-test="unmuteMicButton"], [data-test="muteMicButton"], [data-test="leaveListenOnly"]');
    for (let index = 0; index < await ready.count(); index += 1) {
      if (await ready.nth(index).isVisible()) return;
    }
    await clickAudioControl('[data-test="joinAudio"]');
    await sleep(500);
  }
  throw new Error('Audio did not finish joining');
}

async function join(index) {
  const pageClient = index === targetUserIndex ? client : loadClient;
  const role = index < 2 ? 'MODERATOR' : 'VIEWER';
  const joinParameters = { meetingID: meeting, fullName: `Perf-${index + 1}-${role}`,
    userID: `perf-${randomUUID()}`,
    role, redirect: 'false', 'userdata-bbb_skip_check_audio': 'true',
    'userdata-bbb_show_session_details_on_join': 'false' };
  let joined = await api('join', joinParameters);
  let settingsStatus;
  const browser = await chromium.launch({ headless: index !== targetUserIndex,
    channel: 'chrome',
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
      `--use-file-for-fake-video-capture=${path.resolve(process.env.PERF_VIDEO || path.join(__dirname, '../core/media/video.y4m'))}`,
      ...(process.env.PERF_AUDIO ? [`--use-file-for-fake-audio-capture=${path.resolve(process.env.PERF_AUDIO)}`] : []),
      '--auto-select-tab-capture-source-by-title=SafeMeet Performance Source',
      '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
  });
  browsers[index] = browser;
  const context = await browser.newContext({ viewport: { width: Number(process.env.PERF_WIDTH || 1440), height: 900 },
    permissions: ['camera', 'microphone'], locale: 'fa-IR' });
  await context.addInitScript(probe);
  const page = await context.newPage();
  pages[index] = page;
  page.on('pageerror', (error) => failures.push({ user: index, error: safeError(error),
    sources: String(error.stack).match(/bundle\.[a-f0-9]+\.js:\d+:\d+/g)?.slice(0, 8) || [] }));
  page.on('websocket', (socket) => {
    const kind = new URL(socket.url()).pathname === '/graphql' ? 'graphql' : 'media-or-other';
    emit({ phase: 'socket-created', user: index, kind });
    socket.on('close', () => emit({ phase: 'socket-closed', user: index, kind }));
    socket.on('socketerror', (error) => emit({ phase: 'socket-error', user: index, kind, error: safeError(error) }));
    if (kind === 'graphql') socket.on('framereceived', ({ payload }) => {
      try {
        const { type } = JSON.parse(String(payload));
        if (['connection_ack', 'connection_error'].includes(type)) emit({ phase: type, user: index });
      } catch { /* No payloads, credentials or GraphQL state are recorded. */ }
    });
  });
  page.on('requestfailed', (request) => {
    const endpoint = new URL(request.url()).pathname;
    if (!['/bigbluebutton/api', '/api/rest/meetingStaticData'].includes(endpoint)) return;
    emit({ phase: 'request-failure', user: index, resource: request.resourceType(),
      endpoint: ['/bigbluebutton/api', '/api/rest/meetingStaticData'].includes(endpoint) ? endpoint : 'other',
      reason: safeError(request.failure()?.errorText || 'unknown') });
  });
  page.on('response', (response) => {
    const endpoint = new URL(response.url()).pathname;
    if (endpoint === '/api/rest/meetingStaticData') settingsStatus = response.status();
    if (['/bigbluebutton/api', '/api/rest/meetingStaticData'].includes(endpoint)) {
      emit({ phase: 'settings-response', user: index, endpoint, status: response.status() });
    }
  });
  await page.goto(`${pageClient}?sessionToken=${encodeURIComponent(joined.session_token)}${process.env.PERF_REACT === '1' ? '&perfReact=1' : ''}`, { timeout: 60000 });
  try {
    try { await page.locator('#layout').waitFor({ timeout: 75000 }); }
    catch {
      emit({ phase: 'join-retry', user: index, reason: 'layout-timeout', settingsStatus, attempts: 1 });
      if (settingsStatus === 401) {
        // Empty meetings can expire between API availability and client entry.
        // Only recreate after a fresh notFound; never end an existing meeting.
        await ensureMeeting();
        joined = await api('join', { ...joinParameters, userID: `perf-${randomUUID()}` });
        await page.goto(`${pageClient}?sessionToken=${encodeURIComponent(joined.session_token)}`, { timeout: 60000 });
      } else await page.reload({ timeout: 60000 });
      await page.locator('#layout').waitFor({ timeout: 75000 });
    }
  }
  catch {
    await page.screenshot({ path: path.join(output, `join-failure-user${index}.png`), timeout: 5000 }).catch(() => {});
    // Capture only our error screen, never meeting messages or participant data.
    emit({ phase: 'join-failure', user: index, reason: 'meeting-settings-or-layout-timeout' });
    throw new Error(`User ${index + 1}: meeting UI did not load`);
  }
  await clickIfVisible(page, '[data-test="modalDismissButton"]');
  if (index < audioUsers) try { await settleAudio(page); }
  catch (error) { throw new Error(`Audio user ${index + 1}: ${safeError(error)}`); }
  if (index === 0 && audioUsers > 0 && process.env.PERF_AUDIO) {
    try { await settleAudio(page, true); }
    catch (error) { throw new Error(`Microphone user 1: ${safeError(error)}`); }
  }
  console.log(`Joined user ${index + 1}/${count} (${role})`);
  return page;
}

async function joinWithRetry(index) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try { return await join(index); }
    catch (error) {
      lastError = error;
      emit({ phase: 'join-retry', user: index, attempt, error: safeError(error) });
      await browsers[index]?.close().catch(() => {});
      browsers[index] = undefined;
      pages[index] = undefined;
      if (attempt < 3) await sleep(5000);
    }
  }
  throw lastError;
}

async function camera(page, enabled) {
  if (!enabled) { await clickIfVisible(page, '[data-test="leaveVideo"]'); return; }
  if (await page.locator('[data-test="leaveVideo"]').isVisible()) return;
  await page.locator('[data-test="joinVideo"]').click({ timeout: 20000 });
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await clickIfVisible(page, '[data-test="startSharingWebcam"]');
    if (await page.locator('[data-test="leaveVideo"]').isVisible()) return;
    await sleep(1000);
  }
  throw new Error('Webcam did not publish');
}

async function main() {
  const info = await waitForPreviousTestClients();
  console.log(`Meeting available; ${Number(info.participantCount || 0)} participants already present`);
  const metadata = { startedAt: new Date().toISOString(), revision: execFileSync('git', ['rev-parse', 'HEAD'],
    { encoding: 'utf8' }).trim(), cpus: os.cpus().length, cpuModel: os.cpus()[0].model,
    memoryBytes: os.totalmem(), count, joinConcurrency, mediaConcurrency, audioUsers, apiAttempts,
    warmup, seconds, repetitions,
    cameraCounts, screenCameraCounts, soakSeconds,
    safety: { abortHostCpu, abortFreeMemoryMB, consecutiveSamples: 3 },
    width: Number(process.env.PERF_WIDTH || 1440), cpuThrottle: Number(process.env.PERF_CPU_RATE || 1),
    target: targetUserIndex, separateLoadClient: client !== loadClient, browserVersion: null, realPhoneTested: false };
  metadata.nativeMetrics = process.env.PERF_NATIVE_METRICS === '1';
  metadata.localServerPid = Number(process.env.PERF_SERVER_PID) || null;
  for (let start = 0; start < count; start += joinConcurrency) {
    const end = Math.min(count, start + joinConcurrency);
    await Promise.all(Array.from({ length: end - start }, (_, offset) => joinWithRetry(start + offset)));
    const freeMemoryMB = os.freemem() / 1024 / 1024;
    emit({ phase: 'join-capacity', joined: end, requested: count, freeMemoryMB });
    if (freeMemoryMB < abortFreeMemoryMB) {
      throw new Error('Host free memory fell below the safety threshold while joining participants');
    }
  }
  const targetIndex = Math.min(metadata.target, count - 1);
  const target = pages[targetIndex];
  await target.bringToFront();
  const cdp = await target.context().newCDPSession(target);
  const processSessions = await Promise.all(browsers.map((browser) => browser.newBrowserCDPSession()));
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: metadata.cpuThrottle });
  metadata.browserVersion = browsers[targetIndex].version();
  metadata.bundles = await Promise.all(pages.map((page) => page.evaluate(() => Array.from(document.scripts)
    .map((script) => script.src.split('/').pop().split('?')[0]).filter((name) => name.startsWith('bundle.')))));
  metadata.videoFixture = process.env.PERF_VIDEO ? 'custom-motion-fixture' : 'repository-160x120-fixture';
  metadata.settings = await target.evaluate(() => ({
    performance: window.meetingClientSettings?.public?.safemeetPerformance,
    livekitEnabled: window.meetingClientSettings?.public?.media?.livekit?.enabled,
    selectiveSubscription: window.meetingClientSettings?.public?.media?.livekit?.selectiveSubscription,
    roomOptions: window.meetingClientSettings?.public?.media?.livekit?.roomOptions,
    videoBridge: window.meetingClientSettings?.public?.media?.video,
  }));
  fs.writeFileSync(path.join(output, 'metadata.json'), JSON.stringify(metadata, null, 2));
  if (process.env.PERF_PROFILE === '1') {
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.start');
    await sleep(10000);
    const { profile } = await cdp.send('Profiler.stop');
    profile.nodes.forEach((node) => {
      node.callFrame.url = node.callFrame.url.replace(/\?.*$/, '').replace(/https?:\/\/[^/]+/g, '');
    });
    fs.writeFileSync(path.join(output, 'cpu.cpuprofile'), JSON.stringify(profile));
    await cdp.send('Profiler.disable');
  }
  if (process.env.PERF_TIMELINE === '1') {
    const events = [];
    const allowed = new Set(['RunTask', 'EvaluateScript', 'FunctionCall', 'Layout', 'Paint', 'UpdateLayerTree']);
    const collect = ({ value }) => value.forEach((event) => {
      if (event.ph === 'X' && allowed.has(event.name)) {
        const { name, ts, dur, pid, tid } = event;
        events.push({ name, ts, dur, pid, tid });
      }
    });
    cdp.on('Tracing.dataCollected', collect);
    await cdp.send('Tracing.start', { categories: 'devtools.timeline', transferMode: 'ReportEvents' });
    await sleep(10000);
    const completed = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve));
    await cdp.send('Tracing.end');
    await completed;
    cdp.off('Tracing.dataCollected', collect);
    fs.writeFileSync(path.join(output, 'timeline.json'), JSON.stringify(events));
  }
  const schedule = [];
  for (let repetition = 1; repetition <= repetitions; repetition += 1) {
    if (!onlyScreenScenarios) {
      cameraCounts.forEach((cameras) => schedule.push({ repetition, cameras, screenShare: false, duration: seconds }));
    }
    screenCameraCounts.forEach((cameras) => schedule.push({ repetition, cameras, screenShare: true, duration: seconds }));
  }
  if (soakSeconds > 0) schedule.push({ repetition: repetitions + 1, cameras: count, screenShare: true, duration: soakSeconds });
  let previousHost;
  let unsafeHostSamples = 0;
  for (const { repetition, cameras, screenShare, duration } of schedule) {
      for (let start = 0; start < count; start += mediaConcurrency) {
        const end = Math.min(count, start + mediaConcurrency);
        await Promise.all(Array.from({ length: end - start }, async (_, offset) => {
          const index = start + offset;
          try { await camera(pages[index], index < cameras); }
          catch (error) {
            const buttons = await pages[index].locator('button:visible')
              .evaluateAll((items) => items.map((item) => item.getAttribute('data-test')));
            emit({ phase: 'camera-failure', user: index, cameras, buttons });
            await pages[index].screenshot({ path: path.join(output, `camera-failure-user${index}.png`) });
            throw new Error(`Camera user ${index + 1}: ${safeError(error)}`);
          }
        }));
      }
      let presenter, screenReceiver;
      const screenFixture = require('./screen-fixture.cjs');
      if (screenShare) {
        for (const page of pages.slice(0, 2)) {
          if (await page.locator('[data-test="startScreenShare"]').isVisible()) presenter = page;
        }
        if (!presenter) throw new Error('No test moderator is presenter');
        screenReceiver = target === presenter ? pages.find((page) => page !== presenter) : target;
        await screenFixture.start(presenter);
        await presenter.locator('[data-test="startScreenShare"]').click();
        await screenReceiver.locator('#screenshareVideo').waitFor({ timeout: 30000 });
      }
      await target.bringToFront();
      console.log(`Run ${repetition}: ${cameras} webcams${screenShare ? ' + screen' : ''}, warming up ${warmup}s`);
      await sleep(warmup * 1000);
      let meetingInfo, list, testPublishers;
      let testParticipants;
      for (let attempt = 0; attempt < 13; attempt += 1) {
        try {
          meetingInfo = await api('getMeetingInfo', { meetingID: meeting });
          const attendees = meetingInfo.attendees?.attendee;
          list = attendees ? (Array.isArray(attendees) ? attendees : [attendees]) : [];
          const testList = list.filter((item) => /^Perf-\d+-(MODERATOR|VIEWER)$/.test(item.fullName || ''));
          testParticipants = testList.length;
          testPublishers = testList.filter((item) => item.hasVideo === 'true').length;
        } catch (error) {
          if (!clientPresenceFallback) throw error;
          const clientMedia = await Promise.all(pages.map((page) => page.evaluate(
            () => window.__safemeetPerfSample(),
          )));
          testParticipants = pages.length;
          testPublishers = clientMedia.filter((sample) => sample.activeSenderTracks > 0).length;
          meetingInfo = { participantCount: null };
          list = [];
          emit({
            phase: 'presence-client-fallback',
            repetition,
            cameras,
            screenShare,
            reason: safeError(error),
            publishers: testPublishers,
          });
        }
        if (testPublishers === cameras && testParticipants === count) break;
        if (attempt < 12) await sleep(5000);
      }
      emit({ phase: 'presence', repetition, cameras, screenShare,
        participants: meetingInfo.participantCount === null ? null : Number(meetingInfo.participantCount),
        testParticipants,
        moderators: list.filter((item) => item.role === 'MODERATOR').length,
        publishers: testPublishers });
      if (testParticipants !== count) throw new Error('Participant count did not recover to requested load');
      if (testPublishers !== cameras) throw new Error('Actual test publishers do not match requested cameras');
      const end = Date.now() + duration * 1000;
      do {
        const started = Date.now();
        const [sample, metrics] = await Promise.all([target.evaluate(() => window.__safemeetPerfSample()),
          cdp.send('Performance.getMetrics')]);
        const processes = await Promise.all(processSessions.map(async (session, index) => {
          const info = await session.send('SystemInfo.getProcessInfo').catch(() => ({ processInfo: [] }));
          return { user: index, target: index === targetIndex, processes: info.processInfo };
        }));
        const native = metadata.nativeMetrics ? await nativeMetrics([
          ...processes.flatMap((browser) => browser.processes.map((item) => item.id)),
          ...(metadata.localServerPid ? [metadata.localServerPid] : []),
        ]) : { available: false, reason: 'disabled' };
        const host = { freeMemory: os.freemem(), cpuTimes: os.cpus().map(({ times }) => times) };
        let hostCpuPercent = null;
        if (previousHost) {
          const busy = host.cpuTimes.reduce((sum, current, index) => {
            const prior = previousHost.cpuTimes[index];
            const total = Object.values(current).reduce((value, item) => value + item, 0)
              - Object.values(prior).reduce((value, item) => value + item, 0);
            return sum + Math.max(0, total - (current.idle - prior.idle));
          }, 0);
          const total = host.cpuTimes.reduce((sum, current, index) => sum
            + Object.values(current).reduce((value, item) => value + item, 0)
            - Object.values(previousHost.cpuTimes[index]).reduce((value, item) => value + item, 0), 0);
          hostCpuPercent = total > 0 ? (busy / total) * 100 : null;
        }
        previousHost = host;
        const freeMemoryMB = host.freeMemory / 1024 / 1024;
        const unsafe = freeMemoryMB < abortFreeMemoryMB
          || (hostCpuPercent !== null && hostCpuPercent >= abortHostCpu);
        unsafeHostSamples = unsafe ? unsafeHostSamples + 1 : 0;
        emit({ repetition, cameras, screenShare, wallTime: new Date().toISOString(), sample,
          metrics: Object.fromEntries(metrics.metrics.map(({ name, value }) => [name, value])),
          processes, native, host, hostCpuPercent, freeMemoryMB, unsafeHostSamples });
        if (unsafeHostSamples >= 3) {
          emit({ phase: 'host-safety-abort', repetition, cameras, screenShare,
            hostCpuPercent, freeMemoryMB, thresholds: metadata.safety });
          throw new Error('Host safety threshold exceeded for three consecutive samples');
        }
        await sleep(Math.max(0, 5000 - (Date.now() - started)));
      } while (Date.now() < end);
      await target.screenshot({ path: path.join(output, `r${repetition}-cams${cameras}${screenShare ? '-screen' : ''}.png`) });
      if (screenShare) {
        await presenter.locator('[data-test="stopScreenShare"]').click();
        await screenReceiver.locator('#screenshareVideo').waitFor({ state: 'hidden', timeout: 20000 });
        await screenFixture.stop(presenter);
      }
      console.log(`Run ${repetition}: ${cameras} webcams complete`);
  }
  if (process.env.PERF_ACTIONS === '1') {
    const actions = require('./actions.cjs');
    await actions({ pages, targetIndex, output, emit, sleep });
  }
}

main().catch(async (error) => {
  failures.push({ error: safeError(error) }); console.error(safeError(error)); process.exitCode = 1;
  for (const index of [...new Set([0, 1, pages.length - 1])].filter((index) => pages[index])) {
    const page = pages[index];
    await page.screenshot({ path: path.join(output, `failure-overview-${index}.png`), timeout: 5000 }).catch(() => {});
    const controls = await page.locator('button:visible').evaluateAll((items) => items.map((item) => ({
      test: item.getAttribute('data-test'), disabled: item.disabled,
    }))).catch(() => []);
    emit({ phase: 'failure-controls', user: index, controls });
    const sample = await page.evaluate(() => window.__safemeetPerfSample?.()).catch(() => null);
    if (sample) emit({ phase: 'failure-media', user: index, sample });
  }
})
  .finally(async () => {
    // Leave only the test clients; never end the user's meeting.
    await cleanup();
    console.log('Test browsers closed');
    if (process.connected) process.disconnect();
  });

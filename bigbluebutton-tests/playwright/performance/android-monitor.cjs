// Samples a real Android Chrome session over ADB/CDP without recording join URLs or credentials.
const { chromium } = require('playwright');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const adb = process.env.ADB || path.join(process.env.LOCALAPPDATA || '', 'Android/platform-tools/adb.exe');
const endpoint = process.env.ANDROID_CDP || 'http://127.0.0.1:9222';
const output = path.resolve(process.env.ANDROID_OUTPUT || 'test-results/performance/android-device/samples.jsonl');
const durationSeconds = Number(process.env.ANDROID_SECONDS || 90);
const intervalSeconds = Number(process.env.ANDROID_INTERVAL_SECONDS || 5);
const openWebcams = process.env.ANDROID_OPEN_WEBCAMS === '1';
if (![durationSeconds, intervalSeconds].every(Number.isFinite) || durationSeconds < 5 || intervalSeconds < 1)
  throw new Error('Invalid sampling duration');

const shell = (...args) => {
  try {
    return execFileSync(adb, ['shell', ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 15000,
    });
  } catch {
    return '';
  }
};
const number = (text, pattern) => Number(text.match(pattern)?.[1] || 0);
const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function deviceSample() {
  // Pass the pipeline as one Android-shell argument. Splitting it after `-c` makes
  // some adb versions treat only `ps` as the command and silently loses the rows.
  const processes = shell('ps -A -o PID,NAME,%CPU | grep chrome');
  const cpu = processes.split(/\r?\n/).reduce((total, line) => {
    const fields = line.trim().split(/\s+/);
    return total + (Number(fields.at(-1)) || 0);
  }, 0);
  const mem = shell('dumpsys', 'meminfo', 'com.android.chrome');
  const battery = shell('dumpsys', 'battery');
  const thermal = shell('dumpsys', 'thermalservice');
  const cachedThermal = thermal.split('Current temperatures from HAL:')[0];
  const currentThermal =
    thermal.split('Current temperatures from HAL:')[1]?.split('Current cooling devices from HAL:')[0] || '';
  const temperatures = [...cachedThermal.matchAll(/mValue=([\d.]+).*?mName=([^,\r\n}]+)/g)].map((match) => ({
    valueC: Number(match[1]),
    sensor: match[2].trim(),
  }));
  const currentTemperatures = [...currentThermal.matchAll(/mValue=([\d.]+).*?mName=([^,\r\n}]+)/g)].map((match) => ({
    valueC: Number(match[1]),
    sensor: match[2].trim(),
  }));
  const gfx = shell('dumpsys', 'gfxinfo', 'com.android.chrome');
  return {
    chromeCpuPercentAllCores: Number(cpu.toFixed(2)),
    chromeProcessCount: processes.split(/\r?\n/).filter(Boolean).length,
    totalPssMB: number(mem, /TOTAL PSS:\s+(\d+)/) / 1024,
    totalRssMB: number(mem, /TOTAL RSS:\s+(\d+)/) / 1024,
    batteryLevel: number(battery, /level:\s+(\d+)/),
    batteryTemperatureC: number(battery, /temperature:\s+(\d+)/) / 10,
    usbPowered: /USB powered:\s+true/.test(battery),
    thermalStatus: number(thermal, /Thermal Status:\s+(\d+)/),
    maxCachedThermalC: temperatures.length ? Math.max(...temperatures.map((item) => item.valueC)) : null,
    maxCurrentThermalC: currentTemperatures.length ? Math.max(...currentTemperatures.map((item) => item.valueC)) : null,
    temperatures,
    currentTemperatures,
    totalFrames: number(gfx, /Total frames rendered:\s+(\d+)/),
    jankyFrames: number(gfx, /Janky frames:\s+(\d+)/),
  };
}

(async () => {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const browser = await chromium.connectOverCDP(endpoint);
  const candidates = browser
    .contexts()
    .flatMap((context) => context.pages())
    .filter((candidate) => candidate.url().includes('/html5client/'));
  const markedCandidates = candidates.filter((candidate) => candidate.url().includes('safemeetAndroidTest=1'));
  const testCandidates = markedCandidates.length ? markedCandidates : candidates;
  const visibility = await Promise.all(
    testCandidates.map(async (candidate) => ({
      candidate,
      visible: await candidate.evaluate(() => document.visibilityState === 'visible').catch(() => false),
    })),
  );
  const page = visibility.find(({ visible }) => visible)?.candidate || testCandidates.at(-1);
  if (!page) throw new Error('Android meeting page is not available over CDP');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.evaluate(() => {
    window.__safeMeetAndroidLongTasks = { count: 0, duration: 0 };
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          window.__safeMeetAndroidLongTasks.count += 1;
          window.__safeMeetAndroidLongTasks.duration += entry.duration;
        });
      });
      observer.observe({ type: 'longtask', buffered: true });
      window.__safeMeetAndroidLongTaskObserver = observer;
    } catch {
      /* Long Task API is optional. */
    }
  });
  const started = Date.now();
  while ((Date.now() - started) / 1000 <= durationSeconds) {
    if (openWebcams) {
      const webcamTab = page.locator('.skyroom-mobile-zone-tab:has([class*="icon-bbb-video"])').first();
      if (
        (await webcamTab.isVisible().catch(() => false)) &&
        (await webcamTab.getAttribute('aria-pressed')) !== 'true'
      ) {
        await webcamTab.click().catch(() => {});
      }
    }
    const [web, metrics] = await Promise.all([
      page.evaluate(() => ({
        visibility: document.visibilityState,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          dpr: window.devicePixelRatio,
        },
        heapMB: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null,
        longTasks: window.__safeMeetAndroidLongTasks || null,
        performanceProfile: {
          tier: document.documentElement.getAttribute('data-skyroom-performance-tier'),
          protectionStage: document.documentElement.getAttribute('data-skyroom-protection-stage'),
          suspendedCameras: document.querySelectorAll('[data-test="safemeetSuspendedCamera"]').length,
          notice: document.querySelector('.Toastify__toast')?.textContent || null,
        },
        tiles: [...document.querySelectorAll('[data-test="webcamVideoItem"]')].map((tile) => {
          const rect = tile.getBoundingClientRect();
          return {
            stream: tile.getAttribute('data-skyroom-viewport-stream'),
            text: (tile.textContent || '').trim().slice(0, 80),
            visible:
              rect.width > 0 &&
              rect.height > 0 &&
              rect.bottom > 0 &&
              rect.right > 0 &&
              rect.top < window.innerHeight &&
              rect.left < window.innerWidth,
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          };
        }),
        videos: [...document.querySelectorAll('video')].map((video) => {
          const quality = video.getVideoPlaybackQuality?.();
          return {
            width: video.videoWidth,
            height: video.videoHeight,
            readyState: video.readyState,
            paused: video.paused,
            currentTime: video.currentTime,
            totalFrames: quality?.totalVideoFrames || 0,
            droppedFrames: quality?.droppedVideoFrames || 0,
          };
        }),
      })),
      cdp.send('Performance.getMetrics'),
    ]);
    const browserMetrics = Object.fromEntries(metrics.metrics.map((item) => [item.name, item.value]));
    const record = {
      at: new Date().toISOString(),
      elapsedSeconds: (Date.now() - started) / 1000,
      device: deviceSample(),
      web,
      browser: {
        taskDurationSeconds: browserMetrics.TaskDuration,
        scriptDurationSeconds: browserMetrics.ScriptDuration,
        layoutDurationSeconds: browserMetrics.LayoutDuration,
        jsHeapUsedMB: browserMetrics.JSHeapUsedSize / 1048576,
        domNodes: browserMetrics.Nodes,
      },
    };
    fs.appendFileSync(output, `${JSON.stringify(record)}\n`);
    await sleep(intervalSeconds * 1000);
  }
  await cdp.detach();
  console.log(`Android samples written: ${output}`);
  // A CDP connection keeps Node's transport alive after sampling. Exiting here
  // disconnects the monitor without closing Android Chrome or its meeting tab.
  process.exit(0);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

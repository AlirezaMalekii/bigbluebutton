// Usage: node performance/summarize.cjs OUTPUT_DIRECTORY RUN_DIRECTORY...
// Summaries use deltas, never cumulative CDP counters as instantaneous CPU.
const fs = require('node:fs');
const path = require('node:path');
const [destination, ...runs] = process.argv.slice(2);
if (!destination || !runs.length) throw new Error('Output directory and input runs are required');
fs.mkdirSync(destination, { recursive: true });
const average = (values) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const distribution = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mean = average(values);
  return { n: values.length, mean, min: sorted[0], max: sorted.at(-1),
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
    sd: Math.sqrt(average(values.map((value) => (value - mean) ** 2))) };
};
const intervalGapLimit = (rows) => {
  if (rows.length < 2) return 30;
  const intervals = [];
  for (let index = 1; index < rows.length; index += 1) {
    const value = (Date.parse(rows[index].wallTime) - Date.parse(rows[index - 1].wallTime)) / 1000;
    if (value > 0 && value < 60) intervals.push(value);
  }
  const typical = intervals.length
    ? [...intervals].sort((a, b) => a - b)[Math.floor(intervals.length / 2)] : 10;
  return Math.max(30, typical * 2.5);
};
function processDelta(previous, current, target) {
  if (!Array.isArray(previous.processes) || !Array.isArray(current.processes)) return null;
  let delta = 0;
  for (const browser of current.processes || []) {
    if (browser.target !== target) continue;
    const old = previous.processes.find((item) => item.user === browser.user);
    for (const process of browser.processes) {
      const before = old?.processes.find((item) => item.id === process.id);
      if (before && process.cpuTime >= before.cpuTime) delta += process.cpuTime - before.cpuTime;
    }
  }
  return delta;
}
function processDeltaForUser(previous, current, user) {
  if (!Array.isArray(previous.processes) || !Array.isArray(current.processes)) return null;
  const browser = current.processes.find((item) => item.user === user);
  const old = previous.processes.find((item) => item.user === user);
  if (!browser || !old) return null;
  let delta = 0;
  for (const process of browser.processes) {
    const before = old.processes.find((item) => item.id === process.id);
    if (before && process.cpuTime >= before.cpuTime) delta += process.cpuTime - before.cpuTime;
  }
  return delta;
}
const results = [];
for (const run of runs) {
  const name = path.basename(run);
  const read = (file, fallback) => fs.existsSync(path.join(run, file))
    ? JSON.parse(fs.readFileSync(path.join(run, file), 'utf8')) : fallback;
  const metadata = read('metadata.json', null);
  const failures = read('failures.json', null);
  const actions = read('actions.json', null);
  const raw = fs.existsSync(path.join(run, 'samples.jsonl'))
    ? fs.readFileSync(path.join(run, 'samples.jsonl'), 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse) : [];
  const remote = fs.existsSync(path.join(run, 'live51-samples.jsonl'))
    ? fs.readFileSync(path.join(run, 'live51-samples.jsonl'), 'utf8').trim().split(/\r?\n/)
      .filter(Boolean).map(JSON.parse) : [];
  const availableRemote = remote.filter((row) => row.available);
  const live51HostCPU = [], graphqlCPU = [], sfuCPU = [];
  const gapLimit = intervalGapLimit(availableRemote);
  for (let index = 1; index < availableRemote.length; index += 1) {
    const before = availableRemote[index - 1], after = availableRemote[index];
    const elapsed = (Date.parse(after.wallTime) - Date.parse(before.wallTime)) / 1000;
    if (!(elapsed > 0) || elapsed > gapLimit) continue;
    const keys = ['cpu_user', 'cpu_nice', 'cpu_system', 'cpu_idle', 'cpu_iowait', 'cpu_irq', 'cpu_softirq', 'cpu_steal'];
    const total = keys.reduce((sum, key) => sum + Math.max(0, after[key] - before[key]), 0);
    const idle = Math.max(0, after.cpu_idle - before.cpu_idle);
    if (total > 0) live51HostCPU.push(100 * (1 - idle / total));
    if (after.graphql_cpu_ns >= before.graphql_cpu_ns) {
      graphqlCPU.push((after.graphql_cpu_ns - before.graphql_cpu_ns) / 1e7 / elapsed);
    }
    if (after.sfu_cpu_ns >= before.sfu_cpu_ns) {
      sfuCPU.push((after.sfu_cpu_ns - before.sfu_cpu_ns) / 1e7 / elapsed);
    }
  }
  const server = {
    samples: remote.length,
    availableSamples: availableRemote.length,
    availabilityRatio: remote.length ? availableRemote.length / remote.length : null,
    hostCPUPercent: distribution(live51HostCPU),
    memoryAvailableMB: distribution(availableRemote.map((row) => row.mem_available_kb / 1024)),
    load1: distribution(availableRemote.map((row) => row.load1)),
    graphqlCPUPercentOfOneCore: distribution(graphqlCPU),
    graphqlMemoryMB: distribution(availableRemote.map((row) => row.graphql_memory / 1024 ** 2)),
    graphqlTasks: distribution(availableRemote.map((row) => row.graphql_tasks)),
    sfuCPUPercentOfOneCore: distribution(sfuCPU),
    sfuMemoryMB: distribution(availableRemote.map((row) => row.sfu_memory / 1024 ** 2)),
    sfuTasks: distribution(availableRemote.map((row) => row.sfu_tasks)),
  };
  const groups = new Map();
  for (const row of raw.filter((item) => item.metrics)) {
    const key = `${row.repetition}:${row.cameras}:${Boolean(row.screenShare)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const scenes = [];
  for (const rows of groups.values()) {
    const main = [], script = [], layout = [], targetCPU = [], loadCPU = [], hostBusy = [], longTasks = [];
    const serverCPU = [], gpuBusy = [], sessionCPUs = new Map();
    for (let i = 1; i < rows.length; i += 1) {
      const before = rows[i - 1], after = rows[i];
      const elapsed = after.metrics.Timestamp - before.metrics.Timestamp;
      if (!(elapsed > 0)) continue;
      main.push(100 * (after.metrics.TaskDuration - before.metrics.TaskDuration) / elapsed);
      script.push(100 * (after.metrics.ScriptDuration - before.metrics.ScriptDuration) / elapsed);
      layout.push(100 * (after.metrics.LayoutDuration - before.metrics.LayoutDuration) / elapsed);
      const targetDelta = processDelta(before, after, true), loadDelta = processDelta(before, after, false);
      const processElapsed = (Date.parse(after.wallTime) - Date.parse(before.wallTime)) / 1000;
      if (targetDelta !== null && processElapsed > 0) targetCPU.push(100 * targetDelta / processElapsed);
      if (loadDelta !== null && processElapsed > 0) loadCPU.push(100 * loadDelta / processElapsed);
      for (const browser of after.processes || []) {
        const delta = processDeltaForUser(before, after, browser.user);
        if (delta === null || !(processElapsed > 0)) continue;
        if (!sessionCPUs.has(browser.user)) sessionCPUs.set(browser.user, []);
        sessionCPUs.get(browser.user).push(100 * delta / processElapsed);
      }
      const serverBefore = before.native?.processes?.find((item) => item.id === metadata?.localServerPid);
      const serverAfter = after.native?.processes?.find((item) => item.id === metadata?.localServerPid);
      if (serverBefore && serverAfter && processElapsed > 0) {
        serverCPU.push(100 * (serverAfter.cpuSeconds - serverBefore.cpuSeconds) / processElapsed);
      }
      longTasks.push((after.sample.longTaskMs - before.sample.longTaskMs) / (elapsed * 10));
      let total = 0, idle = 0;
      after.host.cpuTimes.forEach((cpu, index) => {
        Object.keys(cpu).forEach((key) => { total += cpu[key] - before.host.cpuTimes[index][key]; });
        idle += cpu.idle - before.host.cpuTimes[index].idle;
      });
      hostBusy.push(100 * (1 - idle / total));
    }
    for (const row of rows) {
      if (!row.native?.gpuAvailable) continue;
      const engines = new Map();
      for (const engine of row.native.gpuEngines) {
        const key = engine.engine.replace(/^pid_\d+_/, '');
        engines.set(key, (engines.get(key) || 0) + engine.percent);
      }
      gpuBusy.push(Math.max(0, ...engines.values()));
    }
    const first = rows[0], last = rows.at(-1);
    const targetIds = new Set(last.processes?.filter((item) => item.target).flatMap((item) => item.processes.map((p) => p.id)));
    const targetNative = last.native?.processes?.filter((item) => targetIds.has(item.id));
    const sessions = (last.processes || []).map((browser) => {
      const ids = new Set(browser.processes.map((item) => item.id));
      const nativeProcesses = last.native?.processes?.filter((item) => ids.has(item.id));
      return {
        user: browser.user,
        role: browser.user < 2 ? 'MODERATOR' : 'VIEWER',
        target: browser.target,
        processCount: browser.processes.length,
        cpuPercentOfOneCore: distribution(sessionCPUs.get(browser.user) || []),
        privateMBLast: nativeProcesses?.length
          ? nativeProcesses.reduce((sum, item) => sum + item.privateBytes / 1024 ** 2, 0) : null,
        workingSetMBSumLast: nativeProcesses?.length
          ? nativeProcesses.reduce((sum, item) => sum + item.workingSetBytes / 1024 ** 2, 0) : null,
      };
    });
    scenes.push({ repetition: first.repetition, camerasRequested: first.cameras, screenShare: Boolean(first.screenShare), samples: rows.length,
      measuredSpanSeconds: (last.sample.at - first.sample.at) / 1000,
      mainThreadPercent: distribution(main), scriptPercent: distribution(script), layoutPercent: distribution(layout),
      targetProcessCPUPercentOfOneCore: distribution(targetCPU), otherBrowsersCPUPercentOfOneCore: distribution(loadCPU),
      localServerCPUPercentOfOneCore: distribution(serverCPU), busiestGPUEnginePercent: distribution(gpuBusy),
      targetPrivateMBLast: targetNative?.reduce((sum, item) => sum + item.privateBytes / 1024 ** 2, 0) ?? null,
      targetWorkingSetMBSumLast: targetNative?.reduce((sum, item) => sum + item.workingSetBytes / 1024 ** 2, 0) ?? null,
      hostCPUPercent: distribution(hostBusy), longTaskPercent: distribution(longTasks),
      hostSaturationObserved: hostBusy.some((value) => value >= 85) || gpuBusy.some((value) => value >= 85)
        || rows.some((row) => row.host.freeMemory < 2 * 1024 ** 3),
      gpuSaturationAssessed: rows.every((row) => row.native?.gpuAvailable),
      heapFirstMB: first.metrics.JSHeapUsedSize / 1024 ** 2, heapLastMB: last.metrics.JSHeapUsedSize / 1024 ** 2,
      listenersFirst: first.metrics.JSEventListeners, listenersLast: last.metrics.JSEventListeners,
      inboundVideoStreamsLast: last.sample.media.filter((item) => item.type === 'inbound-rtp' && item.kind === 'video').length,
      receivedVideoLast: last.sample.media.filter((item) => item.type === 'inbound-rtp' && item.kind === 'video')
        .map(({ framesDecoded, framesDropped, framesPerSecond, frameWidth, frameHeight, freezeCount }) =>
          ({ framesDecoded, framesDropped, framesPerSecond, frameWidth, frameHeight, freezeCount })),
      targetPageVisibleThroughout: rows.every((row) => row.sample.visibility === 'visible'),
      targetNativeForegroundThroughout: rows.every((row) => Number.isInteger(row.native?.foregroundPid))
        ? rows.every((row) => row.processes?.filter((item) => item.target)
          .some((item) => item.processes.some((p) => p.id === row.native.foregroundPid))) : null,
      sessions });
  }
  results.push({ name, metadata, failures, actions, presence: raw.filter((row) => row.phase === 'presence'), server, scenes });
}
fs.writeFileSync(path.join(destination, 'summary.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.map(({ name, scenes }) => ({ name, scenes: scenes.map((scene) => ({
  cameras: scene.camerasRequested, main: scene.mainThreadPercent?.mean,
  cpu: scene.targetProcessCPUPercentOfOneCore?.mean, host: scene.hostCPUPercent?.mean,
  saturated: scene.hostSaturationObserved,
})) })), null, 2));

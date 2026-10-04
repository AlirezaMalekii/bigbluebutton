const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'safemeet-analysis-'));
try {
  const input = path.join(directory, 'input'), output = path.join(directory, 'output');
  fs.mkdirSync(input);
  fs.writeFileSync(path.join(input, 'metadata.json'), JSON.stringify({ localServerPid: 42 }));
  const sample = (i) => ({ repetition: 1, cameras: 1, wallTime: new Date(i * 5000).toISOString(),
    metrics: { Timestamp: 100 + i * 5, TaskDuration: 30 + i * 0.5, ScriptDuration: 20 + i * 0.25,
      LayoutDuration: 2 + i * 0.05, JSHeapUsedSize: 1024 ** 2, JSEventListeners: 100 },
    sample: { at: i * 9999, longTaskMs: i * 100, media: [], visibility: 'visible' },
    processes: [{ user: 0, target: true, processes: [{ id: 1, cpuTime: 50 + i }] },
      { user: 1, target: false, processes: [{ id: 2, cpuTime: 10 + 2 * i }] }],
    native: { gpuAvailable: true, gpuEngines: [{ engine: 'pid_1_luid_gpu_phys_0_eng_0', percent: 90 }],
      processes: [{ id: 42, cpuSeconds: i * 0.1 }, { id: 1, privateBytes: 3 * 1024 ** 2, workingSetBytes: 4 * 1024 ** 2 }] },
    host: { freeMemory: 8 * 1024 ** 3, cpuTimes: [{ user: i * 100, sys: 0, irq: 0, nice: 0, idle: i * 900 }] } });
  fs.writeFileSync(path.join(input, 'samples.jsonl'), [sample(0), sample(1)].map(JSON.stringify).join('\n'));
  const run = () => {
    execFileSync(process.execPath, [path.join(__dirname, 'summarize.cjs'), output, input], { stdio: 'pipe' });
    return JSON.parse(fs.readFileSync(path.join(output, 'summary.json'), 'utf8'))[0].scenes[0];
  };
  const result = run();
  assert.equal(result.mainThreadPercent.mean, 10);
  assert.equal(result.scriptPercent.mean, 5);
  assert.equal(result.targetProcessCPUPercentOfOneCore.mean, 20);
  assert.equal(result.otherBrowsersCPUPercentOfOneCore.mean, 40);
  assert.equal(result.localServerCPUPercentOfOneCore.mean, 2);
  assert.equal(result.targetPrivateMBLast, 3);
  assert.equal(result.sessions.length, 2);
  assert.equal(result.sessions[0].role, 'MODERATOR');
  assert.equal(result.sessions[0].target, true);
  assert.equal(result.sessions[0].cpuPercentOfOneCore.mean, 20);
  assert.equal(result.sessions[0].privateMBLast, 3);
  assert.equal(result.sessions[1].cpuPercentOfOneCore.mean, 40);
  assert.equal(result.sessions[1].privateMBLast, null);
  assert.equal(result.hostSaturationObserved, true);
  assert.equal(result.gpuSaturationAssessed, true);
  const missing = [sample(0), sample(1)].map(({ processes, native, ...rest }) => rest);
  fs.writeFileSync(path.join(input, 'samples.jsonl'), missing.map(JSON.stringify).join('\n'));
  const unavailable = run();
  assert.equal(unavailable.targetProcessCPUPercentOfOneCore, null);
  assert.equal(unavailable.targetPrivateMBLast, null);
  assert.deepEqual(unavailable.sessions, []);
  assert.equal(unavailable.gpuSaturationAssessed, false);
  assert.equal(unavailable.hostSaturationObserved, false);
  console.log('PASS: counter deltas, monotonic timing, CPU grouping, memory, GPU saturation and missing data');
} finally {
  const resolved = path.resolve(directory);
  if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('safemeet-analysis-')) {
    throw new Error('Refusing cleanup outside the generated test directory');
  }
  fs.rmSync(resolved, { recursive: true });
}

// Foreground supervisor: a failed local proxy/tunnel invalidates the experiment.
// Only children created here are stopped. No daemon or scheduled task is created.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const port = Number(process.env.PERF_PORT || 3004);
const tunnelPort = Number(process.env.PERF_TUNNEL_PORT || 18443);
if (![port, tunnelPort].every((value) => Number.isInteger(value) && value > 1024 && value < 65536)) {
  throw new Error('Invalid local port');
}
const children = [];
let stopping = false, testChild;
const safe = (text) => String(text).replace(/https?:\/\/\S+/g, '[url]')
  .replace(/(?:sessionToken|checksum|secret|token|password)=[^\s&]+/gi, '[redacted]');
const output = path.resolve(process.env.PERF_OUTPUT || 'test-results/performance');
fs.mkdirSync(output, { recursive: true });
const stop = () => {
  stopping = true;
  for (const child of [...children].reverse()) if (child.exitCode === null) {
    if (child === testChild && child.connected) {
      child.send({ type: 'stop-experiment' });
      setTimeout(() => { if (child.exitCode === null) child.kill(); }, 15000).unref();
    } else child.kill();
  }
};
process.once('SIGINT', () => { stop(); process.exitCode = 130; });
process.once('SIGTERM', () => { stop(); process.exitCode = 143; });
function dependency(command, args, options) {
  const child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], ...options });
  children.push(child);
  child.stdout.on('data', (data) => process.stdout.write(safe(data)));
  child.stderr.on('data', (data) => process.stderr.write(safe(data)));
  child.on('error', () => {
    if (!stopping) {
      fs.writeFileSync(path.join(output, 'infrastructure-failure.json'), JSON.stringify({ reason: 'dependency-start-failed' }));
      stop(); process.exitCode = 1;
    }
  });
  child.on('exit', (code) => {
    if (!stopping) {
      fs.writeFileSync(path.join(output, 'infrastructure-failure.json'), JSON.stringify({ reason: 'dependency-exited', code }));
      console.error('Local test infrastructure exited; result invalidated');
      stop(); process.exitCode = 1;
    }
  });
  return child;
}
function observer(command, args, options) {
  const child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'], ...options });
  children.push(child);
  child.stderr.on('data', (data) => process.stderr.write(safe(data)));
  return child;
}
async function main() {
  const env = { ...process.env, PORT: String(port) };
  if (process.env.PERF_USE_TUNNEL === '1') {
    dependency('ssh', ['-N', '-o', 'BatchMode=yes', '-o', 'ExitOnForwardFailure=yes',
      '-o', 'ServerAliveInterval=30', '-L', `${tunnelPort}:127.0.0.1:443`, 'live51']);
    env.PERF_BACKEND_TUNNEL = `https://127.0.0.1:${tunnelPort}`;
  }
  const server = dependency(process.execPath, [path.resolve(__dirname, '../../../bigbluebutton-html5/scripts/serve-perf.cjs')], { env });
  const targetPort = process.env.PERF_TARGET_DIST ? port + 1 : port;
  const targetServer = process.env.PERF_TARGET_DIST ? dependency(process.execPath,
    [path.resolve(__dirname, '../../../bigbluebutton-html5/scripts/serve-perf.cjs')], {
      env: { ...env, PORT: String(targetPort), PERF_DIST: path.resolve(process.env.PERF_TARGET_DIST) },
    }) : server;
  if (process.env.PERF_REMOTE_METRICS === '1') {
    observer(process.execPath, [path.join(__dirname, 'remote-monitor.cjs')], { env: process.env });
  }
  let ready = false;
  for (let attempt = 0; attempt < 30 && !stopping; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${port}/bigbluebutton/api`, {
        headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(2000),
      });
      if (response.ok && (await response.json()).response.returncode === 'SUCCESS') { ready = true; break; }
    } catch { /* Dependency is still starting; no response data is logged. */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready || stopping) throw new Error('Local proxy did not become ready');
  testChild = spawn(process.execPath, [path.join(__dirname, 'run.cjs')], {
    windowsHide: true, stdio: ['inherit', 'inherit', 'inherit', 'ipc'], env: { ...process.env,
      PERF_CLIENT: `http://localhost:${targetPort}/html5client/`,
      PERF_LOAD_CLIENT: `http://localhost:${port}/html5client/`, PERF_SERVER_PID: String(targetServer.pid) },
  });
  children.push(testChild);
  await new Promise((resolve, reject) => {
    testChild.on('error', reject);
    testChild.on('exit', (code) => { if (!stopping) process.exitCode = code ?? 1; resolve(); });
  });
}
main().catch((error) => { console.error(safe(error.message)); process.exitCode = 1; }).finally(stop);

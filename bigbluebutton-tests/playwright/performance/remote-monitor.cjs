// Read-only live51 resource sampling over one persistent SSH connection.
// The output contains numeric service/host counters only; no environment or secret is read.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const output = path.resolve(process.env.PERF_OUTPUT || 'test-results/performance');
const interval = Number(process.env.PERF_REMOTE_INTERVAL_SECONDS || 10);
if (!Number.isInteger(interval) || interval < 5) throw new Error('Invalid remote sampling interval');
fs.mkdirSync(output, { recursive: true });
const destination = path.join(output, 'live51-samples.jsonl');
const remote = `while true; do awk '/^cpu / {printf "cpu_user=%s cpu_nice=%s cpu_system=%s cpu_idle=%s cpu_iowait=%s cpu_irq=%s cpu_softirq=%s cpu_steal=%s ", $2,$3,$4,$5,$6,$7,$8,$9}' /proc/stat; awk '/^MemTotal:/ {printf "mem_total_kb=%s ", $2} /^MemAvailable:/ {printf "mem_available_kb=%s ", $2}' /proc/meminfo; printf 'load1=%s ' "$(cut -d' ' -f1 /proc/loadavg)"; printf 'graphql_memory=%s graphql_cpu_ns=%s graphql_tasks=%s ' "$(systemctl show bbb-graphql-middleware -p MemoryCurrent --value)" "$(systemctl show bbb-graphql-middleware -p CPUUsageNSec --value)" "$(systemctl show bbb-graphql-middleware -p TasksCurrent --value)"; printf 'sfu_memory=%s sfu_cpu_ns=%s sfu_tasks=%s\\n' "$(systemctl show bbb-webrtc-sfu -p MemoryCurrent --value)" "$(systemctl show bbb-webrtc-sfu -p CPUUsageNSec --value)" "$(systemctl show bbb-webrtc-sfu -p TasksCurrent --value)"; sleep ${interval}; done`;
const append = (value) => fs.appendFileSync(destination, `${JSON.stringify(value)}\n`);
let child;
let stopping = false;
let reconnectTimer;
function connect() {
  if (stopping) return;
  child = spawn('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8',
    '-o', 'ServerAliveInterval=20', 'live51', remote], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let buffer = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      const values = {};
      for (const pair of line.trim().split(/\s+/)) {
        const [key, raw] = pair.split('=');
        const value = Number(raw);
        if (key && Number.isFinite(value)) values[key] = value;
      }
      append({ wallTime: new Date().toISOString(), available: Object.keys(values).length >= 10, ...values });
    }
  });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.on('error', () => append({ wallTime: new Date().toISOString(), available: false,
    reason: 'ssh-start-failed' }));
  child.on('exit', (code) => {
    if (stopping) return;
    append({ wallTime: new Date().toISOString(), available: false,
      reason: /timed out|closed|reset/i.test(stderr) ? 'ssh-connection-lost' : 'ssh-exited', code });
    reconnectTimer = setTimeout(connect, 5000);
  });
}
connect();
const stop = () => {
  stopping = true;
  clearTimeout(reconnectTimer);
  if (child?.exitCode === null) child.kill();
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

// Run the real TS modules with a deterministic browser/clock, without a bundle.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(relative, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const sandbox = { exports: {}, require: (id) => {
    if (id === '/imports/utils/deviceInfo') return { default: { isPhone: true } };
    if (id === './performance-profile-policy') {
      return load('imports/ui/components/skyroom-layout/performance-profile-policy.js');
    }
    throw new Error(`Unexpected module: ${id}`);
  }, ...globals };
  vm.runInNewContext(code, sandbox);
  return sandbox.exports;
}
const { updateVisibleUserPage, removeVisibleUserPage } = load(
  'imports/ui/components/user-list/user-list-content/user-participants/user-list-participants/visible-users.ts',
);
const user = { userId: 'a', name: 'Guest', role: 'VIEWER' };
const other = { userId: 'b' };
const pages = { 0: [user, other], 1: [other] };
for (let i = 0; i < 10000; i += 1) assert.equal(updateVisibleUserPage(pages, 0, [user, other]), pages);
assert.notEqual(updateVisibleUserPage(pages, 0, [other, user]), pages, 'order changes must propagate');
assert.notEqual(updateVisibleUserPage(pages, 0, [{ ...user, role: 'MODERATOR' }, other]), pages,
  'permission updates must propagate even when the ID is unchanged');
assert.equal(updateVisibleUserPage(pages, 0, [])[0].length, 0, 'an empty page must propagate');
const removed = removeVisibleUserPage(pages, 0);
assert.equal(removed[0], undefined);
assert.equal(removed[1], pages[1]);
assert.equal(pages[0].length, 2, 'cleanup must not mutate the published state');
assert.equal(removeVisibleUserPage(removed, 0), removed);

class Events {
  listeners = new Map();
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  dispatchEvent(event) { this.listeners.get(event.type)?.forEach((fn) => fn(event)); }
}
const element = () => {
  const attributes = new Map();
  return { getAttribute: (key) => attributes.get(key) ?? null,
    setAttribute: (key, value) => attributes.set(key, value), removeAttribute: (key) => attributes.delete(key) };
};
const root = element();
const layout = element();
const document = Object.assign(new Events(), { visibilityState: 'visible', documentElement: root,
  getElementById: () => layout });
const query = Object.assign(new Events(), { matches: false });
const window = Object.assign(new Events(), { matchMedia: () => query, meetingClientSettings: { public: {
  safemeetPerformance: { enabled: true, mode: 'auto', adaptiveProtectionEnabled: false },
} } });
let now = 100000;
const timers = new Map();
let timerId = 0;
const advance = (ms) => {
  now += ms;
  for (const [id, timer] of timers) if (timer.at <= now) { timers.delete(id); timer.fn(); }
};
let observer;
let observersCreated = 0;
class Observer {
  static supportedEntryTypes = ['longtask'];
  constructor(callback) { this.callback = callback; observer = this; observersCreated += 1; }
  observe() { this.connected = true; }
  disconnect() { this.connected = false; }
  takeRecords() { return []; }
}
const profile = load('imports/ui/components/skyroom-layout/performance-profile.ts', {
  window, document, navigator: { hardwareConcurrency: 12, deviceMemory: 8 },
  performance: { now: () => now }, PerformanceObserver: Observer,
  CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
  setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, at: now + ms }); return id; },
  clearTimeout: (id) => timers.delete(id),
  setInterval: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, at: now + ms }); return id; },
  clearInterval: (id) => timers.delete(id),
});
const emitTasks = (n) => observer.callback({ getEntries: () => Array.from({ length: n }, () => ({
  startTime: now - 200, duration: 200,
})) });
profile.startSkyroomPerformanceProfile();
profile.startSkyroomPerformanceProfile();
assert.equal(observersCreated, 1, 'start is idempotent');
emitTasks(2);
assert.equal(profile.getSkyroomPerformanceTier(), 'standard');
emitTasks(1);
assert.equal(profile.getSkyroomPerformanceTier(), 'low');
advance(59000);
assert.equal(profile.getSkyroomPerformanceTier(), 'low', 'no early quality oscillation');
emitTasks(1);
advance(59000);
assert.equal(profile.getSkyroomPerformanceTier(), 'low', 'new pressure delays recovery');
advance(1000);
assert.equal(profile.getSkyroomPerformanceTier(), 'standard');
query.matches = true;
query.dispatchEvent({ type: 'change' });
assert.equal(profile.getSkyroomActiveVideoLimit(), 4);
profile.setSkyroomPerformanceMode('standard');
assert.equal(profile.getSkyroomActiveVideoLimit(), Infinity, 'manual normal quality releases mobile cap');
assert.equal(profile.getSkyroomPerformanceTier(), 'standard');
profile.setSkyroomPerformanceMode('auto');
assert.equal(profile.getSkyroomPerformanceTier(), 'low');
document.visibilityState = 'hidden';
document.dispatchEvent({ type: 'visibilitychange' });
assert.equal(observer.connected, false);
profile.stopSkyroomPerformanceProfile();
assert.equal(timers.size, 0);
assert.equal(document.listeners.get('visibilitychange').size, 0);
assert.equal(query.listeners.get('change').size, 0);
document.visibilityState = 'visible';
window.meetingClientSettings.public.safemeetPerformance.enabled = false;
const before = observersCreated;
profile.startSkyroomPerformanceProfile();
assert.equal(observersCreated, before, 'disabled profile must not observe long tasks');
assert.equal(profile.getSkyroomActiveVideoLimit(), Infinity);
profile.stopSkyroomPerformanceProfile();
console.log('PASS: participant state stability, permission/order updates, immutable cleanup, performance recovery, mode and lifecycle');

window.meetingClientSettings.public.safemeetPerformance = {
  enabled: true, mode: 'auto', adaptiveProtectionEnabled: true,
};
profile.startSkyroomPerformanceProfile();
const sample = (elapsed, busyMs = 0) => {
  const timer = [...timers.values()][0];
  assert.ok(timer, 'adaptive sampler exists');
  now += elapsed;
  if (busyMs) observer.callback({ getEntries: () => [{ startTime: now - busyMs, duration: busyMs }] });
  timer.fn();
};
for (let i = 0; i < 12; i += 1) sample(5000, 2000);
assert.equal(profile.getSkyroomProtectionStage(), 'none', 'startup pressure must be ignored');
for (let i = 0; i < 6; i += 1) sample(10000, 2000);
assert.equal(profile.getSkyroomProtectionStage(), 'none', '20% of a delayed sample is not 40% pressure');
for (let i = 0; i < 5; i += 1) sample(5000, 1600);
assert.equal(profile.getSkyroomProtectionStage(), 'none', 'transient pressure must not constrain quality');
sample(5000, 1600);
assert.equal(profile.getSkyroomProtectionStage(), 'quality');
assert.equal(profile.getSkyroomActiveVideoLimit(), 4, 'quality reduction does not remove a webcam');
for (let i = 0; i < 5; i += 1) sample(5000, 1600);
document.visibilityState = 'hidden';
document.dispatchEvent({ type: 'visibilitychange' });
assert.equal(timers.size, 0);
document.visibilityState = 'visible';
document.dispatchEvent({ type: 'visibilitychange' });
document.dispatchEvent({ type: 'visibilitychange' });
assert.equal(timers.size, 1, 'duplicate resume must not create another sampler');
for (let i = 0; i < 4; i += 1) sample(5000, 2000);
sample(5000, 1600);
assert.equal(profile.getSkyroomProtectionStage(), 'quality', 'pressure must not accumulate across background');
for (let i = 0; i < 5; i += 1) sample(5000, 1600);
assert.equal(profile.getSkyroomProtectionStage(), 'moderate');
assert.equal(profile.getSkyroomActiveVideoLimit(), 3);
for (let i = 0; i < 12; i += 1) sample(5000);
assert.equal(profile.getSkyroomProtectionStage(), 'quality');
profile.setSkyroomPerformanceMode('standard');
assert.equal(timers.size, 0);
assert.equal(profile.getSkyroomActiveVideoLimit(), Infinity);
profile.stopSkyroomPerformanceProfile();
assert.equal(document.listeners.get('visibilitychange').size, 0);
console.log('PASS: adaptive startup, elapsed-time accounting, sustained pressure, resume, recovery and cleanup');

profile.startSkyroomPerformanceProfile();
sample(5000, 2000);
profile.markSkyroomPerformanceTransition();
for (let i = 0; i < 11; i += 1) sample(5000, 2000);
assert.equal(profile.getSkyroomProtectionStage(), 'none', 'reconnect must not shorten initial warmup');
observer.callback({ getEntries: () => [{ startTime: now - 60000, duration: 50000 }] });
for (let i = 0; i < 6; i += 1) sample(5000);
assert.equal(profile.getSkyroomProtectionStage(), 'none', 'stale observer entries must be excluded');
profile.stopSkyroomPerformanceProfile();

Observer.supportedEntryTypes = [];
profile.startSkyroomPerformanceProfile();
for (let i = 0; i < 12; i += 1) sample(5000);
for (let i = 0; i < 5; i += 1) sample(5301);
assert.equal(profile.getSkyroomProtectionStage(), 'none');
sample(5301);
assert.equal(profile.getSkyroomProtectionStage(), 'quality', 'fallback also needs six consecutive late samples');
profile.stopSkyroomPerformanceProfile();
assert.equal(timers.size, 0);
console.log('PASS: reconnect warmup, stale observer delivery and timer-only fallback');

Observer.supportedEntryTypes = ['longtask'];
window.meetingClientSettings.public.safemeetPerformance.mobilePublishProtectionEnabled = true;
profile.startSkyroomPerformanceProfile();
assert.equal(profile.getSkyroomMobilePublishCap(true), null);
for (let i = 0; i < 12; i += 1) sample(5000, 2000);
for (let i = 0; i < 6; i += 1) sample(5000, 1600);
assert.equal(profile.getSkyroomProtectionStage(), 'quality');
assert.equal(profile.getSkyroomMobilePublishCap(true).maxFrameRate, 15);
assert.equal(profile.getSkyroomMobilePublishCap(false), null, 'desktop/tablet publisher unchanged');
for (let i = 0; i < 6; i += 1) sample(5000, 1600);
assert.equal(profile.getSkyroomProtectionStage(), 'moderate');
assert.equal(profile.getSkyroomMobilePublishCap(true).maxFrameRate, 10);
profile.setSkyroomPerformanceMode('standard');
assert.equal(profile.getSkyroomMobilePublishCap(true), null);
profile.setSkyroomPerformanceMode('low');
assert.equal(profile.getSkyroomMobilePublishCap(true).maxEdge, 480);
window.meetingClientSettings.public.safemeetPerformance.mobilePublishProtectionEnabled = false;
assert.equal(profile.getSkyroomMobilePublishCap(true), null);
profile.stopSkyroomPerformanceProfile();
console.log('PASS: mobile publisher sustained pressure, delayed budget, opt-out and disabled flag');

window.meetingClientSettings.public.safemeetPerformance.mobilePublishProtectionEnabled = true;
profile.startSkyroomPerformanceProfile();
for (let i = 0; i < 12; i += 1) sample(5000);
for (let i = 0; i < 6; i += 1) {
  profile.reportSkyroomMediaWorkRatio(0.8);
  sample(5000);
}
assert.equal(profile.getSkyroomProtectionStage(), 'quality',
  'sustained codec work must activate only the first protection stage');
for (let i = 0; i < 6; i += 1) {
  profile.reportSkyroomMediaWorkRatio(0.8);
  sample(5000);
}
assert.equal(profile.getSkyroomProtectionStage(), 'moderate');
for (let i = 0; i < 12; i += 1) {
  profile.reportSkyroomMediaWorkRatio(0.55);
  sample(5000);
}
assert.equal(profile.getSkyroomProtectionStage(), 'moderate',
  'media work above the recovery threshold must prevent oscillation');
for (let i = 0; i < 12; i += 1) {
  profile.reportSkyroomMediaWorkRatio(0.3);
  sample(5000);
}
assert.equal(profile.getSkyroomProtectionStage(), 'quality');
profile.stopSkyroomPerformanceProfile();
console.log('PASS: codec workload activation and hysteresis');

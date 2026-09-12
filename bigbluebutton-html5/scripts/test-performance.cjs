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
  const sandbox = { exports: {}, ...globals };
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
  safemeetPerformance: { enabled: true, mode: 'auto' },
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
}
const profile = load('imports/ui/components/skyroom-layout/performance-profile.ts', {
  window, document, navigator: { hardwareConcurrency: 12, deviceMemory: 8 },
  performance: { now: () => now }, PerformanceObserver: Observer,
  CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
  setTimeout: (fn, ms) => { const id = ++timerId; timers.set(id, { fn, at: now + ms }); return id; },
  clearTimeout: (id) => timers.delete(id),
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

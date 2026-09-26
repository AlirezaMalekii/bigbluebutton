/* eslint-disable no-await-in-loop -- Exercise ordered camera lifecycle transitions. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

const exported = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,
  '../imports/ui/components/skyroom-layout/mobile-publish-policy.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, { exports: exported });
const { composeMobileCapture, createMobileCameraController } = exported;
const plain = (v) => JSON.parse(JSON.stringify(v));

(async () => {
  const original = { width: 360, height: 640, frameRate: 20 };
  const cap = { maxEdge: 480, maxFrameRate: 15 };
  assert.deepEqual(plain(composeMobileCapture(original, {}, cap)), {
    width: { ideal: 270, max: 270 },
    height: { ideal: 480, max: 480 },
    frameRate: { ideal: 15, max: 15 },
  });
  const smaller = composeMobileCapture(
    { width: 160, height: 120, frameRate: 8 }, {}, cap,
  );
  assert.equal(smaller.width.max, 160);
  assert.equal(smaller.frameRate.max, 8);
  assert.equal(composeMobileCapture(original, { frameRate: 6 }, cap).frameRate.max, 6);
  let constraints = {
    deviceId: { exact: 'test-camera' }, width: 360, height: 640, frameRate: 20,
  };
  const initial = plain(constraints);
  let parameters = { encodings: [{ maxBitrate: 200000 }] };
  let calls = 0;
  let rejectNext = false;
  const track = {
    kind: 'video',
    readyState: 'live',
    getSettings: () => original,
    getConstraints: () => plain(constraints),
    applyConstraints: async (value) => {
      calls += 1;
      if (rejectNext) { rejectNext = false; throw new Error('unsupported'); }
      constraints = plain(value);
    },
  };
  const sender = {
    track,
    getParameters: () => plain(parameters),
    setParameters: async (p) => { parameters = plain(p); },
  };
  const peer = { peerConnection: { signalingState: 'stable', getSenders: () => [sender] } };
  const controller = createMobileCameraController();
  const request = {
    profileId: 'medium', constraints: {}, bitrate: 200, cap, restore: true,
  };
  await controller.apply(peer, request);
  assert.equal(constraints.height.max, 480);
  assert.equal(parameters.encodings[0].maxFramerate, 15);
  assert.deepEqual(constraints.deviceId, initial.deviceId);
  const before = calls;
  await controller.apply(peer, request);
  assert.equal(calls, before, 'unchanged policy must not touch the camera');
  rejectNext = true;
  await assert.rejects(controller.apply(peer, { ...request, profileId: 'low', cap: { maxEdge: 320, maxFrameRate: 10 } }));
  assert.equal(peer.currentProfileId, 'medium', 'failed profile is not marked applied');
  assert.equal(constraints.height.max, 480, 'failed change restores previous capture');
  await controller.apply(peer, { ...request, cap: null });
  assert.deepEqual(constraints, initial);
  assert.equal(parameters.encodings[0].maxFramerate, 20);
  for (let i = 0; i < 20; i += 1) {
    await Promise.all([
      controller.apply(peer, request), controller.apply(peer, { ...request, cap: null }),
    ]);
    assert.deepEqual(constraints, initial);
  }
  rejectNext = true;
  const queuedFailure = controller.apply(peer, request);
  const queuedRestore = controller.apply(peer, { ...request, cap: null });
  await Promise.allSettled([queuedFailure, queuedRestore]);
  assert.deepEqual(constraints, initial, 'restore queued during failure must still run');
  const replacement = {
    ...track, getSettings: () => ({ width: 1280, height: 720, frameRate: 30 }),
  };
  sender.track = replacement;
  await controller.apply(peer, request);
  assert.equal(constraints.width.max, 480, 'replacement track receives the same active cap');
  peer.peerConnection.signalingState = 'closed';
  const closedCalls = calls;
  await controller.apply(peer, request);
  assert.equal(calls, closedCalls);
  console.log('Mobile publisher: composition, portrait, no-upscale, deduplication, failure rollback, recovery, queue and closed peer passed');
})().catch((error) => { console.error(error); process.exitCode = 1; });

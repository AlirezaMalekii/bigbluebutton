import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./performance-profile-policy.js', import.meta.url), 'utf8');
const policy = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`);
const {
  PROTECTION_STAGES,
  createProtectionState,
  classifyPerformanceSample,
  detectInitialProtectionStage,
  protectionVideoLimit,
  resolveProtectionStage,
  updateProtectionState,
} = policy;

assert.equal(detectInitialProtectionStage({ deviceMemory: 2, hardwareConcurrency: 8 }), 'quality');
assert.equal(detectInitialProtectionStage({ deviceMemory: 8, hardwareConcurrency: 2 }), 'quality');
assert.equal(detectInitialProtectionStage({ deviceMemory: 4, hardwareConcurrency: 4 }), 'quality');
assert.equal(detectInitialProtectionStage({ deviceMemory: 4, hardwareConcurrency: 8 }), 'none');
assert.equal(detectInitialProtectionStage({ deviceMemory: 8, hardwareConcurrency: 4 }), 'none');
assert.equal(detectInitialProtectionStage({}), 'none');
assert.equal(resolveProtectionStage({
  adaptiveEnabled: true,
  automaticStage: 'high',
  mode: 'standard',
}), 'none');
assert.equal(resolveProtectionStage({
  adaptiveEnabled: true,
  automaticStage: 'none',
  mode: 'low',
}), 'moderate');
assert.deepEqual(classifyPerformanceSample({
  eventLoopLagMs: 500,
  longTaskRatio: 0.8,
  longTaskSupported: true,
  warmingUp: true,
}), { pressured: false, recovered: false });
assert.deepEqual(classifyPerformanceSample({
  eventLoopLagMs: 250,
  longTaskRatio: 0,
  longTaskSupported: false,
}), { pressured: true, recovered: false });
assert.deepEqual(classifyPerformanceSample({
  eventLoopLagMs: 20,
  longTaskRatio: 0.05,
  longTaskSupported: true,
}), { pressured: false, recovered: true });

let state = createProtectionState();
state = updateProtectionState({ state, pressured: true, recovered: false });
state = updateProtectionState({ state, pressured: true, recovered: false });
assert.equal(state.stage, PROTECTION_STAGES.none);
state = updateProtectionState({ state, pressured: true, recovered: false });
assert.equal(state.stage, PROTECTION_STAGES.quality);
for (let index = 0; index < 6; index += 1) {
  state = updateProtectionState({ state, pressured: true, recovered: false });
}
assert.equal(state.stage, PROTECTION_STAGES.high);

for (let index = 0; index < 12; index += 1) {
  state = updateProtectionState({ state, pressured: false, recovered: true });
}
assert.equal(state.stage, PROTECTION_STAGES.moderate);

let hardwareFloor = createProtectionState(PROTECTION_STAGES.quality);
for (let index = 0; index < 36; index += 1) {
  hardwareFloor = updateProtectionState({
    state: hardwareFloor,
    pressured: false,
    recovered: true,
    minimumStage: PROTECTION_STAGES.quality,
  });
}
assert.equal(hardwareFloor.stage, PROTECTION_STAGES.quality);

assert.equal(protectionVideoLimit({ baseLimit: 4, stage: 'none' }), 4);
assert.equal(protectionVideoLimit({ baseLimit: Infinity, stage: 'quality' }), Infinity);
assert.equal(protectionVideoLimit({ baseLimit: 4, stage: 'moderate' }), 3);
assert.equal(protectionVideoLimit({ baseLimit: 2, stage: 'moderate' }), 2);
assert.equal(protectionVideoLimit({ baseLimit: Infinity, stage: 'high' }), 2);

const largeMeeting = Array.from({ length: 200 }, (_, index) => `camera-${index}`);
assert.equal(largeMeeting.slice(0, protectionVideoLimit({
  baseLimit: Infinity,
  stage: 'moderate',
})).length, 3);

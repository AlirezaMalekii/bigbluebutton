import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const loadPermissions = async () => {
  const sourceUrl = new URL('./shape-permissions.js', import.meta.url);
  const source = await readFile(sourceUrl, 'utf8');
  const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
  return import(moduleUrl);
};

const run = async () => {
  const {
    canDeleteWhiteboardShape,
    stampLocalShapeOwnership,
  } = await loadPermissions();

  const original = { id: 'shape:local', meta: { version: 1 } };
  const owned = stampLocalShapeOwnership(original, 'user-1', 'presentation-1');

  assert.notEqual(owned, original);
  assert.deepEqual(original.meta, { version: 1 });
  assert.deepEqual(owned.meta, {
    version: 1,
    createdBy: 'user-1',
    presentationId: 'presentation-1',
  });

  assert.equal(canDeleteWhiteboardShape({
    shape: owned,
    source: 'user',
    userId: 'user-1',
    isPresenter: false,
    isModerator: false,
  }), true);

  assert.equal(canDeleteWhiteboardShape({
    shape: owned,
    source: 'user',
    userId: 'user-2',
    isPresenter: false,
    isModerator: false,
  }), false);

  assert.equal(canDeleteWhiteboardShape({
    shape: { id: 'shape:legacy', meta: {} },
    source: 'user',
    userId: 'user-2',
    isPresenter: true,
    isModerator: false,
  }), true);

  assert.equal(canDeleteWhiteboardShape({
    shape: { id: 'shape:legacy', meta: {} },
    source: 'user',
    userId: 'user-2',
    isPresenter: false,
    isModerator: true,
  }), true);

  assert.equal(canDeleteWhiteboardShape({
    shape: owned,
    source: 'remote',
    userId: 'user-2',
    isPresenter: false,
    isModerator: false,
  }), true);
};

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});

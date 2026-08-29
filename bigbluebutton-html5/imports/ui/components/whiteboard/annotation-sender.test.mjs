import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const loadSenderFactory = async () => {
  const sourceUrl = new URL('./annotation-sender.js', import.meta.url);
  const source = await readFile(sourceUrl, 'utf8');
  const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
  return (await import(moduleUrl)).default;
};

const run = async () => {
  const createAnnotationSender = await loadSenderFactory();

  {
    const batches = [];
    const sender = createAnnotationSender({ minDelay: 5, maxDelay: 5 });
    const submit = async (annotations) => {
      batches.push(annotations);
      return true;
    };
    for (let index = 0; index < 1000; index += 1) {
      sender.enqueue({ id: 'shape:1', value: index }, submit);
    }
    assert.deepEqual(sender.getState(), { pendingCount: 1, scheduled: true, running: false });
    await wait(20);
    assert.equal(batches.length, 1);
    assert.deepEqual(batches[0], [{ id: 'shape:1', value: 999 }]);
    sender.reset();
  }

  {
    const batches = [];
    let releaseFirstRequest;
    const firstRequest = new Promise((resolve) => { releaseFirstRequest = resolve; });
    let attempt = 0;
    const sender = createAnnotationSender({ minDelay: 1, maxDelay: 1, retryDelay: 5 });
    const submit = async (annotations) => {
      batches.push(annotations);
      attempt += 1;
      if (attempt === 1) return firstRequest;
      return true;
    };
    sender.enqueue({ id: 'shape:1', value: 'old' }, submit);
    await wait(5);
    sender.enqueue({ id: 'shape:1', value: 'new' }, submit);
    releaseFirstRequest(false);
    await wait(20);
    assert.equal(batches.length, 2);
    assert.deepEqual(batches[1], [{ id: 'shape:1', value: 'new' }]);
    sender.reset();
  }

  {
    const batches = [];
    const sender = createAnnotationSender({ minDelay: 1000 });
    sender.enqueue({ id: 'shape:1' }, async (annotations) => {
      batches.push(annotations);
      return true;
    });
    await sender.flush();
    assert.equal(batches.length, 1);
    assert.deepEqual(sender.getState(), { pendingCount: 0, scheduled: false, running: false });
    sender.reset();
  }
};

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});

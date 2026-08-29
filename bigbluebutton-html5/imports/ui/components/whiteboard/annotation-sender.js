const DEFAULT_MIN_DELAY = 30;
const DEFAULT_MAX_DELAY = 200;
const DEFAULT_MAX_DELAY_QUEUE_SIZE = 60;
const DEFAULT_RETRY_DELAY = 1000;

/**
 * Single-owner, last-write-wins annotation sender.
 *
 * A Map keeps burst updates O(1) by annotation id. Only one timer or network
 * request may own the queue at a time, which avoids the timer fan-out that can
 * otherwise occur during a fast pen stroke.
 */
const createAnnotationSender = ({
  minDelay = DEFAULT_MIN_DELAY,
  maxDelay = DEFAULT_MAX_DELAY,
  maxDelayQueueSize = DEFAULT_MAX_DELAY_QUEUE_SIZE,
  retryDelay = DEFAULT_RETRY_DELAY,
} = {}) => {
  let pending = new Map();
  let timer = null;
  let running = false;
  let flushRequested = false;
  let latestSubmitAnnotations = null;

  const mergeFailedBatch = (annotations) => {
    const merged = new Map(annotations.map((annotation) => [annotation.id, annotation]));
    // Updates produced while the request was in flight are newer and must win.
    pending.forEach((annotation, id) => merged.set(id, annotation));
    pending = merged;
  };

  const calculateDelay = (queueSize) => {
    const delayPercentage = Math.min(maxDelayQueueSize, queueSize) / maxDelayQueueSize;
    return minDelay + ((maxDelay - minDelay) * delayPercentage);
  };

  let schedule;

  async function processQueue() {
    if (running) {
      flushRequested = true;
      return false;
    }
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending.size === 0 || !latestSubmitAnnotations) return true;

    running = true;
    const submitAnnotations = latestSubmitAnnotations;
    const annotations = Array.from(pending.values());
    pending.clear();
    let sent = false;

    try {
      sent = await submitAnnotations(annotations);
    } catch (error) {
      sent = false;
    }

    if (!sent) mergeFailedBatch(annotations);
    running = false;

    const shouldFlushImmediately = flushRequested;
    flushRequested = false;
    if (pending.size > 0) {
      let nextDelay = retryDelay;
      if (sent) nextDelay = calculateDelay(annotations.length);
      if (shouldFlushImmediately) nextDelay = 0;
      schedule(nextDelay);
    }
    return sent;
  }

  schedule = (delay = minDelay) => {
    if (timer || running || pending.size === 0 || !latestSubmitAnnotations) return;
    timer = setTimeout(() => {
      timer = null;
      processQueue();
    }, delay);
  };

  const enqueue = (annotation, submitAnnotations) => {
    latestSubmitAnnotations = submitAnnotations;
    pending.set(annotation.id, annotation);
    schedule();
  };

  const flush = () => {
    if (running) {
      flushRequested = true;
      return Promise.resolve(false);
    }
    return processQueue();
  };

  const reset = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    pending.clear();
    flushRequested = false;
    latestSubmitAnnotations = null;
  };

  const getState = () => ({
    pendingCount: pending.size,
    scheduled: Boolean(timer),
    running,
  });

  return {
    enqueue,
    flush,
    reset,
    getState,
  };
};

export default createAnnotationSender;

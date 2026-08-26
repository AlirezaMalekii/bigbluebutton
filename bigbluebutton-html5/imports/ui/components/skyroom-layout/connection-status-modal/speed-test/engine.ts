import {
  bytesToMbps,
  getSpeedTestVerdict,
  meanAbsoluteDeviation,
  median,
} from './format';
import {
  DEFAULT_SPEED_TEST_CONFIG,
  type SpeedTestConfig,
  type SpeedTestErrorCode,
  type SpeedTestSnapshot,
} from './types';

const SLOW_START_MS = 800;
const UPLOAD_BLOB_BYTES = 256 * 1024;
const MAX_RANDOM_VALUES_BYTES = 64 * 1024;
const MIN_PING_SAMPLES = 3;
const MAX_PING_SAMPLES = 12;
const MIN_TRANSFER_BYTES = 16 * 1024;
const MIN_TRANSFER_DURATION_MS = 1000;
const MAX_TRANSFER_DURATION_MS = 15000;
const PING_TIMEOUT_MS = 4000;

export class SpeedTestRunError extends Error {
  code: SpeedTestErrorCode;

  constructor(code: SpeedTestErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'SpeedTestRunError';
    this.code = code;
  }
}

export const getSpeedTestServerHost = (): string => window.location.host;

const getBasename = (): string => {
  const basename = window.meetingClientSettings?.public?.app?.basename || '/html5client';
  return basename.replace(/\/$/, '');
};

export const getSpeedTestEndpoints = () => {
  const base = `${window.location.origin}${getBasename()}/speedtest`;
  return {
    ping: `${base}/ping`,
    download: `${base}/download`,
    upload: `${base}/upload`,
  };
};

const isAbortError = (error: unknown, signal: AbortSignal): boolean => {
  if (signal.aborted) return true;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  return false;
};

const throwIfAborted = (signal: AbortSignal) => {
  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
};

type Deadline = {
  signal: AbortSignal;
  expired: () => boolean;
  cleanup: () => void;
};

const createDeadline = (parentSignal: AbortSignal, durationMs: number): Deadline => {
  const controller = new AbortController();
  let deadlineExpired = false;

  const abortFromParent = () => controller.abort();
  const timer = window.setTimeout(() => {
    deadlineExpired = true;
    controller.abort();
  }, durationMs);

  parentSignal.addEventListener('abort', abortFromParent, { once: true });
  if (parentSignal.aborted) abortFromParent();

  return {
    signal: controller.signal,
    expired: () => deadlineExpired,
    cleanup: () => {
      window.clearTimeout(timer);
      parentSignal.removeEventListener('abort', abortFromParent);
      controller.abort();
    },
  };
};

const classifyHttpStatus = (status: number): SpeedTestErrorCode => {
  if (status === 404 || status === 405 || status === 501) return 'notConfigured';
  return 'network';
};

const fetchNoStore = (
  url: string,
  signal: AbortSignal,
  init: RequestInit = {},
): Promise<Response> => fetch(url, {
  cache: 'no-store',
  credentials: 'omit',
  redirect: 'follow',
  // Keep GraphQL/WebRTC ahead of this bulk transfer when the browser supports it.
  priority: 'low',
  signal,
  ...init,
  headers: {
    Pragma: 'no-cache',
    'Cache-Control': 'no-store',
    ...(init.headers || {}),
  },
} as RequestInit);

const measurePingSample = async (url: string, parentSignal: AbortSignal): Promise<number> => {
  const deadline = createDeadline(parentSignal, PING_TIMEOUT_MS);
  try {
    const startedAt = performance.now();
    const response = await fetchNoStore(`${url}?r=${Math.random()}`, deadline.signal, { method: 'GET' });
    const elapsed = performance.now() - startedAt;
    if (!response.ok && response.status !== 204) {
      throw new SpeedTestRunError(classifyHttpStatus(response.status));
    }
    return elapsed;
  } catch (error) {
    if (parentSignal.aborted) throw new DOMException('Aborted', 'AbortError');
    if (deadline.expired() && isAbortError(error, deadline.signal)) {
      throw new SpeedTestRunError('network');
    }
    throw error;
  } finally {
    deadline.cleanup();
  }
};

const probeServer = async (pingUrl: string, signal: AbortSignal): Promise<void> => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new SpeedTestRunError('offline');
  }
  try {
    await measurePingSample(pingUrl, signal);
  } catch (error) {
    if (isAbortError(error, signal)) throw error;
    if (error instanceof SpeedTestRunError) throw error;
    throw new SpeedTestRunError('network');
  }
};

type ThroughputTracker = {
  bytes: () => number;
  addBytes: (bytes: number) => number;
  finalize: () => number;
};

const createThroughputTracker = (durationMs: number): ThroughputTracker => {
  const startedAt = performance.now();
  const graceEndsAt = startedAt + Math.min(SLOW_START_MS, durationMs / 4);
  let totalBytes = 0;
  let firstSample: { t: number; bytes: number } | null = null;
  let lastSample: { t: number; bytes: number } | null = null;

  const compute = (): number => {
    if (firstSample && lastSample && lastSample.t > firstSample.t) {
      return bytesToMbps(lastSample.bytes - firstSample.bytes, lastSample.t - firstSample.t);
    }
    const elapsed = Math.max(performance.now() - startedAt, 1);
    return bytesToMbps(totalBytes, elapsed);
  };

  return {
    bytes: () => totalBytes,
    addBytes: (bytes: number) => {
      if (bytes <= 0) return compute();
      totalBytes += bytes;
      const now = performance.now();
      if (now >= graceEndsAt) {
        if (!firstSample) {
          firstSample = { t: now, bytes: totalBytes };
        }
        lastSample = { t: now, bytes: totalBytes };
      }
      return compute();
    },
    finalize: compute,
  };
};

const cancelReader = (reader: ReadableStreamDefaultReader<Uint8Array>) => {
  // Cancellation can itself remain pending on some HTTP/2 implementations.
  // Fetch abort owns transport cleanup, so never block phase completion on it.
  reader.cancel().catch(() => undefined);
};

const readStreamChunk = (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
): Promise<ReadableStreamReadResult<Uint8Array>> => new Promise((resolve, reject) => {
  if (signal.aborted) {
    reject(new DOMException('Aborted', 'AbortError'));
    return;
  }

  const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
  signal.addEventListener('abort', onAbort, { once: true });
  reader.read().then(
    (result) => {
      signal.removeEventListener('abort', onAbort);
      resolve(result);
    },
    (error) => {
      signal.removeEventListener('abort', onAbort);
      reject(error);
    },
  );
});

const runDownloadStream = async (
  url: string,
  until: number,
  signal: AbortSignal,
  onBytes: (bytes: number) => void,
): Promise<void> => {
  while (performance.now() < until) {
    throwIfAborted(signal);
    let response: Response;
    try {
      // Sequential chunks until the phase timer ends.
      // eslint-disable-next-line no-await-in-loop
      response = await fetchNoStore(`${url}?r=${Math.random()}`, signal, { method: 'GET' });
    } catch (error) {
      if (isAbortError(error, signal)) throw error;
      if (performance.now() >= until) return;
      throw new SpeedTestRunError('network');
    }
    if (!response.ok) {
      throw new SpeedTestRunError(classifyHttpStatus(response.status));
    }
    if (!response.body) {
      throw new SpeedTestRunError('network');
    }

    const reader = response.body.getReader();
    try {
      while (performance.now() < until) {
        throwIfAborted(signal);
        // eslint-disable-next-line no-await-in-loop
        const { done, value } = await readStreamChunk(reader, signal);
        if (done) break;
        if (value?.byteLength) onBytes(value.byteLength);
      }
    } catch (error) {
      if (isAbortError(error, signal)) throw error;
      if (performance.now() >= until) return;
      throw error instanceof SpeedTestRunError
        ? error
        : new SpeedTestRunError('network');
    } finally {
      cancelReader(reader);
    }
  }
};

const createUploadBlob = (byteLength: number): Blob => {
  const unit = new Uint8Array(byteLength);
  // Web Crypto rejects getRandomValues calls larger than 65,536 bytes.
  // Fill the incompressible payload in bounded views while retaining one Blob.
  for (let offset = 0; offset < unit.byteLength; offset += MAX_RANDOM_VALUES_BYTES) {
    crypto.getRandomValues(unit.subarray(
      offset,
      Math.min(offset + MAX_RANDOM_VALUES_BYTES, unit.byteLength),
    ));
  }
  return new Blob([unit], {
    type: 'application/octet-stream',
  });
};

const uploadOnce = (
  url: string,
  body: Blob,
  until: number,
  signal: AbortSignal,
  onDelta: (bytes: number) => void,
): Promise<void> => new Promise((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  let lastLoaded = 0;
  let settled = false;
  let watchdog = 0;

  const cleanup = () => {
    signal.removeEventListener('abort', onAbort);
    if (watchdog) window.clearTimeout(watchdog);
  };

  const finish = (handler: () => void) => {
    if (settled) return;
    settled = true;
    cleanup();
    handler();
  };

  const onAbort = () => {
    xhr.abort();
  };

  const resolveSuccessfulUpload = () => {
    const remaining = body.size - lastLoaded;
    if (remaining > 0) onDelta(remaining);
    finish(resolve);
  };

  const resolvePartialUpload = () => finish(resolve);

  const rejectNetwork = () => finish(() => reject(new SpeedTestRunError('network')));

  xhr.open('POST', `${url}?r=${Math.random()}`);
  xhr.setRequestHeader('Content-Type', 'application/octet-stream');
  xhr.setRequestHeader('Cache-Control', 'no-store');
  xhr.timeout = Math.max(1500, Math.ceil(until - performance.now()) + 750);

  xhr.upload.onprogress = (event) => {
    const loaded = event.loaded || 0;
    const delta = loaded - lastLoaded;
    lastLoaded = loaded;
    if (delta > 0) onDelta(delta);
    if (performance.now() >= until) {
      xhr.abort();
    }
  };

  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      resolveSuccessfulUpload();
      return;
    }
    finish(() => reject(new SpeedTestRunError(classifyHttpStatus(xhr.status))));
  };

  xhr.onerror = () => {
    if (performance.now() >= until) {
      resolvePartialUpload();
      return;
    }
    rejectNetwork();
  };
  xhr.onabort = () => {
    if (signal.aborted) {
      finish(() => reject(new DOMException('Aborted', 'AbortError')));
      return;
    }
    if (performance.now() >= until) {
      resolvePartialUpload();
      return;
    }
    rejectNetwork();
  };
  xhr.ontimeout = () => {
    if (performance.now() >= until) {
      resolvePartialUpload();
      return;
    }
    rejectNetwork();
  };
  xhr.onloadend = () => {
    if (settled) return;
    if (xhr.status >= 200 && xhr.status < 300) {
      resolveSuccessfulUpload();
    } else if (performance.now() >= until) {
      resolvePartialUpload();
    } else {
      rejectNetwork();
    }
  };

  watchdog = window.setTimeout(() => {
    xhr.abort();
    resolvePartialUpload();
  }, Math.max(50, until - performance.now()));

  signal.addEventListener('abort', onAbort);
  if (signal.aborted) {
    onAbort();
    finish(() => reject(new DOMException('Aborted', 'AbortError')));
    return;
  }

  xhr.send(body);
});

const sleep = (ms: number, signal: AbortSignal): Promise<void> => new Promise((resolve, reject) => {
  if (signal.aborted) {
    reject(new DOMException('Aborted', 'AbortError'));
    return;
  }

  let timer = 0;
  const cleanup = () => {
    if (timer) window.clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
  };
  const onAbort = () => {
    cleanup();
    reject(new DOMException('Aborted', 'AbortError'));
  };
  signal.addEventListener('abort', onAbort, { once: true });
  timer = window.setTimeout(() => {
    cleanup();
    resolve();
  }, ms);
});

const runUploadStream = async (
  url: string,
  until: number,
  signal: AbortSignal,
  onBytes: (bytes: number) => void,
): Promise<void> => {
  const body = createUploadBlob(UPLOAD_BLOB_BYTES);
  while (performance.now() < until) {
    throwIfAborted(signal);
    try {
      // Sequential POSTs until the phase timer ends.
      // eslint-disable-next-line no-await-in-loop
      await uploadOnce(url, body, until, signal, onBytes);
    } catch (error) {
      if (isAbortError(error, signal)) throw error;
      if (performance.now() >= until) return;
      // eslint-disable-next-line no-await-in-loop
      await sleep(80, signal);
    }
  }
};

const runParallelSettled = async (
  count: number,
  worker: (index: number) => Promise<void>,
): Promise<void> => {
  const results = await Promise.allSettled(
    Array.from({ length: count }, (_, index) => worker(index)),
  );
  const rejection = results.find((result): result is PromiseRejectedResult => (
    result.status === 'rejected'
  ));
  if (!rejection) return;

  const allFailed = results.every((result) => result.status === 'rejected');
  if (allFailed) throw rejection.reason;
};

const runTimedTransferPhase = async (
  durationMs: number,
  parentSignal: AbortSignal,
  work: (phaseSignal: AbortSignal, until: number) => Promise<void>,
): Promise<void> => {
  const deadline = createDeadline(parentSignal, durationMs);
  const until = performance.now() + durationMs;
  try {
    await work(deadline.signal, until);
  } catch (error) {
    if (parentSignal.aborted) throw new DOMException('Aborted', 'AbortError');
    if (deadline.expired() && isAbortError(error, deadline.signal)) return;
    throw error;
  } finally {
    deadline.cleanup();
  }
};

const clampDuration = (durationMs: number, fallback: number): number => {
  const resolved = Number.isFinite(durationMs) ? durationMs : fallback;
  return Math.max(MIN_TRANSFER_DURATION_MS, Math.min(MAX_TRANSFER_DURATION_MS, resolved));
};

export const runSpeedTest = async (
  config: SpeedTestConfig,
  onSnapshot: (snapshot: SpeedTestSnapshot) => void,
  signal: AbortSignal,
): Promise<SpeedTestSnapshot> => {
  const resolved: SpeedTestConfig = {
    ...DEFAULT_SPEED_TEST_CONFIG,
    ...config,
    pingCount: Math.max(MIN_PING_SAMPLES, Math.min(
      MAX_PING_SAMPLES,
      config.pingCount || DEFAULT_SPEED_TEST_CONFIG.pingCount,
    )),
    downloadDurationMs: clampDuration(
      config.downloadDurationMs,
      DEFAULT_SPEED_TEST_CONFIG.downloadDurationMs,
    ),
    uploadDurationMs: clampDuration(
      config.uploadDurationMs,
      DEFAULT_SPEED_TEST_CONFIG.uploadDurationMs,
    ),
    parallelStreams: Math.max(1, Math.min(
      2,
      config.parallelStreams || DEFAULT_SPEED_TEST_CONFIG.parallelStreams,
    )),
  };
  const endpoints = getSpeedTestEndpoints();
  const serverHost = getSpeedTestServerHost();

  let snapshot: SpeedTestSnapshot = {
    phase: 'probing',
    pingMs: null,
    jitterMs: null,
    downloadMbps: null,
    uploadMbps: null,
    liveMbps: null,
    errorCode: null,
    serverHost,
    verdict: null,
    uploadIncomplete: false,
  };

  const emit = (partial: Partial<SpeedTestSnapshot>) => {
    snapshot = { ...snapshot, ...partial };
    onSnapshot(snapshot);
  };

  emit({ phase: 'probing' });
  await probeServer(endpoints.ping, signal);

  emit({ phase: 'ping', liveMbps: null });
  const pingSamples: number[] = [];
  for (let i = 0; i < resolved.pingCount; i += 1) {
    throwIfAborted(signal);
    try {
      // Sequential samples so each RTT is independent.
      // eslint-disable-next-line no-await-in-loop
      const sample = await measurePingSample(endpoints.ping, signal);
      pingSamples.push(sample);
      emit({
        pingMs: median(pingSamples),
        jitterMs: pingSamples.length > 1
          ? meanAbsoluteDeviation(pingSamples, median(pingSamples))
          : 0,
        liveMbps: null,
      });
    } catch (error) {
      if (isAbortError(error, signal)) throw error;
      if (error instanceof SpeedTestRunError) throw error;
    }
  }

  if (pingSamples.length < MIN_PING_SAMPLES) {
    throw new SpeedTestRunError('network');
  }

  const pingMs = median(pingSamples);
  const jitterMs = meanAbsoluteDeviation(pingSamples, pingMs);
  emit({ pingMs, jitterMs });

  // Brief yield so GraphQL/WebRTC can drain before the bulk transfer.
  await sleep(120, signal);

  emit({ phase: 'download', liveMbps: 0 });
  const downloadTracker = createThroughputTracker(resolved.downloadDurationMs);
  try {
    await runTimedTransferPhase(
      resolved.downloadDurationMs,
      signal,
      async (phaseSignal, downloadUntil) => {
        await runParallelSettled(resolved.parallelStreams, async () => {
          await runDownloadStream(endpoints.download, downloadUntil, phaseSignal, (bytes) => {
            emit({ liveMbps: downloadTracker.addBytes(bytes) });
          });
        });
      },
    );
  } catch (error) {
    if (isAbortError(error, signal)) throw error;
    if (downloadTracker.bytes() < MIN_TRANSFER_BYTES) {
      throw error instanceof SpeedTestRunError ? error : new SpeedTestRunError('network');
    }
  }
  const downloadMbps = downloadTracker.finalize();
  if (downloadTracker.bytes() < MIN_TRANSFER_BYTES) {
    throw new SpeedTestRunError('network');
  }
  emit({ downloadMbps, liveMbps: downloadMbps });

  await sleep(150, signal);

  emit({ phase: 'upload', liveMbps: 0 });
  const uploadTracker = createThroughputTracker(resolved.uploadDurationMs);
  let uploadIncomplete = false;
  try {
    await runTimedTransferPhase(
      resolved.uploadDurationMs,
      signal,
      async (phaseSignal, uploadUntil) => {
        await runUploadStream(endpoints.upload, uploadUntil, phaseSignal, (bytes) => {
          emit({ liveMbps: uploadTracker.addBytes(bytes) });
        });
      },
    );
  } catch (error) {
    if (isAbortError(error, signal)) throw error;
    uploadIncomplete = true;
  }
  const uploadMbps = uploadTracker.bytes() >= MIN_TRANSFER_BYTES
    ? uploadTracker.finalize()
    : null;
  if (uploadMbps == null) {
    uploadIncomplete = true;
  }
  const doneSnapshot: SpeedTestSnapshot = {
    ...snapshot,
    phase: 'done',
    uploadMbps,
    liveMbps: uploadMbps,
    verdict: getSpeedTestVerdict({
      pingMs,
      jitterMs,
      downloadMbps,
      uploadMbps,
    }),
    errorCode: null,
    uploadIncomplete,
  };
  onSnapshot(doneSnapshot);
  return doneSnapshot;
};

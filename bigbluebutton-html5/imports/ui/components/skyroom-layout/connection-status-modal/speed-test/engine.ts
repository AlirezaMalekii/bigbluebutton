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

const SLOW_START_MS = 2000;
const UPLOAD_BLOB_BYTES = 4 * 1024 * 1024;
const MIN_PING_SAMPLES = 3;

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
    const abortError = new DOMException('Aborted', 'AbortError');
    throw abortError;
  }
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
  redirect: 'error',
  signal,
  ...init,
  headers: {
    Pragma: 'no-cache',
    'Cache-Control': 'no-store',
    ...(init.headers || {}),
  },
});

const measurePingSample = async (url: string, signal: AbortSignal): Promise<number> => {
  const startedAt = performance.now();
  const response = await fetchNoStore(`${url}?r=${Math.random()}`, signal, { method: 'GET' });
  const elapsed = performance.now() - startedAt;
  if (!response.ok && response.status !== 204) {
    throw new SpeedTestRunError(classifyHttpStatus(response.status));
  }
  return elapsed;
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

const runDownloadStream = async (
  url: string,
  until: number,
  signal: AbortSignal,
  onBytes: (bytes: number) => void,
): Promise<void> => {
  while (performance.now() < until) {
    throwIfAborted(signal);
    // Sequential chunks until the phase timer ends.
    // eslint-disable-next-line no-await-in-loop
    const response = await fetchNoStore(`${url}?r=${Math.random()}`, signal, { method: 'GET' });
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
        const { done, value } = await reader.read();
        if (done) break;
        if (value?.byteLength) onBytes(value.byteLength);
      }
    } finally {
      try {
        // eslint-disable-next-line no-await-in-loop
        await reader.cancel();
      } catch {
        // Ignore cancel races after abort or completion.
      }
    }
  }
};

const createUploadBlob = (): Blob => {
  const unit = new Uint8Array(1024 * 1024);
  crypto.getRandomValues(unit);
  const copies = Math.max(1, Math.round(UPLOAD_BLOB_BYTES / unit.byteLength));
  return new Blob(Array.from({ length: copies }, () => unit), {
    type: 'application/octet-stream',
  });
};

const uploadOnce = (
  url: string,
  body: Blob,
  signal: AbortSignal,
  onDelta: (bytes: number) => void,
): Promise<void> => new Promise((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  let lastLoaded = 0;
  let settled = false;

  const cleanup = () => {
    signal.removeEventListener('abort', onAbort);
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

  xhr.open('POST', `${url}?r=${Math.random()}`);
  xhr.setRequestHeader('Content-Type', 'application/octet-stream');
  xhr.setRequestHeader('Cache-Control', 'no-store');
  xhr.timeout = 20000;

  xhr.upload.onprogress = (event) => {
    const loaded = event.loaded || 0;
    const delta = loaded - lastLoaded;
    lastLoaded = loaded;
    if (delta > 0) onDelta(delta);
  };

  xhr.onload = () => {
    const remaining = body.size - lastLoaded;
    if (remaining > 0) onDelta(remaining);
    if (xhr.status >= 200 && xhr.status < 300) {
      finish(resolve);
      return;
    }
    finish(() => reject(new SpeedTestRunError(classifyHttpStatus(xhr.status))));
  };

  xhr.onerror = () => {
    finish(() => reject(new SpeedTestRunError('network')));
  };

  xhr.onabort = () => {
    finish(() => reject(new DOMException('Aborted', 'AbortError')));
  };

  xhr.ontimeout = () => {
    finish(() => reject(new SpeedTestRunError('network')));
  };

  signal.addEventListener('abort', onAbort);
  if (signal.aborted) {
    onAbort();
    finish(() => reject(new DOMException('Aborted', 'AbortError')));
    return;
  }

  xhr.send(body);
});

const runUploadStream = async (
  url: string,
  body: Blob,
  until: number,
  signal: AbortSignal,
  onBytes: (bytes: number) => void,
): Promise<void> => {
  while (performance.now() < until) {
    throwIfAborted(signal);
    // eslint-disable-next-line no-await-in-loop
    await uploadOnce(url, body, signal, onBytes);
  }
};

const runParallel = async (
  count: number,
  worker: (index: number) => Promise<void>,
): Promise<void> => {
  const tasks = Array.from({ length: count }, (_, index) => worker(index));
  await Promise.all(tasks);
};

const withTimedPhase = async (
  durationMs: number,
  parentSignal: AbortSignal,
  work: (phaseSignal: AbortSignal) => Promise<void>,
): Promise<void> => {
  const phaseController = new AbortController();
  const stopPhase = () => phaseController.abort();
  const onParentAbort = () => stopPhase();
  parentSignal.addEventListener('abort', onParentAbort);
  const timer = window.setTimeout(stopPhase, durationMs);

  try {
    await work(phaseController.signal);
  } catch (error) {
    if (isAbortError(error, phaseController.signal) && !parentSignal.aborted) {
      return;
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
    parentSignal.removeEventListener('abort', onParentAbort);
    stopPhase();
  }
};

export const runSpeedTest = async (
  config: SpeedTestConfig,
  onSnapshot: (snapshot: SpeedTestSnapshot) => void,
  signal: AbortSignal,
): Promise<SpeedTestSnapshot> => {
  const resolved: SpeedTestConfig = {
    ...DEFAULT_SPEED_TEST_CONFIG,
    ...config,
    pingCount: Math.max(MIN_PING_SAMPLES, config.pingCount || DEFAULT_SPEED_TEST_CONFIG.pingCount),
    parallelStreams: Math.max(1, config.parallelStreams || DEFAULT_SPEED_TEST_CONFIG.parallelStreams),
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

  emit({ phase: 'download', liveMbps: 0 });
  const downloadTracker = createThroughputTracker(resolved.downloadDurationMs);
  await withTimedPhase(resolved.downloadDurationMs, signal, async (phaseSignal) => {
    const downloadUntil = performance.now() + resolved.downloadDurationMs;
    await runParallel(resolved.parallelStreams, async () => {
      await runDownloadStream(endpoints.download, downloadUntil, phaseSignal, (bytes) => {
        emit({ liveMbps: downloadTracker.addBytes(bytes) });
      });
    });
  });
  const downloadMbps = downloadTracker.finalize();
  emit({ downloadMbps, liveMbps: downloadMbps });

  emit({ phase: 'upload', liveMbps: 0 });
  const uploadBlob = createUploadBlob();
  const uploadTracker = createThroughputTracker(resolved.uploadDurationMs);
  await withTimedPhase(resolved.uploadDurationMs, signal, async (phaseSignal) => {
    const uploadUntil = performance.now() + resolved.uploadDurationMs;
    await runParallel(resolved.parallelStreams, async () => {
      await runUploadStream(endpoints.upload, uploadBlob, uploadUntil, phaseSignal, (bytes) => {
        emit({ liveMbps: uploadTracker.addBytes(bytes) });
      });
    });
  });
  const uploadMbps = uploadTracker.finalize();
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
  };
  onSnapshot(doneSnapshot);
  return doneSnapshot;
};

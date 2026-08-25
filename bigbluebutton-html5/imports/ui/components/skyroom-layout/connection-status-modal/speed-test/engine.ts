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
const MIN_PING_SAMPLES = 3;
const MIN_TRANSFER_BYTES = 16 * 1024;

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

const silentCancel = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
  try {
    await reader.cancel();
  } catch {
    // Ignore cancel races after abort or completion.
  }
};

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
        const { done, value } = await reader.read();
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
      // eslint-disable-next-line no-await-in-loop
      await silentCancel(reader);
    }
  }
};

const createUploadBlob = (byteLength: number): Blob => {
  const unit = new Uint8Array(byteLength);
  crypto.getRandomValues(unit);
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

  const resolvePhase = () => {
    const remaining = body.size - lastLoaded;
    if (remaining > 0 && lastLoaded > 0) onDelta(remaining);
    finish(resolve);
  };

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
      resolvePhase();
      return;
    }
    finish(() => reject(new SpeedTestRunError(classifyHttpStatus(xhr.status))));
  };

  xhr.onerror = resolvePhase;
  xhr.onabort = () => {
    if (signal.aborted) {
      finish(() => reject(new DOMException('Aborted', 'AbortError')));
      return;
    }
    resolvePhase();
  };
  xhr.ontimeout = resolvePhase;
  xhr.onloadend = () => {
    if (!settled) resolvePhase();
  };

  watchdog = window.setTimeout(() => {
    xhr.abort();
    resolvePhase();
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
  const timer = window.setTimeout(resolve, ms);
  const onAbort = () => {
    window.clearTimeout(timer);
    reject(new DOMException('Aborted', 'AbortError'));
  };
  signal.addEventListener('abort', onAbort, { once: true });
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

export const runSpeedTest = async (
  config: SpeedTestConfig,
  onSnapshot: (snapshot: SpeedTestSnapshot) => void,
  signal: AbortSignal,
): Promise<SpeedTestSnapshot> => {
  const resolved: SpeedTestConfig = {
    ...DEFAULT_SPEED_TEST_CONFIG,
    ...config,
    pingCount: Math.max(MIN_PING_SAMPLES, config.pingCount || DEFAULT_SPEED_TEST_CONFIG.pingCount),
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
  const downloadUntil = performance.now() + resolved.downloadDurationMs;
  try {
    await runParallelSettled(resolved.parallelStreams, async () => {
      await runDownloadStream(endpoints.download, downloadUntil, signal, (bytes) => {
        emit({ liveMbps: downloadTracker.addBytes(bytes) });
      });
    });
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
  const uploadUntil = performance.now() + resolved.uploadDurationMs;
  let uploadIncomplete = false;
  try {
    await runUploadStream(endpoints.upload, uploadUntil, signal, (bytes) => {
      emit({ liveMbps: uploadTracker.addBytes(bytes) });
    });
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

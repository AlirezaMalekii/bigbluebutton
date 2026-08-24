import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { throttle } from '/imports/utils/throttle';
import deviceInfo from '/imports/utils/deviceInfo';
import {
  DEFAULT_SPEED_TEST_CONFIG,
  IDLE_SPEED_TEST_SNAPSHOT,
  type SpeedTestConfig,
  type SpeedTestSnapshot,
} from './types';
import { runSpeedTest, SpeedTestRunError } from './engine';

const PROGRESS_THROTTLE_MS = 200;

const readConfig = (): SpeedTestConfig => {
  const settings = window.meetingClientSettings?.public?.app?.speedTest;
  const parallel = deviceInfo.isMobile
    ? settings?.mobileParallelStreams ?? 1
    : settings?.parallelStreams ?? DEFAULT_SPEED_TEST_CONFIG.parallelStreams;

  return {
    pingCount: settings?.pingCount ?? DEFAULT_SPEED_TEST_CONFIG.pingCount,
    downloadDurationMs: settings?.downloadDurationMs ?? DEFAULT_SPEED_TEST_CONFIG.downloadDurationMs,
    uploadDurationMs: settings?.uploadDurationMs ?? DEFAULT_SPEED_TEST_CONFIG.uploadDurationMs,
    // Cap at 2 so the test cannot starve GraphQL/WebRTC on the same link.
    parallelStreams: Math.max(1, Math.min(2, parallel)),
  };
};

const toErrorSnapshot = (
  error: unknown,
  previous: SpeedTestSnapshot,
  serverHost: string,
): SpeedTestSnapshot => ({
  ...previous,
  phase: 'error',
  errorCode: error instanceof SpeedTestRunError ? error.code : 'network',
  liveMbps: previous.downloadMbps ?? previous.liveMbps,
  verdict: null,
  serverHost,
  uploadIncomplete: previous.uploadIncomplete,
});

const useSpeedTest = () => {
  const [snapshot, setSnapshot] = useState<SpeedTestSnapshot>({
    ...IDLE_SPEED_TEST_SNAPSHOT,
    serverHost: typeof window !== 'undefined' ? window.location.host : '',
  });
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const runIdRef = useRef(0);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const emitThrottled = useMemo(() => throttle((next: SpeedTestSnapshot, runId: number) => {
    if (mountedRef.current && runIdRef.current === runId) {
      setSnapshot(next);
    }
  }, PROGRESS_THROTTLE_MS), []);

  const cancel = useCallback(() => {
    runIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    if (mountedRef.current) {
      setSnapshot({
        ...IDLE_SPEED_TEST_SNAPSHOT,
        serverHost: typeof window !== 'undefined' ? window.location.host : '',
      });
    }
  }, []);

  const start = useCallback(async () => {
    abortRef.current?.abort();
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    const controller = new AbortController();
    abortRef.current = controller;
    const serverHost = window.location.host;
    setSnapshot({
      ...IDLE_SPEED_TEST_SNAPSHOT,
      phase: 'probing',
      serverHost,
    });

    try {
      const result = await runSpeedTest(
        readConfig(),
        (next) => emitThrottled(next, runId),
        controller.signal,
      );
      if (mountedRef.current && runIdRef.current === runId && !controller.signal.aborted) {
        setSnapshot(result);
      }
    } catch (error) {
      if (!mountedRef.current || runIdRef.current !== runId) return;
      if (controller.signal.aborted) {
        setSnapshot({
          ...IDLE_SPEED_TEST_SNAPSHOT,
          serverHost,
        });
        return;
      }
      runIdRef.current += 1;
      setSnapshot(toErrorSnapshot(error, snapshotRef.current, serverHost));
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [emitThrottled]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runIdRef.current += 1;
      abortRef.current?.abort();
    };
  }, []);

  const running = snapshot.phase !== 'idle'
    && snapshot.phase !== 'done'
    && snapshot.phase !== 'error';

  return {
    snapshot,
    start,
    cancel,
    running,
  };
};

export default useSpeedTest;

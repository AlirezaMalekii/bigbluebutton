export type SpeedTestPhase =
  | 'idle'
  | 'probing'
  | 'ping'
  | 'download'
  | 'upload'
  | 'done'
  | 'error';

export type SpeedTestErrorCode = 'notConfigured' | 'network' | 'offline';

export type SpeedTestVerdict = 'excellent' | 'good' | 'fair' | 'poor';

export interface SpeedTestConfig {
  pingCount: number;
  downloadDurationMs: number;
  uploadDurationMs: number;
  parallelStreams: number;
}

export interface SpeedTestSnapshot {
  phase: SpeedTestPhase;
  pingMs: number | null;
  jitterMs: number | null;
  downloadMbps: number | null;
  uploadMbps: number | null;
  liveMbps: number | null;
  errorCode: SpeedTestErrorCode | null;
  serverHost: string;
  verdict: SpeedTestVerdict | null;
}

export const DEFAULT_SPEED_TEST_CONFIG: SpeedTestConfig = {
  pingCount: 10,
  downloadDurationMs: 8000,
  uploadDurationMs: 8000,
  parallelStreams: 4,
};

export const IDLE_SPEED_TEST_SNAPSHOT: SpeedTestSnapshot = {
  phase: 'idle',
  pingMs: null,
  jitterMs: null,
  downloadMbps: null,
  uploadMbps: null,
  liveMbps: null,
  errorCode: null,
  serverHost: '',
  verdict: null,
};

import type { SpeedTestSnapshot, SpeedTestVerdict } from './types';

const GAUGE_MIN_MBPS = 0.1;
const GAUGE_MAX_MBPS = 1000;

export const bytesToMbps = (bytes: number, elapsedMs: number): number => {
  if (bytes <= 0 || elapsedMs <= 0) return 0;
  return (bytes * 8) / (elapsedMs * 1000);
};

export const formatMbps = (value: number | null): string => {
  if (value == null || Number.isNaN(value)) return '—';
  if (value < 0.1) return value.toFixed(2);
  if (value < 10) return value.toFixed(1);
  if (value < 100) return value.toFixed(1);
  return Math.round(value).toString();
};

export const formatMs = (value: number | null): string => {
  if (value == null || Number.isNaN(value)) return '—';
  return Math.round(value).toString();
};

export const mbpsToGauge = (mbps: number | null): number => {
  if (mbps == null || mbps <= 0) return 0;
  const clamped = Math.min(GAUGE_MAX_MBPS, Math.max(GAUGE_MIN_MBPS, mbps));
  return Math.log10(clamped / GAUGE_MIN_MBPS) / Math.log10(GAUGE_MAX_MBPS / GAUGE_MIN_MBPS);
};

export const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

export const meanAbsoluteDeviation = (values: number[], center: number): number => {
  if (values.length === 0) return 0;
  const total = values.reduce((sum, value) => sum + Math.abs(value - center), 0);
  return total / values.length;
};

export const getSpeedTestVerdict = (
  snapshot: Pick<SpeedTestSnapshot, 'pingMs' | 'jitterMs' | 'downloadMbps' | 'uploadMbps'>,
): SpeedTestVerdict => {
  const ping = snapshot.pingMs ?? Number.POSITIVE_INFINITY;
  const jitter = snapshot.jitterMs ?? Number.POSITIVE_INFINITY;
  const down = snapshot.downloadMbps ?? 0;
  const up = snapshot.uploadMbps;

  if (up == null) {
    if (down >= 8 && ping < 60 && jitter < 15) return 'good';
    if (down >= 1.5 && ping < 150) return 'fair';
    return 'poor';
  }
  if (down >= 20 && up >= 5 && ping < 40 && jitter < 10) return 'excellent';
  if (down >= 5 && up >= 1.5 && ping < 80) return 'good';
  if (down >= 1 && up >= 0.5 && ping < 150) return 'fair';
  return 'poor';
};

export type MeetingFitLevel = 'good' | 'ok' | 'poor' | 'unknown';

export type MeetingAdviceSummaryKey =
  | 'reportExcellent'
  | 'reportGood'
  | 'reportWatchOk'
  | 'reportLimited'
  | 'reportPoor'
  | 'reportPartial';

export interface MeetingAdvice {
  watching: MeetingFitLevel;
  presenting: MeetingFitLevel;
  screenshare: MeetingFitLevel;
  summaryKey: MeetingAdviceSummaryKey;
  tone: SpeedTestVerdict;
}

const fitWatching = (down: number, ping: number): MeetingFitLevel => {
  if (down >= 2 && ping < 150) return 'good';
  if (down >= 0.8 && ping < 250) return 'ok';
  return 'poor';
};

const fitPresenting = (
  up: number | null,
  ping: number,
  jitter: number,
  uploadMissing: boolean,
): MeetingFitLevel => {
  if (uploadMissing || up == null) return 'unknown';
  if (up >= 1.5 && ping < 120 && jitter < 40) return 'good';
  if (up >= 0.6 && ping < 200) return 'ok';
  return 'poor';
};

const fitScreenshare = (
  up: number | null,
  down: number,
  ping: number,
  jitter: number,
  uploadMissing: boolean,
): MeetingFitLevel => {
  if (uploadMissing || up == null) return 'unknown';
  if (up >= 2.5 && down >= 2 && ping < 100 && jitter < 30) return 'good';
  if (up >= 1 && ping < 180) return 'ok';
  return 'poor';
};

const pickSummary = (
  watching: MeetingFitLevel,
  presenting: MeetingFitLevel,
  screenshare: MeetingFitLevel,
  uploadMissing: boolean,
): MeetingAdviceSummaryKey => {
  if (uploadMissing) return 'reportPartial';
  if (watching === 'poor') return 'reportPoor';
  if (watching === 'ok' && presenting !== 'good') return 'reportLimited';
  if (presenting === 'poor') return 'reportWatchOk';
  if (screenshare !== 'good' || presenting !== 'good') return 'reportGood';
  return 'reportExcellent';
};

export const toneForSummary = (summaryKey: MeetingAdviceSummaryKey): SpeedTestVerdict => {
  if (summaryKey === 'reportExcellent') return 'excellent';
  if (summaryKey === 'reportGood') return 'good';
  if (summaryKey === 'reportPoor') return 'poor';
  return 'fair';
};

export const getMeetingAdvice = (
  snapshot: Pick<SpeedTestSnapshot, 'pingMs' | 'jitterMs' | 'downloadMbps' | 'uploadMbps' | 'uploadIncomplete'>,
): MeetingAdvice => {
  const ping = snapshot.pingMs ?? Number.POSITIVE_INFINITY;
  const jitter = snapshot.jitterMs ?? Number.POSITIVE_INFINITY;
  const down = snapshot.downloadMbps ?? 0;
  const up = snapshot.uploadMbps;
  const uploadMissing = Boolean(snapshot.uploadIncomplete) || up == null;
  const watching = fitWatching(down, ping);
  const presenting = fitPresenting(up, ping, jitter, uploadMissing);
  const screenshare = fitScreenshare(up, down, ping, jitter, uploadMissing);
  const summaryKey = pickSummary(watching, presenting, screenshare, uploadMissing);

  return {
    watching,
    presenting,
    screenshare,
    summaryKey,
    tone: toneForSummary(summaryKey),
  };
};

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
  const up = snapshot.uploadMbps ?? 0;

  if (down >= 20 && up >= 5 && ping < 40 && jitter < 10) return 'excellent';
  if (down >= 5 && up >= 1.5 && ping < 80) return 'good';
  if (down >= 1 && up >= 0.5 && ping < 150) return 'fair';
  return 'poor';
};

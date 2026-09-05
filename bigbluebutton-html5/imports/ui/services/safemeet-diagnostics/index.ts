import Auth from '/imports/ui/services/auth';

type DiagnosticValue = string | number | boolean | null;
type DiagnosticData = Record<string, DiagnosticValue>;

interface DiagnosticEvent {
  timestamp: string;
  logCode: string;
  data: DiagnosticData;
}

interface DiagnosticsConfig {
  enabled: boolean;
  endpoint: string;
  sampleIntervalMs: number;
  longTaskThresholdMs: number;
  eventLoopStallThresholdMs: number;
  ringBufferSize: number;
}

const DIAGNOSTICS_VERSION = 'safemeet-diagnostics/v1';
const MAX_PAYLOAD_BYTES = 60 * 1024;
const MAX_STRING_LENGTH = 4096;
const DEFAULT_CONFIG: DiagnosticsConfig = {
  enabled: false,
  endpoint: '/safemeet-client-log',
  sampleIntervalMs: 15000,
  longTaskThresholdMs: 200,
  eventLoopStallThresholdMs: 1000,
  ringBufferSize: 200,
};

const SECRET_QUERY_PATTERN = /([?&](?:sessionToken|authToken|token|checksum|logoutURL)=)[^&#\s]*/gi;
const URL_PATTERN = /https?:\/\/[^\s)]+/gi;

const redactString = (value: string) => value
  .replace(SECRET_QUERY_PATTERN, '$1[redacted]')
  .replace(URL_PATTERN, (url) => {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return '[redacted-url]';
    }
  })
  .slice(0, MAX_STRING_LENGTH);

const sanitizeData = (data: Record<string, unknown> = {}): DiagnosticData => Object.entries(data)
  .reduce<DiagnosticData>((safe, [key, value]) => {
    let normalized: DiagnosticValue | undefined;
    if (typeof value === 'string') normalized = redactString(value);
    else if (typeof value === 'number' && Number.isFinite(value)) normalized = value;
    else if (typeof value === 'boolean' || value === null) normalized = value;
    return normalized === undefined ? safe : { ...safe, [key]: normalized };
  }, {});

const safeResourcePath = (value?: string | null) => {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    return `${url.origin === window.location.origin ? '' : url.origin}${url.pathname}`;
  } catch {
    return '';
  }
};

class SafeMeetDiagnostics {
  private config: DiagnosticsConfig = DEFAULT_CONFIG;

  private events: DiagnosticEvent[] = [];

  private flushInFlight = false;

  private started = false;

  private stallTimer: number | null = null;

  private sampleTimer: number | null = null;

  private longTaskObserver: PerformanceObserver | null = null;

  private expectedHeartbeat = 0;

  private lastLongTaskRecordMs = 0;

  private context: DiagnosticData = {};

  private readonly handleError = (event: Event) => {
    if (event instanceof ErrorEvent) {
      this.record('runtime_error', {
        name: event.error?.name || 'Error',
        message: event.message || event.error?.message || 'Unknown runtime error',
        stack: event.error?.stack || '',
        path: safeResourcePath(event.filename),
        line: event.lineno || 0,
        column: event.colno || 0,
      });
      this.flush();
      return;
    }

    const { target } = event;
    if (target instanceof HTMLElement) {
      this.record('resource_load_error', {
        tag: target.tagName.toLowerCase(),
        path: safeResourcePath(
          target.getAttribute('src') || target.getAttribute('href'),
        ),
      });
    }
  };

  private readonly handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const { reason } = event;
    this.record('unhandled_rejection', {
      name: reason?.name || 'UnhandledRejection',
      message: reason?.message || String(reason || 'Unknown rejection'),
      stack: reason?.stack || '',
    });
    this.flush();
  };

  private readonly handleVisibility = () => {
    this.record('page_visibility_changed', { state: document.visibilityState });
    if (document.visibilityState === 'hidden') {
      this.pauseTimers();
      this.stopLongTaskObserver();
      this.flush(true);
      return;
    }
    this.startLongTaskObserver();
    this.resumeTimers();
  };

  private readonly handlePageHide = () => {
    this.record('page_hidden', { persisted: false });
    this.flush(true);
  };

  private static getConfig(): DiagnosticsConfig {
    const configured = window.meetingClientSettings?.public?.safemeetDiagnostics;
    return {
      ...DEFAULT_CONFIG,
      ...configured,
      endpoint: configured?.endpoint || DEFAULT_CONFIG.endpoint,
      sampleIntervalMs: Math.max(5000, configured?.sampleIntervalMs || DEFAULT_CONFIG.sampleIntervalMs),
      longTaskThresholdMs: Math.max(50, configured?.longTaskThresholdMs || DEFAULT_CONFIG.longTaskThresholdMs),
      eventLoopStallThresholdMs: Math.max(
        250,
        configured?.eventLoopStallThresholdMs || DEFAULT_CONFIG.eventLoopStallThresholdMs,
      ),
      ringBufferSize: Math.min(500, Math.max(20, configured?.ringBufferSize || DEFAULT_CONFIG.ringBufferSize)),
    };
  }

  start() {
    if (this.started) return;
    this.config = SafeMeetDiagnostics.getConfig();
    if (!this.config.enabled) return;

    this.started = true;
    this.record('diagnostics_started', SafeMeetDiagnostics.getRuntimeSnapshot());
    window.addEventListener('error', this.handleError, true);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
    document.addEventListener('visibilitychange', this.handleVisibility);
    window.addEventListener('pagehide', this.handlePageHide);

    this.startLongTaskObserver();
    this.startTimers();
  }

  private startLongTaskObserver() {
    if (this.longTaskObserver || !('PerformanceObserver' in window)) return;
    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        if (document.visibilityState === 'hidden') return;
        let longest = 0;
        let startTimeMs = 0;
        list.getEntries().forEach((entry) => {
          if (entry.duration >= this.config.longTaskThresholdMs && entry.duration > longest) {
            longest = entry.duration;
            startTimeMs = entry.startTime;
          }
        });
        const now = performance.now();
        if (longest > 0 && now - this.lastLongTaskRecordMs >= 1000) {
          this.lastLongTaskRecordMs = now;
          this.record('main_thread_long_task', {
            durationMs: Math.round(longest),
            startTimeMs: Math.round(startTimeMs),
          });
        }
      });
      this.longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch {
      this.longTaskObserver = null;
    }
  }

  private stopLongTaskObserver() {
    this.longTaskObserver?.disconnect();
    this.longTaskObserver = null;
  }

  private startTimers() {
    if (this.stallTimer !== null || this.sampleTimer !== null) return;
    const heartbeatInterval = 1000;
    this.expectedHeartbeat = Date.now() + heartbeatInterval;
    this.stallTimer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      const drift = now - this.expectedHeartbeat;
      this.expectedHeartbeat = now + heartbeatInterval;
      if (drift >= this.config.eventLoopStallThresholdMs) {
        this.record('event_loop_stall_recovered', { durationMs: drift });
        this.flush();
      }
    }, heartbeatInterval);

    this.sampleTimer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      this.record('runtime_sample', SafeMeetDiagnostics.getRuntimeSnapshot());
      this.flush();
    }, this.config.sampleIntervalMs);
  }

  private pauseTimers() {
    if (this.stallTimer !== null) window.clearInterval(this.stallTimer);
    if (this.sampleTimer !== null) window.clearInterval(this.sampleTimer);
    this.stallTimer = null;
    this.sampleTimer = null;
  }

  private resumeTimers() {
    if (!this.started) return;
    this.startTimers();
  }

  stop() {
    if (!this.started) return;
    this.record('diagnostics_stopped');
    this.flush(true);
    this.started = false;
    window.removeEventListener('error', this.handleError, true);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    window.removeEventListener('pagehide', this.handlePageHide);
    this.pauseTimers();
    this.stopLongTaskObserver();
  }

  record(logCode: string, data: Record<string, unknown> = {}) {
    if (!this.started && logCode !== 'diagnostics_started') return;
    this.events.push({
      timestamp: new Date().toISOString(),
      logCode: redactString(logCode).slice(0, 128),
      data: sanitizeData(data),
    });
    if (this.events.length > this.config.ringBufferSize) {
      this.events.splice(0, this.events.length - this.config.ringBufferSize);
    }
  }

  setContext(context: Record<string, unknown>) {
    this.context = sanitizeData(context);
    this.record('meeting_context_changed', this.context);
  }

  private static getRuntimeSnapshot(): DiagnosticData {
    const { memory } = performance as Performance & { memory?: { usedJSHeapSize?: number } };
    return {
      visibility: document.visibilityState,
      orientation: window.matchMedia?.('(orientation: landscape)').matches ? 'landscape' : 'portrait',
      viewportWidth: Math.round(window.innerWidth),
      viewportHeight: Math.round(window.innerHeight),
      devicePixelRatio: window.devicePixelRatio || 1,
      online: navigator.onLine,
      usedJSHeapSize: memory?.usedJSHeapSize || 0,
    };
  }

  private buildPayload(events: DiagnosticEvent[]) {
    return {
      version: DIAGNOSTICS_VERSION,
      identity: {
        meetingId: Auth.meetingID || 'unknown',
        requesterUserId: Auth.userID || 'unknown',
        clientSessionUUID: sessionStorage.getItem('clientSessionUUID') || '0',
        clientBuild: window.meetingClientSettings?.public?.app?.html5ClientBuild || 'unknown',
        role: typeof this.context.role === 'string' ? this.context.role : 'unknown',
      },
      device: {
        userAgent: redactString(navigator.userAgent),
        platform: redactString(navigator.platform || 'unknown'),
        touchPoints: navigator.maxTouchPoints || 0,
        viewportWidth: Math.round(window.innerWidth),
        viewportHeight: Math.round(window.innerHeight),
        orientation: window.matchMedia?.('(orientation: landscape)').matches ? 'landscape' : 'portrait',
      },
      events,
    };
  }

  flush(useBeacon = false) {
    if (!this.started || this.events.length === 0 || this.flushInFlight) return;

    let eventCount = this.events.length;
    let payload = this.buildPayload(this.events.slice(0, eventCount));
    let body = JSON.stringify(payload);
    const encodedLength = (value: string) => new TextEncoder().encode(value).byteLength;
    while (encodedLength(body) > MAX_PAYLOAD_BYTES && eventCount > 1) {
      eventCount = Math.ceil(eventCount / 2);
      payload = this.buildPayload(this.events.slice(0, eventCount));
      body = JSON.stringify(payload);
    }

    const pending = this.events.splice(0, eventCount);
    if (useBeacon && navigator.sendBeacon) {
      const sent = navigator.sendBeacon(
        this.config.endpoint,
        new Blob([body], { type: 'application/json' }),
      );
      if (!sent) this.events.unshift(...pending);
      return;
    }

    this.flushInFlight = true;
    fetch(this.config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      credentials: 'same-origin',
      keepalive: true,
    }).then((response) => {
      if (!response.ok) throw new Error(`Diagnostics collector returned ${response.status}`);
    }).catch(() => {
      this.events.unshift(...pending);
      if (this.events.length > this.config.ringBufferSize) {
        this.events.splice(0, this.events.length - this.config.ringBufferSize);
      }
    }).finally(() => {
      this.flushInFlight = false;
    });
  }
}

const diagnostics = new SafeMeetDiagnostics();

export const startSafeMeetDiagnostics = () => diagnostics.start();
export const stopSafeMeetDiagnostics = () => diagnostics.stop();
export const recordSafeMeetDiagnostic = (
  logCode: string,
  data: Record<string, unknown> = {},
) => diagnostics.record(logCode, data);
export const flushSafeMeetDiagnostics = () => diagnostics.flush();
export const setSafeMeetDiagnosticsContext = (context: Record<string, unknown>) => diagnostics.setContext(context);

export default diagnostics;

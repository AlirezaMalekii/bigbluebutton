import deviceInfo from '/imports/utils/deviceInfo';
import {
  PROTECTION_STAGES,
  classifyPerformanceSample,
  createProtectionState,
  detectInitialProtectionStage,
  protectionVideoLimit,
  resolveProtectionStage,
  updateProtectionState,
  type PerformanceProtectionStage,
  type ProtectionState,
} from './performance-profile-policy';

const PERFORMANCE_TIER_ATTRIBUTE = 'data-skyroom-performance-tier';
const PROTECTION_STAGE_ATTRIBUTE = 'data-skyroom-protection-stage';
export const SKYROOM_PERFORMANCE_TIER_EVENT = 'safemeetPerformanceTierChanged';
export const SKYROOM_PERFORMANCE_SAMPLE_EVENT = 'safemeetPerformanceSampleRequested';

type PerformanceTier = 'standard' | 'low';
export type PerformanceMode = 'auto' | 'low' | 'standard';

type NavigatorWithPerformanceHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

let currentTier: PerformanceTier = 'standard';
let currentProtectionStage: PerformanceProtectionStage = PROTECTION_STAGES.none;
let initialProtectionStage: PerformanceProtectionStage = PROTECTION_STAGES.none;
let protectionState: ProtectionState = createProtectionState();
let persistentLongTasks = false;
let publishPressureConfirmed = false;
let longTaskDurationMs = 0;
let longTaskObserver: PerformanceObserver | null = null;
let sampleTimer: ReturnType<typeof setInterval> | null = null;
let recoveryTimer: ReturnType<typeof setTimeout> | null = null;
let phoneMediaQuery: MediaQueryList | null = null;
let mediaQueryListener: (() => void) | null = null;
let visibilityListener: (() => void) | null = null;
let started = false;
let userMode: PerformanceMode | undefined;
let warmupUntil = 0;
let expectedSampleAt = 0;
let lastSampleAt = 0;
let latestMediaWorkRatio: number | null = null;
let latestMediaWorkAt = 0;

const DEFAULT_SETTINGS = {
  enabled: true,
  mode: 'auto',
  adaptiveProtectionEnabled: true,
  mobilePublishProtectionEnabled: false,
  mobilePublishQualityMaxEdge: 480,
  mobilePublishQualityMaxFrameRate: 15,
  mobilePublishModerateMaxEdge: 480,
  mobilePublishModerateMaxFrameRate: 10,
  mobilePublishHighMaxEdge: 320,
  mobilePublishHighMaxFrameRate: 10,
  mobileDecoderBudget: 4,
  desktopLowPowerDecoderBudget: 9,
  lowPowerHardwareConcurrency: 4,
  lowPowerDeviceMemoryGb: 4,
  strongLowPowerHardwareConcurrency: 2,
  strongLowPowerDeviceMemoryGb: 2,
  sampleIntervalMs: 5000,
  initialWarmupMs: 60000,
  resumeWarmupMs: 20000,
  pressureLongTaskRatio: 0.3,
  recoveryLongTaskRatio: 0.08,
  pressureEventLoopLagMs: 300,
  recoveryEventLoopLagMs: 100,
  pressureMediaWorkRatio: 0.7,
  recoveryMediaWorkRatio: 0.45,
  pressureSampleCount: 6,
  recoverySampleCount: 12,
  moderateDecoderBudget: 3,
  highDecoderBudget: 2,
  handoffGraceMs: 2000,
  longTaskThresholdMs: 200,
  longTaskCountThreshold: 3,
  longTaskWindowMs: 30000,
  recoveryQuietMs: 60000,
};

const getSettings = () => ({
  ...DEFAULT_SETTINGS,
  ...window.meetingClientSettings?.public?.safemeetPerformance,
  ...(userMode ? { mode: userMode } : {}),
});

const normalizePositive = (value: number, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeBudget = (value: number, fallback: number) => (
  Math.floor(normalizePositive(value, fallback))
);

const isPhoneViewport = () => (
  typeof window !== 'undefined' && window.matchMedia('(max-width: 599px)').matches
);

const supportsLongTasks = () => (
  typeof PerformanceObserver === 'function'
  && PerformanceObserver.supportedEntryTypes?.includes('longtask') === true
);

const detectLegacyTier = (): PerformanceTier => {
  const settings = getSettings();
  if (isPhoneViewport() || persistentLongTasks) return 'low';
  const navigatorWithHints = navigator as NavigatorWithPerformanceHints;
  const hardwareConcurrency = Number(navigatorWithHints.hardwareConcurrency) || 0;
  const deviceMemory = Number(navigatorWithHints.deviceMemory) || 0;
  return (
    navigatorWithHints.connection?.saveData === true
    || (hardwareConcurrency > 0
      && hardwareConcurrency <= settings.lowPowerHardwareConcurrency)
    || (deviceMemory > 0 && deviceMemory <= settings.lowPowerDeviceMemoryGb)
  ) ? 'low' : 'standard';
};

const configuredInitialStage = (): PerformanceProtectionStage => {
  const settings = getSettings();
  if (!settings.adaptiveProtectionEnabled || settings.mode !== 'auto') {
    return PROTECTION_STAGES.none;
  }
  const navigatorWithHints = navigator as NavigatorWithPerformanceHints;
  return detectInitialProtectionStage({
    deviceMemory: navigatorWithHints.deviceMemory,
    hardwareConcurrency: navigatorWithHints.hardwareConcurrency,
    strongDeviceMemoryGb: settings.strongLowPowerDeviceMemoryGb,
    strongHardwareConcurrency: settings.strongLowPowerHardwareConcurrency,
    combinedDeviceMemoryGb: settings.lowPowerDeviceMemoryGb,
    combinedHardwareConcurrency: settings.lowPowerHardwareConcurrency,
  });
};

export const getSkyroomProtectionStage = (): PerformanceProtectionStage => {
  const settings = getSettings();
  if (!settings.enabled) return PROTECTION_STAGES.none;
  return resolveProtectionStage({
    adaptiveEnabled: settings.adaptiveProtectionEnabled,
    automaticStage: protectionState.stage,
    mode: settings.mode,
  });
};

export const detectSkyroomPerformanceTier = (): PerformanceTier => {
  const settings = getSettings();
  if (!settings.enabled || settings.mode === 'standard') return 'standard';
  if (settings.mode === 'low') return 'low';
  if (settings.adaptiveProtectionEnabled) {
    return getSkyroomProtectionStage() === PROTECTION_STAGES.none ? 'standard' : 'low';
  }
  return detectLegacyTier();
};

const applyProfile = (forceNotify = false) => {
  const nextTier = detectSkyroomPerformanceTier();
  const nextStage = getSkyroomProtectionStage();
  const changed = nextTier !== currentTier || nextStage !== currentProtectionStage;
  currentTier = nextTier;
  currentProtectionStage = nextStage;
  [document.documentElement, document.getElementById('layout')].forEach((element) => {
    if (!element) return;
    if (element.getAttribute(PERFORMANCE_TIER_ATTRIBUTE) !== nextTier) {
      element.setAttribute(PERFORMANCE_TIER_ATTRIBUTE, nextTier);
    }
    if (element.getAttribute(PROTECTION_STAGE_ATTRIBUTE) !== nextStage) {
      element.setAttribute(PROTECTION_STAGE_ATTRIBUTE, nextStage);
    }
  });
  if (changed || forceNotify) {
    window.dispatchEvent(new CustomEvent(SKYROOM_PERFORMANCE_TIER_EVENT, {
      detail: { tier: nextTier, stage: nextStage },
    }));
  }
};

const stopMonitoring = () => {
  longTaskObserver?.disconnect();
  longTaskObserver = null;
  if (sampleTimer) clearInterval(sampleTimer);
  sampleTimer = null;
  if (recoveryTimer) clearTimeout(recoveryTimer);
  recoveryTimer = null;
  longTaskDurationMs = 0;
};

const scheduleLegacyRecovery = () => {
  if (recoveryTimer) clearTimeout(recoveryTimer);
  if (!persistentLongTasks || document.visibilityState === 'hidden') return;
  const settings = getSettings();
  recoveryTimer = setTimeout(() => {
    recoveryTimer = null;
    persistentLongTasks = false;
    applyProfile();
  }, Math.max(settings.longTaskWindowMs, normalizePositive(settings.recoveryQuietMs, 60000)));
};

const applyAdaptiveSample = () => {
  const settings = getSettings();
  const now = performance.now();
  const sampleIntervalMs = normalizePositive(settings.sampleIntervalMs, 5000);
  const eventLoopLagMs = Math.max(0, now - expectedSampleAt);
  expectedSampleAt = now + sampleIntervalMs;
  const longTaskSupported = supportsLongTasks();
  // Drain entries queued before this timer so they belong to this sample.
  collectLongTasks(longTaskObserver?.takeRecords() ?? []);
  const longTaskRatio = Math.min(1, longTaskDurationMs / Math.max(1, now - lastSampleAt));
  const warmingUp = lastSampleAt < warmupUntil;
  lastSampleAt = now;
  longTaskDurationMs = 0;

  const mainThread = classifyPerformanceSample({
    eventLoopLagMs,
    longTaskRatio,
    longTaskSupported,
    pressureEventLoopLagMs: settings.pressureEventLoopLagMs,
    pressureLongTaskRatio: settings.pressureLongTaskRatio,
    recoveryEventLoopLagMs: settings.recoveryEventLoopLagMs,
    recoveryLongTaskRatio: settings.recoveryLongTaskRatio,
    visible: document.visibilityState !== 'hidden',
    warmingUp,
  });
  const mediaFresh = deviceInfo.isPhone && settings.mobilePublishProtectionEnabled
    && latestMediaWorkRatio !== null
    && now - latestMediaWorkAt <= sampleIntervalMs * 2.5;
  const pressured = mainThread.pressured
    || (mediaFresh && latestMediaWorkRatio! >= settings.pressureMediaWorkRatio);
  const recovered = mainThread.recovered
    && (!mediaFresh || latestMediaWorkRatio! < settings.recoveryMediaWorkRatio);
  const nextState = updateProtectionState({
    state: protectionState,
    pressured,
    recovered,
    minimumStage: initialProtectionStage,
    pressureSampleCount: normalizeBudget(settings.pressureSampleCount, 6),
    recoverySampleCount: normalizeBudget(settings.recoverySampleCount, 12),
  });
  let publishChanged = false;
  if (deviceInfo.isPhone && settings.mobilePublishProtectionEnabled && !publishPressureConfirmed
    && pressured && protectionState.pressureSamples + 1 >= settings.pressureSampleCount) {
    publishPressureConfirmed = true;
    publishChanged = true;
    // Hardware hints must not skip the first measured quality-only stage.
    nextState.stage = PROTECTION_STAGES.quality;
  }
  if (nextState.stage === PROTECTION_STAGES.none) publishPressureConfirmed = false;
  const changed = nextState.stage !== protectionState.stage || publishChanged;
  protectionState = nextState;
  if (changed) applyProfile();
  window.dispatchEvent(new CustomEvent(SKYROOM_PERFORMANCE_SAMPLE_EVENT, { detail: null }));
};

export const reportSkyroomMediaWorkRatio = (ratio: number | null) => {
  if (ratio === null || !Number.isFinite(ratio) || ratio < 0) {
    latestMediaWorkRatio = null;
    latestMediaWorkAt = 0;
    return;
  }
  latestMediaWorkRatio = ratio;
  latestMediaWorkAt = performance.now();
};

const collectLongTasks = (entries: PerformanceEntry[]) => {
  if (document.visibilityState === 'hidden') return;
  const windowStart = Math.max(lastSampleAt, warmupUntil);
  entries.forEach((entry) => {
    // Exclude startup work and stale entries delivered after a transition.
    longTaskDurationMs += Math.max(0, entry.startTime + entry.duration
      - Math.max(windowStart, entry.startTime));
  });
};

const startMonitoring = (warmupMs: number) => {
  const settings = getSettings();
  if (
    !settings.enabled
    || settings.mode !== 'auto'
    || document.visibilityState === 'hidden'
  ) return;

  // Resume notifications can repeat; retain exactly one observer and timer.
  stopMonitoring();
  protectionState = { ...protectionState, pressureSamples: 0, recoverySamples: 0 };
  lastSampleAt = performance.now();
  warmupUntil = Math.max(warmupUntil, lastSampleAt + normalizePositive(warmupMs, 20000));

  if (settings.adaptiveProtectionEnabled) {
    if (supportsLongTasks()) {
      longTaskObserver = new PerformanceObserver((list) => {
        collectLongTasks(list.getEntries());
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    }
    const sampleIntervalMs = normalizePositive(settings.sampleIntervalMs, 5000);
    expectedSampleAt = performance.now() + sampleIntervalMs;
    sampleTimer = setInterval(applyAdaptiveSample, sampleIntervalMs);
    return;
  }

  if (!supportsLongTasks()) return;
  const longTaskTimes: number[] = [];
  longTaskObserver = new PerformanceObserver((list) => {
    if (document.visibilityState === 'hidden') return;
    const now = performance.now();
    let hadLongTask = false;
    list.getEntries().forEach((entry) => {
      if (entry.duration >= settings.longTaskThresholdMs) {
        longTaskTimes.push(entry.startTime + entry.duration);
        hadLongTask = true;
      }
    });
    while (longTaskTimes[0] < now - settings.longTaskWindowMs) longTaskTimes.shift();
    if (!persistentLongTasks && longTaskTimes.length >= settings.longTaskCountThreshold) {
      persistentLongTasks = true;
      applyProfile();
    }
    if (hadLongTask) scheduleLegacyRecovery();
  });
  longTaskObserver.observe({ entryTypes: ['longtask'] });
};

export const markSkyroomPerformanceTransition = () => {
  if (!started) return;
  const settings = getSettings();
  stopMonitoring();
  protectionState = {
    ...protectionState,
    pressureSamples: 0,
    recoverySamples: 0,
  };
  startMonitoring(settings.resumeWarmupMs);
};

const handleVisibility = () => {
  const settings = getSettings();
  if (document.visibilityState === 'hidden') {
    stopMonitoring();
    return;
  }
  startMonitoring(settings.resumeWarmupMs);
};

export const startSkyroomPerformanceProfile = () => {
  if (started) return;
  started = true;
  const settings = getSettings();
  initialProtectionStage = configuredInitialStage();
  protectionState = createProtectionState(initialProtectionStage);
  currentProtectionStage = protectionState.stage;
  applyProfile(true);
  phoneMediaQuery = window.matchMedia('(max-width: 599px)');
  mediaQueryListener = () => applyProfile();
  phoneMediaQuery.addEventListener?.('change', mediaQueryListener);
  visibilityListener = handleVisibility;
  document.addEventListener('visibilitychange', visibilityListener);
  startMonitoring(settings.initialWarmupMs);
};

export const stopSkyroomPerformanceProfile = () => {
  if (phoneMediaQuery && mediaQueryListener) {
    phoneMediaQuery.removeEventListener?.('change', mediaQueryListener);
  }
  if (visibilityListener) document.removeEventListener('visibilitychange', visibilityListener);
  stopMonitoring();
  phoneMediaQuery = null;
  mediaQueryListener = null;
  visibilityListener = null;
  persistentLongTasks = false;
  currentTier = 'standard';
  currentProtectionStage = PROTECTION_STAGES.none;
  initialProtectionStage = PROTECTION_STAGES.none;
  protectionState = createProtectionState();
  started = false;
  publishPressureConfirmed = false;
  userMode = undefined;
  warmupUntil = 0;
  latestMediaWorkRatio = null;
  latestMediaWorkAt = 0;
  document.documentElement.removeAttribute(PERFORMANCE_TIER_ATTRIBUTE);
  document.documentElement.removeAttribute(PROTECTION_STAGE_ATTRIBUTE);
  document.getElementById('layout')?.removeAttribute(PERFORMANCE_TIER_ATTRIBUTE);
  document.getElementById('layout')?.removeAttribute(PROTECTION_STAGE_ATTRIBUTE);
};

export const getSkyroomActiveVideoLimit = () => {
  const settings = getSettings();
  if (!settings.enabled || settings.mode === 'standard') return Number.POSITIVE_INFINITY;
  const baseLimit = isPhoneViewport()
    ? normalizeBudget(settings.mobileDecoderBudget, 4)
    : Number.POSITIVE_INFINITY;
  if (settings.adaptiveProtectionEnabled) {
    return protectionVideoLimit({
      baseLimit,
      highLimit: normalizeBudget(settings.highDecoderBudget, 2),
      moderateLimit: normalizeBudget(settings.moderateDecoderBudget, 3),
      stage: getSkyroomProtectionStage(),
    });
  }
  if (isPhoneViewport()) return baseLimit;
  return detectSkyroomPerformanceTier() === 'low'
    ? normalizeBudget(settings.desktopLowPowerDecoderBudget, 9)
    : Number.POSITIVE_INFINITY;
};

export const getSkyroomCameraHandoffGraceMs = () => {
  const settings = getSettings();
  return settings.adaptiveProtectionEnabled
    ? normalizePositive(settings.handoffGraceMs, 2000)
    : 120;
};

export const shouldConstrainSkyroomCameraQuality = () => {
  const settings = getSettings();
  if (!settings.enabled || settings.mode === 'standard') return false;
  return settings.adaptiveProtectionEnabled
    ? getSkyroomProtectionStage() !== PROTECTION_STAGES.none
    : detectSkyroomPerformanceTier() === 'low';
};

export const getSkyroomPerformanceTier = (): PerformanceTier => (
  (document.documentElement.getAttribute(PERFORMANCE_TIER_ATTRIBUTE) as PerformanceTier)
  || detectSkyroomPerformanceTier()
);

export const getSkyroomPerformanceMode = (): PerformanceMode => {
  const { mode } = getSettings();
  return mode === 'low' || mode === 'standard' ? mode : 'auto';
};

export const setSkyroomPerformanceMode = (mode: PerformanceMode) => {
  if (mode !== 'auto' && mode !== 'low' && mode !== 'standard') return;
  userMode = mode;
  publishPressureConfirmed = false;
  persistentLongTasks = false;
  stopMonitoring();
  initialProtectionStage = configuredInitialStage();
  protectionState = createProtectionState(
    mode === 'low' ? PROTECTION_STAGES.moderate : initialProtectionStage,
  );
  currentProtectionStage = protectionState.stage;
  applyProfile(true);
  if (started) startMonitoring(getSettings().resumeWarmupMs);
};

// BBB deviceInfo supplies phone identity independently of orientation.
export const getSkyroomMobilePublishCap = (isPhone: boolean) => {
  const settings = getSettings();
  if (!isPhone || !settings.enabled || !settings.adaptiveProtectionEnabled
    || !settings.mobilePublishProtectionEnabled || settings.mode === 'standard'
    || (settings.mode !== 'low' && !publishPressureConfirmed)) return null;
  const stage = getSkyroomProtectionStage();
  if (stage === 'none') return null;
  const prefix = ({ high: 'High', moderate: 'Moderate', quality: 'Quality' } as const)[stage];
  return {
    maxEdge: normalizePositive(settings[`mobilePublish${prefix}MaxEdge`], stage === 'high' ? 320 : 480),
    maxFrameRate: normalizePositive(settings[`mobilePublish${prefix}MaxFrameRate`], stage === 'quality' ? 15 : 10),
  };
};

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

const DEFAULT_SETTINGS = {
  enabled: true,
  mode: 'auto',
  adaptiveProtectionEnabled: true,
  mobileDecoderBudget: 4,
  desktopLowPowerDecoderBudget: 9,
  lowPowerHardwareConcurrency: 4,
  lowPowerDeviceMemoryGb: 4,
  strongLowPowerHardwareConcurrency: 2,
  strongLowPowerDeviceMemoryGb: 2,
  sampleIntervalMs: 5000,
  initialWarmupMs: 20000,
  resumeWarmupMs: 10000,
  pressureLongTaskRatio: 0.2,
  recoveryLongTaskRatio: 0.08,
  pressureEventLoopLagMs: 200,
  recoveryEventLoopLagMs: 100,
  pressureSampleCount: 3,
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
  const longTaskRatio = Math.min(1, longTaskDurationMs / sampleIntervalMs);
  longTaskDurationMs = 0;

  const { pressured, recovered } = classifyPerformanceSample({
    eventLoopLagMs,
    longTaskRatio,
    longTaskSupported,
    pressureEventLoopLagMs: settings.pressureEventLoopLagMs,
    pressureLongTaskRatio: settings.pressureLongTaskRatio,
    recoveryEventLoopLagMs: settings.recoveryEventLoopLagMs,
    recoveryLongTaskRatio: settings.recoveryLongTaskRatio,
    visible: document.visibilityState !== 'hidden',
    warmingUp: now < warmupUntil,
  });
  const nextState = updateProtectionState({
    state: protectionState,
    pressured,
    recovered,
    minimumStage: initialProtectionStage,
    pressureSampleCount: normalizeBudget(settings.pressureSampleCount, 3),
    recoverySampleCount: normalizeBudget(settings.recoverySampleCount, 12),
  });
  const changed = nextState.stage !== protectionState.stage;
  protectionState = nextState;
  if (changed) applyProfile();
};

const startMonitoring = (warmupMs: number) => {
  const settings = getSettings();
  if (
    !settings.enabled
    || settings.mode !== 'auto'
    || document.visibilityState === 'hidden'
  ) return;

  warmupUntil = performance.now() + normalizePositive(warmupMs, 10000);

  if (settings.adaptiveProtectionEnabled) {
    if (supportsLongTasks()) {
      longTaskObserver = new PerformanceObserver((list) => {
        if (document.visibilityState === 'hidden') return;
        list.getEntries().forEach((entry) => {
          longTaskDurationMs += entry.duration;
        });
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
  userMode = undefined;
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

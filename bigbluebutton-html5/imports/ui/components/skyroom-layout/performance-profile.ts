const PERFORMANCE_TIER_ATTRIBUTE = 'data-skyroom-performance-tier';
export const SKYROOM_PERFORMANCE_TIER_EVENT = 'safemeetPerformanceTierChanged';

type PerformanceTier = 'standard' | 'low';

type NavigatorWithPerformanceHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

let currentTier: PerformanceTier = 'standard';
let persistentLongTasks = false;
let longTaskObserver: PerformanceObserver | null = null;
let phoneMediaQuery: MediaQueryList | null = null;
let mediaQueryListener: (() => void) | null = null;
let visibilityListener: (() => void) | null = null;

const DEFAULT_SETTINGS = {
  enabled: true,
  mode: 'auto',
  mobileDecoderBudget: 4,
  desktopLowPowerDecoderBudget: 9,
  lowPowerHardwareConcurrency: 4,
  lowPowerDeviceMemoryGb: 4,
  longTaskThresholdMs: 200,
  longTaskCountThreshold: 3,
  longTaskWindowMs: 30000,
};

const getSettings = () => ({
  ...DEFAULT_SETTINGS,
  ...window.meetingClientSettings?.public?.safemeetPerformance,
});

const normalizeBudget = (value: number, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const isPhoneViewport = () => (
  typeof window !== 'undefined' && window.matchMedia('(max-width: 599px)').matches
);

export const detectSkyroomPerformanceTier = (): PerformanceTier => {
  const settings = getSettings();
  if (!settings.enabled || settings.mode === 'standard') return 'standard';
  if (settings.mode === 'low') return 'low';
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

const applyTier = () => {
  const nextTier = detectSkyroomPerformanceTier();
  const changed = nextTier !== currentTier;
  currentTier = nextTier;
  document.documentElement.setAttribute(PERFORMANCE_TIER_ATTRIBUTE, nextTier);
  document.getElementById('layout')?.setAttribute(PERFORMANCE_TIER_ATTRIBUTE, nextTier);
  if (changed) {
    window.dispatchEvent(new CustomEvent(SKYROOM_PERFORMANCE_TIER_EVENT, {
      detail: { tier: nextTier },
    }));
  }
};

const stopLongTaskObserver = () => {
  longTaskObserver?.disconnect();
  longTaskObserver = null;
};

const startLongTaskObserver = () => {
  const settings = getSettings();
  if (
    longTaskObserver
    || settings.mode !== 'auto'
    || typeof PerformanceObserver !== 'function'
    || !PerformanceObserver.supportedEntryTypes?.includes('longtask')
  ) return;

  const longTaskTimes: number[] = [];
  longTaskObserver = new PerformanceObserver((list) => {
    if (document.visibilityState === 'hidden') return;
    const now = performance.now();
    list.getEntries().forEach((entry) => {
      if (entry.duration >= settings.longTaskThresholdMs) longTaskTimes.push(now);
    });
    while (longTaskTimes[0] < now - settings.longTaskWindowMs) longTaskTimes.shift();
    if (!persistentLongTasks && longTaskTimes.length >= settings.longTaskCountThreshold) {
      persistentLongTasks = true;
      applyTier();
    }
  });
  longTaskObserver.observe({ entryTypes: ['longtask'] });
};

const handleVisibility = () => {
  if (document.visibilityState === 'hidden') {
    stopLongTaskObserver();
    return;
  }
  startLongTaskObserver();
};

export const startSkyroomPerformanceProfile = () => {
  applyTier();
  phoneMediaQuery = window.matchMedia('(max-width: 599px)');
  mediaQueryListener = () => applyTier();
  phoneMediaQuery.addEventListener?.('change', mediaQueryListener);
  visibilityListener = handleVisibility;
  document.addEventListener('visibilitychange', visibilityListener);
  startLongTaskObserver();
};

export const stopSkyroomPerformanceProfile = () => {
  if (phoneMediaQuery && mediaQueryListener) {
    phoneMediaQuery.removeEventListener?.('change', mediaQueryListener);
  }
  if (visibilityListener) {
    document.removeEventListener('visibilitychange', visibilityListener);
  }
  stopLongTaskObserver();
  phoneMediaQuery = null;
  mediaQueryListener = null;
  visibilityListener = null;
  persistentLongTasks = false;
  currentTier = 'standard';
  document.documentElement.removeAttribute(PERFORMANCE_TIER_ATTRIBUTE);
  document.getElementById('layout')?.removeAttribute(PERFORMANCE_TIER_ATTRIBUTE);
};

export const getSkyroomActiveVideoLimit = () => {
  const settings = getSettings();
  if (!settings.enabled) return Number.POSITIVE_INFINITY;
  if (isPhoneViewport()) return normalizeBudget(settings.mobileDecoderBudget, 4);
  const tier = document.documentElement.getAttribute(PERFORMANCE_TIER_ATTRIBUTE)
    || detectSkyroomPerformanceTier();
  if (tier === 'low') {
    return normalizeBudget(settings.desktopLowPowerDecoderBudget, 9);
  }
  return Number.POSITIVE_INFINITY;
};

export const getSkyroomPerformanceTier = (): PerformanceTier => (
  (document.documentElement.getAttribute(PERFORMANCE_TIER_ATTRIBUTE) as PerformanceTier)
  || detectSkyroomPerformanceTier()
);

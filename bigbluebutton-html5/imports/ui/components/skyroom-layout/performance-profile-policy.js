export const PROTECTION_STAGES = {
  none: 'none',
  quality: 'quality',
  moderate: 'moderate',
  high: 'high',
};

const STAGE_ORDER = [
  PROTECTION_STAGES.none,
  PROTECTION_STAGES.quality,
  PROTECTION_STAGES.moderate,
  PROTECTION_STAGES.high,
];

const positiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const stageRank = (stage) => Math.max(0, STAGE_ORDER.indexOf(stage));

export const maxProtectionStage = (left, right) => (
  stageRank(left) >= stageRank(right) ? left : right
);

export const detectInitialProtectionStage = ({
  deviceMemory,
  hardwareConcurrency,
  strongDeviceMemoryGb = 2,
  strongHardwareConcurrency = 2,
  combinedDeviceMemoryGb = 4,
  combinedHardwareConcurrency = 4,
}) => {
  const memory = positiveNumber(deviceMemory);
  const concurrency = positiveNumber(hardwareConcurrency);
  const strongMemorySignal = memory > 0 && memory <= strongDeviceMemoryGb;
  const strongConcurrencySignal = concurrency > 0 && concurrency <= strongHardwareConcurrency;
  const combinedSignals = memory > 0
    && concurrency > 0
    && memory <= combinedDeviceMemoryGb
    && concurrency <= combinedHardwareConcurrency;

  return strongMemorySignal || strongConcurrencySignal || combinedSignals
    ? PROTECTION_STAGES.quality
    : PROTECTION_STAGES.none;
};

export const createProtectionState = (minimumStage = PROTECTION_STAGES.none) => ({
  stage: minimumStage,
  pressureSamples: 0,
  recoverySamples: 0,
});

export const resolveProtectionStage = ({ adaptiveEnabled, automaticStage, mode }) => {
  if (!adaptiveEnabled || mode === 'standard') return PROTECTION_STAGES.none;
  if (mode === 'low') return PROTECTION_STAGES.moderate;
  return automaticStage;
};

export const classifyPerformanceSample = ({
  eventLoopLagMs,
  longTaskRatio,
  longTaskSupported,
  pressureEventLoopLagMs = 200,
  pressureLongTaskRatio = 0.2,
  recoveryEventLoopLagMs = 100,
  recoveryLongTaskRatio = 0.08,
  visible = true,
  warmingUp = false,
}) => {
  if (!visible || warmingUp) return { pressured: false, recovered: false };
  return longTaskSupported
    ? {
      pressured: longTaskRatio >= pressureLongTaskRatio,
      recovered: longTaskRatio < recoveryLongTaskRatio,
    }
    : {
      pressured: eventLoopLagMs >= pressureEventLoopLagMs,
      recovered: eventLoopLagMs < recoveryEventLoopLagMs,
    };
};

export const updateProtectionState = ({
  state,
  pressured,
  recovered,
  minimumStage = PROTECTION_STAGES.none,
  pressureSampleCount = 3,
  recoverySampleCount = 12,
}) => {
  let pressureSamples = pressured ? state.pressureSamples + 1 : 0;
  let recoverySamples = recovered ? state.recoverySamples + 1 : 0;
  let stage = maxProtectionStage(state.stage, minimumStage);

  if (pressureSamples >= pressureSampleCount) {
    stage = STAGE_ORDER[Math.min(STAGE_ORDER.length - 1, stageRank(stage) + 1)];
    pressureSamples = 0;
    recoverySamples = 0;
  } else if (recoverySamples >= recoverySampleCount) {
    stage = STAGE_ORDER[Math.max(stageRank(minimumStage), stageRank(stage) - 1)];
    pressureSamples = 0;
    recoverySamples = 0;
  }

  return { stage, pressureSamples, recoverySamples };
};

export const protectionVideoLimit = ({
  baseLimit,
  highLimit = 2,
  moderateLimit = 3,
  stage,
}) => {
  let stageLimit = Number.POSITIVE_INFINITY;
  if (stage === PROTECTION_STAGES.high) stageLimit = highLimit;
  if (stage === PROTECTION_STAGES.moderate) stageLimit = moderateLimit;
  return Math.min(baseLimit, stageLimit);
};

export type PerformanceProtectionStage = 'none' | 'quality' | 'moderate' | 'high';

export type ProtectionState = {
  stage: PerformanceProtectionStage;
  pressureSamples: number;
  recoverySamples: number;
};

export const PROTECTION_STAGES: Record<PerformanceProtectionStage, PerformanceProtectionStage>;
export function stageRank(stage: PerformanceProtectionStage): number;
export function maxProtectionStage(
  left: PerformanceProtectionStage,
  right: PerformanceProtectionStage,
): PerformanceProtectionStage;
export function detectInitialProtectionStage(args: {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  strongDeviceMemoryGb?: number;
  strongHardwareConcurrency?: number;
  combinedDeviceMemoryGb?: number;
  combinedHardwareConcurrency?: number;
}): PerformanceProtectionStage;
export function createProtectionState(minimumStage?: PerformanceProtectionStage): ProtectionState;
export function resolveProtectionStage(args: {
  adaptiveEnabled: boolean;
  automaticStage: PerformanceProtectionStage;
  mode: 'auto' | 'low' | 'standard';
}): PerformanceProtectionStage;
export function classifyPerformanceSample(args: {
  eventLoopLagMs: number;
  longTaskRatio: number;
  longTaskSupported: boolean;
  pressureEventLoopLagMs?: number;
  pressureLongTaskRatio?: number;
  recoveryEventLoopLagMs?: number;
  recoveryLongTaskRatio?: number;
  visible?: boolean;
  warmingUp?: boolean;
}): { pressured: boolean; recovered: boolean };
export function updateProtectionState(args: {
  state: ProtectionState;
  pressured: boolean;
  recovered: boolean;
  minimumStage?: PerformanceProtectionStage;
  pressureSampleCount?: number;
  recoverySampleCount?: number;
}): ProtectionState;
export function protectionVideoLimit(args: {
  baseLimit: number;
  highLimit?: number;
  moderateLimit?: number;
  stage: PerformanceProtectionStage;
}): number;

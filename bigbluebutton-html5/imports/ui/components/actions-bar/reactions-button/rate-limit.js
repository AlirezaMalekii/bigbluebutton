const DEFAULT_MAX_PER_WINDOW = 5;
const DEFAULT_WINDOW_SECONDS = 60;

const getRateLimitConfig = () => {
  const cfg = window.meetingClientSettings?.public?.userReaction?.rateLimit || {};
  return {
    enabled: cfg.enabled !== false,
    maxPerWindow: typeof cfg.maxPerWindow === 'number' && cfg.maxPerWindow > 0
      ? cfg.maxPerWindow
      : DEFAULT_MAX_PER_WINDOW,
    windowSeconds: typeof cfg.windowSeconds === 'number' && cfg.windowSeconds > 0
      ? cfg.windowSeconds
      : DEFAULT_WINDOW_SECONDS,
  };
};

/** Sliding window of successful reaction send timestamps (ms). */
const sendTimestamps = [];

/**
 * @returns {{ allowed: true }
 *   | { allowed: false, retryAfterSeconds: number, maxPerWindow: number, windowSeconds: number }}
 */
export const checkReactionRateLimit = () => {
  const { enabled, maxPerWindow, windowSeconds } = getRateLimitConfig();

  if (!enabled) {
    return { allowed: true };
  }

  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  while (sendTimestamps.length > 0 && now - sendTimestamps[0] >= windowMs) {
    sendTimestamps.shift();
  }

  if (sendTimestamps.length >= maxPerWindow) {
    const oldest = sendTimestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    return {
      allowed: false,
      retryAfterSeconds,
      maxPerWindow,
      windowSeconds,
    };
  }

  return { allowed: true };
};

/**
 * Record a successful reaction send. Call only after mutation succeeds.
 */
export const consumeReactionRateLimit = () => {
  const check = checkReactionRateLimit();
  if (!check.allowed) return check;

  sendTimestamps.push(Date.now());
  return { allowed: true };
};

/** Remove the most recent slot (e.g. when mutation fails after consume). */
export const releaseReactionRateLimitSlot = () => {
  if (sendTimestamps.length > 0) {
    sendTimestamps.pop();
  }
};

export default {
  checkReactionRateLimit,
  consumeReactionRateLimit,
  releaseReactionRateLimitSlot,
};

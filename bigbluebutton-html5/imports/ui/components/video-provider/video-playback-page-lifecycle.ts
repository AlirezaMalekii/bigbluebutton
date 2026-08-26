type VideoPlaybackPageLifecycleSubscriber = () => void;

const subscribers = new Set<VideoPlaybackPageLifecycleSubscriber>();
let listenersAttached = false;
let resumeFrame: number | null = null;
let resumeQueue: VideoPlaybackPageLifecycleSubscriber[] = [];

const ACTIVE_RESUME_BATCH_SIZE = 8;

const isVideoPlaybackPageActive = () => (
  typeof document !== 'undefined'
  && document.visibilityState !== 'hidden'
);

const requestResumeFrame = (callback: FrameRequestCallback): number => (
  typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame(callback)
    : window.setTimeout(() => callback(performance.now()), 16)
);

const cancelResumeNotifications = () => {
  resumeQueue = [];
  if (resumeFrame === null) return;
  if (typeof window.cancelAnimationFrame === 'function') {
    window.cancelAnimationFrame(resumeFrame);
  } else {
    window.clearTimeout(resumeFrame);
  }
  resumeFrame = null;
};

const flushResumeNotifications = () => {
  resumeFrame = null;
  if (!isVideoPlaybackPageActive()) {
    resumeQueue = [];
    return;
  }

  const batch = resumeQueue.splice(0, ACTIVE_RESUME_BATCH_SIZE);
  batch.forEach((subscriber) => {
    if (subscribers.has(subscriber)) subscriber();
  });

  if (resumeQueue.length > 0) {
    resumeFrame = requestResumeFrame(flushResumeNotifications);
  }
};

const notifySubscribers = () => {
  if (!isVideoPlaybackPageActive()) {
    // Suspending timers is cheap and should happen immediately. Resuming every
    // video at once, however, creates a decode/attach spike on tab focus.
    cancelResumeNotifications();
    Array.from(subscribers).forEach((subscriber) => subscriber());
    return;
  }

  // visibilitychange, focus and pageshow often arrive together. Coalesce them
  // and resume a small number of tiles per animation frame.
  if (resumeFrame !== null || resumeQueue.length > 0) return;
  resumeQueue = Array.from(subscribers);
  if (resumeQueue.length > 0) {
    resumeFrame = requestResumeFrame(flushResumeNotifications);
  }
};

const attachListeners = () => {
  if (listenersAttached || typeof window === 'undefined' || typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', notifySubscribers);
  window.addEventListener('focus', notifySubscribers);
  window.addEventListener('pageshow', notifySubscribers);
  listenersAttached = true;
};

const detachListeners = () => {
  if (!listenersAttached || typeof window === 'undefined' || typeof document === 'undefined') return;
  document.removeEventListener('visibilitychange', notifySubscribers);
  window.removeEventListener('focus', notifySubscribers);
  window.removeEventListener('pageshow', notifySubscribers);
  listenersAttached = false;
  cancelResumeNotifications();
};

const subscribeToVideoPlaybackPageLifecycle = (
  subscriber: VideoPlaybackPageLifecycleSubscriber,
) => {
  subscribers.add(subscriber);
  attachListeners();

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) detachListeners();
  };
};

export {
  isVideoPlaybackPageActive,
  subscribeToVideoPlaybackPageLifecycle,
};

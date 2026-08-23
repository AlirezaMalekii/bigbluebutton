type VideoPlaybackPageLifecycleSubscriber = () => void;

const subscribers = new Set<VideoPlaybackPageLifecycleSubscriber>();
let listenersAttached = false;

const notifySubscribers = () => {
  Array.from(subscribers).forEach((subscriber) => subscriber());
};

const attachListeners = () => {
  if (listenersAttached || typeof window === 'undefined' || typeof document === 'undefined') return;
  document.addEventListener('visibilitychange', notifySubscribers);
  window.addEventListener('focus', notifySubscribers);
  window.addEventListener('blur', notifySubscribers);
  window.addEventListener('pageshow', notifySubscribers);
  listenersAttached = true;
};

const detachListeners = () => {
  if (!listenersAttached || typeof window === 'undefined' || typeof document === 'undefined') return;
  document.removeEventListener('visibilitychange', notifySubscribers);
  window.removeEventListener('focus', notifySubscribers);
  window.removeEventListener('blur', notifySubscribers);
  window.removeEventListener('pageshow', notifySubscribers);
  listenersAttached = false;
};

const isVideoPlaybackPageActive = () => (
  typeof document !== 'undefined'
  && document.visibilityState !== 'hidden'
  && document.hasFocus()
);

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

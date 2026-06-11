type LoadingListener = (active: boolean) => void;

const BOOTSTRAP_SOURCE = 'bootstrap';

/** Keeps the overlay visible from module load until the first real phase registers. */
const activeSources = new Set<string>([BOOTSTRAP_SOURCE]);
const listeners = new Set<LoadingListener>();

let notifyScheduled = false;

const flushListeners = (): void => {
  notifyScheduled = false;
  const isActive = activeSources.size > 0;
  listeners.forEach((listener) => listener(isActive));
};

const scheduleNotify = (): void => {
  if (notifyScheduled) return;
  notifyScheduled = true;
  queueMicrotask(flushListeners);
};

export const setSkyroomLoadingSource = (source: string, active: boolean): void => {
  if (active && source !== BOOTSTRAP_SOURCE) {
    activeSources.delete(BOOTSTRAP_SOURCE);
  }

  if (active) {
    activeSources.add(source);
  } else {
    activeSources.delete(source);
  }

  scheduleNotify();
};

export const isSkyroomLoadingActive = (): boolean => activeSources.size > 0;

export const subscribeSkyroomLoading = (listener: LoadingListener): (() => void) => {
  listeners.add(listener);
  listener(activeSources.size > 0);
  return () => listeners.delete(listener);
};

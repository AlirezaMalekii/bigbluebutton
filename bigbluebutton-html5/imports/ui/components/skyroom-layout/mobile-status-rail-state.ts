/**
 * Skyroom mobile — reserved space for poll/timer status rail above the top box.
 * Height is measured by the rail component; layout reads it synchronously.
 */

export const SKYROOM_MOBILE_STATUS_RAIL_GAP = 1;
/** Fallback until the rail mounts and reports its measured height. */
export const SKYROOM_MOBILE_STATUS_RAIL_FALLBACK = 40;

export const SKYROOM_MOBILE_STATUS_RAIL_EVENT = 'skyroom-mobile-status-rail';

let active = false;
let measuredHeight = 0;
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((fn) => fn());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SKYROOM_MOBILE_STATUS_RAIL_EVENT));
  }
};

export const isSkyroomMobileStatusRailActive = (): boolean => active;

export const setSkyroomMobileStatusRailActive = (next: boolean): void => {
  if (active === next) return;
  active = next;
  if (!next) measuredHeight = 0;
  notify();
};

export const setSkyroomMobileStatusRailMeasuredHeight = (heightPx: number): void => {
  const next = heightPx > 0 ? heightPx : 0;
  if (measuredHeight === next) return;
  measuredHeight = next;
  notify();
};

export const getSkyroomMobileStatusRailOffset = (): number => {
  if (!active) return 0;
  const railH = measuredHeight > 0 ? measuredHeight : SKYROOM_MOBILE_STATUS_RAIL_FALLBACK;
  return railH + SKYROOM_MOBILE_STATUS_RAIL_GAP;
};

export const subscribeSkyroomMobileStatusRail = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const resetSkyroomMobileStatusRail = (): void => {
  active = false;
  measuredHeight = 0;
};

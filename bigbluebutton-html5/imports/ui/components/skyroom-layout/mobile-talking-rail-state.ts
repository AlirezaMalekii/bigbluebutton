/**
 * Skyroom mobile — reserved space for active-speaker rail above poll/timer status rail.
 * Height is measured by the rail component; layout reads it synchronously.
 */

export const SKYROOM_MOBILE_TALKING_RAIL_GAP = 1;
/** Fallback until the rail mounts and reports its measured height. */
export const SKYROOM_MOBILE_TALKING_RAIL_FALLBACK = 32;

export const SKYROOM_MOBILE_TALKING_RAIL_EVENT = 'skyroom-mobile-talking-rail';

let active = false;
let measuredHeight = 0;
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((fn) => fn());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SKYROOM_MOBILE_TALKING_RAIL_EVENT));
  }
};

export const isSkyroomMobileTalkingRailActive = (): boolean => active;

export const setSkyroomMobileTalkingRailActive = (next: boolean): void => {
  if (active === next) return;
  active = next;
  if (!next) measuredHeight = 0;
  notify();
};

export const setSkyroomMobileTalkingRailMeasuredHeight = (heightPx: number): void => {
  const next = heightPx > 0 ? heightPx : 0;
  if (measuredHeight === next) return;
  measuredHeight = next;
  notify();
};

export const getSkyroomMobileTalkingRailOffset = (): number => {
  if (!active) return 0;
  const railH = measuredHeight > 0 ? measuredHeight : SKYROOM_MOBILE_TALKING_RAIL_FALLBACK;
  return railH + SKYROOM_MOBILE_TALKING_RAIL_GAP;
};

export const subscribeSkyroomMobileTalkingRail = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const resetSkyroomMobileTalkingRail = (): void => {
  active = false;
  measuredHeight = 0;
};

/**
 * Skyroom mobile — which zone (if any) is expanded to fill the content area.
 * `top` = stage box; `bottom` = chat / users / webcams / notes box.
 */

export type SkyroomMobileZoneFullscreen = 'top' | 'bottom' | null;

export const SKYROOM_MOBILE_ZONE_FS_EVENT = 'skyroom-mobile-zone-fs';

let expandedZone: SkyroomMobileZoneFullscreen = null;
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((fn) => fn());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SKYROOM_MOBILE_ZONE_FS_EVENT));
  }
};

export const getSkyroomMobileZoneFullscreen = (): SkyroomMobileZoneFullscreen => expandedZone;

export const setSkyroomMobileZoneFullscreen = (zone: SkyroomMobileZoneFullscreen): void => {
  if (expandedZone === zone) return;
  expandedZone = zone;
  notify();
};

export const toggleSkyroomMobileZoneFullscreen = (zone: Exclude<SkyroomMobileZoneFullscreen, null>): void => {
  setSkyroomMobileZoneFullscreen(expandedZone === zone ? null : zone);
};

export const subscribeSkyroomMobileZoneFullscreen = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

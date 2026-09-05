export interface MobileWebcamGrid {
  cellHeight: number;
  cellWidth: number;
  columns: number;
  filledArea: number;
  height: number;
  rows: number;
  width: number;
}

export { computeMobileScrollableWebcamGrid } from '/imports/ui/components/video-provider/mobile-webcam-grid-policy';

const readInlinePx = (element: HTMLElement | null, name: string) => {
  if (!element) return 0;
  const value = parseFloat(element.style.getPropertyValue(name));
  return Number.isFinite(value) && value > 1 ? value : 0;
};

/** Prefer a measured dock, then layout bounds, then the Skyroom zone CSS vars. */
export const resolveMobileWebcamDockSize = (
  measuredWidth = 0,
  measuredHeight = 0,
  fallbackWidth = 0,
  fallbackHeight = 0,
) => {
  const layoutEl = typeof document !== 'undefined'
    ? document.getElementById('layout')
    : null;
  const cssWidth = readInlinePx(layoutEl, '--skyroom-mobile-bottom-width')
    || readInlinePx(layoutEl, '--skyroom-mobile-top-width');
  const cssHeight = readInlinePx(layoutEl, '--skyroom-mobile-bottom-height')
    || readInlinePx(layoutEl, '--skyroom-mobile-top-height');
  let width = cssWidth;
  if (measuredWidth > 1) width = measuredWidth;
  else if (fallbackWidth > 1) width = fallbackWidth;

  let height = cssHeight;
  if (measuredHeight > 1) height = measuredHeight;
  else if (fallbackHeight > 1) height = fallbackHeight;

  return { width, height };
};

import { debounce } from '/imports/utils/debounce';

/**
 * Coalesce Skyroom layout resize signals — many subsystems used to dispatch
 * synchronous window "resize" events, which retriggers the full layout engine
 * and can freeze low-end mobile browsers during tab switches.
 */
const dispatchResize = debounce(
  () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('resize'));
    }
  },
  120,
  { leading: true, trailing: true },
);

export const dispatchSkyroomLayoutResize = (): void => {
  dispatchResize();
};

/** Use sparingly when a panel must settle on the next frame (first tab tap). */
export const dispatchSkyroomLayoutResizeNextFrame = (): void => {
  if (typeof window === 'undefined') return;
  window.requestAnimationFrame(() => dispatchSkyroomLayoutResize());
};

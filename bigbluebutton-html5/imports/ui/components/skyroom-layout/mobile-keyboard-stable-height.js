/**
 * Skyroom phone layout height = the visible viewport, not 100dvh/clientHeight.
 *
 * Android often keeps the layout viewport full while the keyboard covers the
 * bottom. The engine must size chat/tabs/actions from visualViewport.height so
 * the first focus matches the packed composer state (not only after send).
 */

import { resolveMobileLayoutHeight } from './mobile-keyboard-viewport-utils';

const SKYROOM_PHONE_MAX_WIDTH = 599;

const readLayoutHeight = () => (
  typeof window === 'undefined'
    ? 0
    : (window.document.documentElement?.clientHeight || window.innerHeight || 0)
);

const isSkyroomPhoneLayout = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const width = window.document.documentElement?.clientWidth || window.innerWidth || 0;
  if (width > SKYROOM_PHONE_MAX_WIDTH) return false;
  const layoutEl = document.getElementById('layout');
  return Boolean(
    layoutEl?.hasAttribute('data-skyroom-column')
    || layoutEl?.hasAttribute('data-skyroom-mobile'),
  );
};

export const getSkyroomMobileLayoutHeight = (fallbackHeight) => {
  const fallback = Math.max(0, Number(fallbackHeight) || readLayoutHeight());
  if (!isSkyroomPhoneLayout()) return fallback;
  const visual = typeof window !== 'undefined' ? window.visualViewport : null;
  return resolveMobileLayoutHeight({
    visualHeight: visual?.height || 0,
    layoutHeight: fallback,
  });
};

/** @deprecated Use getSkyroomMobileLayoutHeight — kept for existing imports. */
export const getSkyroomStableLayoutHeight = getSkyroomMobileLayoutHeight;

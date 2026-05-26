import data from '@emoji-mart/data';
import { init } from 'emoji-mart';
import logger from '/imports/startup/client/logger';
import useMeeting from '../../core/hooks/useMeeting';

export function useMeetingIsBreakout() {
  const { data: meeting } = useMeeting((m) => ({
    isBreakout: m.isBreakout,
  }));

  return meeting && meeting.isBreakout;
}

/**
 * Skyroom theme integration:
 * BBB upstream uses the `darkreader` library to invert the page at
 * runtime when dark mode is toggled. That destroys our brand palette
 * (#0D887E / #070B14) by inverting it.
 *
 * We replace the implementation with a declarative `[data-theme]`
 * attribute on <html>. Our stylesheet at
 * `public/stylesheets/skyroom/theme.css` reacts to that attribute and
 * applies the correct CSS variables for either theme.
 *
 * The public function signature (`setDarkTheme(boolean)` and
 * `isDarkThemeEnabled()`) is preserved so callers across the BBB
 * codebase keep working unchanged — minimizing merge conflicts with
 * upstream releases.
 */
const SKYROOM_THEME_STORAGE_KEY = 'skyroom-theme';

/** Skyroom ships dark-only; BBB still calls setDarkTheme(boolean) upstream. */
export const setDarkTheme = () => {
  const root = document?.documentElement;
  if (!root) return;

  if (root.getAttribute('data-theme') === 'dark') return;

  root.setAttribute('data-theme', 'dark');

  try {
    window.localStorage.setItem(SKYROOM_THEME_STORAGE_KEY, 'dark');
  } catch {
    // localStorage may be unavailable (private mode / quota) — non-fatal.
  }

  logger.info({ logCode: 'dark_mode' }, 'Theme set to dark (Skyroom dark-only).');
  window.dispatchEvent(
    new CustomEvent('darkmodechange', { detail: { enabled: true } }),
  );
};

export const isDarkThemeEnabled = () => (
  document?.documentElement?.getAttribute('data-theme') === 'dark'
);

export const initializeEmojiData = () => {
  const DISABLE_EMOJIS = window.meetingClientSettings.public.chat.disableEmojis;
  const emojis = Object.values(data.emojis);
  const allowedEmojis = {};

  // We manually filter it here because there's a bug in the Picker component.
  // See: https://github.com/missive/emoji-mart/issues/810
  const filteredEmojis = emojis.filter((e) => !DISABLE_EMOJIS.includes(e.id));

  filteredEmojis.forEach((e) => {
    allowedEmojis[e.id] = e;
  });

  const filteredData = {
    ...data,
    emojis: allowedEmojis,
  };

  init({ data: filteredData });
};

export default {
  setDarkTheme,
  isDarkThemeEnabled,
  useMeetingIsBreakout,
  initializeEmojiData,
};

/**
 * useSkyroomTheme
 * ---------------------------------------------------------------
 * Thin wrapper around BBB's existing `application.darkTheme` user
 * setting. We deliberately do NOT manipulate the `data-theme`
 * attribute here — that is owned by `AppService.setDarkTheme`,
 * which already runs every time `darkTheme` flips (see
 * `App.componentDidUpdate` -> `renderDarkMode` in
 * `imports/ui/components/app/component.jsx`).
 *
 * Responsibilities:
 *   1. Read the current `darkTheme` value via `useSettings`.
 *   2. On toggle, persist the new value through BBB's standard
 *      `updateSettings` pipeline (storage + GraphQL mutation +
 *      reactive var). This guarantees the rest of BBB (settings
 *      panel, presentation theme, video-preview, etc.) stays in
 *      sync.
 *   3. Mirror the chosen value to a `skyroom-theme` localStorage
 *      key so the inline boot script in `client/main.html` can
 *      paint the correct theme on the *very first* frame without
 *      a flash of unstyled background.
 *
 * This keeps the component fully decoupled from the dark-reader
 * legacy implementation and 100% aligned with BBB's settings
 * model — meaning future upstream changes to `darkTheme` semantics
 * propagate to us for free.
 */

import { useCallback } from 'react';
import useSettings from '/imports/ui/services/settings/hooks/useSettings';
import useUserChangedLocalSettings from '/imports/ui/services/settings/hooks/useUserChangedLocalSettings';
import { SETTINGS } from '/imports/ui/services/settings/enums';
import { updateSettings } from '/imports/ui/components/settings/service';

export const SKYROOM_THEME_STORAGE_KEY = 'skyroom-theme';

export type SkyroomTheme = 'dark' | 'light';

interface UseSkyroomThemeReturn {
  isDark: boolean;
  theme: SkyroomTheme;
  toggle: () => void;
  setTheme: (next: SkyroomTheme) => void;
}

const useSkyroomTheme = (): UseSkyroomThemeReturn => {
  const application = useSettings(SETTINGS.APPLICATION) as
    | { darkTheme?: boolean }
    | undefined;

  const setLocalSettings = useUserChangedLocalSettings();

  const isDark = Boolean(application?.darkTheme);

  const setTheme = useCallback(
    (next: SkyroomTheme) => {
      const nextIsDark = next === 'dark';

      try {
        window.localStorage.setItem(SKYROOM_THEME_STORAGE_KEY, next);
      } catch {
        // localStorage may be unavailable (private mode / quota) — non-fatal.
      }

      updateSettings(
        {
          application: {
            ...(application || {}),
            darkTheme: nextIsDark,
          },
        },
        null,
        setLocalSettings,
      );
    },
    [application, setLocalSettings],
  );

  const toggle = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  return {
    isDark,
    theme: isDark ? 'dark' : 'light',
    toggle,
    setTheme,
  };
};

export default useSkyroomTheme;

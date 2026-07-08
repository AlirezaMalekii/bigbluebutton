import logger from '/imports/startup/client/logger';
import { ScreenRect } from './types';

type ScreenLike = {
  left: number;
  top: number;
  width: number;
  height: number;
  availLeft?: number;
  availTop?: number;
  availWidth?: number;
  availHeight?: number;
  isPrimary?: boolean;
  label?: string;
};

const MARGIN = 20;

const isPointInScreen = (x: number, y: number, screen: ScreenLike): boolean => (
  x >= screen.left
  && x < screen.left + screen.width
  && y >= screen.top
  && y < screen.top + screen.height
);

const toPlacementRect = (screen: ScreenLike): ScreenRect => {
  const left = typeof screen.availLeft === 'number' ? screen.availLeft : screen.left;
  const top = typeof screen.availTop === 'number' ? screen.availTop : screen.top;
  const width = typeof screen.availWidth === 'number' ? screen.availWidth : screen.width;
  const height = typeof screen.availHeight === 'number' ? screen.availHeight : screen.height;
  return {
    left,
    top,
    width,
    height,
  };
};

/**
 * Best-effort: place the overlay on the shared display (usually the non-meeting monitor).
 * Browsers cannot always reveal which exact display was picked in getDisplayMedia.
 */
export const resolveSharedScreenPlacement = async (
  stream?: MediaStream | null,
): Promise<ScreenRect | null> => {
  const track = stream?.getVideoTracks()?.[0];
  const settings = track?.getSettings?.() as MediaTrackSettings & {
    displaySurface?: string;
    screen?: ScreenLike;
  } | undefined;

  // Some Chromium builds expose the Screen object on the capture track.
  if (settings?.screen && typeof settings.screen.left === 'number') {
    return toPlacementRect(settings.screen);
  }

  const meetingX = window.screenX ?? window.screenLeft ?? 0;
  const meetingY = window.screenY ?? window.screenTop ?? 0;

  const { getScreenDetails } = window as unknown as {
    getScreenDetails?: () => Promise<{ screens: ScreenLike[]; currentScreen: ScreenLike }>;
  };

  if (typeof getScreenDetails === 'function') {
    try {
      const details = await getScreenDetails();

      const screens = details.screens || [];
      if (screens.length === 0) return null;

      const meetingScreen = screens.find((s) => isPointInScreen(meetingX, meetingY, s))
        || details.currentScreen
        || screens[0];

      // Full-monitor share with multi-display: prefer a screen other than the meeting window's.
      if (settings?.displaySurface === 'monitor' && screens.length > 1) {
        const other = screens.find((s) => s !== meetingScreen) || meetingScreen;
        return toPlacementRect(other);
      }

      // Window/tab share: stay near meeting screen but still return a usable rect for corner placement.
      if (meetingScreen) return toPlacementRect(meetingScreen);

      return toPlacementRect(screens[0]);
    } catch (error) {
      logger.debug({
        logCode: 'screen_share_chat_overlay_screen_details_failed',
        extraInfo: {
          errorName: (error as Error).name,
          errorMessage: (error as Error).message,
        },
      }, 'Window Management getScreenDetails unavailable or denied');
    }
  }

  // Fallback without Screen Details: use CSSOM multi-monitor hints (availLeft/Top).
  const screen = window.screen as Screen & {
    availLeft?: number;
    availTop?: number;
  };

  const availLeft = typeof screen.availLeft === 'number' ? screen.availLeft : 0;
  const availTop = typeof screen.availTop === 'number' ? screen.availTop : 0;

  // If the meeting window sits on a secondary screen, prefer the primary (left≈0), and vice versa.
  if (Math.abs(meetingX) > 100 || Math.abs(meetingY) > 100) {
    return {
      left: 0,
      top: 0,
      width: screen.width,
      height: screen.height,
    };
  }

  if (availLeft !== 0 || availTop !== 0) {
    return {
      left: availLeft,
      top: availTop,
      width: screen.availWidth || screen.width,
      height: screen.availHeight || screen.height,
    };
  }

  return {
    left: availLeft,
    top: availTop,
    width: screen.availWidth || screen.width,
    height: screen.availHeight || screen.height,
  };
};

export const getOverlayCornerPosition = (
  screenRect: ScreenRect,
  width: number,
  height: number,
  isRTL = false,
): { left: number; top: number } => {
  const left = isRTL
    ? screenRect.left + MARGIN
    : screenRect.left + Math.max(MARGIN, screenRect.width - width - MARGIN);
  const top = screenRect.top + Math.max(MARGIN, screenRect.height - height - MARGIN);
  return { left, top };
};

export type OverlayMode = 'pip' | 'popup' | null;

/** closed = gone, open = full, compact = small (1–2 msgs), hidden = title bar only */
export type OverlayVisibility = 'closed' | 'open' | 'compact' | 'hidden';

export interface OverlayOpenOptions {
  isRTL: boolean;
  locale: string;
  messages: Record<string, string>;
}

export interface ScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface WindowDragState {
  startScreenX: number;
  startScreenY: number;
  startWinX: number;
  startWinY: number;
}

export const OVERLAY_DEFAULT_WIDTH = 360;
export const OVERLAY_DEFAULT_HEIGHT = 500;
export const OVERLAY_COMPACT_WIDTH = 300;
export const OVERLAY_COMPACT_HEIGHT = 190;
export const OVERLAY_COLLAPSED_HEIGHT = 44;
export const OVERLAY_POPUP_NAME = 'bbb-screen-share-chat-overlay';
export const OVERLAY_FULL_MESSAGE_LIMIT = 20;
export const OVERLAY_COMPACT_MESSAGE_LIMIT = 2;

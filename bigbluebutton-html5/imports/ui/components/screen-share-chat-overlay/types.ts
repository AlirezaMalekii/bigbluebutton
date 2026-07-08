export type OverlayMode = 'pip' | 'popup' | null;

export type OverlayVisibility = 'closed' | 'open' | 'hidden';

export interface OverlayOpenOptions {
  isRTL: boolean;
  locale: string;
  messages: Record<string, string>;
}

export interface WindowDragState {
  startScreenX: number;
  startScreenY: number;
  startWinX: number;
  startWinY: number;
}

export const OVERLAY_DEFAULT_WIDTH = 380;
export const OVERLAY_DEFAULT_HEIGHT = 520;
export const OVERLAY_COLLAPSED_HEIGHT = 48;
export const OVERLAY_POPUP_NAME = 'bbb-screen-share-chat-overlay';

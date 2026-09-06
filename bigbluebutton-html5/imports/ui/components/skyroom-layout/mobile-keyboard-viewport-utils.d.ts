export const KEYBOARD_HEIGHT_THRESHOLD_PX: number;
export const VIEWPORT_OFFSET_EPSILON_PX: number;

export function isEditableFocusTarget(target?: {
  nodeName?: string;
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
} | null): boolean;

export function resolveMobileLayoutHeight(input?: {
  visualHeight?: number;
  layoutHeight?: number;
}): number;

export function measureKeyboardInset(input?: {
  layoutHeight?: number;
  visualHeight?: number;
  visualOffsetTop?: number;
}): number;

export function isSoftKeyboardOpen(input?: {
  layoutHeight?: number;
  visualHeight?: number;
  visualOffsetTop?: number;
}): boolean;

export function hasStaleViewportOffset(input?: {
  scrollY?: number;
  visualOffsetTop?: number;
}): boolean;

export function shouldRestoreLayoutViewport(input?: {
  keyboardWasOpen?: boolean;
  keyboardIsOpen?: boolean;
  scrollY?: number;
  visualOffsetTop?: number;
}): boolean;

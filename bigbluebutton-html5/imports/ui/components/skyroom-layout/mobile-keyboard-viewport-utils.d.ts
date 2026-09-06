export const KEYBOARD_HEIGHT_THRESHOLD_PX: number;
export const VIEWPORT_OFFSET_EPSILON_PX: number;
export const LAYOUT_WIDTH_CHANGE_THRESHOLD_PX: number;

export function isEditableFocusTarget(target?: {
  nodeName?: string;
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
} | null): boolean;

export function shouldLockStableLayoutHeight(input?: {
  liveHeight?: number;
  cachedHeight?: number;
  liveWidth?: number;
  cachedWidth?: number;
  textInputFocused?: boolean;
  visualInset?: number;
}): boolean;

export function resolveStableLayoutHeight(input?: {
  liveHeight?: number;
  cachedHeight?: number;
  lockToCached?: boolean;
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

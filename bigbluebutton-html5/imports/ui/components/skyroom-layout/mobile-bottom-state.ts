/**
 * Skyroom mobile bottom-zone selection.
 *
 * On phones the layout is a vertical split: a top "stage" zone and a bottom zone
 * that shows exactly ONE box at a time — {webcams | chat | users | notes}.
 *
 * Selection semantics:
 * - `undefined` — nothing chosen yet → resolve may derive from live BBB panel flags
 * - `null` — user explicitly closed the bottom zone → resolve always returns null
 * - box key — explicit selection wins immediately
 *
 * Distinguishing unset from closed fixes re-tapping an active tab (which sets null)
 * so the bottom zone collapses and the top expands instead of falling back to an
 * still-open BBB panel flag.
 */

export type SkyroomMobileBox = 'webcams' | 'chat' | 'users' | 'notes' | 'breakout' | 'waiting' | null;

/** undefined = unset; null = explicitly closed; string = selected box */
let activeBox: SkyroomMobileBox | undefined;
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((fn) => fn());
};

export const getSkyroomMobileActiveBox = (): SkyroomMobileBox | undefined => activeBox;

export const setSkyroomMobileActiveBox = (box: SkyroomMobileBox): void => {
  if (activeBox === box) return;
  activeBox = box;
  notify();
};

export const subscribeSkyroomMobileBottom = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/**
 * Single source of truth for which box owns the bottom zone.
 * Explicit selection (including null = closed) ALWAYS wins. Fallback derivation
 * only runs when nothing has been chosen yet (activeBox === undefined).
 */
export const resolveSkyroomMobileBox = ({
  usersOpen,
  chatOpen,
  notesOpen,
  breakoutOpen = false,
  waitingUsersOpen = false,
}: {
  usersOpen: boolean;
  chatOpen: boolean;
  notesOpen: boolean;
  breakoutOpen?: boolean;
  waitingUsersOpen?: boolean;
}): SkyroomMobileBox => {
  if (activeBox !== undefined) return activeBox;

  // Fallback: derive from live state (external opens / initial state).
  if (notesOpen) return 'notes';
  if (breakoutOpen) return 'breakout';
  if (waitingUsersOpen) return 'waiting';
  if (usersOpen) return 'users';
  if (chatOpen) return 'chat';
  return null;
};

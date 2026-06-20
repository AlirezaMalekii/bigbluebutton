/**
 * Skyroom mobile bottom-zone selection.
 *
 * On phones the layout is a vertical split: a top "stage" zone and a bottom zone
 * that shows exactly ONE box at a time — {webcams | chat | users | notes}.
 *
 * The active box is tracked EXPLICITLY here (set by `openSkyroomMobileBox` / the tab
 * bar / the navbar toggles), and `resolveSkyroomMobileBox` prefers it whenever it's
 * still consistent with the underlying BBB state. This avoids the priority/timing
 * bugs of a pure 3-source derivation (e.g. switching notes→users used to strand on
 * notes). For boxes opened by external code (initial chat default, moderator's global
 * notes) the resolver falls back to the derived state so nothing is lost.
 */

export type SkyroomMobileBox = 'webcams' | 'chat' | 'users' | 'notes' | null;

let activeBox: SkyroomMobileBox = null;
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((fn) => fn());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('resize'));
  }
};

export const getSkyroomMobileActiveBox = (): SkyroomMobileBox => activeBox;

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
 * The explicit selection ALWAYS wins when set — the chosen box's zone is allocated
 * immediately (the panel renders as its own dispatch settles), avoiding the one-tick
 * "empty zone" flash that otherwise made the first tab tap appear to do nothing and
 * the default chat-on-join not show. When nothing has been chosen yet (activeBox null)
 * we derive from live panel state (covers externally-opened panels / first render).
 */
export const resolveSkyroomMobileBox = ({
  usersOpen,
  chatOpen,
  notesOpen,
}: {
  usersOpen: boolean;
  chatOpen: boolean;
  notesOpen: boolean;
}): SkyroomMobileBox => {
  if (activeBox) return activeBox;

  // Fallback: derive from live state (external opens / initial state).
  if (notesOpen) return 'notes';
  if (usersOpen) return 'users';
  if (chatOpen) return 'chat';
  return null;
};

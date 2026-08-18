import { dispatchSkyroomLayoutResize } from './layout-resize';

type NotesPanelListener = (open: boolean) => void;
type NotesFeatureListener = (visible: boolean) => void;

let skyroomNotesGlobalOpen = false;
let skyroomNotesLocallyDismissed = false;
/** Viewer-only: panel open while moderator has not shared notes globally. */
let skyroomNotesLocallyOpen = false;
let skyroomNotesSyncEntryId: string | null = null;
/** Meeting-wide shared-notes chrome visibility (nav icon, mobile tab, column). */
let skyroomNotesFeatureVisible = Boolean(
  window.meetingClientSettings?.public?.notes?.showInMeeting,
);
const listeners = new Set<NotesPanelListener>();
const featureListeners = new Set<NotesFeatureListener>();

const getVisibleNotesOpen = (): boolean => {
  if (skyroomNotesGlobalOpen) {
    return !skyroomNotesLocallyDismissed;
  }
  return skyroomNotesLocallyOpen;
};

const notifyListeners = (): void => {
  const visible = getVisibleNotesOpen();
  listeners.forEach((listener) => listener(visible));
  dispatchSkyroomLayoutResize();
};

const notifyFeatureListeners = (): void => {
  featureListeners.forEach((listener) => listener(skyroomNotesFeatureVisible));
  dispatchSkyroomLayoutResize();
};

export const getSkyroomNotesFeatureVisible = (): boolean => skyroomNotesFeatureVisible;

export const setSkyroomNotesFeatureVisible = (visible: boolean): void => {
  if (skyroomNotesFeatureVisible === visible) return;
  skyroomNotesFeatureVisible = visible;
  if (!visible) {
    skyroomNotesGlobalOpen = false;
    skyroomNotesLocallyOpen = false;
    skyroomNotesLocallyDismissed = false;
    notifyListeners();
  }
  notifyFeatureListeners();
};

export const subscribeSkyroomNotesFeatureVisible = (listener: NotesFeatureListener): (() => void) => {
  featureListeners.add(listener);
  listener(skyroomNotesFeatureVisible);
  return () => featureListeners.delete(listener);
};

export const getSkyroomNotesOpen = (): boolean => getVisibleNotesOpen();

export const getSkyroomNotesGlobalOpen = (): boolean => skyroomNotesGlobalOpen;

export const getSkyroomNotesLocallyDismissed = (): boolean => skyroomNotesLocallyDismissed;

export const getSkyroomNotesLocallyOpen = (): boolean => skyroomNotesLocallyOpen;

export const getSkyroomNotesSyncEntryId = (): string | null => skyroomNotesSyncEntryId;

export const setSkyroomNotesSyncEntryId = (entryId: string): void => {
  skyroomNotesSyncEntryId = entryId;
};

export const setSkyroomNotesGlobalOpen = (
  open: boolean,
  options: { clearDismiss?: boolean } = {},
): void => {
  const { clearDismiss = false } = options;
  const changed = skyroomNotesGlobalOpen !== open
    || (clearDismiss && skyroomNotesLocallyDismissed);

  if (!changed) return;

  skyroomNotesGlobalOpen = open;
  skyroomNotesLocallyOpen = false;
  if (clearDismiss) {
    skyroomNotesLocallyDismissed = false;
  }
  notifyListeners();
};

export const setSkyroomNotesLocallyOpen = (open: boolean): void => {
  if (skyroomNotesGlobalOpen || skyroomNotesLocallyOpen === open) return;
  skyroomNotesLocallyOpen = open;
  notifyListeners();
};

export const dismissSkyroomNotesLocally = (): void => {
  if (skyroomNotesLocallyDismissed) return;
  skyroomNotesLocallyDismissed = true;
  notifyListeners();
};

export const clearSkyroomNotesLocalDismiss = (): void => {
  if (!skyroomNotesLocallyDismissed) return;
  skyroomNotesLocallyDismissed = false;
  notifyListeners();
};

/** @deprecated Use getSkyroomNotesOpen */
export const setSkyroomNotesOpen = (open: boolean): void => {
  setSkyroomNotesGlobalOpen(open, { clearDismiss: true });
};

export const subscribeSkyroomNotesOpen = (listener: NotesPanelListener): (() => void) => {
  listeners.add(listener);
  listener(getVisibleNotesOpen());
  return () => listeners.delete(listener);
};

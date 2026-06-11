type NotesPanelListener = (open: boolean) => void;

let skyroomNotesGlobalOpen = false;
let skyroomNotesLocallyDismissed = false;
let skyroomNotesSyncEntryId: string | null = null;
const listeners = new Set<NotesPanelListener>();

const getVisibleNotesOpen = (): boolean => (
  skyroomNotesGlobalOpen && !skyroomNotesLocallyDismissed
);

const notifyListeners = (): void => {
  const visible = getVisibleNotesOpen();
  listeners.forEach((listener) => listener(visible));
  window.dispatchEvent(new Event('resize'));
};

export const getSkyroomNotesOpen = (): boolean => getVisibleNotesOpen();

export const getSkyroomNotesGlobalOpen = (): boolean => skyroomNotesGlobalOpen;

export const getSkyroomNotesLocallyDismissed = (): boolean => skyroomNotesLocallyDismissed;

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
  if (clearDismiss) {
    skyroomNotesLocallyDismissed = false;
  }
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

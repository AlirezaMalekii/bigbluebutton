export const SKYROOM_OPEN_POLL_PARTICIPATION_EVENT = 'skyroom:openPollParticipation';

type Listener = () => void;

let dismissedPollId: string | null = null;
const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function dismissPollParticipation(pollId: string): void {
  dismissedPollId = pollId;
  notify();
}

export function clearPollParticipationDismiss(): void {
  if (dismissedPollId === null) return;
  dismissedPollId = null;
  notify();
}

export function isPollParticipationDismissed(pollId: string): boolean {
  return dismissedPollId === pollId;
}

export function subscribePollParticipationDismiss(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function openSkyroomPollParticipation(): void {
  clearPollParticipationDismiss();
  window.dispatchEvent(new Event(SKYROOM_OPEN_POLL_PARTICIPATION_EVENT));
}

export function resetPollParticipationDismissIfPollChanged(pollId: string): void {
  if (dismissedPollId !== null && dismissedPollId !== pollId) {
    dismissedPollId = null;
    notify();
  }
}

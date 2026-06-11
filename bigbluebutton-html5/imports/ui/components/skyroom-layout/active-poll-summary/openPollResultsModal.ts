import Session from '/imports/ui/services/storage/in-memory';

export const SKYROOM_OPEN_POLL_RESULTS_EVENT = 'skyroom:openPollResultsModal';

export function openSkyroomPollResultsModal(): void {
  Session.setItem('forcePollOpen', true);
  Session.setItem('pollInitiated', true);
  window.dispatchEvent(new Event(SKYROOM_OPEN_POLL_RESULTS_EVENT));
}

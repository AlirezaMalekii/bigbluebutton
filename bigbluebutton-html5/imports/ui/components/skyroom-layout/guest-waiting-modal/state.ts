type GuestWaitingModalListener = (open: boolean) => void;

let guestWaitingModalOpen = false;
const listeners = new Set<GuestWaitingModalListener>();

const notify = (): void => {
  listeners.forEach((fn) => fn(guestWaitingModalOpen));
};

export const getGuestWaitingModalOpen = (): boolean => guestWaitingModalOpen;

export const openGuestWaitingModal = (): void => {
  if (guestWaitingModalOpen) return;
  guestWaitingModalOpen = true;
  notify();
};

export const closeGuestWaitingModal = (): void => {
  if (!guestWaitingModalOpen) return;
  guestWaitingModalOpen = false;
  notify();
};

export const toggleGuestWaitingModal = (): void => {
  if (guestWaitingModalOpen) {
    closeGuestWaitingModal();
  } else {
    openGuestWaitingModal();
  }
};

export const subscribeGuestWaitingModal = (listener: GuestWaitingModalListener): (() => void) => {
  listeners.add(listener);
  listener(guestWaitingModalOpen);
  return () => listeners.delete(listener);
};

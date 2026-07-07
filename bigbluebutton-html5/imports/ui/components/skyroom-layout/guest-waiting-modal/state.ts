export const SKYROOM_GUEST_WAITING_OPEN = 'skyroom:guestWaitingOpen';
export const SKYROOM_GUEST_WAITING_CLOSE = 'skyroom:guestWaitingClose';
export const SKYROOM_GUEST_WAITING_TOGGLE = 'skyroom:guestWaitingToggle';

export const openGuestWaitingModal = (): void => {
  window.dispatchEvent(new Event(SKYROOM_GUEST_WAITING_OPEN));
};

export const closeGuestWaitingModal = (): void => {
  window.dispatchEvent(new Event(SKYROOM_GUEST_WAITING_CLOSE));
};

export const toggleGuestWaitingModal = (): void => {
  window.dispatchEvent(new Event(SKYROOM_GUEST_WAITING_TOGGLE));
};

import React, { useEffect, useRef } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import ModalSimple from '/imports/ui/components/common/modal/simple/component';
import GuestUsersManagementPanel from '/imports/ui/components/waiting-users/waiting-users-graphql/component';
import { useModalRegistration } from '/imports/ui/core/singletons/modalController';
import {
  SKYROOM_GUEST_WAITING_CLOSE,
  SKYROOM_GUEST_WAITING_OPEN,
  SKYROOM_GUEST_WAITING_TOGGLE,
} from './state';

const intlMessages = defineMessages({
  title: {
    id: 'app.userList.guest.waitingUsers',
    description: 'Guest waiting modal title',
  },
});

const SkyroomGuestWaitingModal: React.FC = () => {
  const intl = useIntl();
  const {
    open,
    close,
    isOpen,
  } = useModalRegistration({
    id: 'skyroomGuestWaitingModal',
    // Same tier as guest-policy / lock-viewers so one modal does not block the other.
    priority: 'low',
  });
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  useEffect(() => {
    const onOpen = () => open();
    const onClose = () => close();
    const onToggle = () => {
      if (isOpenRef.current) close();
      else open();
    };

    window.addEventListener(SKYROOM_GUEST_WAITING_OPEN, onOpen);
    window.addEventListener(SKYROOM_GUEST_WAITING_CLOSE, onClose);
    window.addEventListener(SKYROOM_GUEST_WAITING_TOGGLE, onToggle);

    return () => {
      window.removeEventListener(SKYROOM_GUEST_WAITING_OPEN, onOpen);
      window.removeEventListener(SKYROOM_GUEST_WAITING_CLOSE, onClose);
      window.removeEventListener(SKYROOM_GUEST_WAITING_TOGGLE, onToggle);
    };
  }, [open, close]);

  if (!isOpen) return null;

  return (
    <ModalSimple
      modalIsOpen={isOpen}
      className="skyroom-guest-waiting-modal"
      data-test="skyroomGuestWaitingModal"
      overlayClassName="skyroom-guest-waiting-overlay"
      onRequestClose={close}
      title={intl.formatMessage(intlMessages.title)}
      shouldShowCloseButton
      shouldCloseOnOverlayClick
    >
      <div className="skyroom-guest-waiting-modal__body">
        <GuestUsersManagementPanel
          presentation="modal"
          onClose={close}
        />
      </div>
    </ModalSimple>
  );
};

export default SkyroomGuestWaitingModal;

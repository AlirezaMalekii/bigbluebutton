import React, { useEffect, useReducer } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import ModalSimple from '/imports/ui/components/common/modal/simple/component';
import GuestUsersManagementPanel from '/imports/ui/components/waiting-users/waiting-users-graphql/component';
import {
  closeGuestWaitingModal,
  getGuestWaitingModalOpen,
  subscribeGuestWaitingModal,
} from './state';

const intlMessages = defineMessages({
  title: {
    id: 'app.userList.guest.waitingUsers',
    description: 'Guest waiting modal title',
  },
});

const SkyroomGuestWaitingModal: React.FC = () => {
  const intl = useIntl();
  const [, force] = useReducer((x: number) => x + 1, 0);
  const isOpen = getGuestWaitingModalOpen();

  useEffect(() => subscribeGuestWaitingModal(() => force()), []);

  if (!isOpen) return null;

  return (
    <ModalSimple
      modalIsOpen={isOpen}
      className="skyroom-guest-waiting-modal"
      data-test="skyroomGuestWaitingModal"
      overlayClassName="skyroom-guest-waiting-overlay"
      onRequestClose={closeGuestWaitingModal}
      title={intl.formatMessage(intlMessages.title)}
      shouldShowCloseButton
      shouldCloseOnOverlayClick
    >
      <div className="skyroom-guest-waiting-modal__body">
        <GuestUsersManagementPanel
          presentation="modal"
          onClose={closeGuestWaitingModal}
        />
      </div>
    </ModalSimple>
  );
};

export default SkyroomGuestWaitingModal;

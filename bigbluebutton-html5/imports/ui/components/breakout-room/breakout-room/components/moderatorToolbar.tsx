import React from 'react';
import { defineMessages, useIntl } from 'react-intl';
import CreateBreakoutRoomContainerGraphql from '../../create-breakout-room/component';
import { useModalRegistration } from '/imports/ui/core/singletons/modalController';
import Styled from '../styles';

const intlMessages = defineMessages({
  manageUsers: {
    id: 'app.breakout.manager.manageUsers',
    description: 'Manage breakout room users',
  },
  changeTime: {
    id: 'app.breakout.manager.changeTime',
    description: 'Change breakout room duration',
  },
  endAll: {
    id: 'app.breakout.manager.endAll',
    description: 'End all breakout rooms',
  },
  toolbarTitle: {
    id: 'app.breakout.manager.toolbarTitle',
    description: 'Breakout manager toolbar title',
  },
});

interface ModeratorToolbarProps {
  onChangeTime: () => void;
  onEndAll: () => void;
  isConnected: boolean;
}

const ModeratorToolbar: React.FC<ModeratorToolbarProps> = ({
  onChangeTime,
  onEndAll,
  isConnected,
}) => {
  const intl = useIntl();

  const {
    isOpen: isManageModalOpen,
    close: closeManageModal,
    open: openManageModal,
  } = useModalRegistration({
    id: 'breakoutroomUpdateUsersModal',
    priority: 'low',
  });

  return (
    <>
      <Styled.ModeratorToolbar data-test="breakoutManagerToolbar">
        <Styled.ModeratorToolbarTitle>
          {intl.formatMessage(intlMessages.toolbarTitle)}
        </Styled.ModeratorToolbarTitle>
        <Styled.ModeratorToolbarActions>
          <Styled.ToolbarButton
            data-test="breakoutManageUsersBtn"
            color="primary"
            size="sm"
            icon="user"
            label={intl.formatMessage(intlMessages.manageUsers)}
            onClick={() => openManageModal()}
          />
          <Styled.ToolbarButton
            data-test="breakoutChangeTimeBtn"
            color="default"
            size="sm"
            icon="time"
            label={intl.formatMessage(intlMessages.changeTime)}
            onClick={onChangeTime}
          />
          <Styled.ToolbarButton
            data-test="breakoutEndAllBtn"
            color="danger"
            size="sm"
            icon="close"
            disabled={!isConnected}
            label={intl.formatMessage(intlMessages.endAll)}
            onClick={onEndAll}
          />
        </Styled.ModeratorToolbarActions>
      </Styled.ModeratorToolbar>
      {isManageModalOpen ? (
        <CreateBreakoutRoomContainerGraphql
          isUpdate
          priority="low"
          setIsOpen={(value: boolean) => {
            if (value) {
              openManageModal();
            } else {
              closeManageModal();
            }
          }}
          isOpen={isManageModalOpen}
        />
      ) : null}
    </>
  );
};

export default ModeratorToolbar;

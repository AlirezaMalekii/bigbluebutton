import React, { useCallback, useMemo } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import Styled from './styles';
import { BreakoutUser } from '../../room-managment-state/types';

const intlMessages = defineMessages({
  breakoutRoomLabel: {
    id: 'app.createBreakoutRoom.breakoutRoomLabel',
    description: 'breakout room label',
  },
  doneLabel: {
    id: 'app.createBreakoutRoom.doneLabel',
    description: 'done label',
  },
  backLabel: {
    id: 'app.audio.backLabel',
    description: 'Back label',
  },
  addParticipantLabel: {
    id: 'app.createBreakoutRoom.addParticipantLabel',
    description: 'add Participant label',
  },
  notAssigned: {
    id: 'app.createBreakoutRoom.notAssigned',
    description: 'Not assigned label',
  },
  breakoutRoom: {
    id: 'app.createBreakoutRoom.room',
    description: 'breakout room',
  },
});

interface RoomUserListProps {
  confirm: () => void;
  onBack: () => void;
  selectedRoom: number;
  rooms: {
    [key: number]: {
      id: number;
      name: string;
      users: BreakoutUser[];
    }
  }
  moveUser: (userId: string, fromRoomId: number, toRoomId: number) => void;
}

type ListedUser = BreakoutUser & {
  currentRoomId: number;
};

const RoomUserList: React.FC<RoomUserListProps> = ({
  selectedRoom,
  rooms,
  moveUser,
  confirm,
  onBack,
}) => {
  const intl = useIntl();

  // One row per user (deduped), with current room for accurate toggle.
  const listedUsers = useMemo(() => {
    const byId = new Map<string, ListedUser>();
    Object.values(rooms).forEach((room) => {
      room.users.forEach((user) => {
        // Prefer non-zero room if the same user somehow appears twice.
        const existing = byId.get(user.userId);
        if (!existing || (existing.currentRoomId === 0 && room.id !== 0)) {
          byId.set(user.userId, { ...user, currentRoomId: room.id });
        }
      });
    });
    return Array.from(byId.values()).sort((a, b) => {
      if (a.isModerator !== b.isModerator) return a.isModerator ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }, [rooms]);

  const selectedCount = rooms?.[selectedRoom]?.users?.length ?? 0;

  const toggleUser = useCallback((user: ListedUser) => {
    const isSelected = user.currentRoomId === selectedRoom;
    if (isSelected) {
      moveUser(user.userId, selectedRoom, 0);
      return;
    }
    moveUser(user.userId, user.currentRoomId, selectedRoom);
  }, [moveUser, selectedRoom]);

  const roomHint = (user: ListedUser) => {
    // Hint only when the user is already in a different breakout room.
    if (user.currentRoomId === 0 || user.currentRoomId === selectedRoom) return null;
    return intl.formatMessage(intlMessages.breakoutRoom, { roomNumber: user.currentRoomId });
  };

  return (
    <Styled.SelectUserScreen
      data-test="breakoutMobileUserPicker"
      role="dialog"
      aria-modal="true"
      aria-label={intl.formatMessage(intlMessages.breakoutRoomLabel, { roomNumber: selectedRoom })}
    >
      <Styled.Header>
        <div>
          <Styled.Title>
            {intl.formatMessage(intlMessages.breakoutRoomLabel, { roomNumber: selectedRoom })}
          </Styled.Title>
          <Styled.SubTitle>
            {intl.formatMessage(intlMessages.addParticipantLabel).replace(/^\+\s*/, '')}
            {selectedCount > 0 ? ` · ${selectedCount}` : ''}
          </Styled.SubTitle>
        </div>
        <Styled.HeaderActions>
          <Styled.ButtonBack
            size="md"
            color="secondary"
            ghost
            label={intl.formatMessage(intlMessages.backLabel)}
            onClick={onBack}
            data-test="breakoutMobileUserPickerBack"
          />
          <Styled.ButtonConfirm
            size="md"
            color="primary"
            label={intl.formatMessage(intlMessages.doneLabel)}
            onClick={confirm}
            data-test="breakoutMobileUserPickerConfirm"
          />
        </Styled.HeaderActions>
      </Styled.Header>

      <Styled.UserList data-test="breakoutMobileUserPickerList">
        {listedUsers.length === 0 ? (
          <Styled.EmptyState>
            {intl.formatMessage(intlMessages.notAssigned, { userCount: 0 })}
          </Styled.EmptyState>
        ) : (
          listedUsers.map((user) => {
            const selected = user.currentRoomId === selectedRoom;
            const hint = roomHint(user);
            return (
              <Styled.UserRow
                key={user.userId}
                type="button"
                $selected={selected}
                aria-pressed={selected}
                data-test="breakoutMobileUserRow"
                data-user-id={user.userId}
                onClick={() => toggleUser(user)}
              >
                <Styled.CheckMark $selected={selected} aria-hidden />
                <Styled.UserMeta>
                  <Styled.TextName>{user.name}</Styled.TextName>
                  {hint ? <Styled.RoomHint>{hint}</Styled.RoomHint> : null}
                </Styled.UserMeta>
              </Styled.UserRow>
            );
          })
        )}
      </Styled.UserList>
    </Styled.SelectUserScreen>
  );
};

export default RoomUserList;

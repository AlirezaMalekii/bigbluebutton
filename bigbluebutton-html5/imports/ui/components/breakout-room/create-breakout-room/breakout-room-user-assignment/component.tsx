import React, { useEffect, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { range } from '/imports/utils/array-utils';
import Icon from '/imports/ui/components/common/icon/icon-ts/component';
import Styled from '../styles';
import Auth from '/imports/ui/services/auth';
import ManageRoomLabel from '../manage-room-label/component';
import { ChildComponentProps } from '../room-managment-state/types';

const intlMessages = defineMessages({
  breakoutRoomTitle: {
    id: 'app.createBreakoutRoom.title',
    description: 'modal title',
  },
  breakoutRoomDesc: {
    id: 'app.createBreakoutRoom.modalDesc',
    description: 'modal description',
  },
  breakoutRoomUpdateDesc: {
    id: 'app.updateBreakoutRoom.modalDesc',
    description: 'update modal description',
  },
  cancelLabel: {
    id: 'app.updateBreakoutRoom.cancelLabel',
    description: 'used in the button that close update modal',
  },
  updateTitle: {
    id: 'app.updateBreakoutRoom.title',
    description: 'update breakout title',
  },
  updateConfirm: {
    id: 'app.updateBreakoutRoom.confirm',
    description: 'Update to breakout confirm button label',
  },
  resetUserRoom: {
    id: 'app.update.resetRoom',
    description: 'Reset user room button label',
  },
  confirmButton: {
    id: 'app.createBreakoutRoom.confirm',
    description: 'confirm button label',
  },
  dismissLabel: {
    id: 'app.presentationUploder.dismissLabel',
    description: 'used in the button that close modal',
  },
  numberOfRooms: {
    id: 'app.createBreakoutRoom.numberOfRooms',
    description: 'number of rooms label',
  },
  duration: {
    id: 'app.createBreakoutRoom.durationInMinutes',
    description: 'duration time label',
  },
  resetAssignments: {
    id: 'app.createBreakoutRoom.resetAssignments',
    description: 'reset assignments label',
  },
  resetAssignmentsDesc: {
    id: 'app.createBreakoutRoom.resetAssignmentsDesc',
    description: 'reset assignments label description',
  },
  randomlyAssign: {
    id: 'app.createBreakoutRoom.randomlyAssign',
    description: 'randomly assign label',
  },
  randomlyAssignDesc: {
    id: 'app.createBreakoutRoom.randomlyAssignDesc',
    description: 'randomly assign label description',
  },
  breakoutRoom: {
    id: 'app.createBreakoutRoom.room',
    description: 'breakout room',
  },
  freeJoinLabel: {
    id: 'app.createBreakoutRoom.freeJoin',
    description: 'free join label',
  },
  captureNotesLabel: {
    id: 'app.createBreakoutRoom.captureNotes',
    description: 'capture shared notes label',
  },
  captureSlidesLabel: {
    id: 'app.createBreakoutRoom.captureSlides',
    description: 'capture slides label',
  },
  captureNotesType: {
    id: 'app.notes.label',
    description: 'indicates notes have been captured',
  },
  captureSlidesType: {
    id: 'app.shortcut-help.whiteboard',
    description: 'indicates the whiteboard has been captured',
  },
  roomLabel: {
    id: 'app.createBreakoutRoom.room',
    description: 'Room label',
  },
  leastOneWarnBreakout: {
    id: 'app.createBreakoutRoom.leastOneWarnBreakout',
    description: 'warn message label',
  },
  notAssigned: {
    id: 'app.createBreakoutRoom.notAssigned',
    description: 'Not assigned label',
  },
  breakoutRoomLabel: {
    id: 'app.createBreakoutRoom.breakoutRoomLabel',
    description: 'breakout room label',
  },
  addParticipantLabel: {
    id: 'app.createBreakoutRoom.addParticipantLabel',
    description: 'add Participant label',
  },
  nextLabel: {
    id: 'app.createBreakoutRoom.nextLabel',
    description: 'Next label',
  },
  backLabel: {
    id: 'app.audio.backLabel',
    description: 'Back label',
  },
  minusRoomTime: {
    id: 'app.createBreakoutRoom.minusRoomTime',
    description: 'aria label for btn to decrease room time',
  },
  addRoomTime: {
    id: 'app.createBreakoutRoom.addRoomTime',
    description: 'aria label for btn to increase room time',
  },
  record: {
    id: 'app.createBreakoutRoom.record',
    description: 'label for checkbox to allow record',
  },
  numberOfRoomsIsValid: {
    id: 'app.createBreakoutRoom.numberOfRoomsError',
    description: 'Label an error message',
  },
  roomNameEmptyIsValid: {
    id: 'app.createBreakoutRoom.emptyRoomNameError',
    description: 'Label an error message',
  },
  roomNameDuplicatedIsValid: {
    id: 'app.createBreakoutRoom.duplicatedRoomNameError',
    description: 'Label an error message',
  },
  you: {
    id: 'app.userList.you',
    description: 'Text for identifying your user',
  },
  minimumDurationWarnBreakout: {
    id: 'app.createBreakoutRoom.minimumDurationWarnBreakout',
    description: 'minimum duration warning message label',
  },
  roomNameInputDesc: {
    id: 'app.createBreakoutRoom.roomNameInputDesc',
    description: 'aria description for room name change',
  },
  manageRooms: {
    id: 'app.createBreakoutRoom.manageRoomsLabel',
    description: 'Label for manage rooms',
  },
  sendInvitationToMods: {
    id: 'app.createBreakoutRoom.sendInvitationToMods',
    description: 'label for checkbox send invitation to moderators',
  },
  currentSlide: {
    id: 'app.createBreakoutRoom.currentSlideLabel',
    description: 'label for current slide',
  },
});

const isMe = (intId: string) => intId === Auth.userID;

type User = {
  userId: string;
  name: string;
  isModerator: boolean;
  extId: string;
};

const BreakoutRoomUserAssignment: React.FC<ChildComponentProps> = ({
  moveUser,
  rooms,
  getRoomName,
  changeRoomName,
  numberOfRooms,
  setSelectedId,
  randomlyAssign,
  resetRooms,
  users,
  currentSlidePrefix,
  presentations,
  getRoomPresentation,
  setRoomPresentations,
  currentPresentation,
  roomPresentations,
  isUpdate,
}) => {
  const intl = useIntl();
  const [sortedRooms, setSortedRooms] = useState(rooms);

  const sortUsers = (users: User[]) => {
    return [...users].sort((a, b) => {
      if (a.isModerator !== b.isModerator) {
        return a.isModerator ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  };

  const updateSortedRooms = () => {
    const newSortedRooms = { ...rooms };
    Object.keys(newSortedRooms).forEach((roomNumber) => {
      const roomNumberInt = parseInt(roomNumber, 10);
      newSortedRooms[roomNumberInt] = {
        ...newSortedRooms[roomNumberInt],
        users: sortUsers(newSortedRooms[roomNumberInt].users),
      };
    });
    setSortedRooms(newSortedRooms);
  };

  useEffect(() => {
    updateSortedRooms();
  }, [rooms]);

  const parseDragPayload = (raw: string) => {
    // Payload format: `${userId}|${fromRoom}` — userId may contain dashes.
    if (!raw) return null;
    const sep = raw.lastIndexOf('|');
    if (sep <= 0) {
      // Backward-compatible fallback for legacy `${userId}-${room}` ids.
      const dash = raw.lastIndexOf('-');
      if (dash <= 0) return null;
      const userId = raw.slice(0, dash);
      const from = Number(raw.slice(dash + 1));
      if (!userId || Number.isNaN(from)) return null;
      return { userId, from };
    }
    const userId = raw.slice(0, sep);
    const from = Number(raw.slice(sep + 1));
    if (!userId || Number.isNaN(from)) return null;
    return { userId, from };
  };

  const dragStart = (ev: React.DragEvent<HTMLParagraphElement>) => {
    // Always use the draggable row (currentTarget). Inner spans/icons as target
    // previously sent an empty id and made drops silently no-op.
    const row = ev.currentTarget;
    const userId = row.dataset.userId ?? '';
    const fromRoom = row.dataset.fromRoom ?? '0';
    if (!userId) {
      ev.preventDefault();
      return;
    }
    const payload = `${userId}|${fromRoom}`;
    const transfer = ev.dataTransfer;
    Object.assign(transfer, { effectAllowed: 'move' });
    transfer.setData('text/plain', payload);
    // Some browsers still read the legacy 'text' type on drop.
    transfer.setData('text', payload);
    setSelectedId(payload);
  };

  const dragEnd = () => {
    setSelectedId('');
  };

  const allowDrop = (ev: React.DragEvent) => {
    ev.preventDefault();
    Object.assign(ev.dataTransfer, { dropEffect: 'move' });
  };

  const drop = (roomNumber: number) => (ev: React.DragEvent) => {
    ev.preventDefault();
    ev.stopPropagation();

    const raw = ev.dataTransfer.getData('text/plain')
      || ev.dataTransfer.getData('text')
      || '';
    const parsed = parseDragPayload(raw);
    if (!parsed) {
      setSelectedId('');
      return;
    }

    moveUser(parsed.userId, parsed.from, roomNumber);
    setSelectedId('');
  };

  const hasNameDuplicated = (room: number) => {
    const roomName = rooms[room]?.name || '';
    return Object.values(rooms).filter((r) => r.name === roomName).length > 1;
  };

  const changeRoomPresentation = (position: number) => (ev: React.ChangeEvent<HTMLSelectElement>) => {
    // @ts-ignore-next-line
    const newRoomsPresentations = [...roomPresentations];
    newRoomsPresentations[position] = ev.target.value;
    setRoomPresentations(newRoomsPresentations);
  };

  useEffect(() => {
    if (numberOfRooms) {
      resetRooms(numberOfRooms);
    }
  }, [numberOfRooms]);

  const roomUserList = (room: number) => {
    if (sortedRooms[room] && Array.isArray(sortedRooms[room].users)) {
      return sortedRooms[room].users.map((user) => {
        return (
          <Styled.RoomUserItem
            tabIndex={-1}
            id={`breakout-user-${user.userId}-room-${room}`}
            key={`${user.userId}-${room}`}
            data-test="roomUserItem"
            data-user-id={user.userId}
            data-from-room={String(room)}
            draggable
            onDragStart={dragStart}
            onDragEnd={dragEnd}
          >
            <span>
              <span>{user.name}</span>
              <i>{(isMe(user.userId)) ? ` (${intl.formatMessage(intlMessages.you)})` : ''}</i>
            </span>
            {room !== 0
              ? (
                <span
                  tabIndex={0}
                  className="close"
                  role="button"
                  draggable={false}
                  aria-label={intl.formatMessage(intlMessages.resetUserRoom)}
                  onMouseDown={(e) => {
                    // Keep close-clicks from starting a drag on the parent row.
                    e.stopPropagation();
                  }}
                  onDragStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      moveUser(user.userId, room, 0);
                    }
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    moveUser(user.userId, room, 0);
                  }}
                >
                  <Icon iconName="close" />
                </span>
              ) : null}
          </Styled.RoomUserItem>
        );
      });
    }
    return '';
  };

  const rover = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const element = e.target as HTMLElement;
    if (element.id.includes('breakoutBox')) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        (element.firstChild as HTMLElement)?.focus?.();
      }
      return;
    }

    if (element?.dataset?.test?.includes('roomUserItem')) {
      const userId = element.dataset.userId ?? '';
      const from = Number(element.dataset.fromRoom ?? '0');
      if (!userId || Number.isNaN(from)) return;

      const maxRooms = numberOfRooms;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        const nextElement = e.key === 'ArrowDown' ? element.nextSibling : element.previousSibling;
        if (nextElement) (nextElement as HTMLElement).focus();
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        const nextRoom = from + 1;
        if (nextRoom <= maxRooms) {
          moveUser(userId, from, nextRoom);
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        const prevRoom = from - 1;
        if (prevRoom >= 0) {
          moveUser(userId, from, prevRoom);
        }
      }
    }
  };

  return (
    <>
      <ManageRoomLabel
        onAssignReset={() => { resetRooms(0); }}
        onAssignRandomly={randomlyAssign}
        numberOfRoomsIsValid={numberOfRooms > 0}
        leastOneUserIsValid={rooms[0]?.users?.length < users.length}
      />
      <Styled.ContentContainer>
        <Styled.Alert valid role="alert">
          <Styled.FreeJoinLabel>
            <Styled.BreakoutNameInput
              type="text"
              readOnly
              value={
                intl.formatMessage(intlMessages.notAssigned, { userCount: rooms[0]?.users?.length })
              }
            />
          </Styled.FreeJoinLabel>
          <Styled.BreakoutBox
            hundred
            id="breakoutBox-0"
            onDrop={drop(0)}
            onDragOver={allowDrop}
            tabIndex={0}
            onKeyDown={rover}
          >
            {roomUserList(0)}
          </Styled.BreakoutBox>
        </Styled.Alert>
        <Styled.BoxContainer key="rooms-grid-" data-test="roomGrid">
          {
            range(1, numberOfRooms + 1).map((value) => (
              <div key={`room-${value}`}>
                <Styled.FreeJoinLabel>
                  <Styled.RoomName
                    type="text"
                    maxLength={255}
                    duplicated={hasNameDuplicated(value)}
                    value={getRoomName(value)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      changeRoomName(value, e.target.value);
                    }}
                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                      changeRoomName(value, e.target.value);
                    }}
                    data-test={getRoomName(value).length === 0 ? `room-error-${value}` : `roomName-${value}`}
                  />
                  <div aria-hidden id={`room-input-${value}`} className="sr-only">
                    {intl.formatMessage(intlMessages.roomNameInputDesc)}
                  </div>
                </Styled.FreeJoinLabel>
                { presentations.length > 0 && !isUpdate ? (
                  <Styled.BreakoutSlideLabel>
                    <Styled.InputRooms
                      data-test={`changeSlideBreakoutRoom${value}`}
                      value={getRoomPresentation(value)}
                      onChange={changeRoomPresentation(value)}
                      valid
                    >
                      { currentPresentation ? (
                        <option key="current-slide" value={`${currentSlidePrefix}${currentPresentation}`} data-test="currentSlideBreakoutOption">
                          {intl.formatMessage(intlMessages.currentSlide)}
                        </option>
                      ) : null }
                      {
                        presentations.map((presentation) => (
                          <option
                            key={presentation.presentationId}
                            value={presentation.presentationId}
                          >
                            {presentation.name}
                          </option>
                        ))
                      }
                    </Styled.InputRooms>
                  </Styled.BreakoutSlideLabel>
                ) : null }
                <Styled.BreakoutBox
                  id={`breakoutBox-${value}`}
                  onDrop={drop(value)}
                  onDragOver={allowDrop}
                  hundred={false}
                  tabIndex={0}
                  onKeyDown={rover}
                >
                  {roomUserList(value)}
                </Styled.BreakoutBox>
                {hasNameDuplicated(value) ? (
                  <Styled.SpanWarn valid>
                    {intl.formatMessage(intlMessages.roomNameDuplicatedIsValid)}
                  </Styled.SpanWarn>
                ) : null}
                {getRoomName(value).length === 0 ? (
                  <Styled.SpanWarn valid aria-hidden id={`room-error-${value}`}>
                    {intl.formatMessage(intlMessages.roomNameEmptyIsValid)}
                  </Styled.SpanWarn>
                ) : null}
              </div>
            ))
          }
        </Styled.BoxContainer>
      </Styled.ContentContainer>
      <Styled.AssignmentHint
        data-test="warningNoUserAssigned"
        role="status"
        $visible={rooms[0]?.users?.length >= users.length}
      >
        {intl.formatMessage(intlMessages.leastOneWarnBreakout)}
      </Styled.AssignmentHint>
    </>
  );
};

export default BreakoutRoomUserAssignment;

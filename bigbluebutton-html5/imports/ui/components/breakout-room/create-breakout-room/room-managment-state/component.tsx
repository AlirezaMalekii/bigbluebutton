import React, {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { useQuery } from '@apollo/client';
import {
  BreakoutUser,
  Rooms,
  ChildComponentProps,
  Room,
  moveUserRegistery,
  Presentation,
  RoomPresentations,
} from './types';
import {
  getBreakoutsResponse, getLastBreakouts, getMeetingGroupResponse, LastBreakoutData,
} from '../queries';

const intlMessages = defineMessages({
  breakoutRoom: {
    id: 'app.createBreakoutRoom.room',
    description: 'breakout room',
  },
  notAssigned: {
    id: 'app.createBreakoutRoom.notAssigned',
    description: 'Not assigned label',
  },
});

interface RoomManagmentStateProps {
  numberOfRooms: number;
  users: BreakoutUser[];
  RendererComponent: React.FC<ChildComponentProps>;
  runningRooms: getBreakoutsResponse['breakoutRoom'] | null;
  setFormIsValid: (isValid: boolean) => void;
  setRoomsRef: (rooms: Rooms) => void;
  setMoveRegisterRef: (moveRegister: moveUserRegistery) => void;
  presentations: Presentation[];
  roomPresentations: RoomPresentations;
  setRoomPresentations: React.Dispatch<React.SetStateAction<RoomPresentations>>;
  currentPresentation: string;
  currentSlidePrefix: string;
  getRoomPresentation: (roomId: number) => string;
  isUpdate: boolean;
  setNumberOfRooms: React.Dispatch<React.SetStateAction<number>>;
  groups: getMeetingGroupResponse['meeting_group'];
}

const RoomManagmentState: React.FC<RoomManagmentStateProps> = ({
  numberOfRooms,
  users,
  RendererComponent,
  setFormIsValid,
  runningRooms,
  setRoomsRef,
  setMoveRegisterRef,
  presentations,
  roomPresentations,
  setRoomPresentations,
  currentPresentation,
  currentSlidePrefix,
  getRoomPresentation,
  isUpdate,
  setNumberOfRooms,
  groups,
}) => {
  const intl = useIntl();
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<number>(0);
  const [movementRegistered, setMovementRegistered] = useState<moveUserRegistery>({});

  const [userAssignedRooms, setUserAssignedRooms] = useState<{
    [key: string]: number[];
  }>({});

  const [roomNames, setRoomNames] = useState<{
    [key: number]: string;
  }>({});

  // Apply meeting-groups / last-breakout hydration at most once per modal open.
  const groupsHydratedRef = useRef(false);
  const lastBreakoutHydratedRef = useRef(false);
  const runningRoomsHydratedRef = useRef(false);

  const recordUserMovement = (userId: string, fromRoom: number, toRoom: number) => {
    // Use the actual running room as fromRoomId source of truth.
    // If the user was dragged through the unassigned box (fromRoom=0),
    // the previous movementRegistered entry still holds the real fromRoomId.
    const runningRoom = runningRooms?.find((r) => r.participants.some((p) => p.user.userId === userId));
    const fromRoomId = runningRoom?.breakoutRoomMeetingId
      ?? movementRegistered[userId]?.fromRoomId;
    let updatedMovementRegistered = { ...movementRegistered };
    updatedMovementRegistered = {
      ...updatedMovementRegistered,
      [userId]: {
        fromSequence: runningRoom?.sequence ?? fromRoom,
        toSequence: toRoom,
        toRoomId: runningRooms?.find((r) => r.sequence === toRoom)?.breakoutRoomMeetingId,
        fromRoomId,
      },
    };
    setMovementRegistered(updatedMovementRegistered);
    setMoveRegisterRef(updatedMovementRegistered);
  };

  const moveUser = (userId: string, from: number, to: number) => {
    if (from === to) return;
    // One room per user: unassign clears; assign replaces previous room.
    setUserAssignedRooms((prev) => ({
      ...prev,
      [userId]: to === 0 ? [] : [to],
    }));

    recordUserMovement(userId, from, to);
  };

  const roomName = (room: number) => {
    const defaultName = intl.formatMessage(intlMessages.breakoutRoom, {
      roomNumber: room,
    });
    if (roomNames[room]) {
      return roomNames[room];
    }
    return defaultName;
  };

  const changeRoomName = (room: number, name: string) => {
    setRoomNames((prev) => ({
      ...prev,
      [room]: name,
    }));
  };

  const resetRooms = (cap: number) => {
    setUserAssignedRooms((prev) => {
      const newUserAssignedRooms = { ...prev };
      Object.keys(newUserAssignedRooms).forEach((userId) => {
        newUserAssignedRooms[userId] = newUserAssignedRooms[userId].filter((room) => room <= cap);
      });
      return newUserAssignedRooms;
    });
  };

  const randomlyAssign = () => {
    const updatedUserAssignedRooms = { ...userAssignedRooms };
    const noModerators = users.filter((user) => !user.isModerator);
    const userIds = noModerators.sort(() => Math.random() - 0.5).map((user) => user.userId);
    const numberOfUsers = noModerators.length;
    const assignments = new Array(numberOfUsers);

    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < numberOfUsers; i++) {
      assignments[i] = (i % numberOfRooms) + 1;
    }

    const updatedMovementRegistered = { ...movementRegistered };
    userIds.forEach((userId, index) => {
      const roomNumber = assignments[index];
      // Find where the user actually is in the running rooms (ground truth),
      // regardless of any UI reassignments or unassigns done in the modal.
      const runningRoom = runningRooms?.find((r) => r.participants.some((p) => p.user.userId === userId));
      updatedUserAssignedRooms[userId] = [roomNumber];
      updatedMovementRegistered[userId] = {
        fromSequence: runningRoom?.sequence ?? 0,
        toSequence: roomNumber,
        fromRoomId: runningRoom?.breakoutRoomMeetingId,
        toRoomId: runningRooms?.find((r) => r.sequence === roomNumber)?.breakoutRoomMeetingId,
      };
    });
    setMovementRegistered(updatedMovementRegistered);
    setMoveRegisterRef(updatedMovementRegistered);
    setUserAssignedRooms(updatedUserAssignedRooms);
  };

  const getUserIdsByNumber = (n: number) => {
    if (n === 0) {
      // Return keys with empty arrays
      return Object.keys(userAssignedRooms).filter((key) => {
        return userAssignedRooms[key].length === 0
          || userAssignedRooms[key].includes(0);
      });
    }
    // Return keys whose array includes the given number
    return Object.keys(userAssignedRooms).filter((key) => userAssignedRooms[key].includes(n));
  };

  const getUsers = (n: number): BreakoutUser[] => {
    const userIds = getUserIdsByNumber(n);
    return userIds
      .map((userId) => users.find((user) => user.userId === userId))
      .filter((u) => !(u === undefined))
      ?? [];
  };

  const {
    data: lastBreakoutData,
  } = useQuery<LastBreakoutData>(getLastBreakouts, {
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (users.length === 0) return;
    setUserAssignedRooms((prev) => {
      // First open: seed everyone as unassigned.
      if (Object.keys(prev).length === 0) {
        return users.reduce((acc: { [key: string]: number[] }, user) => {
          acc[user.userId] = [];
          return acc;
        }, {});
      }
      // Later joins while modal is open: append missing users as unassigned.
      let changed = false;
      const next = { ...prev };
      users.forEach((user) => {
        if (next[user.userId] === undefined) {
          next[user.userId] = [];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [users]);

  // Manage a running room (update mode only — hydrate once per open).
  useEffect(() => {
    if (runningRoomsHydratedRef.current) return;
    if (
      runningRooms
      && runningRooms.length > 0
      && Object.keys(userAssignedRooms).length > 0) {
      runningRoomsHydratedRef.current = true;
      const assignUsers = runningRooms
        .reduce((
          acc: { [key: string]: number[] },
          room,
        ) => {
          room.participants.forEach((user) => {
            const { userId } = user.user;
            acc[userId] = [room.sequence];
          });

          return acc;
        }, {});

      const nextRoomNames = runningRooms.reduce((acc: { [key: number]: string }, room) => {
        acc[room.sequence] = room.name;
        return acc;
      }, {});

      setNumberOfRooms(runningRooms.length);
      setUserAssignedRooms((prev) => ({
        ...prev,
        ...assignUsers,
      }));

      setRoomNames((prev) => ({
        ...prev,
        ...nextRoomNames,
      }));
    }
  }, [runningRooms, Object.keys(userAssignedRooms).length]);

  useEffect(() => {
    if (getUserIdsByNumber(0).length === users.length) {
      setFormIsValid(false);
    } else {
      setFormIsValid(true);
    }
  }, [userAssignedRooms]);

  // SafeMeet: after end-all, opening Create must start with everyone unassigned.
  // Upstream restores lastBreakoutRoom into columns; that looks like a bug for recreate.
  // Keep room count/names as a soft convenience only when explicitly updating is not the case —
  // never re-apply previous user → room assignments on a fresh create.
  useEffect(() => {
    if (lastBreakoutHydratedRef.current) return;
    if (isUpdate) return;
    if (
      lastBreakoutData
      && lastBreakoutData.breakoutRoom_createdLatest.length > 0
      && runningRooms
      && runningRooms.length === 0
    ) {
      lastBreakoutHydratedRef.current = true;
      const nextRoomNames = lastBreakoutData.breakoutRoom_createdLatest.reduce(
        (acc: { [key: number]: string }, room) => {
          acc[room.sequence] = room.shortName;
          return acc;
        },
        {},
      );

      setNumberOfRooms(lastBreakoutData.breakoutRoom_createdLatest.length);
      setRoomNames((prev) => ({
        ...prev,
        ...nextRoomNames,
      }));
      // Intentionally do NOT merge lastBreakout user assignments — leave users in "not assigned".
    }
  }, [lastBreakoutData, runningRooms, isUpdate]);

  useEffect(() => {
    if (groupsHydratedRef.current) return;
    if (
      groups.length
      && Object.keys(userAssignedRooms).length > 0
      && lastBreakoutData
      && !(lastBreakoutData.breakoutRoom_createdLatest.length > 0)
    ) {
      groupsHydratedRef.current = true;
      const updatedUserAssignedRooms = { ...userAssignedRooms };
      const nextRoomNames: {
        [key: number]: string;
      } = {};
      Array.from(groups).forEach((group, index) => {
        const idx = index + 1;
        const userIds = group.usersExtId
          .map((id) => users.find((user) => user.extId === id))
          .filter((user) => user !== undefined)
          .map((user) => user.userId);
        userIds.forEach((userId) => {
          updatedUserAssignedRooms[userId] = [idx];
        });

        nextRoomNames[idx] = group.name;
      });

      setUserAssignedRooms(updatedUserAssignedRooms);
      setRoomNames(nextRoomNames);
    }
  }, [
    lastBreakoutData,
    groups,
    users,
    Object.keys(userAssignedRooms).length,
  ]);

  const rooms = useMemo(() => {
    const roomList: {
      [key: number]: Room;
    } = {};

    for (let i = 0; i <= numberOfRooms; i += 1) {
      if (!roomList[i]) {
        if (i === 0) {
          roomList[i] = {
            id: i,
            name: intl.formatMessage(intlMessages.notAssigned),
            users: getUsers(i),
          };
        } else {
          roomList[i] = {
            id: i,
            name: roomName(i),
            users: getUsers(i),
          };
        }
      }
    }

    return roomList;
  }, [
    userAssignedRooms,
    numberOfRooms,
    roomNames,
    users,
  ]);

  useEffect(() => {
    setRoomsRef(rooms);
  }, [rooms, setRoomsRef]);

  return (
    <RendererComponent
      moveUser={moveUser}
      rooms={rooms}
      getRoomName={roomName}
      changeRoomName={changeRoomName}
      numberOfRooms={numberOfRooms}
      selectedId={selectedId ?? ''}
      setSelectedId={setSelectedId}
      selectedRoom={selectedRoom}
      setSelectedRoom={setSelectedRoom}
      randomlyAssign={randomlyAssign}
      resetRooms={resetRooms}
      users={users}
      currentSlidePrefix={currentSlidePrefix}
      presentations={presentations}
      roomPresentations={roomPresentations}
      setRoomPresentations={setRoomPresentations}
      getRoomPresentation={getRoomPresentation}
      currentPresentation={currentPresentation}
      isUpdate={isUpdate}
    />
  );
};

export default RoomManagmentState;

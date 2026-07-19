import React, { useMemo, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import Button from '/imports/ui/components/common/button/component';
import { uniqueId } from '/imports/utils/string-utils';
import Styled from '../styles';
import RoomUserList from './room-user-list/component';
import { ChildComponentProps } from '../room-managment-state/types';

const intlMessages = defineMessages({
  nextLabel: {
    id: 'app.createBreakoutRoom.nextLabel',
    description: 'Next label',
  },
  breakoutRoomDesc: {
    id: 'app.createBreakoutRoom.modalDesc',
    description: 'modal description',
  },
  addParticipantLabel: {
    id: 'app.createBreakoutRoom.addParticipantLabel',
    description: 'add Participant label',
  },
  breakoutRoomLabel: {
    id: 'app.createBreakoutRoom.breakoutRoomLabel',
    description: 'breakout room label',
  },
  participantsLabel: {
    id: 'app.breakout.manager.participantsLabel',
    description: 'Assigned participants count with unit, e.g. "2 people"',
  },
});

const BreakoutRoomUserAssignmentMobile: React.FC<ChildComponentProps> = ({
  numberOfRooms,
  selectedRoom,
  setSelectedRoom,
  moveUser,
  rooms,
}) => {
  const intl = useIntl();
  const [layer, setLayer] = useState<1 | 2 | 3>(1);

  const btnLevelId = useMemo(() => uniqueId('btn-set-level-'), []);
  // Step 1 only: advance to room assignment. No bottom "Back" on step 2 —
  // users create/close from the modal header instead.
  const nextStepButton = layer === 1 ? (
    <Button
      color="primary"
      size="lg"
      label={intl.formatMessage(intlMessages.nextLabel)}
      onClick={() => setLayer(2)}
      key={btnLevelId}
    />
  ) : null;

  const layerTwo = useMemo(() => {
    if (layer === 2) {
      return (
        <>
          <Styled.SubTitle>
            {intl.formatMessage(intlMessages.breakoutRoomDesc)}
          </Styled.SubTitle>
          <Styled.ListContainer>
            <span>
              {
                new Array(numberOfRooms).fill(1).map((_, idx) => {
                  const roomNumber = idx + 1;
                  const assignedCount = rooms?.[roomNumber]?.users?.length ?? 0;
                  return (
                    <Styled.RoomItem key={`breakout-room-assign-${roomNumber}`}>
                      <Styled.ItemTitle>
                        {intl.formatMessage(intlMessages.breakoutRoomLabel, { roomNumber })}
                        {' · '}
                        {intl.formatMessage(intlMessages.participantsLabel, { count: assignedCount })}
                      </Styled.ItemTitle>
                      <Styled.ItemButton
                        label={intl.formatMessage(intlMessages.addParticipantLabel)}
                        size="lg"
                        ghost
                        color="primary"
                        onClick={() => {
                          setLayer(3);
                          setSelectedRoom(roomNumber);
                        }}
                      />
                    </Styled.RoomItem>
                  );
                })
              }
            </span>
          </Styled.ListContainer>
        </>
      );
    }
    return null;
  }, [layer, numberOfRooms, rooms, intl]);

  const closeUserPicker = () => setLayer(2);

  const layerThree = layer === 3 ? (
    <RoomUserList
      confirm={closeUserPicker}
      onBack={closeUserPicker}
      selectedRoom={selectedRoom}
      rooms={rooms}
      moveUser={moveUser}
    />
  ) : null;

  const layers = {
    1: null,
    2: layerTwo,
    3: layerThree,
  };
  return (
    <>
      {layers[layer]}
      {nextStepButton}
    </>
  );
};

export default BreakoutRoomUserAssignmentMobile;

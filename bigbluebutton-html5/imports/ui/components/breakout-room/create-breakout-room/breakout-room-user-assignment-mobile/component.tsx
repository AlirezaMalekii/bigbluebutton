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
  backLabel: {
    id: 'app.audio.backLabel',
    description: 'Back label',
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
  const levelingButton = useMemo(() => {
    return (
      <Button
        color="primary"
        size="lg"
        label={layer === 1 ? intl.formatMessage(intlMessages.nextLabel)
          : intl.formatMessage(intlMessages.backLabel)}
        onClick={() => (layer === 1 ? setLayer(2) : setLayer(1))}
        key={btnLevelId}
      />
    );
  }, [layer]);

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
                        {assignedCount > 0 ? ` · ${assignedCount}` : ''}
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
  }, [layer, numberOfRooms, rooms]);

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
      {/* Layer 3 has its own Back/Confirm chrome; hide the wizard next/back. */}
      {layer !== 3 ? levelingButton : null}
    </>
  );
};

export default BreakoutRoomUserAssignmentMobile;

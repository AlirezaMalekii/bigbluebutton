import React from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { BreakoutRoom as BreakoutRoomType } from '../queries';
import Styled from '../styles';

const intlMessages = defineMessages({
  breakoutRoom: {
    id: 'app.createBreakoutRoom.room',
    description: 'breakout room',
  },
  breakoutJoin: {
    id: 'app.createBreakoutRoom.join',
    description: 'label for join breakout room',
  },
  askToJoin: {
    id: 'app.createBreakoutRoom.askToJoin',
    description: 'label for generate breakout room url',
  },
  generatingURL: {
    id: 'app.createBreakoutRoom.generatingURL',
    description: 'label for generating breakout room url',
  },
  alreadyConnected: {
    id: 'app.createBreakoutRoom.alreadyConnected',
    description: 'label for the user that is already connected to breakout room',
  },
  breakoutJoinAudio: {
    id: 'app.createBreakoutRoom.joinAudio',
    description: 'label for option to transfer audio',
  },
  breakoutReturnAudio: {
    id: 'app.createBreakoutRoom.returnAudio',
    description: 'label for option to return audio',
  },
  yourRoom: {
    id: 'app.breakout.manager.yourRoom',
    description: 'Label for user assigned breakout room',
  },
  participantsLabel: {
    id: 'app.breakout.manager.participantsLabel',
    description: 'Participants count label',
  },
  noParticipants: {
    id: 'app.breakout.manager.noParticipants',
    description: 'No participants assigned',
  },
});

interface RoomCardProps {
  breakout: BreakoutRoomType;
  isModerator: boolean;
  isYourRoom: boolean;
  userId: string;
  meetingId: string;
  userJoinedAudio: boolean;
  audioBridge: string;
  isRequesting: boolean;
  onJoin: () => void;
  onTransferAudio: (fromMeeting: string, toMeeting: string) => void;
}

const RoomCard: React.FC<RoomCardProps> = ({
  breakout,
  isModerator,
  isYourRoom,
  userId,
  meetingId,
  userJoinedAudio,
  audioBridge,
  isRequesting,
  onJoin,
  onTransferAudio,
}) => {
  const intl = useIntl();

  const roomName = breakout.isDefaultName
    ? intl.formatMessage(intlMessages.breakoutRoom, { roomNumber: breakout.sequence })
    : breakout.shortName;

  const participantCount = breakout.participants.filter((p) => !p.isAudioOnly).length;
  const userJoinedDialin = breakout.participants.find((p) => p.userId === userId)?.isAudioOnly ?? false;

  const joinLabel = breakout.joinURL
    ? intl.formatMessage(intlMessages.breakoutJoin)
    : intl.formatMessage(intlMessages.askToJoin);

  const dataTest = `${breakout.joinURL ? 'join' : 'askToJoin'}${breakout.shortName.replace(' ', '')}`;

  return (
    <Styled.RoomCard
      data-test={`breakoutRoomCard-${breakout.sequence}`}
      data-skyroom-highlighted={isYourRoom ? 'true' : 'false'}
      $highlighted={isYourRoom}
    >
      <Styled.RoomCardHeader>
        <Styled.RoomCardTitle>
          <span data-test={breakout.shortName}>{roomName}</span>
          {isYourRoom ? (
            <Styled.YourRoomBadge data-test="yourBreakoutRoomBadge">
              {intl.formatMessage(intlMessages.yourRoom)}
            </Styled.YourRoomBadge>
          ) : null}
        </Styled.RoomCardTitle>
        <Styled.ParticipantCount data-test="breakoutParticipantCount">
          {intl.formatMessage(intlMessages.participantsLabel, { count: participantCount })}
        </Styled.ParticipantCount>
      </Styled.RoomCardHeader>

      {participantCount > 0 ? (
        <Styled.ParticipantList data-test={`userNameBreakoutRoom-${breakout.shortName}`}>
          {breakout.participants
            .filter((p) => !p.isAudioOnly)
            .sort((a, b) => a.user.nameSortable.localeCompare(b.user.nameSortable))
            .map((p) => (
              <Styled.ParticipantChip key={p.userId}>
                {p.user.name}
              </Styled.ParticipantChip>
            ))}
        </Styled.ParticipantList>
      ) : (
        <Styled.NoParticipants>
          {intl.formatMessage(intlMessages.noParticipants)}
        </Styled.NoParticipants>
      )}

      <Styled.RoomCardActions>
        {(() => {
          if (isRequesting) {
            return (
              <Styled.GeneratingURL>
                {intl.formatMessage(intlMessages.generatingURL)}
                <Styled.ConnectingAnimation animations />
              </Styled.GeneratingURL>
            );
          }
          if (breakout.isUserCurrentlyInRoom) {
            return (
              <Styled.StatusBadge $status="connected" data-test="alreadyConnected">
                {intl.formatMessage(intlMessages.alreadyConnected)}
              </Styled.StatusBadge>
            );
          }
          return (
            <Styled.JoinButton
              label={joinLabel}
              data-test={dataTest}
              aria-label={`${joinLabel} ${roomName}`}
              onClick={onJoin}
              disabled={isRequesting}
            />
          );
        })()}

        {isModerator && (userJoinedAudio || userJoinedDialin) && audioBridge !== 'livekit' ? (
          <Styled.AudioButton
            label={
              userJoinedDialin
                ? intl.formatMessage(intlMessages.breakoutReturnAudio)
                : intl.formatMessage(intlMessages.breakoutJoinAudio)
            }
            disabled={false}
            onClick={
              userJoinedDialin
                ? () => onTransferAudio(breakout.breakoutRoomMeetingId, meetingId)
                : () => onTransferAudio(meetingId, breakout.breakoutRoomMeetingId)
            }
          />
        ) : null}
      </Styled.RoomCardActions>
    </Styled.RoomCard>
  );
};

export default RoomCard;

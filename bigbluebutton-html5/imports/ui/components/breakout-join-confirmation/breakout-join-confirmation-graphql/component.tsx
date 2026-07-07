import { useMutation } from '@apollo/client';
import React, { useCallback, useEffect, useMemo } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import Styled from './styles';
import ModalSimple from '/imports/ui/components/common/modal/simple/component';
import Button from '/imports/ui/components/common/button/component';
import Icon from '/imports/ui/components/common/icon/component';
import {
  BreakoutRoom,
  getBreakoutData,
  GetBreakoutDataResponse,
  handleInviteDismissedAt,
} from './queries';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import { BREAKOUT_ROOM_REQUEST_JOIN_URL } from '../../breakout-room/mutations';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import { rejoinAudio } from '../../breakout-room/breakout-room/service';
import { useBreakoutExitObserver } from './hooks';
import { useStopMediaOnMainRoom } from '/imports/ui/components/breakout-room/hooks';
import logger from '/imports/startup/client/logger';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import { useModalRegistration } from '/imports/ui/core/singletons/modalController';

const intlMessages = defineMessages({
  title: {
    id: 'app.breakoutJoinConfirmation.title',
    description: 'Join breakout room title',
    defaultMessage: 'Join breakout room',
  },
  message: {
    id: 'app.breakoutJoinConfirmation.message',
    description: 'Join breakout confirm message',
    defaultMessage: 'You have been invited to join a breakout room.',
  },
  freeJoinMessage: {
    id: 'app.breakoutJoinConfirmation.freeJoinMessage',
    description: 'Join breakout confirm message',
    defaultMessage: 'Choose a breakout room to join:',
  },
  confirmLabel: {
    id: 'app.createBreakoutRoom.join',
    description: 'Join confirmation button label',
    defaultMessage: 'Join room',
  },
  dismissLabel: {
    id: 'app.breakoutJoinConfirmation.dismissLabel',
    description: 'Cancel button label',
    defaultMessage: 'Not now',
  },
  generatingURL: {
    id: 'app.createBreakoutRoom.generatingURLMessage',
    description: 'label for generating breakout room url',
    defaultMessage: 'Preparing your join link…',
  },
  breakoutRoom: {
    id: 'app.createBreakoutRoom.room',
    description: 'breakout room',
    defaultMessage: 'Group {roomNumber}',
  },
  joinHint: {
    id: 'app.breakoutJoinConfirmation.joinHint',
    description: 'Hint that breakout opens in a new tab',
    defaultMessage: 'The room opens in a new browser tab. You can return here anytime.',
  },
});

interface BreakoutJoinConfirmationProps {
  freeJoin: boolean;
  breakouts: BreakoutRoom[];
  currentUserJoined: boolean,
  presenter: boolean;
}

const BreakoutJoinConfirmation: React.FC<BreakoutJoinConfirmationProps> = ({
  freeJoin,
  breakouts,
  currentUserJoined,
  presenter,
}) => {
  const [breakoutRoomRequestJoinURL] = useMutation(BREAKOUT_ROOM_REQUEST_JOIN_URL);
  const [callHandleInviteDismissedAt] = useMutation(handleInviteDismissedAt);
  const stopMediaOnMainRoom = useStopMediaOnMainRoom();
  const intl = useIntl();
  const [waiting, setWaiting] = React.useState(false);

  const {
    close: breakoutJoinConfirmationClose,
    open: breakoutJoinConfirmationOpen,
    isOpen: breakoutJoinConfirmationIsOpen,
  } = useModalRegistration({
    id: 'breakoutJoinConfirmationModal',
    priority: 'medium',
  });

  const setIsOpen = useCallback((value: boolean) => {
    if (value) {
      breakoutJoinConfirmationOpen();
    } else {
      breakoutJoinConfirmationClose();
    }
  }, [breakoutJoinConfirmationClose, breakoutJoinConfirmationOpen]);

  const uniqueMatch = (arr: BreakoutRoom[], predicate: (item: BreakoutRoom) => boolean) => {
    const matches = arr.filter(predicate);
    return matches.length === 1 ? matches[0] : null;
  };

  const defaultSelectedBreakoutId = uniqueMatch(breakouts, (br) => br.showInvitation)?.breakoutRoomMeetingId
      || uniqueMatch(breakouts, (br) => br.isLastAssignedRoom)?.breakoutRoomMeetingId
      || breakouts.find((br) => br.joinURL != null)?.breakoutRoomMeetingId
      || breakouts[0]?.breakoutRoomMeetingId;

  const [selectValue, setSelectValue] = React.useState('');

  const requestJoinURL = (breakoutRoomMeetingId: string) => {
    breakoutRoomRequestJoinURL({ variables: { breakoutRoomMeetingId } });
  };

  if (defaultSelectedBreakoutId === breakouts[0]?.breakoutRoomMeetingId) {
    const selectedBreakout = breakouts.find(
      ({ breakoutRoomMeetingId }) => breakoutRoomMeetingId === defaultSelectedBreakoutId,
    );
    if (!selectedBreakout?.joinURL && !waiting) {
      requestJoinURL(defaultSelectedBreakoutId);
      setWaiting(true);
    }
  }

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectValue(event.target.value);
    const selectedBreakout = breakouts.find(
      ({ breakoutRoomMeetingId }) => breakoutRoomMeetingId === event.target.value,
    );
    if (!selectedBreakout?.joinURL) {
      requestJoinURL(event.target.value);
      setWaiting(true);
    }
  };

  useEffect(() => {
    if (defaultSelectedBreakoutId) {
      setSelectValue(defaultSelectedBreakoutId);
    }
  }, [defaultSelectedBreakoutId]);

  const handleJoinBreakoutConfirmation = useCallback(() => {
    stopMediaOnMainRoom(presenter);

    if (breakouts.length === 1) {
      const breakout = breakouts[0];

      if (breakout?.joinURL) {
        window.open(breakout.joinURL, '_blank');
      }
      setIsOpen(false);
    } else {
      const selectedBreakout = breakouts.find(({ breakoutRoomMeetingId }) => breakoutRoomMeetingId === selectValue);
      if (selectedBreakout?.joinURL) {
        logger.info({
          logCode: 'breakoutroom_freejoin_selected',
          extraInfo: { selectedBreakout },
        }, 'User selected breakout room to join');

        window.open(selectedBreakout.joinURL, '_blank');
        setIsOpen(false);
      }
    }
  }, [breakouts, selectValue, presenter, stopMediaOnMainRoom, setIsOpen]);

  const handleDismiss = useCallback(() => {
    setIsOpen(false);
    callHandleInviteDismissedAt();
  }, [setIsOpen, callHandleInviteDismissedAt]);

  const select = useMemo(() => (
    <Styled.SelectParent>
      <p data-test="breakoutJoinModalMessage">
        {intl.formatMessage(intlMessages.freeJoinMessage)}
      </p>
      <Styled.Select
        value={selectValue}
        onChange={handleSelectChange}
        disabled={waiting}
        data-test="selectBreakoutRoomBtn"
      >
        {
          breakouts.sort((a, b) => a.sequence - b.sequence).map(({
            shortName, breakoutRoomMeetingId, isDefaultName, sequence,
          }) => (
            <option
              data-test="roomOption"
              key={breakoutRoomMeetingId}
              value={breakoutRoomMeetingId}
            >
              {isDefaultName ? intl.formatMessage(intlMessages.breakoutRoom, { roomNumber: sequence }) : shortName}
            </option>
          ))
        }
      </Styled.Select>
      {waiting ? (
        <span data-test="labelGeneratingURL">{intl.formatMessage(intlMessages.generatingURL)}</span>
      ) : null}
    </Styled.SelectParent>
  ), [breakouts, waiting, selectValue, intl]);

  const roomName = breakouts[0].isDefaultName
    ? intl.formatMessage(intlMessages.breakoutRoom, { roomNumber: breakouts[0].sequence })
    : breakouts[0].shortName;

  useEffect(() => {
    if (waiting) {
      const breakout = breakouts.find(({ breakoutRoomMeetingId }) => breakoutRoomMeetingId === selectValue);
      if (breakout?.joinURL) {
        setWaiting(false);
      }
    }
  }, [breakouts, waiting, selectValue]);

  useEffect(() => {
    if (breakouts?.length > 0 && !currentUserJoined) {
      setIsOpen(true);
    }
  }, [breakouts, currentUserJoined, setIsOpen]);

  useEffect(() => {
    if (freeJoin) {
      logger.info({
        logCode: 'breakoutroom_freejoin_options',
        extraInfo: { breakouts },
      }, 'User is given the option to join these breakout rooms');
    }
  }, [freeJoin, breakouts]);

  return (
    <ModalSimple
      modalIsOpen={breakoutJoinConfirmationIsOpen}
      className="skyroom-breakout-join-modal"
      overlayClassName="skyroom-breakout-join-overlay"
      onRequestClose={handleDismiss}
      title={intl.formatMessage(intlMessages.title)}
      shouldShowCloseButton={false}
      shouldCloseOnOverlayClick={false}
      data-test="breakoutJoinConfirmationModal"
    >
      <Styled.JoinModalBody data-test="breakoutJoinModalBody">
        {freeJoin ? select : (
          <>
            <p data-test="breakoutJoinModalMessage">
              {intl.formatMessage(intlMessages.message)}
            </p>
            <Styled.RoomNameHighlight data-test="breakoutJoinRoomName">
              <Icon iconName="rooms" data-test="breakoutJoinRoomIcon" />
              <span>{roomName}</span>
            </Styled.RoomNameHighlight>
          </>
        )}
        <p data-test="breakoutJoinModalHint">
          {intl.formatMessage(intlMessages.joinHint)}
        </p>
        <Styled.JoinModalActions data-test="breakoutJoinModalActions">
          <Styled.ActionButtonWrap data-test="breakoutJoinConfirmBtn">
            <Button
              color="primary"
              size="md"
              icon="popout_window"
              iconRight
              label={intl.formatMessage(intlMessages.confirmLabel)}
              disabled={waiting}
              onClick={handleJoinBreakoutConfirmation}
            />
          </Styled.ActionButtonWrap>
          <Styled.ActionButtonWrap data-test="breakoutJoinDismissBtn">
            <Button
              color="default"
              size="md"
              label={intl.formatMessage(intlMessages.dismissLabel)}
              onClick={handleDismiss}
            />
          </Styled.ActionButtonWrap>
        </Styled.JoinModalActions>
      </Styled.JoinModalBody>
    </ModalSimple>
  );
};

const BreakoutJoinConfirmationContainer: React.FC = () => {
  const { data: currentUser } = useCurrentUser((u) => {
    return {
      isModerator: u.isModerator,
      lastBreakoutRoom: u.lastBreakoutRoom,
      presenter: u.presenter,
      breakoutRoomsSummary: u.breakoutRoomsSummary,
    };
  });

  const hasInvitationToShow = (currentUser?.breakoutRoomsSummary?.totalOfShowInvitation ?? 0) > 0;

  const { data: currentMeeting } = useMeeting((m) => ({
    breakoutRoomsCommonProperties: m.breakoutRoomsCommonProperties,
  }));

  const breakoutExitObserver = useBreakoutExitObserver();
  useEffect(() => {
    breakoutExitObserver.setCallback('rejoinAudio', rejoinAudio);
    return () => {
      breakoutExitObserver.removeCallback('rejoinAudio');
    };
  }, [breakoutExitObserver]);

  const {
    data: breakoutData,
  } = useDeduplicatedSubscription<GetBreakoutDataResponse>(getBreakoutData, { skip: !hasInvitationToShow });

  if (!hasInvitationToShow) return null;

  if (currentUser?.isModerator
      && !currentMeeting?.breakoutRoomsCommonProperties?.sendInvitationToModerators) return null;

  if (!breakoutData || (breakoutData.breakoutRoom?.length ?? 0) === 0) return null;

  return (
    <BreakoutJoinConfirmation
      freeJoin={currentMeeting?.breakoutRoomsCommonProperties?.freeJoin ?? false}
      breakouts={breakoutData.breakoutRoom}
      currentUserJoined={currentUser?.lastBreakoutRoom?.isUserCurrentlyInRoom ?? false}
      presenter={currentUser?.presenter ?? false}
    />
  );
};

export default BreakoutJoinConfirmationContainer;

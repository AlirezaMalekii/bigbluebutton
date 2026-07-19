import { useMutation } from '@apollo/client';
import React, { useCallback, useEffect, useMemo } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import Styled from './styles';
import ModalFullscreen from '/imports/ui/components/common/modal/fullscreen/component';
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
import Icon from '/imports/ui/components/common/icon/component';
import { layoutDispatch } from '/imports/ui/components/layout/context';
import {
  isSkyroomColumnLayout,
  openSkyroomBreakoutPanel,
} from '/imports/ui/components/skyroom-layout/panel-toggles';

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
  confirmDesc: {
    id: 'app.breakoutJoinConfirmation.confirmDesc',
    description: 'adds context to confirm option',
    defaultMessage: 'Join breakout room',
  },
  dismissLabel: {
    id: 'app.breakoutJoinConfirmation.dismissLabel',
    description: 'Cancel button label',
    defaultMessage: 'Not now',
  },
  dismissDesc: {
    id: 'app.breakoutJoinConfirmation.dismissDesc',
    description: 'adds context to dismiss option',
    defaultMessage: 'Dismiss breakout room invitation',
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
  const layoutContextDispatch = layoutDispatch();
  const [waiting, setWaiting] = React.useState(false);
  const [invitationDismissed, setInvitationDismissed] = React.useState(false);

  const {
    close: breakoutJoinConfirmationClose,
    open: breakoutJoinConfirmationOpen,
    isOpen: breakoutJoinConfirmationIsOpen,
  } = useModalRegistration({
    id: 'breakoutJoinConfirmationModal',
    priority: 'high',
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

  const [selectValue, setSelectValue] = React.useState(defaultSelectedBreakoutId ?? '');

  const requestJoinURL = useCallback((breakoutRoomMeetingId: string) => {
    breakoutRoomRequestJoinURL({ variables: { breakoutRoomMeetingId } });
  }, [breakoutRoomRequestJoinURL]);

  useEffect(() => {
    if (defaultSelectedBreakoutId) {
      setSelectValue(defaultSelectedBreakoutId);
    }
  }, [defaultSelectedBreakoutId]);

  // Pre-request join URL for free-join when the default room has no URL yet.
  useEffect(() => {
    if (!freeJoin || !defaultSelectedBreakoutId || waiting) return;

    const selectedBreakout = breakouts.find(
      ({ breakoutRoomMeetingId }) => breakoutRoomMeetingId === defaultSelectedBreakoutId,
    );
    if (!selectedBreakout?.joinURL) {
      requestJoinURL(defaultSelectedBreakoutId);
      setWaiting(true);
    }
  }, [freeJoin, defaultSelectedBreakoutId, breakouts, waiting, requestJoinURL]);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextValue = event.target.value;
    setSelectValue(nextValue);
    const selectedBreakout = breakouts.find(
      ({ breakoutRoomMeetingId }) => breakoutRoomMeetingId === nextValue,
    );
    if (!selectedBreakout?.joinURL) {
      requestJoinURL(nextValue);
      setWaiting(true);
    }
  };

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
    setInvitationDismissed(true);
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

  const roomName = breakouts[0]?.isDefaultName
    ? intl.formatMessage(intlMessages.breakoutRoom, { roomNumber: breakouts[0].sequence })
    : breakouts[0]?.shortName ?? '';

  useEffect(() => {
    if (!waiting) return;
    const breakout = breakouts.find(({ breakoutRoomMeetingId }) => breakoutRoomMeetingId === selectValue);
    if (breakout?.joinURL) {
      setWaiting(false);
    }
  }, [breakouts, waiting, selectValue]);

  useEffect(() => {
    if (breakouts?.length > 0 && !currentUserJoined && !invitationDismissed) {
      setIsOpen(true);
      // Open the Skyroom breakout content box / mobile tab alongside the invite modal.
      // Defer one tick so mobile activeBox isn't raced against stale breakoutOpen=false.
      if (isSkyroomColumnLayout()) {
        window.setTimeout(() => {
          openSkyroomBreakoutPanel(layoutContextDispatch);
        }, 0);
      }
    }
  }, [breakouts, currentUserJoined, invitationDismissed, setIsOpen, layoutContextDispatch]);

  useEffect(() => {
    if (freeJoin) {
      logger.info({
        logCode: 'breakoutroom_freejoin_options',
        extraInfo: { breakouts },
      }, 'User is given the option to join these breakout rooms');
    }
  }, [freeJoin, breakouts]);

  return (
    <ModalFullscreen
      title={intl.formatMessage(intlMessages.title)}
      confirm={{
        callback: handleJoinBreakoutConfirmation,
        label: intl.formatMessage(intlMessages.confirmLabel),
        description: intl.formatMessage(intlMessages.confirmDesc),
        icon: 'popout_window',
        disabled: waiting,
      }}
      dismiss={{
        callback: handleDismiss,
        label: intl.formatMessage(intlMessages.dismissLabel),
        description: intl.formatMessage(intlMessages.dismissDesc),
      }}
      setIsOpen={setIsOpen}
      isOpen={breakoutJoinConfirmationIsOpen}
      priority="high"
      data-test="breakoutJoinConfirmationModal"
    >
      {freeJoin ? select : (
        <Styled.ConfirmationBody data-test="breakoutJoinModalBody">
          <p data-test="breakoutJoinModalMessage">
            {intl.formatMessage(intlMessages.message)}
          </p>
          <Styled.RoomNameHighlight data-test="breakoutJoinRoomName">
            <Icon iconName="rooms" data-test="breakoutJoinRoomIcon" />
            <span>{roomName}</span>
          </Styled.RoomNameHighlight>
          <p data-test="breakoutJoinModalHint">
            {intl.formatMessage(intlMessages.joinHint)}
          </p>
        </Styled.ConfirmationBody>
      )}
    </ModalFullscreen>
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

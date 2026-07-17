import { useMutation, useReactiveVar } from '@apollo/client';
import React, { useCallback, useEffect, useMemo } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import {
  BreakoutRoom as BreakoutRoomType,
  GetBreakoutDataResponse,
  getBreakoutData,
} from './queries';
import logger from '/imports/startup/client/logger';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import Header from '/imports/ui/components/common/control-header/component';
import Styled from './styles';
import { layoutDispatch } from '../../layout/context';
import { ACTIONS, PANELS } from '../../layout/enums';
import { BREAKOUT_ROOM_END_ALL, BREAKOUT_ROOM_REQUEST_JOIN_URL, USER_TRANSFER_VOICE_TO_MEETING } from '../mutations';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import TimeRemaingPanel from './components/timeRemaining';
import BreakoutMessageForm from './components/messageForm';
import ModeratorToolbar from './components/moderatorToolbar';
import RoomCard from './components/roomCard';
import { useStopMediaOnMainRoom } from '/imports/ui/components/breakout-room/hooks';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import connectionStatus from '/imports/ui/core/graphql/singletons/connectionStatus';
import {
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
  closeSkyroomBreakoutPanel,
} from '/imports/ui/components/skyroom-layout/panel-toggles';

export type BreakoutRoomPresentation = 'sidebar' | 'mobile';

interface BreakoutRoomProps {
  breakouts: BreakoutRoomType[];
  isModerator: boolean;
  presenter: boolean;
  durationInSeconds: number;
  userJoinedAudio: boolean;
  userId: string;
  meetingId: string;
  createdTime: number;
  isConnected: boolean;
  audioBridge: string;
  presentation?: BreakoutRoomPresentation;
  onClose?: () => void;
}

const intlMessages = defineMessages({
  breakoutTitle: {
    id: 'app.createBreakoutRoom.title',
    description: 'breakout title',
    defaultMessage: 'Breakout Rooms',
  },
  breakoutAriaTitle: {
    id: 'app.createBreakoutRoom.ariaTitle',
    description: 'breakout aria title',
    defaultMessage: 'Close breakout panel',
  },
  summaryRooms: {
    id: 'app.breakout.manager.summaryRooms',
    description: 'Summary of active breakout rooms',
    defaultMessage: '{count} active rooms',
  },
  summaryParticipants: {
    id: 'app.breakout.manager.summaryParticipants',
    description: 'Summary of assigned participants',
    defaultMessage: '{count} assigned',
  },
  userGuide: {
    id: 'app.breakout.manager.userGuide',
    description: 'Guide for participants to join their room',
    defaultMessage: 'Your breakout room is highlighted below. Tap "Join room" to enter in a new tab.',
  },
  userGuideAssigned: {
    id: 'app.breakout.manager.userGuideAssigned',
    description: 'Guide when user has an assigned room',
    defaultMessage: 'You are assigned to "{roomName}". Tap "Join room" to enter.',
  },
});

const BreakoutRoom: React.FC<BreakoutRoomProps> = ({
  breakouts,
  isModerator,
  durationInSeconds,
  presenter,
  userJoinedAudio,
  userId,
  meetingId,
  createdTime,
  isConnected,
  audioBridge,
  presentation = 'sidebar',
  onClose,
}) => {
  const [breakoutRoomEndAll] = useMutation(BREAKOUT_ROOM_END_ALL);
  const [breakoutRoomTransfer] = useMutation(USER_TRANSFER_VOICE_TO_MEETING);
  const [breakoutRoomRequestJoinURL] = useMutation(BREAKOUT_ROOM_REQUEST_JOIN_URL);
  const stopMediaOnMainRoom = useStopMediaOnMainRoom();

  const layoutContextDispatch = layoutDispatch();
  const intl = useIntl();

  const panelRef = React.useRef<HTMLDivElement>(null);
  const [showChangeTimeForm, setShowChangeTimeForm] = React.useState(false);
  const [requestedBreakoutRoomId, setRequestedBreakoutRoomId] = React.useState<string>('');

  const assignedRoom = useMemo(
    () => breakouts.find((b) => b.showInvitation || b.isLastAssignedRoom),
    [breakouts],
  );

  const totalAssignedParticipants = useMemo(
    () => breakouts.reduce(
      (sum, b) => sum + b.participants.filter((p) => !p.isAudioOnly).length,
      0,
    ),
    [breakouts],
  );

  const transferUserToMeeting = (fromMeeting: string, toMeeting: string) => {
    breakoutRoomTransfer({
      variables: {
        fromMeetingId: fromMeeting,
        toMeetingId: toMeeting,
      },
    });
  };

  const requestJoinURL = (breakoutRoomMeetingId: string) => {
    breakoutRoomRequestJoinURL({ variables: { breakoutRoomMeetingId } });
  };

  const handleJoinRoom = (breakout: BreakoutRoomType) => {
    if (!breakout.joinURL) {
      setRequestedBreakoutRoomId(breakout.breakoutRoomMeetingId);
      requestJoinURL(breakout.breakoutRoomMeetingId);
    } else {
      window.open(breakout.joinURL, '_blank');
      stopMediaOnMainRoom(presenter);
    }
  };

  const closePanel = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }
    if (isSkyroomColumnLayout()) {
      closeSkyroomBreakoutPanel(layoutContextDispatch);
      return;
    }
    layoutContextDispatch({
      type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN,
      value: false,
    });
    layoutContextDispatch({
      type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL,
      value: PANELS.NONE,
    });
  }, [layoutContextDispatch, onClose]);

  useEffect(() => {
    if (requestedBreakoutRoomId) {
      const breakout = breakouts.find((b) => b.breakoutRoomMeetingId === requestedBreakoutRoomId);
      if (breakout && breakout.joinURL) {
        window.open(breakout.joinURL, '_blank');
        setRequestedBreakoutRoomId('');
        stopMediaOnMainRoom(presenter);
      }
    }
  }, [breakouts, stopMediaOnMainRoom, presenter, requestedBreakoutRoomId]);

  const userGuideMessage = assignedRoom
    ? intl.formatMessage(intlMessages.userGuideAssigned, {
      roomName: assignedRoom.isDefaultName
        ? intl.formatMessage({ id: 'app.createBreakoutRoom.room', defaultMessage: 'Group {roomNumber}' }, { roomNumber: assignedRoom.sequence })
        : assignedRoom.shortName,
    })
    : intl.formatMessage(intlMessages.userGuide);

  const isMobilePresentation = presentation === 'mobile';

  const durationBlock = (
    <TimeRemaingPanel
      showChangeTimeForm={showChangeTimeForm}
      isModerator={isModerator}
      durationInSeconds={durationInSeconds}
      createdTime={createdTime}
      toggleShowChangeTimeForm={setShowChangeTimeForm}
      presentation={presentation}
    />
  );

  const managerChrome = (
    <>
      {isModerator ? (
        <ModeratorToolbar
          onChangeTime={() => setShowChangeTimeForm(true)}
          onEndAll={() => {
            closePanel();
            breakoutRoomEndAll();
          }}
          isConnected={isConnected}
        />
      ) : (
        <Styled.UserGuideBanner data-test="breakoutUserGuide">
          {userGuideMessage}
        </Styled.UserGuideBanner>
      )}

      <Styled.SummaryBar data-test="breakoutSummaryBar">
        <span>
          {intl.formatMessage(intlMessages.summaryRooms, { count: breakouts.length })}
        </span>
        {isModerator ? (
          <span>
            {intl.formatMessage(intlMessages.summaryParticipants, { count: totalAssignedParticipants })}
          </span>
        ) : null}
      </Styled.SummaryBar>

      {isModerator ? <BreakoutMessageForm /> : null}
      {isModerator ? <Styled.Separator /> : null}
    </>
  );

  const roomsList = (
    <Styled.BreakoutsList>
      {breakouts.map((breakout) => (
        <RoomCard
          key={`breakoutRoomItems-${breakout.breakoutRoomMeetingId}`}
          breakout={breakout}
          isModerator={isModerator}
          isYourRoom={!isModerator && (breakout.showInvitation || breakout.isLastAssignedRoom)}
          userId={userId}
          meetingId={meetingId}
          userJoinedAudio={userJoinedAudio}
          audioBridge={audioBridge}
          isRequesting={requestedBreakoutRoomId === breakout.breakoutRoomMeetingId}
          onJoin={() => handleJoinRoom(breakout)}
          onTransferAudio={transferUserToMeeting}
        />
      ))}
    </Styled.BreakoutsList>
  );

  return (
    <Styled.Panel
      ref={panelRef}
      $presentation={presentation}
      data-test="breakoutRoomPanel"
      data-skyroom-presentation={presentation}
      onCopy={(e) => {
        e.preventDefault();
      }}
    >
      {isMobilePresentation ? (
        <>
          <Styled.MobilePanelTitle data-test="breakoutRoomManagerHeader">
            {intl.formatMessage(intlMessages.breakoutTitle)}
          </Styled.MobilePanelTitle>
          <Styled.ScrollableBody data-test="breakoutRoomScrollBody">
            {durationBlock}
            {managerChrome}
            {roomsList}
          </Styled.ScrollableBody>
        </>
      ) : (
        <>
          <Styled.PanelHeader data-test="breakoutRoomPanelHeader">
            <Header
              leftButtonProps={{
                'aria-label': intl.formatMessage(intlMessages.breakoutAriaTitle),
                label: intl.formatMessage(intlMessages.breakoutTitle),
                onClick: closePanel,
              }}
              data-test="breakoutRoomManagerHeader"
              rightButtonProps={{}}
              customRightButton={null}
            />
            {durationBlock}
            {managerChrome}
          </Styled.PanelHeader>
          <Styled.ScrollableBody data-test="breakoutRoomScrollBody">
            {roomsList}
          </Styled.ScrollableBody>
        </>
      )}
    </Styled.Panel>
  );
};

interface BreakoutRoomContainerProps {
  presentation?: BreakoutRoomPresentation;
  onClose?: () => void;
}

const BreakoutRoomContainer: React.FC<BreakoutRoomContainerProps> = ({
  presentation: presentationProp,
  onClose,
}) => {
  const layoutContextDispatch = layoutDispatch();
  const presentation = presentationProp ?? (
    isSkyroomColumnLayout() && isSkyroomMobileViewport() ? 'mobile' : 'sidebar'
  );

  const handleClose = onClose ?? (
    isSkyroomColumnLayout()
      ? () => closeSkyroomBreakoutPanel(layoutContextDispatch)
      : undefined
  );

  const {
    data: meetingData,
  } = useMeeting((m) => ({
    audioBridge: m.audioBridge,
    durationInSeconds: m.durationInSeconds,
    createdTime: m.createdTime,
    meetingId: m.meetingId,
  }));

  const {
    data: currentUserData,
    loading: currentUserLoading,
  } = useCurrentUser((u) => ({
    isModerator: u.isModerator,
    presenter: u.presenter,
    voice: u.voice,
    userId: u.userId,
  }));

  const {
    data: breakoutData,
    loading: breakoutLoading,
    error: breakoutError,
  } = useDeduplicatedSubscription<GetBreakoutDataResponse>(getBreakoutData);
  const connected = useReactiveVar(connectionStatus.getConnectedStatusVar());
  if (
    breakoutLoading
    || currentUserLoading
  ) return null;

  if (breakoutError) {
    connectionStatus.setSubscriptionFailed(true);
    logger.error(
      {
        logCode: 'subscription_Failed',
        extraInfo: {
          error: breakoutError,
        },
      },
      'Subscription failed to load',
    );
    return null;
  }
  if (!currentUserData || !breakoutData || !meetingData) return null;

  return (
    <BreakoutRoom
      breakouts={breakoutData.breakoutRoom || []}
      isModerator={currentUserData.isModerator ?? false}
      presenter={currentUserData.presenter ?? false}
      durationInSeconds={meetingData.durationInSeconds ?? 0}
      userJoinedAudio={(currentUserData?.voice?.joined && !currentUserData?.voice?.deafened) ?? false}
      userId={currentUserData.userId ?? ''}
      meetingId={meetingData.meetingId ?? ''}
      createdTime={meetingData.createdTime ?? 0}
      isConnected={connected}
      audioBridge={meetingData.audioBridge ?? 'livekit'}
      presentation={presentation}
      onClose={handleClose}
    />
  );
};
export default BreakoutRoomContainer;

import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import useTimer from '/imports/ui/core/hooks/useTimer';
import { getCurrentPollData, getCurrentPollDataResponse } from '/imports/ui/components/poll/queries';
import { hasPendingPoll, HasPendingPollResponse } from '/imports/ui/components/polling/queries';
import { useStorageKey } from '/imports/ui/services/storage/hooks';
import { useIsPollingEnabled } from '/imports/ui/services/features';
import { useEffect, useReducer } from 'react';
import {
  isPollParticipationDismissed,
  subscribePollParticipationDismiss,
} from './pollParticipationDismiss';

/**
 * True when the Skyroom header status cluster (timer and/or poll summary) should
 * render for the current user. Shared by the desktop header rail and mobile rail.
 */
const useSkyroomHeaderStatusVisible = (): boolean => {
  const pollInitiated = useStorageKey('pollInitiated') || false;
  const [, forceParticipationSync] = useReducer((x: number) => x + 1, 0);

  useEffect(() => subscribePollParticipationDismiss(forceParticipationSync), []);

  const { data: currentUser, loading: userLoading } = useCurrentUser((u) => ({
    userId: u.userId,
    presenter: u.presenter,
    isModerator: u.isModerator,
  }));

  const { data: meeting, loading: meetingLoading } = useMeeting((m) => ({
    componentsFlags: m.componentsFlags,
  }));

  const { data: timerData } = useTimer({ isIndicator: true });
  const timerActive = Boolean(timerData?.active);
  const isPollingEnabled = useIsPollingEnabled();

  const hasActivePoll = Boolean(meeting?.componentsFlags?.hasPoll || pollInitiated);
  const canSeePollSummary = Boolean(currentUser?.presenter || currentUser?.isModerator);

  const { error: pollError } = useDeduplicatedSubscription<getCurrentPollDataResponse>(
    getCurrentPollData,
    { skip: !hasActivePoll || !canSeePollSummary || userLoading || meetingLoading },
  );

  const pollVisible = canSeePollSummary
    && hasActivePoll
    && !userLoading
    && !meetingLoading
    && !pollError;

  const { data: pendingPollData } = useDeduplicatedSubscription<HasPendingPollResponse>(
    hasPendingPoll,
    {
      variables: { userId: currentUser?.userId },
      skip: !currentUser?.userId || userLoading || meetingLoading
        || !meeting?.componentsFlags?.hasPoll || !isPollingEnabled
        || currentUser?.presenter || currentUser?.isModerator,
    },
  );

  const pendingPollId = pendingPollData?.meeting?.[0]?.polls?.[0]?.pollId;
  const participationVisible = Boolean(
    pendingPollId
    && isPollParticipationDismissed(pendingPollId)
    && !currentUser?.presenter
    && !currentUser?.isModerator,
  );

  return timerActive || pollVisible || participationVisible;
};

export default useSkyroomHeaderStatusVisible;

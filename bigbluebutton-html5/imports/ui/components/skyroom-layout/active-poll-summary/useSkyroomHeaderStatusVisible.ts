import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import useTimer from '/imports/ui/core/hooks/useTimer';
import { getCurrentPollData, getCurrentPollDataResponse } from '/imports/ui/components/poll/queries';
import { useStorageKey } from '/imports/ui/services/storage/hooks';

/**
 * True when the Skyroom header status cluster (timer and/or poll summary) should
 * render for the current user. Shared by the desktop header rail and mobile rail.
 */
const useSkyroomHeaderStatusVisible = (): boolean => {
  const pollInitiated = useStorageKey('pollInitiated') || false;

  const { data: currentUser, loading: userLoading } = useCurrentUser((u) => ({
    presenter: u.presenter,
    isModerator: u.isModerator,
  }));

  const { data: meeting, loading: meetingLoading } = useMeeting((m) => ({
    componentsFlags: m.componentsFlags,
  }));

  const { data: timerData } = useTimer({ isIndicator: true });
  const timerActive = Boolean(timerData?.active);

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

  return timerActive || pollVisible;
};

export default useSkyroomHeaderStatusVisible;

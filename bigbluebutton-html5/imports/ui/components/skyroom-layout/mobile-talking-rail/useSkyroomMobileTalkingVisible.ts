import { useMemo } from 'react';
import useTalkingUsers from '/imports/ui/core/hooks/useTalkingUsers';

/**
 * True when the active-speaker rail should render on Skyroom mobile
 * (feature enabled and at least one talking / was-talking user visible).
 */
const useSkyroomMobileTalkingVisible = (): boolean => {
  const enableTalkingIndicator = window.meetingClientSettings?.public?.app?.enableTalkingIndicator;
  const { data: talkingUsersData, loading } = useTalkingUsers();

  const hasTalkingUsers = useMemo(() => {
    if (!talkingUsersData) return false;
    return Object.values(talkingUsersData).length > 0;
  }, [talkingUsersData]);

  return Boolean(enableTalkingIndicator && !loading && hasTalkingUsers);
};

export default useSkyroomMobileTalkingVisible;

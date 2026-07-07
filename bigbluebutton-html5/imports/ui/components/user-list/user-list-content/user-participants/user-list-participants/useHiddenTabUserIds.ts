import { useMemo } from 'react';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import {
  HIDDEN_TAB_USERS_SUBSCRIPTION,
  HiddenTabUsersSubscriptionResponse,
} from './tab-presence-queries';

const useHiddenTabUserIds = (): Set<string> => {
  const { data: currentUser } = useCurrentUser((u) => ({
    isModerator: u.isModerator,
  }));

  const isModerator = currentUser?.isModerator === true;

  const { data } = useDeduplicatedSubscription<HiddenTabUsersSubscriptionResponse>(
    HIDDEN_TAB_USERS_SUBSCRIPTION,
    { skip: !isModerator },
  );

  return useMemo(() => {
    const hiddenUserIds = new Set<string>();
    data?.user_connectionStatusReport?.forEach((entry) => {
      if (entry.clientIsHidden && entry.userId) {
        hiddenUserIds.add(entry.userId);
      }
    });
    return hiddenUserIds;
  }, [data]);
};

export default useHiddenTabUserIds;

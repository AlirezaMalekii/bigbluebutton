import { useEffect, useRef } from 'react';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import { layoutDispatch } from '/imports/ui/components/layout/context';
import {
  GET_GUESTS_COUNT,
  GuestUsersCountResponse,
} from '/imports/ui/components/user-list/user-list-graphql/user-participants-title/guest-panel-opener/queries';
import {
  isSkyroomMobileViewport,
  openSkyroomMobileBox,
  openSkyroomWaitingUsers,
} from '../panel-toggles';
import { getSkyroomMobileActiveBox } from '../mobile-bottom-state';

/**
 * When a new guest joins the lobby on mobile, auto-switch the moderator to the
 * waiting tab so approval is one tap away.
 */
const useGuestWaitingAutoFocus = (): void => {
  const layoutContextDispatch = layoutDispatch();
  const prevCountRef = useRef<number | null>(null);
  const { data: currentUser } = useCurrentUser((u) => ({
    isModerator: u.isModerator,
  }));

  const { data: guestsCountData } = useDeduplicatedSubscription<GuestUsersCountResponse>(
    GET_GUESTS_COUNT,
  );

  const guestCount = guestsCountData?.user_guest_aggregate.aggregate.count ?? 0;
  const isModerator = Boolean(currentUser?.isModerator);

  useEffect(() => {
    if (!isModerator || !isSkyroomMobileViewport()) {
      prevCountRef.current = guestCount;
      return;
    }

    if (prevCountRef.current !== null && guestCount > prevCountRef.current) {
      openSkyroomWaitingUsers(layoutContextDispatch);
    }

    prevCountRef.current = guestCount;
  }, [guestCount, isModerator, layoutContextDispatch]);

  useEffect(() => {
    if (!isSkyroomMobileViewport()) return;
    if (guestCount === 0 && getSkyroomMobileActiveBox() === 'waiting') {
      openSkyroomMobileBox(layoutContextDispatch, 'chat');
    }
  }, [guestCount, layoutContextDispatch]);
};

export default useGuestWaitingAutoFocus;

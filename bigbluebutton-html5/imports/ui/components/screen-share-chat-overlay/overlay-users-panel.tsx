import React, { useEffect, useMemo, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import { User } from '/imports/ui/Types/user';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import {
  USER_AGGREGATE_COUNT_SUBSCRIPTION,
  UsersCountSubscriptionResponse,
} from '/imports/ui/components/user-list/user-list-content/user-participants/user-list-participants/queries';
import UserListParticipantsPageContainer from '/imports/ui/components/user-list/user-list-content/user-participants/user-list-participants/page/component';
import IntersectionWatcher from '/imports/ui/components/user-list/user-list-content/user-participants/user-list-participants/intersection-watcher/intersectionWatcher';
import useHiddenTabUserIds from '/imports/ui/components/user-list/user-list-content/user-participants/user-list-participants/useHiddenTabUserIds';
import UserListParticipantsStyles from '/imports/ui/components/user-list/user-list-content/user-participants/user-list-participants/styles';
import roveBuilder from '/imports/ui/core/utils/keyboardRove';
import {
  SkyroomUserSearchProvider,
  useSkyroomUserSearch,
} from '/imports/ui/components/skyroom-layout/user-search/context';
import SkyroomUserSearch from '/imports/ui/components/skyroom-layout/user-search/component';
import SkyroomUserSearchResults from '/imports/ui/components/skyroom-layout/user-search/search-results';
import { OverlayEmptyState, OverlayUsersPanelRoot } from './styles';

const intlMessages = defineMessages({
  empty: {
    id: 'app.screenShareChatOverlay.usersEmpty',
    description: 'Empty state when no participants are listed in floating overlay',
  },
  loading: {
    id: 'app.screenShareChatOverlay.usersLoading',
    description: 'Loading state for participants in floating overlay',
  },
});

/**
 * Same participant chrome as the sidebar users box: search + compact rows + actions,
 * without the sidebar plugin "user list open" side-effects.
 */
const OverlayUsersList: React.FC = () => {
  const intl = useIntl();
  const { searchTerm, isSearching } = useSkyroomUserSearch();
  const hiddenTabUserIds = useHiddenTabUserIds();
  const userListRef = React.useRef<HTMLUListElement | null>(null);
  const selectedUserRef = React.useRef<HTMLElement | null>(null);
  const [, setVisibleUsers] = useState<{ [key: number]: User[] }>({});

  const {
    data: countData,
    loading,
  } = useDeduplicatedSubscription<UsersCountSubscriptionResponse>(
    USER_AGGREGATE_COUNT_SUBSCRIPTION,
  );
  const count = countData?.user_aggregate?.aggregate?.count || 0;
  const amountOfPages = Math.ceil(count / 50);
  const rove = useMemo(() => roveBuilder(selectedUserRef, 'user-index'), []);

  useEffect(() => {
    selectedUserRef.current = null;
  }, [count, isSearching]);

  if (isSearching) {
    return (
      <>
        <SkyroomUserSearch forceEnabled />
        <SkyroomUserSearchResults searchTerm={searchTerm} />
      </>
    );
  }

  if (loading && count === 0) {
    return (
      <>
        <SkyroomUserSearch forceEnabled />
        <OverlayEmptyState>
          {intl.formatMessage(intlMessages.loading)}
        </OverlayEmptyState>
      </>
    );
  }

  if (count === 0) {
    return (
      <>
        <SkyroomUserSearch forceEnabled />
        <OverlayEmptyState>
          {intl.formatMessage(intlMessages.empty)}
        </OverlayEmptyState>
      </>
    );
  }

  return (
    <>
      <SkyroomUserSearch forceEnabled />
      <UserListParticipantsStyles.UserListColumn
        onKeyDown={rove}
        tabIndex={0}
        role="list"
      >
        <UserListParticipantsStyles.VirtualizedList as="ul" ref={userListRef}>
          {Array.from({ length: amountOfPages }).map((_, i) => {
            const isLastItem = amountOfPages === (i + 1);
            const restOfUsers = count % 50;
            const key = i;
            return i === 0
              ? (
                <UserListParticipantsPageContainer
                  key={key}
                  index={i}
                  isLastItem={isLastItem}
                  restOfUsers={isLastItem ? restOfUsers : 50}
                  setVisibleUsers={setVisibleUsers}
                  hiddenTabUserIds={hiddenTabUserIds}
                />
              )
              : (
                <IntersectionWatcher
                  // eslint-disable-next-line react/no-array-index-key
                  key={i}
                  ParentRef={userListRef}
                  isLastItem={isLastItem}
                  restOfUsers={isLastItem ? restOfUsers : 50}
                >
                  <UserListParticipantsPageContainer
                    key={key}
                    index={i}
                    isLastItem={isLastItem}
                    restOfUsers={isLastItem ? restOfUsers : 50}
                    setVisibleUsers={setVisibleUsers}
                    hiddenTabUserIds={hiddenTabUserIds}
                  />
                </IntersectionWatcher>
              );
          })}
        </UserListParticipantsStyles.VirtualizedList>
      </UserListParticipantsStyles.UserListColumn>
    </>
  );
};

const OverlayUsersPanel: React.FC = () => (
  <OverlayUsersPanelRoot data-test="screenShareChatOverlayUsers">
    <SkyroomUserSearchProvider>
      <OverlayUsersList />
    </SkyroomUserSearchProvider>
  </OverlayUsersPanelRoot>
);

export default OverlayUsersPanel;

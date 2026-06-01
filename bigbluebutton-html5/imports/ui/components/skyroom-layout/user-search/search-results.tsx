import React, { useContext, useMemo, useState } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import * as PluginSdk from 'bigbluebutton-html-plugin-sdk';
import { User } from '/imports/ui/Types/user';
import { GraphqlDataHookSubscriptionResponse } from '/imports/ui/Types/hook';
import { useCreateUseSubscription } from '/imports/ui/core/hooks/createUseSubscription';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import { layoutSelect } from '/imports/ui/components/layout/context';
import { Layout } from '/imports/ui/components/layout/layoutTypes';
import { LockSettings, UsersPolicies } from '/imports/ui/Types/meeting';
import { PluginsContext } from '/imports/ui/components/components-data/plugin-context/context';
import UserListParticipantsStyles from '/imports/ui/components/user-list/user-list-content/user-participants/user-list-participants/styles';
import UserActions from '/imports/ui/components/user-list/user-list-content/user-participants/user-list-participants/user-actions/component';
import ListItem from '/imports/ui/components/user-list/user-list-content/user-participants/user-list-participants/list-item/component';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import { CURRENT_PRESENTATION_PAGE_SUBSCRIPTION, CurrentPresentationPagesSubscriptionResponse } from '/imports/ui/components/whiteboard/queries';
import { SKYROOM_USER_SEARCH_SUBSCRIPTION } from './queries';
import Styled from './styles';

const SEARCH_LIMIT = 200;

const messages = defineMessages({
  loading: {
    id: 'app.skyroom.userSearch.loading',
    defaultMessage: 'Searching…',
  },
  empty: {
    id: 'app.skyroom.userSearch.empty',
    defaultMessage: 'No participants match your search',
  },
});

interface SkyroomUserSearchResultsProps {
  searchTerm: string;
}

const SkyroomUserSearchResults: React.FC<SkyroomUserSearchResultsProps> = ({ searchTerm }) => {
  const intl = useIntl();
  const isRTL = layoutSelect((i: Layout) => i.isRTL);
  const [openUserAction, setOpenUserAction] = useState<string | null>(null);
  const { pluginsExtensibleAreasAggregatedState } = useContext(PluginsContext);

  const ilikePattern = `%${searchTerm.trim()}%`;

  const useSearchSubscription = useCreateUseSubscription<User>(
    SKYROOM_USER_SEARCH_SUBSCRIPTION,
    { search: ilikePattern, limit: SEARCH_LIMIT },
    true,
  );

  const { data: usersData, loading } = useSearchSubscription((u) => u) as GraphqlDataHookSubscriptionResponse<User[]>;

  const { data: meeting, loading: meetingLoading } = useMeeting((m) => ({
    lockSettings: m.lockSettings,
    usersPolicies: m.usersPolicies,
    isBreakout: m.isBreakout,
    meetingId: m.meetingId,
  }));

  const { data: currentUser, loading: currentUserLoading } = useCurrentUser((c: Partial<User>) => ({
    userId: c.userId,
    extId: c.extId,
    voice: c.voice,
    isModerator: c.isModerator,
    presenter: c.presenter,
    guest: c.guest,
    mobile: c.mobile,
    locked: c.locked,
    userLockSettings: c.userLockSettings,
    lastBreakoutRoom: c.lastBreakoutRoom,
    cameras: c.cameras,
    pinned: c.pinned,
    away: c.away,
    reactionEmoji: c.reactionEmoji,
    avatar: c.avatar,
    isDialIn: c.isDialIn,
    name: c.name,
    color: c.color,
    whiteboardWriteAccess: c.whiteboardWriteAccess,
    raiseHand: c.raiseHand,
  }));

  const {
    data: presentationData,
    loading: presentationLoading,
  } = useDeduplicatedSubscription<CurrentPresentationPagesSubscriptionResponse>(
    CURRENT_PRESENTATION_PAGE_SUBSCRIPTION,
  );
  const pageId = presentationData?.pres_page_curr[0]?.pageId ?? '';

  const users = useMemo(() => {
    const list = [...(usersData ?? [])];
    if (!currentUser?.userId) return list;
    const idx = list.findIndex((u) => u.userId === currentUser.userId);
    if (idx > 0) {
      const [self] = list.splice(idx, 1);
      list.unshift(self);
    } else if (idx < 0 && currentUser.name?.toLowerCase().includes(searchTerm.trim().toLowerCase())) {
      list.unshift(currentUser as User);
    }
    return list;
  }, [usersData, currentUser, searchTerm]);

  let userListDropdownItems = [] as PluginSdk.UserListDropdownInterface[];
  if (pluginsExtensibleAreasAggregatedState.userListDropdownItems) {
    userListDropdownItems = [...pluginsExtensibleAreasAggregatedState.userListDropdownItems];
  }

  if (loading || meetingLoading || currentUserLoading || presentationLoading || !meeting || !currentUser) {
    return (
      <UserListParticipantsStyles.UserListColumn role="list" tabIndex={0}>
        <Styled.EmptyHint>{intl.formatMessage(messages.loading)}</Styled.EmptyHint>
      </UserListParticipantsStyles.UserListColumn>
    );
  }

  if (users.length === 0) {
    return (
      <UserListParticipantsStyles.UserListColumn role="list" tabIndex={0}>
        <Styled.EmptyHint>{intl.formatMessage(messages.empty)}</Styled.EmptyHint>
      </UserListParticipantsStyles.UserListColumn>
    );
  }

  return (
    <UserListParticipantsStyles.UserListColumn
      onKeyDown={() => {}}
      tabIndex={0}
      role="list"
    >
      <UserListParticipantsStyles.VirtualizedList as="ul">
        {users.map((user, idx) => (
          <UserListParticipantsStyles.UserListItem
            key={user.userId}
            style={{ direction: isRTL ? 'rtl' : 'ltr' }}
          >
            <UserActions
              user={user}
              currentUser={currentUser as User}
              lockSettings={meeting.lockSettings as LockSettings}
              usersPolicies={(meeting.usersPolicies as UsersPolicies) ?? {}}
              pageId={pageId}
              userListDropdownItems={userListDropdownItems}
              open={user.userId === openUserAction}
              setOpenUserAction={setOpenUserAction}
              isBreakout={!!meeting.isBreakout}
              type="participant"
            >
              <ListItem
                index={idx}
                user={user}
                lockSettings={meeting.lockSettings as LockSettings}
              />
            </UserActions>
          </UserListParticipantsStyles.UserListItem>
        ))}
      </UserListParticipantsStyles.VirtualizedList>
    </UserListParticipantsStyles.UserListColumn>
  );
};

export default SkyroomUserSearchResults;

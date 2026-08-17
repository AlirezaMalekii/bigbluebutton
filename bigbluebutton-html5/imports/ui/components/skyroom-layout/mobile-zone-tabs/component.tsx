import React, {
  useEffect, useReducer, useState, useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { defineMessages, useIntl } from 'react-intl';
import { layoutDispatch, layoutSelectInput } from '/imports/ui/components/layout/context';
import { PANELS } from '/imports/ui/components/layout/enums';
import { Input } from '/imports/ui/components/layout/layoutTypes';
import Icon from '/imports/ui/components/common/icon/component';
import useChat from '/imports/ui/core/hooks/useChat';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import { useIsSharedNotesEnabled } from '/imports/ui/services/features';
import { useLayoutWebcamCount } from '/imports/ui/components/video-provider/hooks';
import {
  USER_AGGREGATE_COUNT_SUBSCRIPTION,
  UsersCountSubscriptionResponse,
} from '/imports/ui/core/graphql/queries/users';
import {
  GET_GUESTS_COUNT,
  GuestUsersCountResponse,
} from '/imports/ui/components/user-list/user-list-graphql/user-participants-title/guest-panel-opener/queries';
import {
  SKYROOM_FOOTER_H,
  SKYROOM_MOBILE_EDGE,
  SKYROOM_MOBILE_FOOTER_LIFT,
  SKYROOM_MOBILE_TAB_FOOTER_GAP,
  SKYROOM_MOBILE_TAB_H,
} from '../column-layout';
import {
  isPublicChatOpen,
  isSkyroomMobileViewport,
  isSkyroomColumnLayout,
  openSkyroomMobileBox,
} from '../panel-toggles';
import { getSkyroomNotesOpen, subscribeSkyroomNotesOpen } from '../notes-panel-state';
import {
  resolveSkyroomMobileBox,
  subscribeSkyroomMobileBottom,
  SkyroomMobileBox,
} from '../mobile-bottom-state';

const messages = defineMessages({
  webcams: {
    id: 'app.skyroom.mobileTabs.webcams',
    description: 'Skyroom mobile bottom tab — webcams',
    defaultMessage: 'Webcams',
  },
  chat: {
    id: 'app.skyroom.mobileTabs.chat',
    description: 'Skyroom mobile bottom tab — chat',
    defaultMessage: 'Chat',
  },
  users: {
    id: 'app.skyroom.mobileTabs.users',
    description: 'Skyroom mobile bottom tab — users',
    defaultMessage: 'Participants',
  },
  notes: {
    id: 'app.skyroom.mobileTabs.notes',
    description: 'Skyroom mobile bottom tab — shared notes',
    defaultMessage: 'Shared notes',
  },
  breakout: {
    id: 'app.skyroom.mobileTabs.breakout',
    description: 'Skyroom mobile bottom tab — breakout rooms',
    defaultMessage: 'Breakout rooms',
  },
  waiting: {
    id: 'app.skyroom.mobileTabs.waiting',
    description: 'Skyroom mobile bottom tab — lobby waiting guests',
    defaultMessage: 'Lobby waiting',
  },
  ariaLabel: {
    id: 'app.skyroom.mobileTabs.ariaLabel',
    description: 'Accessible name for mobile bottom panel tabs',
    defaultMessage: 'Bottom panel tabs',
  },
});

type TabKey = Exclude<SkyroomMobileBox, null>;

const SkyroomMobileZoneTabs: React.FC = () => {
  const intl = useIntl();
  const layoutContextDispatch = layoutDispatch();
  const sidebarNavigation = layoutSelectInput((i: Input) => i.sidebarNavigation);
  const sidebarContent = layoutSelectInput((i: Input) => i.sidebarContent);
  const layoutWebcamCount = useLayoutWebcamCount();
  const presentation = layoutSelectInput((i: Input) => i.presentation);
  const screenShare = layoutSelectInput((i: Input) => i.screenShare);
  const cameraDock = layoutSelectInput((i: Input) => i.cameraDock);
  const notesEnabled = useIsSharedNotesEnabled();
  const { data: meeting } = useMeeting((m: {
    componentsFlags?: { hasBreakoutRoom?: boolean };
    usersPolicies?: { guestPolicy?: string };
  }) => ({
    componentsFlags: m.componentsFlags,
    usersPolicies: m.usersPolicies,
  }));
  const { data: currentUser } = useCurrentUser((u) => ({
    isModerator: u.isModerator,
    breakoutRoomsSummary: u.breakoutRoomsSummary,
  }));

  const { data: usersCountData } = useDeduplicatedSubscription<UsersCountSubscriptionResponse>(
    USER_AGGREGATE_COUNT_SUBSCRIPTION,
  );
  const { data: guestsCountData } = useDeduplicatedSubscription<GuestUsersCountResponse>(
    GET_GUESTS_COUNT,
  );

  const [notesOpen, setNotesOpen] = useState(getSkyroomNotesOpen);
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [isMobile, setIsMobile] = useState(isSkyroomMobileViewport);

  const usersCount = usersCountData?.user_aggregate?.aggregate?.count ?? 0;
  const guestCount = guestsCountData?.user_guest_aggregate.aggregate.count ?? 0;

  // Total unread across all conversations (public + privates) drives the chat-tab badge so a
  // received private message is noticeable before the chat box is opened.
  const { data: chats } = useChat((c: { totalUnread?: number }) => ({
    totalUnread: c.totalUnread,
  })) as { data?: { totalUnread?: number }[] };
  const totalUnread = Array.isArray(chats)
    ? chats.reduce((sum, c) => sum + (c.totalUnread || 0), 0)
    : 0;

  useEffect(() => subscribeSkyroomNotesOpen(setNotesOpen), []);
  useEffect(() => subscribeSkyroomMobileBottom(force), []);

  useEffect(() => {
    const onResize = () => setIsMobile(isSkyroomMobileViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleTab = useCallback((box: TabKey, active: boolean) => {
    openSkyroomMobileBox(layoutContextDispatch, active ? null : box);
  }, [layoutContextDispatch]);

  if (!isMobile || !isSkyroomColumnLayout()) return null;

  const usersOpen = sidebarNavigation.isOpen;
  const chatOpen = isPublicChatOpen(sidebarContent);
  const breakoutOpen = sidebarContent.isOpen
    && sidebarContent.sidebarContentPanel === PANELS.BREAKOUT;
  const waitingUsersOpen = sidebarContent.isOpen
    && sidebarContent.sidebarContentPanel === PANELS.WAITING_USERS;
  const activeBox = resolveSkyroomMobileBox({
    usersOpen, chatOpen, notesOpen, breakoutOpen, waitingUsersOpen,
  });

  const hasStage = Boolean(presentation.isOpen || screenShare.hasScreenShare);
  const hasCameras = layoutWebcamCount > 0 || (cameraDock?.numCameras ?? 0) > 0;
  // Keep the Webcams tab visible while that box is active (local join can briefly
  // report 0 cameras) so tiles stay in the tab panel above this bar — not orphaned.
  const showWebcams = hasStage && (hasCameras || activeBox === 'webcams');

  const hasBreakoutRoom = Boolean(meeting?.componentsFlags?.hasBreakoutRoom);
  const hasBreakoutInvite = (currentUser?.breakoutRoomsSummary?.totalOfJoinURL ?? 0) > 0
    || (currentUser?.breakoutRoomsSummary?.totalOfShowInvitation ?? 0) > 0;
  const showBreakout = hasBreakoutRoom && (Boolean(currentUser?.isModerator) || hasBreakoutInvite);
  const { usersPolicies } = meeting ?? {};
  const isAskModeratorPolicy = usersPolicies?.guestPolicy === 'ASK_MODERATOR';
  const showWaiting = Boolean(currentUser?.isModerator) && (
    guestCount > 0 || (
      window.meetingClientSettings.public.app.alwaysShowWaitingRoomUI && isAskModeratorPolicy
    )
  );

  const tabs: { key: TabKey; icon: string; label: string }[] = [
    showWebcams ? { key: 'webcams', icon: 'video', label: intl.formatMessage(messages.webcams) } : null,
    { key: 'chat', icon: 'chat', label: intl.formatMessage(messages.chat) },
    showWaiting ? { key: 'waiting', icon: 'time', label: intl.formatMessage(messages.waiting) } : null,
    { key: 'users', icon: 'user', label: intl.formatMessage(messages.users) },
    notesEnabled ? { key: 'notes', icon: 'copy', label: intl.formatMessage(messages.notes) } : null,
    showBreakout ? { key: 'breakout', icon: 'rooms', label: intl.formatMessage(messages.breakout) } : null,
  ].filter(Boolean) as { key: TabKey; icon: string; label: string }[];

  const layoutEl = typeof document !== 'undefined' ? document.getElementById('layout') : null;
  if (!layoutEl) return null;

  const bar = (
    <nav
      className="skyroom-mobile-zone-tabs"
      data-test="skyroomMobileZoneTabs"
      aria-label={intl.formatMessage(messages.ariaLabel)}
      style={{
        position: 'fixed',
        left: SKYROOM_MOBILE_EDGE,
        right: SKYROOM_MOBILE_EDGE,
        bottom: SKYROOM_FOOTER_H + SKYROOM_MOBILE_TAB_FOOTER_GAP + SKYROOM_MOBILE_FOOTER_LIFT,
        height: SKYROOM_MOBILE_TAB_H,
        zIndex: 11,
      }}
    >
      {tabs.map(({ key, icon, label }) => {
        const active = activeBox === key;
        const showUnread = key === 'chat' && !active && totalUnread > 0;
        const showWaitingBadge = key === 'waiting' && !active && guestCount > 0;
        const showUsersBadge = key === 'users' && !active && usersCount > 0;
        const showBreakoutBadge = key === 'breakout' && !active && showBreakout;
        const badgeCount = key === 'waiting' ? guestCount : usersCount;
        const badgeClass = key === 'users' || key === 'breakout'
          ? 'skyroom-mobile-zone-tab-badge skyroom-mobile-zone-tab-badge--count'
          : 'skyroom-mobile-zone-tab-badge';

        return (
          <button
            key={key}
            type="button"
            className={`skyroom-mobile-zone-tab${active ? ' is-active' : ''}`}
            aria-pressed={active}
            aria-label={label}
            title={label}
            onClick={() => handleTab(key, active)}
          >
            <Icon iconName={icon} />
            {showUnread || showWaitingBadge || showUsersBadge ? (
              <span className={badgeClass} aria-hidden="true">
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            ) : null}
            {showBreakoutBadge ? (
              <span className={badgeClass} aria-hidden="true" />
            ) : null}
          </button>
        );
      })}
    </nav>
  );

  return createPortal(bar, layoutEl);
};

export default SkyroomMobileZoneTabs;

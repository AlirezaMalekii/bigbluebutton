import React, {
  useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import PropTypes from 'prop-types';
import { defineMessages, useIntl } from 'react-intl';
import Auth from '/imports/ui/services/auth';
import getFromUserSettings from '/imports/ui/services/users-settings';
import { useQuery, useReactiveVar } from '@apollo/client';
import NavBar from './component';
import { layoutSelectInput, layoutDispatch, layoutSelectOutput } from '../layout/context';
import { PluginsContext } from '/imports/ui/components/components-data/plugin-context/context';
import { PANELS } from '/imports/ui/components/layout/enums';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import useChat from '/imports/ui/core/hooks/useChat';
import useHasUnreadNotes from '../notes/hooks/useHasUnreadNotes';
import { useShortcut } from '../../core/hooks/useShortcut';
import useMeeting from '../../core/hooks/useMeeting';
import { registerTitleView } from '/imports/utils/dom-utils';
import connectionStatus from '../../core/graphql/singletons/connectionStatus';
import useSkyroomSharedNotesUiVisible from '/imports/ui/components/skyroom-layout/useSkyroomSharedNotesUiVisible';
import { isSkyroomColumnLayout } from '/imports/ui/components/skyroom-layout/panel-toggles';
import {
  subscribeSkyroomNotesOpen,
  getSkyroomNotesOpen,
} from '/imports/ui/components/skyroom-layout/notes-panel-state';
import {
  GET_WELCOME_MESSAGE,
} from '/imports/ui/components/session-details/queries';
import { hasDisplayableSessionDetails } from '/imports/ui/components/session-details/utils';

const intlMessages = defineMessages({
  defaultViewLabel: {
    id: 'app.title.defaultViewLabel',
    description: 'view name appended to document title',
  },
});

const NavBarContainer = ({ children, ...props }) => {
  const { pluginsExtensibleAreasAggregatedState } = useContext(PluginsContext);
  const unread = useHasUnreadNotes();
  const intl = useIntl();

  const sidebarContent = layoutSelectInput((i) => i.sidebarContent);
  const sidebarNavigation = layoutSelectInput((i) => i.sidebarNavigation);
  const navBar = layoutSelectOutput((i) => i.navBar);
  const layoutContextDispatch = layoutDispatch();
  const sharedNotes = layoutSelectInput((i) => i.sharedNotes);
  const { isPinned: notesIsPinned } = sharedNotes;

  const { sidebarContentPanel } = sidebarContent;
  const { sidebarNavPanel } = sidebarNavigation;

  const toggleUserList = useShortcut('toggleUserList');
  const togglePublicChat = useShortcut('togglePublicChat');

  const [skyroomNotesOpen, setSkyroomNotesOpen] = useState(getSkyroomNotesOpen);
  const isSharedNotesEnabled = useSkyroomSharedNotesUiVisible();
  useEffect(() => subscribeSkyroomNotesOpen(setSkyroomNotesOpen), []);

  const notesPanelOpen = isSkyroomColumnLayout()
    ? skyroomNotesOpen
    : sidebarContentPanel === PANELS.SHARED_NOTES;
  const hasUnreadNotes = !notesPanelOpen && unread && !notesIsPinned;

  const { data: chats } = useChat((chat) => ({
    totalUnread: chat.totalUnread,
  }));

  const hasUnreadMessages = chats && chats.reduce((acc, chat) => acc + chat?.totalUnread, 0) > 0;

  const { data: currentUserData } = useCurrentUser((user) => ({
    isModerator: user.isModerator,
    breakoutRoomsSummary: user.breakoutRoomsSummary,
  }));
  const amIModerator = Boolean(currentUserData?.isModerator);
  const breakoutSummary = currentUserData?.breakoutRoomsSummary;
  const hasBreakoutInvitation = (breakoutSummary?.totalOfJoinURL ?? 0) > 0
    || (breakoutSummary?.totalOfShowInvitation ?? 0) > 0;
  const canAccessBreakoutPanel = amIModerator || hasBreakoutInvitation;

  const isExpanded = !!sidebarContentPanel || !!sidebarNavPanel;

  const hideNavBar = getFromUserSettings('bbb_hide_nav_bar', false);

  const PUBLIC_CONFIG = window.meetingClientSettings.public;
  const CLIENT_TITLE = getFromUserSettings('bbb_client_title', PUBLIC_CONFIG.app.clientTitle);
  const IS_DIRECT_LEAVE_BUTTON_ENABLED = getFromUserSettings(
    'bbb_direct_leave_button',
    PUBLIC_CONFIG.app.defaultSettings.application.directLeaveButton,
  );
  const SHOW_SESSION_DETAILS_ON_JOIN = getFromUserSettings(
    'bbb_show_session_details_on_join',
    PUBLIC_CONFIG.layout.showSessionDetailsOnJoin,
  );

  let meetingTitle;
  let breakoutNum;
  let breakoutName;
  let meetingName;
  const connected = useReactiveVar(connectionStatus.getConnectedStatusVar());

  const { data: meeting } = useMeeting((m) => ({
    name: m.name,
    meetingId: m.meetingId,
    isBreakout: m.isBreakout,
    componentsFlags: m.componentsFlags,
    breakoutPolicies: m.breakoutPolicies,
  }));

  const hasBreakoutRooms = Boolean(meeting?.componentsFlags?.hasBreakoutRoom)
    || (breakoutSummary?.totalOfBreakoutRooms ?? 0) > 0;
  const breakoutPanelOpen = sidebarContentPanel === PANELS.BREAKOUT;

  // Keep the header breakout chip for the whole breakout session — not only while the
  // content panel is open. Latch on when rooms/panel are observed; clear only on a
  // real rooms-ended edge (hasBreakoutRooms true → false), never when merely closing
  // the sidebar panel.
  const [breakoutToggleAvailable, setBreakoutToggleAvailable] = useState(false);
  const prevHasBreakoutRoomsRef = useRef(false);
  useEffect(() => {
    if (meeting?.isBreakout) {
      prevHasBreakoutRoomsRef.current = false;
      setBreakoutToggleAvailable(false);
      return;
    }
    if (canAccessBreakoutPanel && (hasBreakoutRooms || breakoutPanelOpen)) {
      setBreakoutToggleAvailable(true);
    }
    if (prevHasBreakoutRoomsRef.current && !hasBreakoutRooms) {
      setBreakoutToggleAvailable(false);
    }
    prevHasBreakoutRoomsRef.current = hasBreakoutRooms;
  }, [
    meeting?.isBreakout,
    canAccessBreakoutPanel,
    hasBreakoutRooms,
    breakoutPanelOpen,
  ]);

  // Skyroom gating stays in NavBar render (DOM column attr is not reactive here).
  const showBreakoutToggle = breakoutToggleAvailable && !meeting?.isBreakout;

  const { data: welcomeData } = useQuery(GET_WELCOME_MESSAGE);

  const hasSessionDetails = useMemo(() => {
    const welcomeMessage = welcomeData?.user_welcomeMsgs?.[0]?.welcomeMsg ?? '';
    const welcomeMsgForModerators = welcomeData?.user_welcomeMsgs?.[0]?.welcomeMsgForModerators ?? '';
    return hasDisplayableSessionDetails({
      welcome: welcomeMessage,
      welcomeForModerators: welcomeMsgForModerators,
    });
  }, [welcomeData]);

  if (meeting) {
    meetingTitle = meeting.name;
    const titleString = `${CLIENT_TITLE} - ${meetingTitle}`;
    document.title = titleString;
    registerTitleView(intl.formatMessage(intlMessages.defaultViewLabel));

    if (meeting.breakoutPolicies) {
      breakoutNum = meeting.breakoutPolicies.sequence;
      if (breakoutNum > 0) {
        breakoutName = meetingTitle;
        meetingName = meetingTitle.replace(`(${breakoutName})`, '').trim();
      }
    }
  }

  if (hideNavBar || navBar.display === false) return null;

  let pluginNavBarItems = [];
  if (pluginsExtensibleAreasAggregatedState.navBarItems) {
    pluginNavBarItems = [
      ...pluginsExtensibleAreasAggregatedState.navBarItems,
    ];
  }

  return (
    <NavBar
      {...{
        amIModerator,
        hasUnreadMessages,
        hasUnreadNotes,
        isSharedNotesEnabled,
        isSharedNotesExpanded: skyroomNotesOpen,
        sidebarNavPanel,
        sidebarContentPanel,
        sidebarNavigation,
        sidebarContent,
        layoutContextDispatch,
        isExpanded,
        currentUserId: Auth.userID,
        pluginNavBarItems,
        shortcuts: toggleUserList,
        togglePublicChatShortcut: togglePublicChat,
        meetingId: meeting?.meetingId,
        presentationTitle: meetingTitle,
        breakoutNum,
        breakoutName,
        meetingName,
        isDirectLeaveButtonEnabled: IS_DIRECT_LEAVE_BUTTON_ENABLED,
        // TODO: Remove/Replace
        isConnected: connected,
        hideTopRow: navBar.hideTopRow,
        showSessionDetailsOnJoin: SHOW_SESSION_DETAILS_ON_JOIN,
        hasSessionDetails,
        showBreakoutToggle,
        ...props,
      }}
      style={{ ...navBar }}
    >
      {children}
    </NavBar>
  );
};

NavBarContainer.propTypes = {
  children: PropTypes.node,
};

export default NavBarContainer;

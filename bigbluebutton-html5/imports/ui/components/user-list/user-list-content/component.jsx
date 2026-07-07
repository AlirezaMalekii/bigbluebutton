import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Styled from './styles';
import UserListParticipants from './user-participants/user-list-participants/component';
import ChatList from './user-messages/chat-list/component';
import UserNotesContainer from '../user-list-graphql/user-shared-notes/component';
import TimerContainer from './timer/container';
import GuestPanelOpenerContainer from '../user-list-graphql/user-participants-title/guest-panel-opener/component';
import UserPollsContainer from './user-polls/container';
import BreakoutRoomContainer from './breakout-room/container';
import UserTitleContainer from '../user-list-graphql/user-participants-title/component';
import SkyroomUserSearch from '../../skyroom-layout/user-search/component';
import RaisedHandsContainer from './raised-hands/component';
import GenericSidekickContentNavButtonContainer from './generic-sidekick-content-button/container';
import { isSkyroomColumnLayout, isSkyroomMobileViewport } from '../../skyroom-layout/panel-toggles';
import deviceInfo from '/imports/utils/deviceInfo';

const { isMobile, isPortrait } = deviceInfo;

const propTypes = {
  currentUser: PropTypes.shape({
    role: PropTypes.string.isRequired,
    presenter: PropTypes.bool.isRequired,
    isModerator: PropTypes.bool.isRequired,
  }),
  compact: PropTypes.bool,
  isTimerActive: PropTypes.bool,
};

const defaultProps = {
  currentUser: {
    role: '',
    presenter: false,
  },
  compact: false,
  isTimerActive: false,
};

class UserContent extends PureComponent {
  render() {
    const {
      currentUser,
      isTimerActive,
      compact,
    } = this.props;

    const ROLE_MODERATOR = window.meetingClientSettings.public.user.role_moderator;
    const showGuestPanelOpener = currentUser?.role === ROLE_MODERATOR
      && !isSkyroomMobileViewport();

    // Skyroom drives its own mobile bottom-zone layout (one box at a time), so use the
    // clean column structure even on phones — not the stock crammed mobile scroll list.
    const useMobileScrollList = (isMobile || (isMobile && isPortrait))
      && !isSkyroomColumnLayout();

    return (
      <Styled.Content data-test="userListContent">
        {useMobileScrollList ? (
          <Styled.ScrollableList role="tabpanel" tabIndex={0}>
            <Styled.List>
              <ChatList />
              <UserNotesContainer />
              {isTimerActive
              && <TimerContainer isModerator={currentUser?.role === ROLE_MODERATOR} />}
              {showGuestPanelOpener ? <GuestPanelOpenerContainer /> : null}
              <UserPollsContainer isPresenter={currentUser?.presenter} />
              <BreakoutRoomContainer />
              <GenericSidekickContentNavButtonContainer />
              <RaisedHandsContainer />
              <UserTitleContainer />
              <SkyroomUserSearch />
              <UserListParticipants compact={compact} />
            </Styled.List>
          </Styled.ScrollableList>
        ) : (
          <>
            <ChatList />
            <UserNotesContainer />
            {isTimerActive && <TimerContainer isModerator={currentUser?.role === ROLE_MODERATOR} />}
            {showGuestPanelOpener ? <GuestPanelOpenerContainer /> : null}
            <UserPollsContainer isPresenter={currentUser?.presenter} />
            <BreakoutRoomContainer />
            <GenericSidekickContentNavButtonContainer />
            <RaisedHandsContainer />
            <UserTitleContainer />
            <SkyroomUserSearch />
            <UserListParticipants compact={compact} />
          </>
        )}
      </Styled.Content>
    );
  }
}

UserContent.propTypes = propTypes;
UserContent.defaultProps = defaultProps;

export default UserContent;

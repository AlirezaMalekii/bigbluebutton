import React from 'react';
import PropTypes from 'prop-types';
import { defineMessages, injectIntl } from 'react-intl';
import Icon from '/imports/ui/components/common/icon/component';
import Styled from './styles';
import { ACTIONS, PANELS } from '../../../layout/enums';
import BreakoutRemainingTime from '/imports/ui/components/common/remaining-time/breakout-duration/component';
import {
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
  openSkyroomBreakout,
  openSkyroomBreakoutPanel,
  closeSkyroomBreakoutPanel,
} from '/imports/ui/components/skyroom-layout/panel-toggles';

const intlMessages = defineMessages({
  breakoutTitle: {
    id: 'app.createBreakoutRoom.title',
    description: 'breakout title',
  },
  moderatorHint: {
    id: 'app.breakout.manager.sidebarHint',
    description: 'Hint for moderators in sidebar breakout entry',
  },
});

const BreakoutRoomItem = ({
  hasBreakoutRoom,
  sidebarContentPanel,
  layoutContextDispatch,
  intl,
  isModerator,
}) => {
  const toggleBreakoutPanel = () => {
    if (isSkyroomColumnLayout()) {
      if (sidebarContentPanel === PANELS.BREAKOUT) {
        closeSkyroomBreakoutPanel(layoutContextDispatch);
        return;
      }
      if (isSkyroomMobileViewport()) {
        openSkyroomBreakout(layoutContextDispatch);
        return;
      }
      openSkyroomBreakoutPanel(layoutContextDispatch);
      return;
    }
    layoutContextDispatch({
      type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN,
      value: sidebarContentPanel !== PANELS.BREAKOUT,
    });
    layoutContextDispatch({
      type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL,
      value: sidebarContentPanel === PANELS.BREAKOUT
        ? PANELS.NONE
        : PANELS.BREAKOUT,
    });
  };

  if (!hasBreakoutRoom) {
    return null;
  }

  const skyroomColumn = isSkyroomColumnLayout();
  const isActive = sidebarContentPanel === PANELS.BREAKOUT;

  if (skyroomColumn) {
    return (
      <Styled.Messages data-test="skyroomBreakoutEntry">
        <button
          type="button"
          className="skyroom-breakout-entry"
          data-test="breakoutRoomsItem"
          data-skyroom-active={isActive ? 'true' : 'false'}
          aria-label={intl.formatMessage(intlMessages.breakoutTitle)}
          aria-pressed={isActive}
          onClick={toggleBreakoutPanel}
        >
          <Styled.EntryIcon className="skyroom-breakout-entry__icon" aria-hidden>
            <Icon iconName="rooms" />
          </Styled.EntryIcon>

          <Styled.EntryBody className="skyroom-breakout-entry__body" aria-hidden>
            <Styled.BreakoutTitle className="skyroom-breakout-entry__title">
              {intl.formatMessage(intlMessages.breakoutTitle)}
            </Styled.BreakoutTitle>
            {isModerator ? (
              <Styled.BreakoutModeratorHint
                className="skyroom-breakout-entry__hint"
                data-test="breakoutModeratorHint"
              >
                {intl.formatMessage(intlMessages.moderatorHint)}
              </Styled.BreakoutModeratorHint>
            ) : (
              <Styled.BreakoutDuration className="skyroom-breakout-entry__time">
                <BreakoutRemainingTime boldText={false} compact />
              </Styled.BreakoutDuration>
            )}
          </Styled.EntryBody>

          <Styled.EntryMeta className="skyroom-breakout-entry__meta" aria-hidden>
            {isModerator ? (
              <Styled.BreakoutDuration className="skyroom-breakout-entry__time-chip">
                <BreakoutRemainingTime boldText={false} compact />
              </Styled.BreakoutDuration>
            ) : null}
            <Styled.EntryChevron className="skyroom-breakout-entry__chevron">
              <Icon iconName="right_arrow" />
            </Styled.EntryChevron>
          </Styled.EntryMeta>
        </button>
      </Styled.Messages>
    );
  }

  return (
    <Styled.Messages data-test="skyroomBreakoutEntry">
      <Styled.Container>
        <Styled.SmallTitle data-test="breakoutRoomsTitle">
          {intl.formatMessage(intlMessages.breakoutTitle)}
        </Styled.SmallTitle>
      </Styled.Container>
      <Styled.ScrollableList>
        <Styled.List>
          <Styled.ListItem
            role="button"
            tabIndex={0}
            active={isActive}
            onClick={toggleBreakoutPanel}
            data-test="breakoutRoomsItem"
            aria-label={intl.formatMessage(intlMessages.breakoutTitle)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                toggleBreakoutPanel();
              }
            }}
          >
            <Icon iconName="rooms" />
            <div aria-hidden>
              <Styled.BreakoutTitle>
                {intl.formatMessage(intlMessages.breakoutTitle)}
              </Styled.BreakoutTitle>
              {isModerator ? (
                <Styled.BreakoutModeratorHint data-test="breakoutModeratorHint">
                  {intl.formatMessage(intlMessages.moderatorHint)}
                </Styled.BreakoutModeratorHint>
              ) : null}
              <Styled.BreakoutDuration>
                <BreakoutRemainingTime />
              </Styled.BreakoutDuration>
            </div>
          </Styled.ListItem>
        </Styled.List>
      </Styled.ScrollableList>
    </Styled.Messages>
  );
};

export default injectIntl(BreakoutRoomItem);

BreakoutRoomItem.propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  hasBreakoutRoom: PropTypes.bool.isRequired,
  sidebarContentPanel: PropTypes.string.isRequired,
  layoutContextDispatch: PropTypes.func.isRequired,
  isModerator: PropTypes.bool,
};

BreakoutRoomItem.defaultProps = {
  isModerator: false,
};

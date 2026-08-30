import React, { useEffect, useRef, useState } from 'react';
import { defineMessages } from 'react-intl';
import PropTypes from 'prop-types';
import BBBMenu from '/imports/ui/components/common/menu/component';
import { convertRemToPixels } from '/imports/utils/dom-utils';
import { SET_REACTION_EMOJI } from '/imports/ui/core/graphql/mutations/userMutations';
import { useMutation } from '@apollo/client';
import { notify } from '/imports/ui/services/notification';
import {
  checkReactionRateLimit,
  consumeReactionRateLimit,
} from './rate-limit';
import Styled from './styles';

const ReactionsButton = (props) => {
  const {
    intl,
    actionsBarRef,
    isMobile,
    currentUserReaction,
    autoCloseReactionsBar,
    isModerator,
  } = props;

  const REACTIONS = window.meetingClientSettings.public.userReaction.reactions;
  const DISABLE_EMOJIS = window.meetingClientSettings.public.chat.disableEmojis;

  const [setReactionEmoji] = useMutation(SET_REACTION_EMOJI);
  const pendingRef = useRef(false);
  const sendLockTimerRef = useRef(null);
  const SEND_LOCK_MS = 400;

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const intlMessages = defineMessages({
    reactionsLabel: {
      id: 'app.actionsBar.reactions.reactionsButtonLabel',
      description: 'reactions Label',
      defaultMessage: 'Share a reaction',
    },
    removeReactionsLabel: {
      id: 'app.actionsBar.reactions.removeReactionLabel',
      description: 'remove reaction Label',
    },
    rateLimitLabel: {
      id: 'app.actionsBar.reactions.rateLimitLabel',
      description: 'toast when reaction rate limit is reached',
      defaultMessage: 'Reaction limit reached ({max} per {window}s). Wait {seconds}s and try again.',
    },
    sendErrorLabel: {
      id: 'app.actionsBar.reactions.sendErrorLabel',
      description: 'toast when reaction send fails',
      defaultMessage: 'Could not send reaction. Please try again.',
    },
  });

  const handleClose = () => {
    setShowEmojiPicker(false);
    setTimeout(() => {
      document.activeElement.blur();
    }, 0);
  };

  const releaseSendLock = () => {
    if (sendLockTimerRef.current) {
      clearTimeout(sendLockTimerRef.current);
    }
    sendLockTimerRef.current = setTimeout(() => {
      pendingRef.current = false;
      sendLockTimerRef.current = null;
    }, SEND_LOCK_MS);
  };

  useEffect(() => () => {
    if (sendLockTimerRef.current) {
      clearTimeout(sendLockTimerRef.current);
    }
  }, []);

  const handleReactionSelect = (reaction) => {
    if (pendingRef.current) return;

    // Clearing status should not consume the send budget.
    if (reaction !== 'none' && !isModerator) {
      const rate = checkReactionRateLimit();
      if (!rate.allowed) {
        notify(
          intl.formatMessage(intlMessages.rateLimitLabel, {
            max: rate.maxPerWindow,
            window: rate.windowSeconds,
            seconds: rate.retryAfterSeconds,
          }),
          'warning',
          'warning',
        );
        return;
      }
    }

    pendingRef.current = true;

    setReactionEmoji({
      variables: { reactionEmoji: reaction },
      onCompleted: () => {
        if (reaction !== 'none' && !isModerator) {
          consumeReactionRateLimit();
        }
        releaseSendLock();
      },
      onError: () => {
        pendingRef.current = false;
        if (sendLockTimerRef.current) {
          clearTimeout(sendLockTimerRef.current);
          sendLockTimerRef.current = null;
        }
        notify(
          intl.formatMessage(intlMessages.sendErrorLabel),
          'error',
          'warning',
        );
      },
    });
  };

  const customStyles = {
    top: '-1rem',
    borderRadius: '1.7rem',
  };

  const actionCustomStyles = {
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: isMobile ? '0' : '0.5rem',
    paddingBottom: isMobile ? '0' : '0.5rem',
  };

  // Picker items keep a little padding for touch targets; the dock trigger
  // must stay optically centered inside the circle (no em-emoji padding).
  const pickerEmojiProps = {
    size: convertRemToPixels(1.5),
    padding: '4px',
  };

  const actions = [];

  REACTIONS.forEach(({ id, native }) => {
    if (DISABLE_EMOJIS.includes(id)) return;
    actions.push({
      label: (
        <Styled.ButtonWrapper active={currentUserReaction === native}>
          <em-emoji key={native} native={native} {...pickerEmojiProps} />
        </Styled.ButtonWrapper>
      ),
      key: id,
      onClick: () => handleReactionSelect(native),
      customStyles: actionCustomStyles,
      dataTest: 'reaction',
    });
  });

  actions.push({
    label: (
      <Styled.ButtonWrapper>
        <Styled.ReactionsButton
          data-test="removeReactionButton"
          icon="close"
          label={intl.formatMessage(intlMessages.removeReactionsLabel)}
          description={intl.formatMessage(intlMessages.removeReactionsLabel)}
          onKeyPress={() => { }}
          onClick={() => { }}
          hideLabel
          circle
          disabled={currentUserReaction === 'none'}
          color="primary"
          ghost
        />
      </Styled.ButtonWrapper>
    ),
    key: 'none',
    onClick: () => (currentUserReaction !== 'none' ? handleReactionSelect('none') : null),
    customStyles: actionCustomStyles,
    dataTest: 'remove-reaction',
  });

  const svgIcon = currentUserReaction === 'none' ? 'reactions' : null;
  const currentUserReactionEmoji = REACTIONS.find(({ native }) => native === currentUserReaction);

  let customIcon = null;

  if (!svgIcon) {
    // Native span avoids emoji-mart async re-layout that shifts the glyph
    // inside the circular dock control a few seconds after send.
    customIcon = (
      <Styled.ReactionEmoji aria-hidden="true">
        {currentUserReactionEmoji?.native || currentUserReaction}
      </Styled.ReactionEmoji>
    );
  }

  return (
    <BBBMenu
      trigger={(
        <Styled.ReactionsDropdown id="interactionsButton">
          <Styled.ReactionsButton
            data-test="reactionsButton"
            svgIcon={svgIcon}
            customIcon={customIcon}
            label={intl.formatMessage(intlMessages.reactionsLabel)}
            description="Reactions"
            onKeyPress={() => { }}
            onClick={() => setShowEmojiPicker(true)}
            color={showEmojiPicker || customIcon ? 'primary' : 'default'}
            hideLabel
            circle
            size="lg"
          />
        </Styled.ReactionsDropdown>
      )}
      actions={actions}
      onCloseCallback={() => handleClose()}
      customAnchorEl={!isMobile ? actionsBarRef.current : null}
      customStyles={customStyles}
      open={showEmojiPicker}
      hasRoundedCorners
      overrideMobileStyles
      isHorizontal={!isMobile}
      isMobile={isMobile}
      isEmoji
      roundButtons
      minContent={isMobile}
      keepOpen={!autoCloseReactionsBar}
      opts={{
        id: 'reactions-dropdown-menu',
        keepMounted: true,
        transitionDuration: 0,
        elevation: 3,
        getcontentanchorel: null,
        anchorOrigin: { vertical: 'top', horizontal: 'center' },
        transformOrigin: { vertical: 'bottom', horizontal: 'center' },
      }}
    />
  );
};

const propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  actionsBarRef: PropTypes.shape({
    current: typeof Element === 'undefined'
      ? PropTypes.oneOf([null])
      : PropTypes.instanceOf(Element),
  }),
  isMobile: PropTypes.bool,
  currentUserReaction: PropTypes.string,
  autoCloseReactionsBar: PropTypes.bool,
  isModerator: PropTypes.bool,
};

ReactionsButton.defaultProps = {
  actionsBarRef: null,
  isMobile: false,
  currentUserReaction: 'none',
  autoCloseReactionsBar: false,
  isModerator: false,
};

ReactionsButton.propTypes = propTypes;

export default ReactionsButton;

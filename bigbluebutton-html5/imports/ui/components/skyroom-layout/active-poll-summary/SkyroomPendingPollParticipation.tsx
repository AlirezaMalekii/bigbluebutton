import React, { useCallback, useEffect, useReducer } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import { hasPendingPoll, HasPendingPollResponse } from '/imports/ui/components/polling/queries';
import { useIsPollingEnabled } from '/imports/ui/services/features';
import { isSkyroomColumnLayout } from '/imports/ui/components/skyroom-layout/panel-toggles';
import Icon from '/imports/ui/components/common/icon/icon-ts/component';
import Tooltip from '/imports/ui/components/common/tooltip/component';
import {
  isPollParticipationDismissed,
  openSkyroomPollParticipation,
  subscribePollParticipationDismiss,
} from './pollParticipationDismiss';

const intlMessages = defineMessages({
  participatePoll: {
    id: 'app.skyroom.pollSummary.participatePoll',
    description: 'Label for pending poll participation pill',
  },
  participateQuiz: {
    id: 'app.skyroom.pollSummary.participateQuiz',
    description: 'Label for pending quiz participation pill',
  },
  participateTooltip: {
    id: 'app.skyroom.pollSummary.participateTooltip',
    description: 'Tooltip for pending poll participation pill',
  },
  participateAria: {
    id: 'app.skyroom.pollSummary.participateAria',
    description: 'Aria label for pending poll participation pill',
  },
});

const SkyroomPendingPollParticipation: React.FC = () => {
  const intl = useIntl();
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const { data: currentUser, loading: userLoading } = useCurrentUser((u) => ({
    userId: u.userId,
    presenter: u.presenter,
    isModerator: u.isModerator,
  }));

  const { data: meeting, loading: meetingLoading } = useMeeting((m) => ({
    componentsFlags: m.componentsFlags,
  }));

  const isPollingEnabled = useIsPollingEnabled();

  const {
    data: hasPendingPollData,
    loading: pollLoading,
  } = useDeduplicatedSubscription<HasPendingPollResponse>(hasPendingPoll, {
    variables: { userId: currentUser?.userId },
    skip: !currentUser?.userId || userLoading || meetingLoading
      || !meeting?.componentsFlags?.hasPoll || !isPollingEnabled,
  });

  useEffect(() => subscribePollParticipationDismiss(forceUpdate), []);

  const pollData = hasPendingPollData?.meeting?.[0]?.polls?.[0];
  const pollId = pollData?.pollId;
  const isDismissed = Boolean(pollId && isPollParticipationDismissed(pollId));

  const handleOpenParticipation = useCallback(() => {
    openSkyroomPollParticipation();
  }, []);

  if (
    !isSkyroomColumnLayout()
    || userLoading
    || meetingLoading
    || pollLoading
    || !pollData
    || !pollId
    || currentUser?.presenter
    || currentUser?.isModerator
    || !isDismissed
  ) {
    return null;
  }

  const typeLabel = pollData.quiz
    ? intl.formatMessage(intlMessages.participateQuiz)
    : intl.formatMessage(intlMessages.participatePoll);

  const questionSnippet = pollData.questionText?.trim() || '';

  return (
    <Tooltip title={intl.formatMessage(intlMessages.participateTooltip)}>
      <button
        type="button"
        data-test="skyroom-poll-participation"
        aria-label={intl.formatMessage(intlMessages.participateAria)}
        onClick={handleOpenParticipation}
      >
        <span data-test="skyroom-poll-participation-icon" aria-hidden="true">
          <Icon iconName="polling" />
        </span>
        <span data-test="skyroom-poll-participation-meta">
          <span data-test="skyroom-poll-participation-primary">
            <span data-test="skyroom-poll-participation-pill">{typeLabel}</span>
            <span data-test="skyroom-poll-participation-dot" aria-hidden="true" />
          </span>
          {questionSnippet ? (
            <span data-test="skyroom-poll-participation-question">{questionSnippet}</span>
          ) : null}
        </span>
      </button>
    </Tooltip>
  );
};

export default SkyroomPendingPollParticipation;

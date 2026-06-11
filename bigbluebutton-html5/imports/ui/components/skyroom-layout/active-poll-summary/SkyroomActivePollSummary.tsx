import React, { useCallback, useMemo } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import { getCurrentPollData, getCurrentPollDataResponse } from '/imports/ui/components/poll/queries';
import { isSkyroomColumnLayout } from '/imports/ui/components/skyroom-layout/panel-toggles';
import { useStorageKey } from '/imports/ui/services/storage/hooks';
import Icon from '/imports/ui/components/common/icon/icon-ts/component';
import Tooltip from '/imports/ui/components/common/tooltip/component';
import logger from '/imports/startup/client/logger';
import connectionStatus from '/imports/ui/core/graphql/singletons/connectionStatus';
import { openSkyroomPollResultsModal } from './openPollResultsModal';

const intlMessages = defineMessages({
  activePollLabel: {
    id: 'app.skyroom.pollSummary.activePoll',
    description: 'Label for active poll in header summary',
  },
  activeQuizLabel: {
    id: 'app.skyroom.pollSummary.activeQuiz',
    description: 'Label for active quiz in header summary',
  },
  responsesCount: {
    id: 'app.skyroom.pollSummary.responsesCount',
    description: 'Response count in header poll summary',
  },
  waitingLabel: {
    id: 'app.poll.waitingLabel',
    description: 'label shown while waiting for responses',
  },
  doneLabel: {
    id: 'app.createBreakoutRoom.doneLabel',
    description: 'label shown when all users have responded',
  },
  openResults: {
    id: 'app.skyroom.pollSummary.openResults',
    description: 'Aria label for opening poll results from header',
  },
  openResultsTooltip: {
    id: 'app.skyroom.pollSummary.openResultsTooltip',
    description: 'Tooltip for opening poll results from header',
  },
});

const SkyroomActivePollSummary: React.FC = () => {
  const intl = useIntl();
  const pollInitiated = useStorageKey('pollInitiated') || false;

  const { data: currentUser, loading: userLoading } = useCurrentUser((u) => ({
    presenter: u.presenter,
    isModerator: u.isModerator,
  }));

  const { data: meeting, loading: meetingLoading } = useMeeting((m) => ({
    componentsFlags: m.componentsFlags,
  }));

  const hasActivePoll = Boolean(meeting?.componentsFlags?.hasPoll || pollInitiated);
  const canSeeSummary = Boolean(currentUser?.presenter || currentUser?.isModerator);

  const {
    data: currentPollData,
    loading: pollLoading,
    error,
  } = useDeduplicatedSubscription<getCurrentPollDataResponse>(getCurrentPollData, {
    skip: !hasActivePoll || !canSeeSummary,
  });

  const handleOpenResults = useCallback(() => {
    openSkyroomPollResultsModal();
  }, []);

  const summary = useMemo(() => {
    if (!currentPollData?.poll?.length) {
      return {
        isQuiz: false,
        answered: 0,
        totalUsers: 0,
        progress: 0,
        questionSnippet: '',
        topOption: '',
        topCount: 0,
        isComplete: false,
      };
    }

    const poll = currentPollData.poll[0];
    const answered = poll.responses_aggregate?.aggregate?.sum?.optionResponsesCount ?? 0;
    const totalUsers = poll.users_aggregate?.aggregate?.count ?? 0;
    const progress = totalUsers > 0 ? Math.min(100, Math.round((answered / totalUsers) * 100)) : 0;

    const topResponse = [...(poll.responses || [])]
      .sort((a, b) => (b.optionResponsesCount ?? 0) - (a.optionResponsesCount ?? 0))[0];

    return {
      isQuiz: poll.quiz,
      answered,
      totalUsers,
      progress,
      questionSnippet: poll.questionText?.trim() || '',
      topOption: topResponse?.optionDesc || '',
      topCount: topResponse?.optionResponsesCount ?? 0,
      isComplete: totalUsers > 0 && answered >= totalUsers,
    };
  }, [currentPollData]);

  if (
    !isSkyroomColumnLayout()
    || userLoading
    || meetingLoading
    || !canSeeSummary
    || !hasActivePoll
  ) {
    return null;
  }

  if (error) {
    connectionStatus.setSubscriptionFailed(true);
    logger.error({ logCode: 'skyroom_poll_summary_failed', extraInfo: { error } }, 'Poll summary subscription failed');
    return null;
  }

  const typeLabel = summary.isQuiz
    ? intl.formatMessage(intlMessages.activeQuizLabel)
    : intl.formatMessage(intlMessages.activePollLabel);

  const stateLabel = summary.isComplete
    ? intl.formatMessage(intlMessages.doneLabel)
    : intl.formatMessage(intlMessages.waitingLabel, {
      current: summary.answered,
      total: summary.totalUsers || '…',
    });

  const secondaryLine = summary.topOption && summary.topCount > 0
    ? `${summary.topOption} · ${summary.topCount}`
    : intl.formatMessage(intlMessages.responsesCount, {
      current: summary.answered,
      total: summary.totalUsers || 0,
    });

  const tooltip = intl.formatMessage(intlMessages.openResultsTooltip);

  return (
    <Tooltip title={tooltip}>
      <button
        type="button"
        data-test="skyroom-poll-summary"
        data-loading={pollLoading ? 'true' : 'false'}
        aria-label={intl.formatMessage(intlMessages.openResults)}
        onClick={handleOpenResults}
      >
        <span data-test="skyroom-poll-summary-icon" aria-hidden="true">
          <Icon iconName="polling" />
        </span>
        <span data-test="skyroom-poll-summary-meta">
          <span data-test="skyroom-poll-summary-primary">
            <span data-test="skyroom-poll-summary-pill">{typeLabel}</span>
            <span
              data-test="skyroom-poll-summary-dot"
              data-complete={summary.isComplete ? 'true' : 'false'}
              aria-hidden="true"
            />
            <span data-test="skyroom-poll-summary-state">{stateLabel}</span>
          </span>
          <span data-test="skyroom-poll-summary-secondary">
            {summary.questionSnippet ? (
              <span data-test="skyroom-poll-summary-question">{summary.questionSnippet}</span>
            ) : null}
            <span data-test="skyroom-poll-summary-detail">{secondaryLine}</span>
            <span data-test="skyroom-poll-summary-bar" aria-hidden="true">
              <span
                data-test="skyroom-poll-summary-bar-fill"
                style={{ width: `${summary.progress}%` }}
              />
            </span>
          </span>
        </span>
      </button>
    </Tooltip>
  );
};

export default SkyroomActivePollSummary;

import { useMutation } from '@apollo/client';
import React, { useCallback, useMemo } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import Session from '/imports/ui/services/storage/in-memory';
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis,
} from 'recharts';
import Styled from '../styles';
import {
  ResponseInfo,
  UserInfo,
  getCurrentPollData,
  getCurrentPollDataResponse,
} from '../queries';
import logger from '/imports/startup/client/logger';
import { getSettingsSingletonInstance } from '/imports/ui/services/settings';
import { POLL_CANCEL, POLL_PUBLISH_RESULT } from '../mutations';
import { layoutDispatch, layoutSelect } from '../../layout/context';
import { ACTIONS, PANELS } from '../../layout/enums';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import CustomizedAxisTick from './CustomizedAxisTick';
import connectionStatus from '/imports/ui/core/graphql/singletons/connectionStatus';
import Tooltip from '../../common/tooltip/component';
import { Layout } from '../../layout/layoutTypes';

const CHART_BAR_HEIGHT = 44;
const CHART_MIN_HEIGHT = 160;
const CHART_Y_AXIS_MIN = 72;
const CHART_Y_AXIS_MAX = 220;

function measureLabelWidth(text: string, fontSize: number): number {
  if (typeof document === 'undefined') return text.length * fontSize * 0.55;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.length * fontSize * 0.55;
  const fontFamily = window.getComputedStyle(document.body).fontFamily || 'IRANYekanX, sans-serif';
  ctx.font = `normal ${fontSize}px ${fontFamily}`;
  return ctx.measureText(text).width;
}

const CHART_Y_AXIS_TICK_PADDING = 24;

function computeChartDimensions(
  labels: string[],
  fontSize: number,
): { chartHeight: number; yAxisWidth: number } {
  const optionCount = Math.max(labels.length, 1);
  const longestLabel = labels.reduce((max, label) => (label.length > max.length ? label : max), '');
  const measuredWidth = measureLabelWidth(longestLabel, fontSize);
  const yAxisWidth = Math.min(
    CHART_Y_AXIS_MAX,
    Math.max(
      CHART_Y_AXIS_MIN,
      Math.ceil(measuredWidth) + 16 + CHART_Y_AXIS_TICK_PADDING,
    ),
  );
  const chartHeight = Math.max(CHART_MIN_HEIGHT, optionCount * CHART_BAR_HEIGHT + 32);
  return { chartHeight, yAxisWidth };
}

function isRtlLayout(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dir === 'rtl';
}

const intlMessages = defineMessages({
  usersTitle: {
    id: 'app.poll.liveResult.usersTitle',
    description: 'heading label for poll users',
  },
  responsesTitle: {
    id: 'app.poll.liveResult.responsesTitle',
    description: 'heading label for poll responses',
  },
  publishLabel: {
    id: 'app.poll.publishLabel',
    description: 'label for the publish button',
  },
  cancelPollLabel: {
    id: 'app.poll.cancelPollLabel',
    description: 'label for cancel poll button',
  },
  backLabel: {
    id: 'app.poll.backLabel',
    description: 'label for the return to poll options button',
  },
  doneLabel: {
    id: 'app.createBreakoutRoom.doneLabel',
    description: 'label shown when all users have responded',
  },
  waitingLabel: {
    id: 'app.poll.waitingLabel',
    description: 'label shown while waiting for responses',
  },
  secretPollLabel: {
    id: 'app.poll.liveResult.secretLabel',
    description: 'label shown instead of users in poll responses if poll is secret',
  },
  activePollInstruction: {
    id: 'app.poll.activePollInstruction',
    description: 'instructions displayed when a poll is active',
  },
  true: {
    id: 'app.poll.t',
    description: 'Poll true option value',
  },
  false: {
    id: 'app.poll.f',
    description: 'Poll false option value',
  },
  yes: {
    id: 'app.poll.y',
    description: 'Poll yes option value',
  },
  no: {
    id: 'app.poll.n',
    description: 'Poll no option value',
  },
  abstention: {
    id: 'app.poll.abstention',
    description: 'Poll Abstention option value',
  },
  showCorrectAnswerLabel: {
    id: 'app.poll.quiz.showCorrectAnswer',
    description: 'Label for checkbox to show correct answer in quiz poll',
  },
  correctAnswerTitle: {
    id: 'app.poll.quiz.liveResult.title.correct',
    description: 'Title for correct answer in quiz poll live result',
  },
  correctOption: {
    id: 'app.poll.quiz.options.correct',
    description: 'Label for correct answer option in quiz poll',
  },
  incorrectOption: {
    id: 'app.poll.quiz.options.incorrect',
    description: 'Label for incorrect answer option in quiz poll',
  },
});

interface LiveResultProps {
  questionText: string;
  responses: Array<ResponseInfo>;
  usersCount: number;
  numberOfAnswerCount: number;
  animations: boolean;
  pollId: string;
  users: Array<UserInfo>;
  isSecret: boolean;
  isQuiz: boolean;
}

const LiveResult: React.FC<LiveResultProps> = ({
  questionText,
  responses,
  usersCount,
  numberOfAnswerCount,
  animations,
  pollId,
  users,
  isSecret,
  isQuiz,
}) => {
  const CHAT_CONFIG = window.meetingClientSettings.public.chat;
  const PUBLIC_CHAT_KEY = CHAT_CONFIG.public_group_id;

  const intl = useIntl();
  const [pollPublishResult] = useMutation(POLL_PUBLISH_RESULT);
  const [stopPoll] = useMutation(POLL_CANCEL);
  const [shouldShowCorrectAnswer, setShouldShowCorrectAnswers] = React.useState(true);

  const layoutContextDispatch = layoutDispatch();
  const fontSize: Layout['fontSize'] = layoutSelect((i: Layout) => i.fontSize);
  const publishPoll = useCallback((pId: string, showAnswer: boolean) => {
    pollPublishResult({
      variables: {
        pollId: pId,
        showAnswer,
      },
    });
  }, []);

  const translatedResponses = responses.map((response) => {
    const translationKey = intlMessages[response.optionDesc.toLowerCase() as keyof typeof intlMessages];
    const optionDesc = translationKey ? intl.formatMessage(translationKey) : response.optionDesc;
    return {
      ...response,
      optionDesc,
    };
  });

  const { chartHeight, yAxisWidth } = useMemo(
    () => computeChartDimensions(
      translatedResponses.map((r) => r.optionDesc),
      fontSize,
    ),
    [translatedResponses, fontSize],
  );

  const chartRtl = isRtlLayout();

  return (
    <div>
      <Styled.Instructions>
        {intl.formatMessage(intlMessages.activePollInstruction)}
      </Styled.Instructions>
      <Styled.Stats>
        {questionText ? <Styled.Title data-test="currentPollQuestion">{questionText}</Styled.Title> : null}
        <Styled.Status>
          {usersCount !== numberOfAnswerCount
            ? (
              <span>
                {`${intl.formatMessage(intlMessages.waitingLabel, {
                  current: numberOfAnswerCount,
                  total: usersCount,
                })} `}
              </span>
            )
            : <span>{intl.formatMessage(intlMessages.doneLabel)}</span>}
          {usersCount !== numberOfAnswerCount
            ? <Styled.ConnectingAnimation animations={animations} /> : null}
        </Styled.Status>
        <Styled.ChartSection data-test="pollLiveResultChart">
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={translatedResponses}
              layout="vertical"
              margin={{
                top: 8,
                right: chartRtl ? 8 : 16,
                left: chartRtl ? 16 : 8,
                bottom: 8,
              }}
              barCategoryGap="20%"
            >
              <XAxis type="number" allowDecimals={false} />
              <YAxis
                width={yAxisWidth}
                fontSize={fontSize}
                type="category"
                dataKey="optionDesc"
                orientation={chartRtl ? 'right' : 'left'}
                tickMargin={12}
                axisLine={{ stroke: 'rgba(255, 255, 255, 0.15)' }}
                tickLine={false}
                tick={<CustomizedAxisTick />}
              />
              <Bar
                dataKey="optionResponsesCount"
                fill="var(--skyroom-brand-400, #14A99E)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Styled.ChartSection>
      </Styled.Stats>
      {
        isQuiz && (
          <Styled.ShowCorrectAnswerLabel
            htmlFor="showCorrectAnswerCheckbox"
            data-test="showCorrectAnswerCheckbox"
          >
            <input
              id="showCorrectAnswerCheckbox"
              type="checkbox"
              checked={shouldShowCorrectAnswer}
              onChange={(e) => {
                setShouldShowCorrectAnswers(e.target.checked);
              }}
            />
            {intl.formatMessage(intlMessages.showCorrectAnswerLabel)}
          </Styled.ShowCorrectAnswerLabel>
        )
      }
      {numberOfAnswerCount >= 0
        ? (
          <Styled.ButtonsActions>
            <Styled.PublishButton
              onClick={() => {
                Session.setItem('pollInitiated', false);
                publishPoll(pollId, shouldShowCorrectAnswer);
                stopPoll();
                layoutContextDispatch({
                  type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN,
                  value: true,
                });
                layoutContextDispatch({
                  type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL,
                  value: PANELS.CHAT,
                });
                layoutContextDispatch({
                  type: ACTIONS.SET_ID_CHAT_OPEN,
                  value: PUBLIC_CHAT_KEY,
                });
              }}
              disabled={numberOfAnswerCount <= 0}
              label={intl.formatMessage(intlMessages.publishLabel)}
              data-test="publishPollingLabel"
              color="primary"
            />
            <Styled.CancelButton
              onClick={() => {
                Session.setItem('pollInitiated', false);
                Session.setItem('resetPollPanel', true);
                stopPoll();
              }}
              label={intl.formatMessage(intlMessages.cancelPollLabel)}
              data-test="cancelPollLabel"
            />
          </Styled.ButtonsActions>
        ) : (
          <Styled.LiveResultButton
            onClick={() => {
              stopPoll();
            }}
            label={intl.formatMessage(intlMessages.backLabel)}
            color="primary"
            data-test="restartPoll"
          />
        )}
      <Styled.Separator />
      {
        !isSecret
          ? (
            <Styled.LiveResultTable>
              <tbody>
                <tr>
                  <Styled.THeading>{intl.formatMessage(intlMessages.usersTitle)}</Styled.THeading>
                  <Styled.THeading>{intl.formatMessage(intlMessages.responsesTitle)}</Styled.THeading>
                  {
                    isQuiz ? (
                      <Styled.THeading>{intl.formatMessage(intlMessages.correctAnswerTitle)}</Styled.THeading>
                    ) : null
                  }
                </tr>
                {
                  users.map((user) => (
                    <tr key={user.user.userId}>
                      <Styled.ResultLeft>{user.user.name}</Styled.ResultLeft>
                      <Styled.ResultRight data-test="userVoteLiveResult">
                        {
                          user.optionDescIds.map((optDesc) => {
                            const translationKey = intlMessages[optDesc.toLowerCase() as keyof typeof intlMessages];
                            return translationKey ? intl.formatMessage(translationKey) : optDesc;
                          }).join()
                        }
                      </Styled.ResultRight>
                      {
                        isQuiz ? user.optionDescIds.length > 0 && (
                          <Styled.ResultRight>
                            {user.optionDescIds.filter((opt) => {
                              const response = responses.find((r) => r.optionDesc === opt);
                              return response && response.correctOption;
                            }).length > 0
                              ? (
                                <Tooltip title={intl.formatMessage(intlMessages.correctOption)}>
                                  <span aria-label={intl.formatMessage(intlMessages.correctOption)}>✅</span>
                                </Tooltip>
                              )
                              : (
                                <Tooltip title={intl.formatMessage(intlMessages.incorrectOption)}>
                                  <span aria-label={intl.formatMessage(intlMessages.incorrectOption)}>❌</span>
                                </Tooltip>
                              )}
                          </Styled.ResultRight>
                        ) : null
                      }
                    </tr>
                  ))
                }
              </tbody>
            </Styled.LiveResultTable>
          )
          : (
            <div>
              {intl.formatMessage(intlMessages.secretPollLabel)}
            </div>
          )
      }
    </div>
  );
};

const LiveResultContainer: React.FC = () => {
  const {
    data: currentPollData,
    loading: currentPollLoading,
    error: currentPollDataError,
  } = useDeduplicatedSubscription<getCurrentPollDataResponse>(getCurrentPollData);

  if (currentPollLoading || !currentPollData) {
    return null;
  }

  if (currentPollDataError) {
    connectionStatus.setSubscriptionFailed(true);
    logger.error(
      {
        logCode: 'subscription_Failed',
        extraInfo: {
          error: currentPollDataError,
        },
      },
      'Subscription failed to load',
    );
    return null;
  }

  if (!currentPollData.poll.length) return null;
  const Settings = getSettingsSingletonInstance();
  // @ts-ignore - JS code
  const { animations } = Settings.application;
  const currentPoll = currentPollData.poll[0];
  const isSecret = currentPoll.secret;
  const {
    questionText,
    responses,
    pollId,
    users,
  } = currentPoll;

  const numberOfAnswerCount = currentPoll.responses_aggregate.aggregate.sum.optionResponsesCount;
  const numberOfUsersCount = currentPoll.users_aggregate.aggregate.count;

  return (
    <LiveResult
      questionText={questionText}
      responses={responses}
      isSecret={isSecret}
      usersCount={numberOfUsersCount}
      numberOfAnswerCount={numberOfAnswerCount ?? 0}
      animations={animations}
      pollId={pollId}
      users={users}
      isQuiz={currentPoll.quiz}
    />
  );
};

export default LiveResultContainer;

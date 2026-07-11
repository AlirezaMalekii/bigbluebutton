import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TabUnstyled from '@mui/base/TabUnstyled';
import TabsListUnstyled from '@mui/base/TabsListUnstyled';
import TabPanelUnstyled from '@mui/base/TabPanelUnstyled';
import TabsUnstyled from '@mui/base/TabsUnstyled';
import { Stack } from '@mui/material';
import './App.css';
import { FormattedMessage, injectIntl } from 'react-intl';
import {
  LearningDashboardDate,
  LearningDashboardDateTime,
} from './utils/datetime';
import CardBody from './components/Card';
import UsersTable from './components/UsersTable';
import UserDetails from './components/UserDetails/component';
import { UserDetailsContext } from './components/UserDetails/context';
import StatusTable from './components/StatusTable';
import PollsTable from './components/PollsTable';
import PluginsTable from './components/PluginsTable';
import ErrorMessage from './components/ErrorMessage';
import { tsToHHmmss } from './services/UserService';
import { createWorkbookBlob, makeSessionWorkbookBuffer } from './services/SessionExportService';
import QuizzesTable from './components/QuizzesTable';
import QuizzesChart from './components/QuizzesChart';
import {
  Modal, ModalBody, ModalContent, ModalDismissButton, ModalTitle,
} from './components/Modal';
import Help from './components/Help';

const TABS = {
  OVERVIEW: 0,
  OVERVIEW_ACTIVITY_SCORE: 1,
  TIMELINE: 2,
  POLLING: 3,
  QUIZZES: 4,
};
const LEARNING_DASHBOARD_LEARN_MORE_LINK = 'learning-dashboard-learn-more-link';
const LEARNING_DASHBOARD_FEEDBACK_LINK = 'learning-dashboard-feedback-link';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      invalidSessionCount: 0,
      activitiesJson: {},
      tab: 0,
      meetingId: '',
      learningDashboardAccessToken: '',
      ldAccessTokenCopied: false,
      sessionToken: '',
      lastUpdated: null,
      modalOpen: false,
    };

    this.handleCloseModal = this.handleCloseModal.bind(this);
    this.handleOpenModal = this.handleOpenModal.bind(this);
  }

  componentDidMount() {
    this.setDashboardParams(() => {
      this.fetchActivitiesJson();
    });
  }

  handleOpenModal() {
    if (process.env.REACT_APP_EXTERNAL_HELP_PAGE_URL) {
      window.open(process.env.REACT_APP_EXTERNAL_HELP_PAGE_URL, '_blank');
      return;
    }
    this.setState({ modalOpen: true });
  }

  handleCloseModal() {
    this.setState({ modalOpen: false });
  }

  async handleSaveSessionData(e) {
    const { currentTarget: downloadButton } = e;
    const downloadButtonLabel = downloadButton.querySelector('span') || downloadButton;
    const { intl } = this.props;
    const { activitiesJson } = this.state;
    const {
      name: meetingName, createdOn, users, polls, downloadSessionDataEnabled,
    } = activitiesJson;

    if (downloadSessionDataEnabled === false) return;

    const link = document.createElement('a');
    const filename = `LearningDashboard_${meetingName}_${new Date(createdOn).toISOString().substr(0, 10)}.xlsx`.replace(/ /g, '-');
    let objectUrl = '';

    downloadButton.setAttribute('disabled', 'true');
    downloadButton.style.cursor = 'not-allowed';
    downloadButtonLabel.innerHTML = intl.formatMessage({ id: 'app.learningDashboard.exportingSessionDataLabel', defaultMessage: 'Preparing...' });

    try {
      const buffer = await makeSessionWorkbookBuffer(activitiesJson, intl, {
        averageActivityScore: intl.formatNumber((this.getAverageActivityScore() || 0), {
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        }),
        totalActivityTime: this.totalOfActivity(),
        usersCount: Object.values(users || {}).length,
        pollsCount: Object.values(polls || {}).filter((poll) => !poll.quiz).length,
        quizzesCount: Object.values(polls || {}).filter((poll) => poll.quiz).length,
      });
      objectUrl = window.URL.createObjectURL(createWorkbookBlob(buffer));
      link.setAttribute('href', objectUrl);
      link.setAttribute('download', filename);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      downloadButtonLabel.innerHTML = intl.formatMessage({ id: 'app.learningDashboard.sessionDataDownloadedLabel', defaultMessage: 'Downloaded!' });
    } catch (error) {
      downloadButtonLabel.innerHTML = intl.formatMessage({ id: 'app.learningDashboard.sessionDataDownloadFailedLabel', defaultMessage: 'Download failed' });
    } finally {
      if (link.parentNode) document.body.removeChild(link);
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
      downloadButton.removeAttribute('disabled');
      downloadButton.style.cursor = 'pointer';
      downloadButton.focus();
      setTimeout(() => {
        downloadButtonLabel.innerHTML = intl.formatMessage({ id: 'app.learningDashboard.downloadSessionDataLabel', defaultMessage: 'Download Session Data' });
      }, 3000);
    }
  }

  setDashboardParams(callback) {
    let learningDashboardAccessToken = '';
    let meetingId = '';
    let sessionToken = '';

    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());

    if (typeof params.meeting !== 'undefined') {
      meetingId = params.meeting;
    }

    if (typeof params.sessionToken !== 'undefined') {
      sessionToken = params.sessionToken;
    }

    if (typeof params.report !== 'undefined') {
      learningDashboardAccessToken = params.report;
    } else {
      const cookieName = `ld-${params.meeting}`;
      const cDecoded = decodeURIComponent(document.cookie);
      const cArr = cDecoded.split('; ');
      cArr.forEach((val) => {
        if (val.indexOf(`${cookieName}=`) === 0) {
          learningDashboardAccessToken = val.substring((`${cookieName}=`).length);
        }
      });

      // Extend AccessToken lifetime by 7d (in each access)
      if (learningDashboardAccessToken !== '') {
        const cookieExpiresDate = new Date();
        cookieExpiresDate.setTime(cookieExpiresDate.getTime() + (3600000 * 24 * 7));
        const value = `ld-${meetingId}=${learningDashboardAccessToken};`;
        const expire = `expires=${cookieExpiresDate.toGMTString()};`;
        const args = 'path=/;SameSite=None;Secure';
        document.cookie = `${value} ${expire} ${args}`;
      }
    }

    this.setState({ learningDashboardAccessToken, meetingId, sessionToken }, () => {
      if (typeof callback === 'function') callback();
    });
  }

  getAverageActivityScore() {
    const { activitiesJson } = this.state;
    let meetingAveragePoints = 0;

    const allUsers = Object.values(activitiesJson.users || {})
      .filter((currUser) => !currUser.isModerator);
    const nrOfUsers = allUsers.length;

    if (nrOfUsers === 0) return meetingAveragePoints;

    // Calculate points of Talking
    const usersTalkTime = allUsers.map((currUser) => currUser.talk.totalTime);
    const maxTalkTime = Math.max(...usersTalkTime);
    const totalTalkTime = usersTalkTime.reduce((prev, val) => prev + val, 0);
    if (totalTalkTime > 0) {
      meetingAveragePoints += ((totalTalkTime / nrOfUsers) / maxTalkTime) * 2;
    }

    // Calculate points of Chatting
    const usersTotalOfMessages = allUsers.map((currUser) => currUser.totalOfMessages);
    const maxMessages = Math.max(...usersTotalOfMessages);
    const totalMessages = usersTotalOfMessages.reduce((prev, val) => prev + val, 0);
    if (maxMessages > 0) {
      meetingAveragePoints += ((totalMessages / nrOfUsers) / maxMessages) * 2;
    }

    // Calculate points of Raise hand
    const usersRaiseHand = allUsers.map((currUser) => currUser?.raiseHand?.length || 0);
    const maxRaiseHand = Math.max(...usersRaiseHand);
    const totalRaiseHand = usersRaiseHand.reduce((prev, val) => prev + val, 0);
    if (maxRaiseHand > 0) {
      meetingAveragePoints += ((totalRaiseHand / nrOfUsers) / maxRaiseHand) * 2;
    }

    // Calculate points of Reactions
    const usersReactions = allUsers.map((currUser) => currUser?.reactions?.length || 0);
    const maxReactions = Math.max(...usersReactions);
    const totalReactions = usersReactions.reduce((prev, val) => prev + val, 0);
    if (maxReactions > 0) {
      meetingAveragePoints += ((totalReactions / nrOfUsers) / maxReactions) * 2;
    }

    // Calculate points of Polls
    const totalOfPolls = Object.values(activitiesJson.polls || {}).length;
    if (totalOfPolls > 0) {
      const totalAnswers = allUsers
        .reduce((prevVal, currUser) => prevVal + Object.values(currUser.answers || {}).length, 0);
      meetingAveragePoints += ((totalAnswers / nrOfUsers) / totalOfPolls) * 2;
    }

    return meetingAveragePoints;
  }

  getErrorMessage() {
    const { activitiesJson, learningDashboardAccessToken, sessionToken } = this.state;
    const { intl } = this.props;
    if (learningDashboardAccessToken === '' && sessionToken === '') {
      return intl.formatMessage({ id: 'app.learningDashboard.errors.invalidToken', defaultMessage: 'Invalid session token' });
    }

    if (Object.keys(activitiesJson).length === 0 || typeof activitiesJson.name === 'undefined') {
      return intl.formatMessage({ id: 'app.learningDashboard.errors.dataUnavailable', defaultMessage: 'Data is no longer available' });
    }

    return '';
  }

  fetchMostUsedReactions() {
    const { activitiesJson } = this.state;
    if (!activitiesJson) { return []; }

    // Count each reaction
    const reactionCount = {};
    const allReactionsUsed = Object
      .values(activitiesJson.users || {})
      .map((user) => user.reactions || [])
      .flat(1);
    allReactionsUsed.forEach((reaction) => {
      if (typeof reactionCount[reaction.name] === 'undefined') {
        reactionCount[reaction.name] = 0;
      }
      reactionCount[reaction.name] += 1;
    });

    // Get the three most used
    const mostUsedReactions = Object
      .entries(reactionCount)
      .filter(([, count]) => count)
      .sort(([, countA], [, countB]) => countA - countB)
      .reverse()
      .slice(0, 3);
    return mostUsedReactions.map(([reaction]) => reaction);
  }

  updateModalUser() {
    const { user, dispatch, isOpen } = this.context;
    const { activitiesJson } = this.state;
    const { users } = activitiesJson;

    if (isOpen && users[user.userKey]) {
      dispatch({
        type: 'changeUser',
        user: users[user.userKey],
      });
    }
  }

  fetchActivitiesJson() {
    const {
      learningDashboardAccessToken, meetingId, sessionToken, invalidSessionCount,
    } = this.state;

    // adjust user sessions to be compatible with old json
    const convertUserUsessionsFormat = (activitiesJson) => {
      const newActivivies = activitiesJson;
      Object.values(newActivivies.users).forEach((user) => {
        Object.values(user.intIds).forEach((intId) => {
          if (!intId?.sessions && intId?.registeredOn) {
            const newIntId = intId;
            newIntId.sessions = [
              { registeredOn: intId.registeredOn, leftOn: intId.leftOn },
            ];
          }
        });
      });
      return newActivivies;
    };

    if (learningDashboardAccessToken !== '') {
      fetch(`${meetingId}/${learningDashboardAccessToken}/learning_dashboard_data.json`)
        .then((response) => response.json())
        .then((json) => {
          this.setState({
            activitiesJson: convertUserUsessionsFormat(json),
            loading: false,
            invalidSessionCount: 0,
            lastUpdated: Date.now(),
          });
          this.updateModalUser();
        }).catch(() => {
          this.setState({ loading: false, invalidSessionCount: invalidSessionCount + 1 });
        });
    } else if (sessionToken !== '') {
      const url = new URL('/bigbluebutton/api/learningDashboard', window.location);
      fetch(`${url}?sessionToken=${sessionToken}`, { credentials: 'include' })
        .then((response) => response.json())
        .then((json) => {
          if (json.response.returncode === 'SUCCESS') {
            const jsonData = JSON.parse(json.response.data);
            this.setState({
              activitiesJson: jsonData,
              loading: false,
              invalidSessionCount: 0,
              lastUpdated: Date.now(),
            });
            this.updateModalUser();
          } else {
            // When meeting is ended the sessionToken stop working, check for new cookies
            this.setDashboardParams();
            this.setState({ loading: false, invalidSessionCount: invalidSessionCount + 1 });
          }
        })
        .catch(() => {
          this.setState({ loading: false, invalidSessionCount: invalidSessionCount + 1 });
        });
    } else {
      this.setState({ loading: false });
    }

    setTimeout(() => {
      this.fetchActivitiesJson();
    }, 10000 * (2 ** invalidSessionCount));
  }

  totalOfReactions() {
    const { activitiesJson } = this.state;
    if (activitiesJson && activitiesJson.users) {
      return Object.values(activitiesJson.users)
        .reduce((prevVal, elem) => prevVal + elem.reactions.length, 0);
    }
    return 0;
  }

  totalOfActivity() {
    const { activitiesJson } = this.state;

    const usersTimes = Object.values(activitiesJson.users || {}).reduce((prev, user) => ([
      ...prev,
      ...Object.values(user.intIds),
    ]), []);

    const minTime = Object.values(usersTimes || {}).reduce((prevVal, elem) => {
      if (prevVal === 0 || elem.sessions[0].registeredOn < prevVal) {
        return elem.sessions[0].registeredOn;
      }
      return prevVal;
    }, 0);

    const maxTime = Object.values(usersTimes || {}).reduce((prevVal, elem) => {
      if (elem.sessions[elem.sessions.length - 1].leftOn === 0) return (new Date()).getTime();
      if (elem.sessions[elem.sessions.length - 1].leftOn > prevVal) {
        return elem.sessions[elem.sessions.length - 1].leftOn;
      }
      return prevVal;
    }, 0);

    return maxTime - minTime;
  }

  render() {
    const {
      activitiesJson, tab, loading, lastUpdated, ldAccessTokenCopied, sessionToken, modalOpen,
    } = this.state;
    const { intl } = this.props;

    const pluginUserDataCardTitle = activitiesJson?.pluginUserDataCardTitles?.[0];
    // This line generates an array of all the plugin entries of all users,
    // this might have duplicate entries:
    const pluginUserDataColumnTitleWithDuplicates = Object.values(
      activitiesJson.users || {}, // Hardcoded for now, we will add cards relative to this key.
    ).flatMap((
      user,
    ) => user.pluginUserData?.[pluginUserDataCardTitle]).filter((
      pluginUserDataListForSpecificUser,
    ) => !!(
      pluginUserDataListForSpecificUser?.columnTitle)).map((
      pluginUserDataListForSpecificUser,
    ) => pluginUserDataListForSpecificUser?.columnTitle);
    // This line will eliminate duplicates.
    const pluginUserDataColumnTitleList = [...new Set(pluginUserDataColumnTitleWithDuplicates)];

    document.title = `${intl.formatMessage({ id: 'app.learningDashboard.bigbluebuttonTitle', defaultMessage: 'BigBlueButton' })} - ${intl.formatMessage({ id: 'app.learningDashboard.dashboardTitle', defaultMessage: 'Learning Analytics Dashboard' })} - ${activitiesJson.name}`;

    if (loading === false && this.getErrorMessage() !== '') return <ErrorMessage message={this.getErrorMessage()} />;

    const usersCount = Object.values(activitiesJson.users || {})
      .filter((u) => activitiesJson.endedOn > 0
        || Object.values(u.intIds)[Object.values(u.intIds).length - 1].leftOn === 0)
      .length;

    const polls = Object.fromEntries(Object
      .values(activitiesJson.polls || {})
      .filter((p) => !p.quiz)
      .map((p) => ([p.pollId, p])));

    const quizzes = Object.fromEntries(Object
      .values(activitiesJson.polls || {})
      .filter((p) => p.quiz)
      .map((p) => ([p.pollId, p])));

    return (
      <div className="ld-shell">
        <div className="ld-hero">
          <div>
            <span className="ld-eyebrow">
              <FormattedMessage id="app.learningDashboard.dashboardTitle" defaultMessage="Learning Dashboard" />
            </span>
            <h1 className="ld-hero-title">
              <FormattedMessage id="app.learningDashboard.dashboardTitle" defaultMessage="Learning Dashboard" />
            </h1>
            {
              ldAccessTokenCopied === true
                ? (
                  <span className="mt-3 inline-flex text-xs text-skyroom-inkMuted font-normal">
                    <FormattedMessage id="app.learningDashboard.linkCopied" defaultMessage="Link successfully copied!" />
                  </span>
                )
                : null
            }
            { activitiesJson?.other
              && activitiesJson.other[LEARNING_DASHBOARD_LEARN_MORE_LINK] !== ''
              && (
                <p className="ld-hero-subtitle">
                  {intl.formatMessage({ id: 'app.learningDashboard.learnMore', defaultMessage: 'Learn more about the use of the Dashboard in {learnMoreLink} from our Knowledge Base.' }, {
                    learnMoreLink: (
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={activitiesJson.other[LEARNING_DASHBOARD_LEARN_MORE_LINK]}
                        className="underline underline-offset-4"
                      >
                        {intl.formatMessage({ id: 'app.learningDashboard.learnMoreLinkText', defaultMessage: 'this article' })}
                      </a>
                    ),
                  })}
                </p>
              )}
            <span className="ld-meeting-name">{activitiesJson.name || ''}</span>
          </div>
          <div className="ld-hero-meta col-text-right">
            <div className="ld-meta-row">
              <span>
                <FormattedMessage id="app.learningDashboard.indicators.meetingStatusActive" defaultMessage="Active" />
              </span>
              {
                activitiesJson.endedOn > 0
                  ? (
                    <span className="ld-badge ld-badge-danger">
                      <FormattedMessage id="app.learningDashboard.indicators.meetingStatusEnded" defaultMessage="Ended" data-test="meetingStatusEndedDashboard" />
                    </span>
                  )
                  : (
                    <span className="ld-badge ld-badge-success" data-test="meetingStatusActiveDashboard">
                      <FormattedMessage id="app.learningDashboard.indicators.meetingStatusActive" defaultMessage="Active" />
                    </span>
                  )
              }
            </div>
            <div className="ld-meta-row">
              <span>
                <FormattedMessage id="app.learningDashboard.indicators.duration" defaultMessage="Duration" />
              </span>
              <strong data-test="meetingDurationTimeDashboard">{tsToHHmmss(this.totalOfActivity())}</strong>
            </div>
            <div className="ld-meta-row">
              <span>
                <FormattedMessage id="app.learningDashboard.date" defaultMessage="Date" />
              </span>
              <strong data-test="meetingDateDashboard">
                <LearningDashboardDate intl={intl} value={activitiesJson.createdOn} />
              </strong>
            </div>
          </div>
        </div>

        <TabsUnstyled
          defaultValue={0}
          onChange={(e, v) => {
            this.setState({ tab: v });
          }}
        >
          <TabsListUnstyled className="ld-tabs-grid">
            <TabUnstyled className="ld-stat-tab" data-test="activeUsersPanelDashboard">
              <Card>
                <CardContent classes={{ root: '!p-0' }}>
                  <CardBody
                    name={
                      activitiesJson.endedOn === 0
                        ? intl.formatMessage({ id: 'app.learningDashboard.indicators.usersOnline', defaultMessage: 'Active Users' })
                        : intl.formatMessage({ id: 'app.learningDashboard.indicators.usersTotal', defaultMessage: 'Total Number Of Users' })
                    }
                    number={usersCount}
                    cardClass={tab === TABS.OVERVIEW ? 'ld-stat-card-active' : ''}
                    iconClass="text-pink-200"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </CardBody>
                </CardContent>
              </Card>
            </TabUnstyled>
            <TabUnstyled className="ld-stat-tab" data-test="activityScorePanelDashboard">
              <Card>
                <CardContent classes={{ root: '!p-0' }}>
                  <CardBody
                    name={intl.formatMessage({ id: 'app.learningDashboard.indicators.activityScore', defaultMessage: 'Activity Score' })}
                    number={intl.formatNumber((this.getAverageActivityScore() || 0), {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 1,
                    })}
                    cardClass={tab === TABS.OVERVIEW_ACTIVITY_SCORE ? 'ld-stat-card-active' : ''}
                    iconClass="text-emerald-100"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                      />
                    </svg>
                  </CardBody>
                </CardContent>
              </Card>
            </TabUnstyled>
            <TabUnstyled className="ld-stat-tab" data-test="timelinePanelDashboard">
              <Card>
                <CardContent classes={{ root: '!p-0' }}>
                  <CardBody
                    name={intl.formatMessage({ id: 'app.learningDashboard.indicators.timeline', defaultMessage: 'Timeline' })}
                    number={this.totalOfReactions()}
                    cardClass={tab === TABS.TIMELINE ? 'ld-stat-card-active' : ''}
                    iconClass="text-violet-100"
                  >
                    {this.fetchMostUsedReactions()}
                  </CardBody>
                </CardContent>
              </Card>
            </TabUnstyled>
            <TabUnstyled className="ld-stat-tab" data-test="pollsPanelDashboard">
              <Card>
                <CardContent classes={{ root: '!p-0' }}>
                  <CardBody
                    name={intl.formatMessage({ id: 'app.learningDashboard.indicators.polls', defaultMessage: 'Polls' })}
                    number={Object.keys(polls).length}
                    cardClass={tab === TABS.POLLING ? 'ld-stat-card-active' : ''}
                    iconClass="text-sky-100"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                  </CardBody>
                </CardContent>
              </Card>
            </TabUnstyled>
            <TabUnstyled className="ld-stat-tab" data-test="quizzesPanelDashboard">
              <Card>
                <CardContent classes={{ root: '!p-0' }}>
                  <CardBody
                    name={intl.formatMessage({ id: 'app.learningDashboard.indicators.quizzes', defaultMessage: 'Quizzes' })}
                    number={Object.keys(quizzes).length}
                    cardClass={tab === TABS.QUIZZES ? 'ld-stat-card-active' : ''}
                    iconClass="text-amber-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </CardBody>
                </CardContent>
              </Card>
            </TabUnstyled>
            {pluginUserDataColumnTitleList.length && (
              <TabUnstyled className="ld-stat-tab" data-test="pluginsPanelDashboard">
                <Card>
                  <CardContent classes={{ root: '!p-0' }}>
                    <CardBody
                      name={pluginUserDataCardTitle}
                      number={pluginUserDataColumnTitleList.length}
                      cardClass={tab === 5 ? 'ld-stat-card-active' : ''}
                      iconClass="text-rose-100"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                        />
                      </svg>
                    </CardBody>
                  </CardContent>
                </Card>
              </TabUnstyled>
            )}
          </TabsListUnstyled>
          <TabPanelUnstyled value={0}>
            <section className="ld-panel">
              <div className="ld-panel-header">
                <h2 className="ld-panel-title">
                  <FormattedMessage id="app.learningDashboard.usersTable.title" defaultMessage="Overview" />
                </h2>
              </div>
              <div className="ld-panel-body">
                <UsersTable
                  allUsers={activitiesJson.users}
                  totalOfActivityTime={this.totalOfActivity()}
                  totalOfPolls={Object.values(activitiesJson.polls || {}).length}
                  tab="overview"
                />
              </div>
            </section>
          </TabPanelUnstyled>
          <TabPanelUnstyled value={1}>
            <section className="ld-panel">
              <div className="ld-panel-header">
                <h2 className="ld-panel-title">
                  <FormattedMessage id="app.learningDashboard.usersTable.title" defaultMessage="Overview" />
                </h2>
              </div>
              <div className="ld-panel-body">
                <UsersTable
                  allUsers={activitiesJson.users}
                  totalOfActivityTime={this.totalOfActivity()}
                  totalOfPolls={Object.values(activitiesJson.polls || {}).length}
                  tab="overview_activityscore"
                />
              </div>
            </section>
          </TabPanelUnstyled>
          <TabPanelUnstyled value={2}>
            <section className="ld-panel">
              <div className="ld-panel-header">
                <h2 className="ld-panel-title">
                  <FormattedMessage id="app.learningDashboard.statusTimelineTable.title" defaultMessage="Timeline" />
                </h2>
              </div>
              <div className="ld-panel-body">
                <StatusTable
                  allUsers={activitiesJson.users}
                  slides={activitiesJson.presentationSlides}
                  meetingId={activitiesJson.intId}
                  sessionToken={sessionToken}
                />
              </div>
            </section>
          </TabPanelUnstyled>
          <TabPanelUnstyled value={3}>
            <section className="ld-panel">
              <div className="ld-panel-header">
                <h2 className="ld-panel-title">
                  <FormattedMessage id="app.learningDashboard.pollsTable.title" defaultMessage="Polls" />
                </h2>
              </div>
              <div className="ld-panel-body">
                <PollsTable polls={polls} allUsers={activitiesJson.users} />
              </div>
            </section>
          </TabPanelUnstyled>
          <TabPanelUnstyled value={4}>
            <section className="ld-panel">
              <div className="ld-panel-header">
                <h2 className="ld-panel-title">
                  <FormattedMessage id="app.learningDashboard.quizzes.title" defaultMessage="Quiz Results" />
                </h2>
              </div>
              <div className="ld-panel-body p-4">
                <Stack spacing={2}>
                  <QuizzesChart
                    quizzes={quizzes}
                    allUsers={activitiesJson.users}
                    totalOfPolls={Object.values(activitiesJson.polls || {}).length}
                  />
                  <QuizzesTable
                    quizzes={quizzes}
                    allUsers={activitiesJson.users}
                  />
                </Stack>
              </div>
            </section>
          </TabPanelUnstyled>
          <TabPanelUnstyled value={5}>
            <section className="ld-panel">
              <div className="ld-panel-header">
                <h2 className="ld-panel-title">
                  {pluginUserDataCardTitle}
                </h2>
              </div>
              <div className="ld-panel-body">
                <PluginsTable
                  pluginUserDataCardTitle={pluginUserDataCardTitle}
                  pluginUserDataColumnTitleList={pluginUserDataColumnTitleList}
                  allUsers={activitiesJson.users}
                />
              </div>
            </section>
          </TabPanelUnstyled>
        </TabsUnstyled>
        <UserDetails dataJson={activitiesJson} />
        <hr className="my-8" />
        { activitiesJson?.other
          && activitiesJson.other[LEARNING_DASHBOARD_FEEDBACK_LINK] !== ''
          && (
            <>
              <div className="ld-feedback">
                { intl.formatMessage({ id: 'app.learningDashboard.feedback', defaultMessage: 'How has your experience been with this feature? We would love to hear your opinion and even suggestions on how we can improve it. Share with us by clicking {feedbackLink}.' }, {
                  feedbackLink: (
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={activitiesJson.other[LEARNING_DASHBOARD_FEEDBACK_LINK]}
                      className="underline underline-offset-4"
                    >
                      {intl.formatMessage({ id: 'app.learningDashboard.feedbackLinkText', defaultMessage: 'here' })}
                    </a>
                  ),
                })}
              </div>
            </>
          )}
        <div className="ld-footer">
          <div>
            <p>
              {
                lastUpdated && (
                  <>
                    <FormattedMessage
                      id="app.learningDashboard.lastUpdatedLabel"
                      defaultMessage="Last updated at"
                    />
                    {' '}
                    <LearningDashboardDateTime intl={intl} value={lastUpdated} />
                  </>
                )
              }
            </p>
          </div>
          <div className="ld-footer-actions">
            {
            (activitiesJson.downloadSessionDataEnabled || false)
              ? (
                <button
                  data-test="downloadSessionDataDashboard"
                  type="button"
                  className="ld-button ld-button-primary"
                  onClick={this.handleSaveSessionData.bind(this)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span>
                    <FormattedMessage
                      id="app.learningDashboard.downloadSessionDataLabel"
                      defaultMessage="Download Session Data"
                    />
                  </span>
                </button>
              )
              : null
          }
            <button
              type="button"
              className="ld-button"
              onClick={this.handleOpenModal}
            >
              {process.env.REACT_APP_EXTERNAL_HELP_PAGE_URL ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                </svg>
              )}
              <FormattedMessage
                id="app.learningDashboard.helpButtonLabel"
                defaultMessage="Help"
              />
            </button>
            <Modal isOpen={modalOpen}>
              <ModalContent>
                <ModalTitle>
                  <FormattedMessage
                    id="app.learningDashboard.help.title"
                    defaultMessage="Learning Dashboard Help"
                  />
                </ModalTitle>
                <ModalDismissButton onClick={this.handleCloseModal} />
                <ModalBody>
                  <Help />
                </ModalBody>
              </ModalContent>
            </Modal>
          </div>
        </div>
      </div>
    );
  }
}

App.contextType = UserDetailsContext;

export default injectIntl(App);

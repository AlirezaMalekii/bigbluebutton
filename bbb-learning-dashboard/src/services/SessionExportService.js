import {
  getActivityScore,
  getJoinTime,
  getLeaveTime,
  getSumOfTime,
  tsToHHmmss,
} from './UserService';
import { filterUserReactions } from './ReactionService';

const EXCEL_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const FONT_FAMILY = 'IRANYekan';

const userHeaderFields = [
  ['name', 'app.learningDashboard.usersTable.colUser', 'User'],
  ['moderator', 'app.learningDashboard.usersTable.colModerator', 'Moderator'],
  ['activityScore', 'app.learningDashboard.usersTable.colActivityScore', 'Activity Score'],
  ['talk', 'app.learningDashboard.usersTable.colTalkTime', 'Talk time'],
  ['webcam', 'app.learningDashboard.usersTable.colWebcamTime', 'Webcam time'],
  ['messages', 'app.learningDashboard.usersTable.colMessages', 'Messages'],
  ['reactions', 'app.learningDashboard.usersTable.colReactions', 'Reactions'],
  ['answers', 'app.learningDashboard.usersTable.colAnswers', 'Answers'],
  ['raiseHand', 'app.learningDashboard.usersTable.colRaiseHands', 'Raise Hands'],
  ['registeredOn', 'app.learningDashboard.usersTable.join', 'Join'],
  ['leftOn', 'app.learningDashboard.usersTable.left', 'Left'],
  ['duration', 'app.learningDashboard.usersTable.duration', 'Duration'],
];

function getExcelJS(module) {
  return module.default || module;
}

function isRtlDocument() {
  return document?.documentElement?.dir === 'rtl';
}

function formatMessage(intl, id, defaultMessage) {
  return intl.formatMessage({ id, defaultMessage });
}

function formatDateTime(intl, value) {
  if (!value || value <= 0) return '-';

  return intl.formatDate(value, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function safeSheetName(name) {
  return String(name)
    .replace(/[:\\/?*[\]]/g, ' ')
    .trim()
    .slice(0, 31) || 'Sheet';
}

function applyWorksheetDefaults(worksheet) {
  /* eslint-disable no-param-reassign */
  worksheet.views = [{ rightToLeft: isRtlDocument() }];
  worksheet.properties.defaultRowHeight = 22;

  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.font = {
        name: FONT_FAMILY,
        size: rowNumber === 1 ? 11 : 10,
        bold: rowNumber === 1,
        color: { argb: rowNumber === 1 ? 'FFE6EDF7' : 'FF1F2937' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: isRtlDocument() ? 'right' : 'left',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
      if (rowNumber === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0D887E' },
        };
      }
    });
  });
  /* eslint-enable no-param-reassign */
}

function autoSizeColumns(worksheet) {
  /* eslint-disable no-param-reassign */
  worksheet.columns.forEach((column) => {
    let maxLength = 12;
    column.eachCell({ includeEmpty: true }, (cell) => {
      const text = cell.value == null ? '' : String(cell.value);
      maxLength = Math.max(maxLength, ...text.split('\n').map((part) => part.length));
    });
    column.width = Math.min(Math.max(maxLength + 3, 12), 48);
  });
  /* eslint-enable no-param-reassign */
}

function addRowsSheet(workbook, name, columns, rows) {
  const worksheet = workbook.addWorksheet(safeSheetName(name));
  worksheet.columns = columns.map(({ header, key }) => ({
    header,
    key,
  }));
  rows.forEach((row) => worksheet.addRow(row));
  applyWorksheetDefaults(worksheet);
  autoSizeColumns(worksheet);
  return worksheet;
}

function getUserRows(users, polls, intl) {
  const userValues = Object.values(users || {});
  const pollValues = Object.values(polls || {});

  return userValues.map((user) => {
    const webcam = getSumOfTime(user.webcams);
    const intIds = Object.values(user.intIds || {});
    const duration = getSumOfTime(intIds);
    const joinTime = getJoinTime(intIds);
    const leaveTime = getLeaveTime(intIds);
    const row = {
      name: user.name,
      moderator: user.isModerator
        ? formatMessage(intl, 'app.learningDashboard.yes', 'Yes')
        : formatMessage(intl, 'app.learningDashboard.no', 'No'),
      activityScore: intl.formatNumber(
        getActivityScore(user, userValues, pollValues.length),
        {
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        },
      ),
      talk: user.talk?.totalTime > 0 ? tsToHHmmss(user.talk.totalTime) : '-',
      webcam: webcam > 0 ? tsToHHmmss(webcam) : '-',
      messages: user.totalOfMessages || 0,
      reactions: filterUserReactions(user).length,
      answers: Object.keys(user.answers || {}).length,
      raiseHand: user.raiseHand?.length || 0,
      registeredOn: formatDateTime(intl, joinTime),
      leftOn: formatDateTime(intl, leaveTime),
      duration: tsToHHmmss(duration),
    };

    pollValues.forEach((poll, index) => {
      row[`poll_${index + 1}`] = user.answers?.[poll.pollId] || '-';
    });

    return row;
  });
}

function getUserColumns(polls, intl) {
  const columns = userHeaderFields.map(([key, id, defaultMessage]) => ({
    key,
    header: formatMessage(intl, id, defaultMessage),
  }));

  Object.values(polls || {}).forEach((poll, index) => {
    columns.push({
      key: `poll_${index + 1}`,
      header: poll.question?.replace(/\s+/g, ' ').trim() || `Poll ${index + 1}`,
    });
  });

  return columns;
}

function getPollRows(polls, users, intl, quiz = false) {
  const pollValues = Object.values(polls || {}).filter((poll) => !!poll.quiz === quiz);
  const userValues = Object.values(users || {});
  const rows = [];

  pollValues.forEach((poll, pollIndex) => {
    userValues.forEach((user) => {
      const answer = user.answers?.[poll.pollId];
      if (!answer) return;

      rows.push({
        index: pollIndex + 1,
        question: poll.question || '-',
        user: user.name,
        moderator: user.isModerator
          ? formatMessage(intl, 'app.learningDashboard.yes', 'Yes')
          : formatMessage(intl, 'app.learningDashboard.no', 'No'),
        answer,
      });
    });

    if (poll.anonymousAnswers?.length) {
      rows.push({
        index: pollIndex + 1,
        question: poll.question || '-',
        user: formatMessage(intl, 'app.learningDashboard.pollsTable.anonymousRowName', 'Anonymous'),
        moderator: '-',
        answer: poll.anonymousAnswers.join('\n'),
      });
    }
  });

  return rows;
}

function getTimelineRows(users, intl) {
  const rows = [];

  Object.values(users || {}).forEach((user) => {
    Object.values(user.intIds || {}).forEach((intId) => {
      (intId.sessions || []).forEach((session) => {
        rows.push({
          user: user.name,
          type: formatMessage(intl, 'app.learningDashboard.usersTable.colOnline', 'Online time'),
          startedAt: formatDateTime(intl, session.registeredOn),
          endedAt: formatDateTime(intl, session.leftOn),
          duration: session.leftOn > 0 ? tsToHHmmss(session.leftOn - session.registeredOn) : '-',
          detail: '',
        });
      });
    });

    filterUserReactions(user).forEach((reaction) => {
      rows.push({
        user: user.name,
        type: formatMessage(intl, 'app.learningDashboard.usersTable.colReactions', 'Reactions'),
        startedAt: formatDateTime(intl, reaction.sentOn),
        endedAt: '-',
        duration: '-',
        detail: reaction.name,
      });
    });

    (user.raiseHand || []).forEach((raiseHand) => {
      rows.push({
        user: user.name,
        type: formatMessage(intl, 'app.learningDashboard.usersTable.colRaiseHands', 'Raise Hands'),
        startedAt: formatDateTime(intl, raiseHand.raisedOn || raiseHand.sentOn),
        endedAt: formatDateTime(intl, raiseHand.loweredOn || raiseHand.leftOn),
        duration: '-',
        detail: '',
      });
    });
  });

  return rows.sort((a, b) => String(a.startedAt).localeCompare(String(b.startedAt)));
}

function getPluginRows(users, cardTitle, columnTitles) {
  if (!cardTitle || columnTitles.length === 0) return [];

  return Object.values(users || {}).map((user) => {
    const row = {
      user: user.name,
    };
    const pluginData = user.pluginUserData?.[cardTitle] || [];
    columnTitles.forEach((title) => {
      const item = pluginData.find((entry) => entry.columnTitle === title);
      row[title] = item?.value || item?.text || item?.content || '';
    });
    return row;
  });
}

function addSummarySheet(workbook, activitiesJson, intl, summary) {
  const users = Object.values(activitiesJson.users || {});
  const polls = Object.values(activitiesJson.polls || {}).filter((poll) => !poll.quiz);
  const quizzes = Object.values(activitiesJson.polls || {}).filter((poll) => poll.quiz);
  const rows = [
    {
      label: formatMessage(intl, 'app.learningDashboard.dashboardTitle', 'Learning Dashboard'),
      value: activitiesJson.name || '',
    },
    {
      label: formatMessage(intl, 'app.learningDashboard.usersTable.colUser', 'User'),
      value: users.length,
    },
    {
      label: formatMessage(intl, 'app.learningDashboard.pollsTable.title', 'Polls'),
      value: polls.length,
    },
    {
      label: formatMessage(intl, 'app.learningDashboard.indicators.quizzes', 'Quizzes'),
      value: quizzes.length,
    },
    {
      label: formatMessage(intl, 'app.learningDashboard.indicators.activityScore', 'Activity Score'),
      value: summary.averageActivityScore,
    },
    {
      label: formatMessage(intl, 'app.learningDashboard.indicators.duration', 'Duration'),
      value: tsToHHmmss(summary.totalActivityTime || 0),
    },
    {
      label: formatMessage(intl, 'app.learningDashboard.usersTable.join', 'Join'),
      value: formatDateTime(intl, activitiesJson.createdOn),
    },
    {
      label: formatMessage(intl, 'app.learningDashboard.indicators.meetingStatusActive', 'Active'),
      value: activitiesJson.endedOn > 0
        ? formatMessage(intl, 'app.learningDashboard.indicators.meetingStatusEnded', 'Ended')
        : formatMessage(intl, 'app.learningDashboard.indicators.meetingStatusActive', 'Active'),
    },
  ];

  addRowsSheet(workbook, formatMessage(intl, 'app.learningDashboard.summary', 'Summary'), [
    { key: 'label', header: formatMessage(intl, 'app.learningDashboard.label', 'Label') },
    { key: 'value', header: formatMessage(intl, 'app.learningDashboard.value', 'Value') },
  ], rows);
}

export async function makeSessionWorkbookBuffer(activitiesJson, intl, summary = {}) {
  const ExcelJS = getExcelJS(await import('exceljs'));
  const workbook = new ExcelJS.Workbook();
  const users = activitiesJson.users || {};
  const polls = activitiesJson.polls || {};
  const pluginUserDataCardTitle = activitiesJson?.pluginUserDataCardTitles?.[0];
  const pluginColumns = [...new Set(Object.values(users)
    .flatMap((user) => user.pluginUserData?.[pluginUserDataCardTitle] || [])
    .filter((entry) => !!entry?.columnTitle)
    .map((entry) => entry.columnTitle))];

  workbook.creator = 'BigBlueButton Learning Dashboard';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.views = [{
    activeTab: 0,
    firstSheet: 0,
    visibility: 'visible',
  }];

  addSummarySheet(workbook, activitiesJson, intl, summary);
  addRowsSheet(
    workbook,
    formatMessage(intl, 'app.learningDashboard.usersTable.title', 'Users'),
    getUserColumns(polls, intl),
    getUserRows(users, polls, intl),
  );
  addRowsSheet(workbook, formatMessage(intl, 'app.learningDashboard.pollsTable.title', 'Polls'), [
    { key: 'index', header: '#' },
    { key: 'question', header: formatMessage(intl, 'app.learningDashboard.userDetails.poll', 'Poll') },
    { key: 'user', header: formatMessage(intl, 'app.learningDashboard.user', 'User') },
    { key: 'moderator', header: formatMessage(intl, 'app.learningDashboard.usersTable.colModerator', 'Moderator') },
    { key: 'answer', header: formatMessage(intl, 'app.learningDashboard.userDetails.response', 'Response') },
  ], getPollRows(polls, users, intl, false));
  addRowsSheet(workbook, formatMessage(intl, 'app.learningDashboard.indicators.quizzes', 'Quizzes'), [
    { key: 'index', header: '#' },
    { key: 'question', header: formatMessage(intl, 'app.learningDashboard.userDetails.quiz', 'Quiz') },
    { key: 'user', header: formatMessage(intl, 'app.learningDashboard.user', 'User') },
    { key: 'moderator', header: formatMessage(intl, 'app.learningDashboard.usersTable.colModerator', 'Moderator') },
    { key: 'answer', header: formatMessage(intl, 'app.learningDashboard.userDetails.response', 'Response') },
  ], getPollRows(polls, users, intl, true));
  addRowsSheet(workbook, formatMessage(intl, 'app.learningDashboard.statusTimelineTable.title', 'Timeline'), [
    { key: 'user', header: formatMessage(intl, 'app.learningDashboard.user', 'User') },
    { key: 'type', header: formatMessage(intl, 'app.learningDashboard.type', 'Type') },
    { key: 'startedAt', header: formatMessage(intl, 'app.learningDashboard.startedAt', 'Started at') },
    { key: 'endedAt', header: formatMessage(intl, 'app.learningDashboard.endedAt', 'Ended at') },
    { key: 'duration', header: formatMessage(intl, 'app.learningDashboard.usersTable.duration', 'Duration') },
    { key: 'detail', header: formatMessage(intl, 'app.learningDashboard.detail', 'Detail') },
  ], getTimelineRows(users, intl));

  if (pluginColumns.length > 0) {
    addRowsSheet(workbook, pluginUserDataCardTitle, [
      { key: 'user', header: formatMessage(intl, 'app.learningDashboard.user', 'User') },
      ...pluginColumns.map((column) => ({ key: column, header: column })),
    ], getPluginRows(users, pluginUserDataCardTitle, pluginColumns));
  }

  return workbook.xlsx.writeBuffer();
}

export function createWorkbookBlob(buffer) {
  return new Blob([buffer], { type: EXCEL_MIME_TYPE });
}

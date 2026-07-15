import intlHolder from '../../core/singletons/intlHolder';
import Session from '/imports/ui/services/storage/in-memory';

const SESSION_REASON_KEYS = {
  503: 'app.error.503',
  500: 'app.error.500',
  410: 'app.error.410',
  409: 'app.error.409',
  408: 'app.error.408',
  404: 'app.error.404',
  403: 'app.error.403',
  401: 'app.error.401',
  400: 'app.error.400',
  meeting_ended: 'app.meeting.endedMessage',
  user_logged_out_reason: 'app.error.userLoggedOut',
  validate_token_failed_eject_reason: 'app.error.ejectedUser',
  banned_user_rejoining_reason: 'app.error.userBanned',
  joined_another_window_reason: 'app.error.joinedAnotherWindow',
  user_inactivity_eject_reason: 'app.meeting.logout.userInactivityEjectReason',
  user_requested_eject_reason: 'app.meeting.logout.ejectedFromMeeting',
  max_participants_reason: 'app.meeting.logout.maxParticipantsReached',
  guest_deny: 'app.guest.guestDeny',
  duplicate_user_in_meeting_eject_reason: 'app.meeting.logout.duplicateUserEjectReason',
  not_enough_permission_eject_reason: 'app.meeting.logout.permissionEjectReason',
  able_to_rejoin_user_disconnected_reason: 'app.error.disconnected.rejoin',
  user_not_found: 'app.error.userNotFound',
  request_timeout: 'app.error.requestTimeout',
  meeting_not_found: 'app.error.meetingNotFound',
  session_token_replaced: 'app.error.sessionTokenReplaced',
  internal_error: 'app.error.serverInternalError',
  param_missing: 'app.error.paramMissing',
  too_many_connections: 'app.error.tooManyConnections',
  server_closed: 'app.error.serverClosed',
};

const ENDED_REASON_TO_KEY = {
  'Missing session token': 'app.error.screen.missingSessionToken',
  'Timeout fetching client settings': 'app.error.screen.settingsTimeout',
  'Error fetching client settings': 'app.error.screen.settingsFetchFailed',
  'Timeout fetching user custom settings': 'app.error.screen.userSettingsTimeout',
  'Error fetching user custom settings': 'app.error.screen.userSettingsFetchFailed',
};

const JOIN_URL_ERROR_PROFILES = {
  guestDeniedAccess: {
    titleKey: 'app.error.guestDeniedAccess.title',
    reasonKey: 'app.error.guestDeniedAccess.message',
    hintKey: 'app.error.guestDeniedAccess.hint',
    actionKey: 'app.error.guestDeniedAccess.action',
    iconName: 'user',
    variant: 'access',
    primaryAction: 'acknowledge',
  },
};

const BOOTSTRAP_MESSAGES = {
  fa: {
    'app.error.screen.title': 'خطایی رخ داد',
    'app.error.screen.hint': 'اگر مشکل ادامه داشت، صفحه را رفرش کنید یا دوباره از لینک ورود استفاده کنید.',
    'app.error.screen.reloadButton': 'رفرش صفحه',
    'app.error.screen.unexpectedError': 'برنامه با خطای غیرمنتظره‌ای مواجه شد.',
    'app.error.screen.missingSessionToken': 'لینک ورود نامعتبر است یا توکن جلسه در آدرس وجود ندارد.',
    'app.error.screen.settingsTimeout': 'دریافت تنظیمات کلاس بیش از حد طول کشید. احتمالاً اتصال اینترنت یا سرور کند است.',
    'app.error.screen.settingsFetchFailed': 'بارگذاری تنظیمات کلاس ناموفق بود. ممکن است کلاس پایان یافته یا سرور در دسترس نباشد.',
    'app.error.screen.userSettingsTimeout': 'دریافت تنظیمات کاربر بیش از حد طول کشید.',
    'app.error.screen.userSettingsFetchFailed': 'بارگذاری تنظیمات کاربر ناموفق بود.',
    'app.error.screen.graphqlFetchFailed': 'اتصال به سرور کلاس برقرار نشد.',
    'app.error.screen.technicalDetail': 'جزئیات فنی',
    'app.error.400': 'درخواست نامعتبر است.',
    'app.error.401': 'دسترسی غیرمجاز است.',
    'app.error.403': 'شما از کلاس حذف شدید.',
    'app.error.404': 'صفحه یا کلاس مورد نظر یافت نشد.',
    'app.error.408': 'مهلت ورود به کلاس به پایان رسید.',
    'app.error.409': 'تداخل در درخواست رخ داد.',
    'app.error.410': 'این کلاس پایان یافته است.',
    'app.error.500': 'مشکلی در سرور رخ داد.',
    'app.error.503': 'سرویس موقتاً در دسترس نیست.',
    'app.meeting.endedMessage': 'این کلاس پایان یافته است.',
    'app.error.userLoggedOut': 'نشست شما منقضی شده یا از سیستم خارج شده‌اید.',
    'app.error.ejectedUser': 'شما از این کلاس اخراج شده‌اید.',
    'app.error.userBanned': 'دسترسی شما به این کلاس مسدود شده است.',
    'app.error.joinedAnotherWindow': 'همین کلاس در تب یا دستگاه دیگری باز است.',
    'app.meeting.logout.userInactivityEjectReason': 'به دلیل عدم فعالیت طولانی از کلاس خارج شدید.',
    'app.meeting.logout.ejectedFromMeeting': 'شما از کلاس حذف شدید.',
    'app.meeting.logout.maxParticipantsReached': 'ظرفیت این کلاس تکمیل شده است.',
    'app.guest.guestDeny': 'درخواست ورود شما رد شد.',
    'app.meeting.logout.duplicateUserEjectReason': 'کاربری با همین نام در حال ورود به کلاس است.',
    'app.meeting.logout.permissionEjectReason': 'به دلیل نقض دسترسی‌ها از کلاس خارج شدید.',
    'app.error.disconnected.rejoin': 'اتصال قطع شد. برای ورود مجدد صفحه را رفرش کنید.',
    'app.error.userNotFound': 'کاربر پیدا نشد.',
    'app.error.requestTimeout': 'مهلت درخواست به پایان رسید. اتصال اینترنت را بررسی کنید.',
    'app.error.meetingNotFound': 'کلاس پیدا نشد.',
    'app.error.sessionTokenReplaced': 'نشست شما در دستگاه دیگری جایگزین شد.',
    'app.error.serverInternalError': 'خطای داخلی سرور رخ داد.',
    'app.error.paramMissing': 'اطلاعات ورود ناقص است.',
    'app.error.tooManyConnections': 'تعداد درخواست‌ها بیش از حد مجاز است.',
    'app.error.serverClosed': 'سرور اتصال را بست.',
    'app.error.guestDeniedAccess.title': 'ورود به کلاس ممکن نیست',
    'app.error.guestDeniedAccess.message': 'ورود مهمان به این کلاس بسته است. مدیر کلاس، سیاست پذیرش مهمان را روی «رد خودکار همه» تنظیم کرده است.',
    'app.error.guestDeniedAccess.hint': 'اگر فکر می‌کنید باید به این کلاس دسترسی داشته باشید، با برگزارکننده یا مدیر کلاس تماس بگیرید.',
    'app.error.guestDeniedAccess.action': 'متوجه شدم',
  },
  en: {
    'app.error.screen.title': 'Something went wrong',
    'app.error.screen.hint': 'If the problem persists, reload the page or open the join link again.',
    'app.error.screen.reloadButton': 'Reload page',
    'app.error.screen.unexpectedError': 'The app encountered an unexpected error.',
    'app.error.screen.missingSessionToken': 'The join link is invalid or the session token is missing.',
    'app.error.screen.settingsTimeout': 'Loading meeting settings took too long. Your connection or the server may be slow.',
    'app.error.screen.settingsFetchFailed': 'Meeting settings could not be loaded. The meeting may have ended or the server may be unavailable.',
    'app.error.screen.userSettingsTimeout': 'Loading user settings took too long.',
    'app.error.screen.userSettingsFetchFailed': 'User settings could not be loaded.',
    'app.error.screen.graphqlFetchFailed': 'Could not connect to the meeting server.',
    'app.error.screen.technicalDetail': 'Technical details',
    'app.error.400': 'Invalid request.',
    'app.error.401': 'Unauthorized access.',
    'app.error.403': 'You were removed from the meeting.',
    'app.error.404': 'The page or meeting was not found.',
    'app.error.408': 'The join request timed out.',
    'app.error.409': 'A request conflict occurred.',
    'app.error.410': 'This meeting has ended.',
    'app.error.500': 'A server error occurred.',
    'app.error.503': 'The service is temporarily unavailable.',
    'app.meeting.endedMessage': 'This meeting has ended.',
    'app.error.userLoggedOut': 'Your session expired or you were logged out.',
    'app.error.ejectedUser': 'You were removed from this meeting.',
    'app.error.userBanned': 'You are banned from this meeting.',
    'app.error.joinedAnotherWindow': 'This meeting is open in another tab or device.',
    'app.meeting.logout.userInactivityEjectReason': 'You were removed due to inactivity.',
    'app.meeting.logout.ejectedFromMeeting': 'You were removed from the meeting.',
    'app.meeting.logout.maxParticipantsReached': 'This meeting has reached its participant limit.',
    'app.guest.guestDeny': 'Your join request was denied.',
    'app.meeting.logout.duplicateUserEjectReason': 'Another user with the same name is joining.',
    'app.meeting.logout.permissionEjectReason': 'You were removed for a permission violation.',
    'app.error.disconnected.rejoin': 'Connection lost. Reload the page to rejoin.',
    'app.error.userNotFound': 'User not found.',
    'app.error.requestTimeout': 'The request timed out. Check your internet connection.',
    'app.error.meetingNotFound': 'Meeting not found.',
    'app.error.sessionTokenReplaced': 'Your session was replaced on another device.',
    'app.error.serverInternalError': 'An internal server error occurred.',
    'app.error.paramMissing': 'Required join information is missing.',
    'app.error.tooManyConnections': 'Too many requests were sent.',
    'app.error.serverClosed': 'The server closed the connection.',
    'app.error.guestDeniedAccess.title': 'You cannot join this meeting',
    'app.error.guestDeniedAccess.message': 'Guest access to this meeting is closed. The moderator has set the guest policy to always deny.',
    'app.error.guestDeniedAccess.hint': 'If you believe you should have access, contact the meeting organizer or moderator.',
    'app.error.guestDeniedAccess.action': 'Got it',
  },
};

const readLocaleCandidates = () => {
  const candidates = [];

  const push = (value) => {
    if (typeof value === 'string' && value.trim()) {
      candidates.push(value.trim().toLowerCase());
    }
  };

  push(document.documentElement.lang);
  push(document.documentElement.getAttribute('data-locale'));
  push(document.documentElement.getAttribute('dir') === 'rtl' ? 'fa' : null);

  try {
    const raw = window.localStorage.getItem('BBB_user_settings')
      || window.sessionStorage.getItem('BBB_user_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      push(parsed?.bbb_override_default_locale);
    }
  } catch {
    // ignore parse errors during bootstrap
  }

  push(navigator.language);

  return candidates;
};

export const isPersianLocale = () => {
  const candidates = readLocaleCandidates();
  return document.documentElement.getAttribute('data-skyroom') === 'true'
    || document.documentElement.getAttribute('dir') === 'rtl'
    || candidates.some((locale) => locale.startsWith('fa'));
};

const formatMessage = (id, defaultMessage) => {
  const intl = intlHolder.getIntl();
  if (intl) {
    return intl.formatMessage({ id, defaultMessage });
  }

  const locale = isPersianLocale() ? 'fa' : 'en';
  return BOOTSTRAP_MESSAGES[locale][id]
    || BOOTSTRAP_MESSAGES.en[id]
    || defaultMessage
    || id;
};

const translateSessionReason = (reasonKey) => {
  const messageId = SESSION_REASON_KEYS[reasonKey];
  if (!messageId) return null;
  return formatMessage(messageId, reasonKey);
};

const translateEndedReason = (endedReason) => {
  if (!endedReason || typeof endedReason !== 'string') return null;

  if (endedReason.startsWith('Error fetching GraphQL URL:')) {
    return formatMessage(
      'app.error.screen.graphqlFetchFailed',
      BOOTSTRAP_MESSAGES.en['app.error.screen.graphqlFetchFailed'],
    );
  }

  const messageId = ENDED_REASON_TO_KEY[endedReason];
  if (messageId) {
    return formatMessage(messageId, endedReason);
  }

  return endedReason;
};

const isUserFacingReason = (value) => {
  if (!value || typeof value !== 'string') return false;
  if (value in SESSION_REASON_KEYS) return true;
  if (value in ENDED_REASON_TO_KEY) return true;
  if (value.startsWith('Error fetching GraphQL URL:')) return true;
  return !/^(Error|TypeError|ReferenceError|ChunkLoadError)/.test(value);
};

const resolveJoinUrlErrorProfile = (errorKey) => {
  if (!errorKey || typeof errorKey !== 'string') return null;
  return JOIN_URL_ERROR_PROFILES[errorKey] ?? null;
};

export const resolveErrorScreenCopy = ({ error, endedReason }) => {
  const joinUrlErrorProfile = resolveJoinUrlErrorProfile(error?.cause);
  const sessionReasonKey = Session.getItem('errorMessageDescription');

  const sessionReason = translateSessionReason(sessionReasonKey);
  const endedReasonText = translateEndedReason(endedReason);
  const errorCause = error?.cause ? translateSessionReason(error.cause) : null;

  if (joinUrlErrorProfile) {
    return {
      title: formatMessage(
        joinUrlErrorProfile.titleKey,
        BOOTSTRAP_MESSAGES.en[joinUrlErrorProfile.titleKey],
      ),
      reason: formatMessage(
        joinUrlErrorProfile.reasonKey,
        BOOTSTRAP_MESSAGES.en[joinUrlErrorProfile.reasonKey],
      ),
      hint: formatMessage(
        joinUrlErrorProfile.hintKey,
        BOOTSTRAP_MESSAGES.en[joinUrlErrorProfile.hintKey],
      ),
      reloadLabel: formatMessage(
        joinUrlErrorProfile.actionKey,
        BOOTSTRAP_MESSAGES.en[joinUrlErrorProfile.actionKey],
      ),
      technicalDetailLabel: formatMessage(
        'app.error.screen.technicalDetail',
        BOOTSTRAP_MESSAGES.en['app.error.screen.technicalDetail'],
      ),
      technicalDetail: null,
      iconName: joinUrlErrorProfile.iconName,
      variant: joinUrlErrorProfile.variant,
      primaryAction: joinUrlErrorProfile.primaryAction,
      isRtl: isPersianLocale(),
    };
  }

  let reason = endedReasonText
    || sessionReason
    || errorCause
    || null;

  if (!reason && error?.message) {
    if (isUserFacingReason(error.message)) {
      reason = translateSessionReason(error.message) || error.message;
    } else {
      reason = formatMessage(
        'app.error.screen.unexpectedError',
        BOOTSTRAP_MESSAGES.en['app.error.screen.unexpectedError'],
      );
    }
  }

  if (!reason) {
    reason = formatMessage(
      'app.error.screen.unexpectedError',
      BOOTSTRAP_MESSAGES.en['app.error.screen.unexpectedError'],
    );
  }

  const technicalDetail = error?.message
    && !isUserFacingReason(error.message)
    && error.message !== reason
    ? error.message
    : null;

  return {
    title: formatMessage(
      'app.error.screen.title',
      BOOTSTRAP_MESSAGES.en['app.error.screen.title'],
    ),
    reason,
    hint: formatMessage(
      'app.error.screen.hint',
      BOOTSTRAP_MESSAGES.en['app.error.screen.hint'],
    ),
    reloadLabel: formatMessage(
      'app.error.screen.reloadButton',
      BOOTSTRAP_MESSAGES.en['app.error.screen.reloadButton'],
    ),
    technicalDetailLabel: formatMessage(
      'app.error.screen.technicalDetail',
      BOOTSTRAP_MESSAGES.en['app.error.screen.technicalDetail'],
    ),
    technicalDetail,
    iconName: 'alert',
    variant: 'error',
    primaryAction: 'reload',
    isRtl: isPersianLocale(),
  };
};

export default resolveErrorScreenCopy;

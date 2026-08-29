import { ServerStream } from '@browser-bunyan/server-stream';
import Auth from '/imports/ui/services/auth';

const FORBIDDEN_LOG_KEYS = new RegExp(
  '^(?:authToken|confname|externalUserId|fullName|logoutURL|mismatchedName|requesterToken|sdp|sessionToken|token)$',
  'i',
);
const SECRET_QUERY_PATTERN = /([?&](?:sessionToken|authToken|token|checksum|logoutURL)=)[^&#\s]*/gi;
const URL_PATTERN = /https?:\/\/[^\s)]+/gi;

const sanitizeLogValue = (value: unknown, depth = 0): unknown => {
  if (depth > 4 || value == null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') {
    return value
      .replace(SECRET_QUERY_PATTERN, '$1[redacted]')
      .replace(URL_PATTERN, '[redacted-url]')
      .slice(0, 8192);
  }
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeLogValue(item, depth + 1));
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
      (safe, [key, child]) => (FORBIDDEN_LOG_KEYS.test(key)
        ? safe
        : { ...safe, [key]: sanitizeLogValue(child, depth + 1) }),
      {},
    );
  }
  return String(value);
};

// Custom stream that logs to an end-point
export default class ServerLoggerStream extends ServerStream {
  private logTagString: string | null = null;

  private rec: Record<string, unknown> | null = null;

  constructor(params: {
    enabled: boolean;
    url?: string;
    method?: string;
    throttleInterval?: number;
    flushOnClose?: boolean;
    logTag?: string;
  }) {
    super(params);

    if (params.logTag) {
      this.logTagString = params.logTag;
    }
  }

  static getUserData() {
    const userInfo: Record<string, unknown> = {
      meetingId: Auth.meetingID,
      requesterUserId: Auth.userID,
      clientSessionUUID: sessionStorage.getItem('clientSessionUUID') || '0',
    };

    return {
      fullInfo: userInfo,
    };
  }

  write(rec: Record<string, unknown>) {
    const { fullInfo } = ServerLoggerStream.getUserData();

    this.rec = sanitizeLogValue(rec) as Record<string, unknown>;
    if (fullInfo.meetingId != null) {
      this.rec.userInfo = fullInfo;
    }
    this.rec.clientBuild = window.meetingClientSettings?.public?.app?.html5ClientBuild;
    if (this.logTagString) {
      this.rec.logTag = this.logTagString;
    }
    return super.write(this.rec);
  }
}

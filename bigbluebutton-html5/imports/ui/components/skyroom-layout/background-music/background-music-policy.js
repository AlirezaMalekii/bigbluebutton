/**
 * Pure helpers for uploaded background-music URLs.
 * Importable from Node tests (no DOM / Meteor types).
 */

export const BACKGROUND_MUSIC_TRACK_ID_RE = /^[a-f0-9]{40}-[0-9]+$/;
export const BACKGROUND_MUSIC_MEETING_ID_RE = /^[a-z0-9-]+$/;
const RELATIVE_STREAM_PATH_RE = /^\/bigbluebutton\/background-music\/([a-z0-9-]+)\/([a-f0-9]{40}-[0-9]+)$/;

export const isValidUploadTrackId = (trackId) => (
  typeof trackId === 'string' && BACKGROUND_MUSIC_TRACK_ID_RE.test(trackId)
);

export const isValidUploadMeetingId = (meetingId) => (
  typeof meetingId === 'string' && BACKGROUND_MUSIC_MEETING_ID_RE.test(meetingId)
);

export const isValidUploadPath = (path) => (
  typeof path === 'string' && RELATIVE_STREAM_PATH_RE.test(path)
);

export const buildBackgroundMusicStreamPath = (meetingId, trackId) => {
  if (!isValidUploadMeetingId(meetingId) || !isValidUploadTrackId(trackId)) return null;
  return `/bigbluebutton/background-music/${meetingId}/${trackId}`;
};

export const parseJsonObject = (value) => {
  if (value && typeof value === 'object') return value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const pathnameFromMaybeUrl = (path) => {
  if (typeof path !== 'string' || path.trim() === '') return '';
  const trimmed = path.trim();
  if (trimmed.startsWith('/')) return trimmed.split('?')[0];
  try {
    return new URL(trimmed).pathname;
  } catch {
    return trimmed.split('?')[0];
  }
};

export const resolveBackgroundMusicStreamPath = ({
  path,
  trackId,
  meetingId,
} = {}) => {
  const pathname = pathnameFromMaybeUrl(path);
  const fromPath = pathname.match(RELATIVE_STREAM_PATH_RE);
  if (fromPath) {
    return `/bigbluebutton/background-music/${fromPath[1]}/${fromPath[2]}`;
  }
  return buildBackgroundMusicStreamPath(meetingId, trackId);
};

export const BACKGROUND_MUSIC_TRACK_ID_RE: RegExp;
export const BACKGROUND_MUSIC_MEETING_ID_RE: RegExp;

export function isValidUploadTrackId(trackId: unknown): trackId is string;
export function isValidUploadMeetingId(meetingId: unknown): meetingId is string;
export function isValidUploadPath(path: unknown): path is string;
export function buildBackgroundMusicStreamPath(
  meetingId: unknown,
  trackId: unknown,
): string | null;
export function parseJsonObject(value: unknown): Record<string, unknown> | object | null;
export function resolveBackgroundMusicStreamPath(input?: {
  path?: unknown;
  trackId?: unknown;
  meetingId?: unknown;
}): string | null;

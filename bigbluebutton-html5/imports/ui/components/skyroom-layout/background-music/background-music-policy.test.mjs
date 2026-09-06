import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const loadProductionModule = async (relativePath) => {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  const moduleUrl = `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
  return import(moduleUrl);
};

const {
  isValidUploadPath,
  isValidUploadTrackId,
  resolveBackgroundMusicStreamPath,
  parseJsonObject,
} = await loadProductionModule('./background-music-policy.js');

const trackId = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-1710000000000';
const meetingId = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-1710000000001';
const relativePath = `/bigbluebutton/background-music/${meetingId}/${trackId}`;

assert.equal(isValidUploadTrackId(trackId), true);
assert.equal(isValidUploadPath(relativePath), true);
assert.equal(isValidUploadPath(`${relativePath}?sessionToken=abc`), false);

assert.equal(
  resolveBackgroundMusicStreamPath({ path: relativePath, trackId, meetingId }),
  relativePath,
  'relative upload paths stay meeting-scoped',
);

assert.equal(
  resolveBackgroundMusicStreamPath({
    path: `https://live51.roomeet.ir${relativePath}?sessionToken=uploader-token`,
    trackId,
    meetingId: 'other-meeting',
  }),
  relativePath,
  'absolute uploader URLs must drop host/query and keep the shared meeting path',
);

assert.equal(
  resolveBackgroundMusicStreamPath({
    path: '/broken',
    trackId,
    meetingId,
  }),
  relativePath,
  'other clients reconstruct the stream path from their own meeting id',
);

assert.equal(
  resolveBackgroundMusicStreamPath({
    path: '',
    trackId,
    meetingId: 'Not a meeting',
  }),
  null,
  'reject reconstructed paths that would not match nginx/bbb-web',
);

assert.deepEqual(
  parseJsonObject('{"type":"upload"}'),
  { type: 'upload' },
);

assert.equal(parseJsonObject('not-json'), null);

console.log('background-music-policy tests passed');

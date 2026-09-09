import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Load the real URL helpers with a browser/session fixture, without booting BBB.
const source = await readFile(new URL('./fileTypes.js', import.meta.url), 'utf8');
const fixture = `
  export const Auth = {
    meetingID: 'meeting-1',
    sessionToken: 'viewer-session',
    authenticateURL(url) { return url + '&sessionToken=' + this.sessionToken; },
  };
  const window = {
    location: { origin: 'https://viewer.example', pathname: '/html5client/' },
    meetingClientSettings: { public: { app: { bbbWebBase: '/bigbluebutton' } } },
  };
`;
const moduleSource = source.replace("import Auth from '/imports/ui/services/auth';", fixture);
const { Auth, getLocalPresentationMediaPlaybackUrl, getPresentationMediaKindFromUrl } = await import(
  `data:text/javascript;charset=utf-8,${encodeURIComponent(moduleSource)}`
);

for (const filename of ['sample.mp4', 'sample.mp3', 'صدای کلاس.wav']) {
  const shared = new URL('https://presenter.example/bigbluebutton/presentation/media/meeting-1/pres-1');
  shared.searchParams.set('filename', filename);
  shared.searchParams.set('sessionToken', 'presenter-session');
  const original = shared.toString();
  Auth.sessionToken = 'viewer-session';
  const viewer = new URL(getLocalPresentationMediaPlaybackUrl(original));
  assert.equal(viewer.origin, 'https://viewer.example');
  assert.equal(viewer.searchParams.get('sessionToken'), 'viewer-session');
  assert.equal(viewer.searchParams.getAll('sessionToken').length, 1);
  assert.equal(viewer.searchParams.get('filename'), filename);
  assert.equal(viewer.pathname, '/bigbluebutton/presentation/media/meeting-1/pres-1');
  assert.equal(getPresentationMediaKindFromUrl(viewer.toString()), filename.endsWith('.mp4') ? 'video' : 'audio');
  assert.equal(shared.toString(), original);

  Auth.sessionToken = 'reconnected-session';
  const reconnected = new URL(getLocalPresentationMediaPlaybackUrl(original));
  assert.equal(reconnected.searchParams.get('sessionToken'), 'reconnected-session');
}

for (const url of ['', 'https://example.com/movie.mp4', 'https://youtu.be/example']) {
  assert.equal(getLocalPresentationMediaPlaybackUrl(url), url);
}
const otherMeeting = 'https://example.com/bigbluebutton/presentation/media/meeting-2/pres-1?filename=sample.mp4';
assert.equal(getLocalPresentationMediaPlaybackUrl(otherMeeting), otherMeeting);
Auth.meetingID = undefined;
assert.equal(getLocalPresentationMediaPlaybackUrl(otherMeeting), otherMeeting);
console.log('Presentation media client URL regression checks passed');

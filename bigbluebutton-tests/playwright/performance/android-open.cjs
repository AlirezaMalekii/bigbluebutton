/* global Atomics, SharedArrayBuffer */
// Opens a fresh local-client session in Android Chrome without logging its token.
const { execFileSync } = require('node:child_process');
const { createHash, randomUUID } = require('node:crypto');
const path = require('node:path');

const adb = process.env.ADB || path.join(process.env.LOCALAPPDATA || '', 'Android/platform-tools/adb.exe');
const server = process.env.BBB_SERVER || 'https://live51.roomeet.ir';
const cdpEndpoint = process.env.ANDROID_CDP || 'http://127.0.0.1:9222';
const meetingID = process.env.PERF_MEETING_ID;
const role = process.env.ANDROID_ROLE || 'VIEWER';
if (!meetingID) throw new Error('PERF_MEETING_ID is required');

const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function readRemoteSecret() {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const output = execFileSync(
        'ssh',
        ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', 'live51', 'sudo bbb-conf --secret'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      const value = output.match(/Secret:\s*(\S+)/)?.[1];
      if (value) return value;
    } catch {
      /* Retry a temporary SSH failure without logging credentials. */
    }
    if (attempt < 8) sleepSync(2500);
  }
  throw new Error('BBB secret unavailable after SSH retries');
}

const secret = readRemoteSecret();
async function closePreviousTestTabs() {
  try {
    const response = await fetch(`${cdpEndpoint}/json/list`, { signal: AbortSignal.timeout(5000) });
    const targets = await response.json();
    const meetingTabs = targets.filter(
      (target) =>
        target.type === 'page' &&
        String(target.url).includes('/html5client/') &&
        String(target.url).includes('safemeetAndroidTest=1'),
    );
    await Promise.allSettled(
      meetingTabs.map((target) =>
        fetch(`${cdpEndpoint}/json/close/${encodeURIComponent(target.id)}`, { signal: AbortSignal.timeout(5000) }),
      ),
    );
  } catch {
    // Tab cleanup is best effort; ADB can still open the requested test session.
  }
}

async function api(name, parameters) {
  const query = new URLSearchParams(parameters).toString();
  const checksum = createHash('sha1')
    .update(name + query + secret)
    .digest('hex');
  const response = await fetch(`${server}/bigbluebutton/api/${name}?${query}&checksum=${checksum}`, {
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.text();
  if (!response.ok || !body.includes('<returncode>SUCCESS</returncode>')) {
    throw new Error(`${name} failed`);
  }
  return body;
}

(async () => {
  await closePreviousTestTabs();
  try {
    await api('getMeetingInfo', { meetingID });
  } catch {
    await api('create', {
      meetingID,
      name: 'SafeMeet Android device test',
      record: 'false',
    });
  }
  const response = await api('join', {
    meetingID,
    fullName: `Android-${role}`,
    userID: `android-${randomUUID()}`,
    role,
    redirect: 'false',
    'userdata-bbb_show_session_details_on_join': 'false',
    'userdata-bbb_skip_check_audio': 'true',
  });
  const token = response.match(/<session_token>([^<]+)<\/session_token>/)?.[1];
  if (!token) throw new Error('Join token missing');
  execFileSync(
    adb,
    [
      'shell',
      'am',
      'start',
      '-n',
      'com.android.chrome/com.google.android.apps.chrome.Main',
      '-a',
      'android.intent.action.VIEW',
      '-d',
      `http://localhost:3000/html5client/?sessionToken=${token}#safemeetAndroidTest=1`,
    ],
    { stdio: 'ignore' },
  );
  console.log('Android Chrome meeting tab opened');
  process.exit(0);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

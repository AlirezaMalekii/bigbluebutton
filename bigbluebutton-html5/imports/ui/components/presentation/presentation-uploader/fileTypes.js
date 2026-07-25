import Auth from '/imports/ui/services/auth';

const MEDIA_EXTENSIONS = new Set([
  '.mp4', '.mov', '.webm',
  '.mp3', '.m4a', '.aac', '.ogg', '.wav',
]);
const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.ogg', '.wav']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif']);

const EXTENSION_CANONICAL_MIME = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/mp4',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
};

const toAsciiDigits = (value) => value.replace(/[۰-۹٠-٩]/g, (digit) => {
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
  const persianIndex = persian.indexOf(digit);
  if (persianIndex >= 0) return String(persianIndex);
  const arabicIndex = arabicIndic.indexOf(digit);
  if (arabicIndex >= 0) return String(arabicIndex);
  return digit;
});

const normalizeExtension = (filename) => {
  if (!filename || typeof filename !== 'string') return '';
  const parts = toAsciiDigits(filename).split('.');
  if (parts.length < 2) return '';
  return `.${parts.pop().toLowerCase()}`;
};

const getExtensionKey = (filename) => normalizeExtension(filename).replace('.', '');

export const isMediaExtension = (filename) => MEDIA_EXTENSIONS.has(normalizeExtension(filename));

export const isImageExtension = (filename) => IMAGE_EXTENSIONS.has(normalizeExtension(filename));

const getMediaExtensionFromName = (presentationName) => {
  const fromName = normalizeExtension(presentationName).replace('.', '');
  if (fromName) return fromName;
  return 'mp4';
};

export const buildAbsoluteBbbUrl = (relativePath) => {
  if (!relativePath) return null;
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  const pathMatch = window.location.pathname.match('^(.*)/html5client/?$');
  const serverPathPrefix = pathMatch ? pathMatch[1] : '';
  const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return new URL(normalizedPath, `${window.location.origin}${serverPathPrefix}`).toString();
};

const buildMediaUrl = (presentationId, presentationName, endpoint) => {
  if (!presentationId || !Auth.meetingID) return null;
  const { bbbWebBase } = window.meetingClientSettings.public.app;
  const ext = getMediaExtensionFromName(presentationName);
  const presFilename = `${presentationId}.${ext}`;
  const filename = presentationName || presFilename;
  const params = new URLSearchParams({
    presFilename,
    filename,
  });
  const relativeUrl = `${bbbWebBase}/presentation/${endpoint}/${Auth.meetingID}/${presentationId}?${params.toString()}`;
  return buildAbsoluteBbbUrl(relativeUrl);
};

export const getPresentationMediaPlaybackUrl = (presentationId, presentationName) => (
  buildMediaUrl(presentationId, presentationName, 'media')
);

export const getPresentationMediaDownloadUrl = (presentationId, presentationName) => (
  buildMediaUrl(presentationId, presentationName, 'download')
);

export const isPresentationMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return /\/presentation\/(media|download)\//.test(url);
};

export const getPresentationMediaKindFromUrl = (url) => {
  try {
    const parsed = new URL(url, window.location.origin);
    // Prefer the original upload name; fall back to stored presFilename.
    // Authenticated playback URLs put the extension in query params (not the path),
    // so react-player cannot detect audio from the path alone.
    const candidates = [
      parsed.searchParams.get('filename'),
      parsed.searchParams.get('presFilename'),
    ].filter(Boolean);

    for (let i = 0; i < candidates.length; i += 1) {
      const ext = normalizeExtension(candidates[i]);
      if (AUDIO_EXTENSIONS.has(ext)) return 'audio';
      if (MEDIA_EXTENSIONS.has(ext)) return 'video';
    }
    return 'video';
  } catch {
    return 'video';
  }
};

export const getAuthenticatedPresentationMediaPlaybackUrl = (presentationId, presentationName) => {
  const playbackUrl = getPresentationMediaPlaybackUrl(presentationId, presentationName);
  if (!playbackUrl) return null;
  return Auth.authenticateURL(playbackUrl);
};

export const getAuthenticatedPresentationMediaDownloadUrl = (presentationId, presentationName) => {
  const downloadUrl = getPresentationMediaDownloadUrl(presentationId, presentationName);
  if (!downloadUrl) return null;
  return Auth.authenticateURL(downloadUrl);
};

export const parsePresentationMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsed = new URL(url, window.location.origin);
    const match = parsed.pathname.match(/\/presentation\/(media|download)\/([^/]+)\/([^/?]+)/);
    if (!match) return null;

    const [, endpoint, meetingId, presentationId] = match;
    const presFilename = parsed.searchParams.get('presFilename') || '';
    const filename = parsed.searchParams.get('filename') || presFilename || `${presentationId}.mp4`;

    return {
      endpoint,
      meetingId,
      presentationId,
      presFilename,
      filename,
    };
  } catch {
    return null;
  }
};

export const getPresentationMediaDisplayName = (url) => {
  const parsed = parsePresentationMediaUrl(url);
  if (!parsed?.filename) return '';
  try {
    return decodeURIComponent(parsed.filename);
  } catch {
    return parsed.filename;
  }
};

export const getAuthenticatedPresentationMediaDownloadUrlFromPlaybackUrl = (playbackUrl) => {
  const parsed = parsePresentationMediaUrl(playbackUrl);
  if (!parsed?.presentationId) return null;
  return getAuthenticatedPresentationMediaDownloadUrl(parsed.presentationId, parsed.filename);
};

export const buildAcceptList = (fileValidMimeTypes = []) => {
  const extensions = fileValidMimeTypes.map((entry) => entry.extension);
  const mimes = fileValidMimeTypes.map((entry) => entry.mime);
  return [...extensions, ...mimes].filter(Boolean).join(',');
};

const isKnownMediaMimeForExtension = (extensionKey, mimeType) => {
  if (!extensionKey || !mimeType) return false;

  const normalizedMime = mimeType.toLowerCase().split(';')[0].trim();
  const aliases = {
    mp4: [
      'video/mp4', 'video/quicktime', 'video/x-m4v', 'video/3gpp', 'video/3gpp2',
      'application/mp4', 'audio/mp4',
    ],
    mov: [
      'video/quicktime', 'video/mp4', 'video/x-m4v', 'video/3gpp', 'video/3gpp2',
    ],
    webm: ['video/webm', 'audio/webm'],
    mp3: ['audio/mpeg', 'audio/mp3', 'audio/x-mpeg-3', 'audio/x-mpeg'],
    m4a: [
      'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'video/mp4', 'video/quicktime',
      'video/3gpp', 'video/3gpp2', 'application/mp4',
    ],
    aac: [
      'audio/mp4', 'audio/aac', 'audio/x-aac', 'video/mp4',
      'video/3gpp', 'video/3gpp2', 'application/mp4',
    ],
    ogg: ['audio/ogg', 'video/ogg', 'application/ogg'],
    wav: ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'],
  };

  return (aliases[extensionKey] || []).includes(normalizedMime);
};

export const normalizeUploadFile = (file) => {
  if (!file) return file;

  const extensionKey = getExtensionKey(file.name);
  const canonicalMime = EXTENSION_CANONICAL_MIME[extensionKey];
  if (!canonicalMime) return file;

  const browserMime = (file.type || '').toLowerCase().split(';')[0].trim();

  if (extensionKey === 'mp4' && (
    !browserMime
    || browserMime === 'application/octet-stream'
    || browserMime === 'application/mp4'
    || browserMime === 'video/quicktime'
    || browserMime === 'video/x-m4v'
    || browserMime === 'video/3gpp'
    || browserMime === 'video/3gpp2'
    || browserMime.startsWith('video/')
    || browserMime.startsWith('audio/')
  )) {
    return new File([file], file.name, {
      type: 'video/mp4',
      lastModified: file.lastModified,
    });
  }

  if (extensionKey === 'mov' && (
    !browserMime
    || browserMime === 'application/octet-stream'
    || browserMime === 'application/mp4'
    || browserMime === 'video/mp4'
    || browserMime === 'video/x-m4v'
    || browserMime === 'video/3gpp'
    || browserMime === 'video/3gpp2'
    || browserMime.startsWith('video/')
  )) {
    return new File([file], file.name, {
      type: 'video/quicktime',
      lastModified: file.lastModified,
    });
  }

  if ((extensionKey === 'm4a' || extensionKey === 'aac') && (
    !browserMime
    || browserMime === 'application/octet-stream'
    || browserMime.startsWith('video/')
    || browserMime === 'audio/x-m4a'
    || browserMime === 'audio/m4a'
    || browserMime === 'audio/aac'
    || browserMime === 'audio/x-aac'
  )) {
    return new File([file], file.name, {
      type: 'audio/mp4',
      lastModified: file.lastModified,
    });
  }

  const shouldNormalize = !browserMime
    || browserMime === 'application/octet-stream'
    || browserMime === canonicalMime
    || isKnownMediaMimeForExtension(extensionKey, browserMime);

  if (!shouldNormalize) return file;
  if (browserMime === canonicalMime) return file;

  return new File([file], file.name, {
    type: canonicalMime,
    lastModified: file.lastModified,
  });
};

export const isFileAccepted = (file, fileValidMimeTypes = []) => {
  if (!file) return false;

  const extension = normalizeExtension(file.name);
  const extensionKey = extension.replace('.', '');
  const validMimes = fileValidMimeTypes.map((entry) => entry.mime);
  const validExtensions = fileValidMimeTypes.map((entry) => entry.extension.toLowerCase());
  const browserMime = (file.type || '').toLowerCase().split(';')[0].trim();

  if (validExtensions.includes(extension)) return true;
  if (validMimes.includes(browserMime)) return true;
  if (MEDIA_EXTENSIONS.has(extension) && isKnownMediaMimeForExtension(extensionKey, browserMime)) {
    return true;
  }
  if (MEDIA_EXTENSIONS.has(extension) && (
    !browserMime || browserMime === 'application/octet-stream'
  )) {
    return true;
  }

  return false;
};

export default {
  isMediaExtension,
  isImageExtension,
  getPresentationMediaPlaybackUrl,
  getPresentationMediaDownloadUrl,
  getAuthenticatedPresentationMediaPlaybackUrl,
  getAuthenticatedPresentationMediaDownloadUrl,
  getAuthenticatedPresentationMediaDownloadUrlFromPlaybackUrl,
  getPresentationMediaDisplayName,
  parsePresentationMediaUrl,
  isPresentationMediaUrl,
  getPresentationMediaKindFromUrl,
  buildAcceptList,
  isFileAccepted,
  normalizeUploadFile,
  buildAbsoluteBbbUrl,
};

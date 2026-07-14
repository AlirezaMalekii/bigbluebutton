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

const normalizeExtension = (filename) => {
  if (!filename || typeof filename !== 'string') return '';
  const parts = filename.split('.');
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
    const name = parsed.searchParams.get('presFilename')
      || parsed.searchParams.get('filename')
      || '';
    const ext = normalizeExtension(name);
    if (AUDIO_EXTENSIONS.has(ext)) return 'audio';
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

export const buildAcceptList = (fileValidMimeTypes = []) => {
  const extensions = fileValidMimeTypes.map((entry) => entry.extension);
  const mimes = fileValidMimeTypes.map((entry) => entry.mime);
  return [...extensions, ...mimes].filter(Boolean).join(',');
};

const isKnownMediaMimeForExtension = (extensionKey, mimeType) => {
  if (!extensionKey || !mimeType) return false;

  const normalizedMime = mimeType.toLowerCase().split(';')[0].trim();
  const aliases = {
    mp4: ['video/mp4', 'video/quicktime', 'video/x-m4v', 'audio/mp4'],
    mov: ['video/quicktime', 'video/mp4', 'video/x-m4v'],
    webm: ['video/webm', 'audio/webm'],
    mp3: ['audio/mpeg', 'audio/mp3', 'audio/x-mpeg-3', 'audio/x-mpeg'],
    m4a: ['audio/mp4', 'audio/x-m4a', 'audio/m4a', 'video/mp4', 'video/quicktime'],
    aac: ['audio/mp4', 'audio/aac', 'audio/x-aac', 'video/mp4'],
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
  const shouldNormalize = !browserMime
    || browserMime === 'application/octet-stream'
    || browserMime === canonicalMime
    || isKnownMediaMimeForExtension(extensionKey, browserMime);

  if (!shouldNormalize) return file;
  if (browserMime === canonicalMime) return file;

  if (extensionKey === 'mp4' && browserMime === 'video/quicktime') {
    return new File([file], file.name, {
      type: 'video/mp4',
      lastModified: file.lastModified,
    });
  }

  if ((extensionKey === 'm4a' || extensionKey === 'aac') && browserMime.startsWith('video/')) {
    return new File([file], file.name, {
      type: 'audio/mp4',
      lastModified: file.lastModified,
    });
  }

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
  isPresentationMediaUrl,
  getPresentationMediaKindFromUrl,
  buildAcceptList,
  isFileAccepted,
  normalizeUploadFile,
  buildAbsoluteBbbUrl,
};

import Auth from '/imports/ui/services/auth';

const MEDIA_EXTENSIONS = new Set(['.mp4', '.webm', '.mp3', '.ogg', '.wav', '.m4a']);
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif']);

const normalizeExtension = (filename) => {
  if (!filename || typeof filename !== 'string') return '';
  const parts = filename.split('.');
  if (parts.length < 2) return '';
  return `.${parts.pop().toLowerCase()}`;
};

export const isMediaExtension = (filename) => MEDIA_EXTENSIONS.has(normalizeExtension(filename));

export const isImageExtension = (filename) => IMAGE_EXTENSIONS.has(normalizeExtension(filename));

export const getPresentationMediaPlaybackUrl = (presentationId) => {
  if (!presentationId || !Auth.meetingID) return null;
  const { bbbWebBase } = window.meetingClientSettings.public.app;
  return `${bbbWebBase}/presentation/download/${Auth.meetingID}/${presentationId}`;
};

export const buildAcceptList = (fileValidMimeTypes = []) => {
  const extensions = fileValidMimeTypes.map((entry) => entry.extension);
  const mimes = fileValidMimeTypes.map((entry) => entry.mime);
  return [...extensions, ...mimes].filter(Boolean).join(',');
};

export const isFileAccepted = (file, fileValidMimeTypes = []) => {
  if (!file) return false;
  const extension = normalizeExtension(file.name);
  const validMimes = fileValidMimeTypes.map((entry) => entry.mime);
  const validExtensions = fileValidMimeTypes.map((entry) => entry.extension.toLowerCase());
  return validMimes.includes(file.type)
    || validExtensions.includes(extension);
};

export default {
  isMediaExtension,
  isImageExtension,
  getPresentationMediaPlaybackUrl,
  buildAcceptList,
  isFileAccepted,
};

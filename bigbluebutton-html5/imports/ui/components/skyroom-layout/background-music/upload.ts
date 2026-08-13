import Auth from '/imports/ui/services/auth';
import { buildAbsoluteBbbUrl } from '/imports/ui/components/presentation/presentation-uploader/fileTypes';
import { BackgroundMusicSource } from './state';

export const BACKGROUND_MUSIC_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

type UploadResponse = {
  trackId?: string;
  path?: string;
  name?: string;
  code?: string;
};

export class BackgroundMusicUploadError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export const validateBackgroundMusicUpload = (file: File): void => {
  if (!/\.mp3$/i.test(file.name)) {
    throw new BackgroundMusicUploadError('invalid-format');
  }
  if (file.size <= 0) {
    throw new BackgroundMusicUploadError('empty-file');
  }
  if (file.size > BACKGROUND_MUSIC_MAX_UPLOAD_BYTES) {
    throw new BackgroundMusicUploadError('file-too-large');
  }
};

export const uploadBackgroundMusic = (
  file: File,
  onProgress: (progress: number) => void,
): Promise<BackgroundMusicSource> => {
  validateBackgroundMusicUpload(file);

  const { bbbWebBase } = window.meetingClientSettings.public.app;
  const endpoint = buildAbsoluteBbbUrl(`${bbbWebBase}/background-music/upload`);
  if (!endpoint) return Promise.reject(new BackgroundMusicUploadError('upload-failed'));

  const authenticatedEndpoint = Auth.authenticateURL(endpoint);
  const formData = new FormData();
  formData.append('fileUpload', file, file.name);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', authenticatedEndpoint, true);
    xhr.responseType = 'json';
    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    });
    xhr.addEventListener('load', () => {
      const response = (xhr.response || {}) as UploadResponse;
      if (
        xhr.status >= 200
        && xhr.status < 300
        && typeof response.trackId === 'string'
        && typeof response.path === 'string'
      ) {
        onProgress(100);
        resolve({
          type: 'upload',
          trackId: response.trackId,
          path: response.path,
          name: response.name || file.name,
        });
        return;
      }
      reject(new BackgroundMusicUploadError(response.code || `http-${xhr.status}`));
    });
    xhr.addEventListener('error', () => {
      reject(new BackgroundMusicUploadError('network-error'));
    });
    xhr.addEventListener('abort', () => {
      reject(new BackgroundMusicUploadError('upload-cancelled'));
    });
    xhr.send(formData);
  });
};

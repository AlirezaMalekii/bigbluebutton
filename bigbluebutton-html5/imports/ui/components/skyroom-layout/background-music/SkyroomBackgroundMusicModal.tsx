import React, {
  ChangeEvent, useEffect, useMemo, useRef, useState,
} from 'react';
import { defineMessages, MessageDescriptor, useIntl } from 'react-intl';
import ModalSimple from '/imports/ui/components/common/modal/simple/component';
import Toggle from '/imports/ui/components/common/switch/component';
import Icon from '/imports/ui/components/common/icon/icon-ts/component';
import { useModalRegistration } from '/imports/ui/core/singletons/modalController';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import { isSkyroomTheme } from '../panel-toggles';
import { BACKGROUND_MUSIC_TRACKS, getBackgroundMusicCatalogTrack } from './catalog';
import {
  BackgroundMusicUploadError,
  uploadBackgroundMusic,
} from './upload';
import {
  publishSkyroomBackgroundMusicCommand,
  retrySkyroomBackgroundMusicPlayback,
  SKYROOM_BACKGROUND_MUSIC_OPEN_EVENT,
  useSkyroomBackgroundMusicPlaybackIssue,
  useSkyroomBackgroundMusicState,
} from './state';

const intlMessages = defineMessages({
  title: { id: 'app.skyroom.backgroundMusic.title', description: 'Background music panel title' },
  subtitle: { id: 'app.skyroom.backgroundMusic.subtitle', description: 'Background music helper text' },
  defaultTracks: { id: 'app.skyroom.backgroundMusic.defaultTracks', description: 'Default tracks section' },
  personalTrack: { id: 'app.skyroom.backgroundMusic.personalTrack', description: 'Personal uploaded track label' },
  addPersonal: { id: 'app.skyroom.backgroundMusic.addPersonal', description: 'Upload personal music button' },
  uploadHint: { id: 'app.skyroom.backgroundMusic.uploadHint', description: 'Personal music constraints' },
  uploading: { id: 'app.skyroom.backgroundMusic.uploading', description: 'Music upload progress' },
  volume: { id: 'app.skyroom.backgroundMusic.volume', description: 'Music volume control label' },
  loop: { id: 'app.skyroom.backgroundMusic.loop', description: 'Loop music control label' },
  play: { id: 'app.skyroom.backgroundMusic.play', description: 'Play background music' },
  pause: { id: 'app.skyroom.backgroundMusic.pause', description: 'Pause background music' },
  stop: { id: 'app.skyroom.backgroundMusic.stop', description: 'Stop background music' },
  playing: { id: 'app.skyroom.backgroundMusic.status.playing', description: 'Music playing state' },
  paused: { id: 'app.skyroom.backgroundMusic.status.paused', description: 'Music paused state' },
  stopped: { id: 'app.skyroom.backgroundMusic.status.stopped', description: 'Music stopped state' },
  autoplayBlocked: { id: 'app.skyroom.backgroundMusic.autoplayBlocked', description: 'Browser blocked remote audio playback' },
  loadFailed: { id: 'app.skyroom.backgroundMusic.loadFailed', description: 'Music load failed' },
  retryPlayback: { id: 'app.skyroom.backgroundMusic.retryPlayback', description: 'Retry music playback' },
  uploadInvalidFormat: { id: 'app.skyroom.backgroundMusic.upload.invalidFormat', description: 'Invalid music format' },
  uploadEmpty: { id: 'app.skyroom.backgroundMusic.upload.empty', description: 'Empty music file' },
  uploadTooLarge: { id: 'app.skyroom.backgroundMusic.upload.tooLarge', description: 'Music file too large' },
  uploadForbidden: { id: 'app.skyroom.backgroundMusic.upload.forbidden', description: 'Music upload permission error' },
  uploadNetwork: { id: 'app.skyroom.backgroundMusic.upload.network', description: 'Music upload network error' },
  uploadFailed: { id: 'app.skyroom.backgroundMusic.upload.failed', description: 'Music upload generic error' },
});

const uploadErrorMessage = (code: string): MessageDescriptor => {
  switch (code) {
    case 'invalid-format':
    case 'invalid-mime':
    case 'http-415':
      return intlMessages.uploadInvalidFormat;
    case 'empty-file':
      return intlMessages.uploadEmpty;
    case 'file-too-large':
    case 'http-413':
      return intlMessages.uploadTooLarge;
    case 'unauthorized':
    case 'forbidden':
    case 'http-401':
    case 'http-403':
      return intlMessages.uploadForbidden;
    case 'network-error':
      return intlMessages.uploadNetwork;
    default:
      return intlMessages.uploadFailed;
  }
};

const PlayPauseGlyph = ({ playing }: { playing: boolean }) => (
  playing ? (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 5v14l11-7z" fill="currentColor" />
    </svg>
  )
);

const SkyroomBackgroundMusicModal: React.FC = () => {
  const intl = useIntl();
  const [state] = useSkyroomBackgroundMusicState();
  const [playbackIssue] = useSkyroomBackgroundMusicPlaybackIssue();
  const { data: currentUser } = useCurrentUser((user) => ({
    isModerator: user.isModerator,
    presenter: user.presenter,
  }));
  const canControl = Boolean(currentUser?.isModerator || currentUser?.presenter);
  const {
    isOpen, open, close, id,
  } = useModalRegistration({ id: 'skyroomBackgroundMusicModal', priority: 'low' });
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<MessageDescriptor | null>(null);

  useEffect(() => {
    const handleOpen = () => {
      if (canControl && isSkyroomTheme()) open();
    };
    window.addEventListener(SKYROOM_BACKGROUND_MUSIC_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(SKYROOM_BACKGROUND_MUSIC_OPEN_EVENT, handleOpen);
  }, [canControl, open]);

  useEffect(() => {
    if (isOpen && !canControl) close();
  }, [canControl, close, isOpen]);

  const selectedTrackName = useMemo(() => {
    if (!state.source) return '';
    if (state.source.type === 'upload') return state.source.name;
    const track = getBackgroundMusicCatalogTrack(state.source.trackId);
    return track ? intl.formatMessage({ id: track.labelId }) : '';
  }, [intl, state.source]);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;

    setUploadError(null);
    setUploadProgress(0);
    try {
      const source = await uploadBackgroundMusic(file, setUploadProgress);
      await publishSkyroomBackgroundMusicCommand({ type: 'select', source });
      setUploadProgress(null);
    } catch (error) {
      const code = error instanceof BackgroundMusicUploadError ? error.code : 'upload-failed';
      setUploadError(uploadErrorMessage(code));
      setUploadProgress(null);
    }
  };

  if (!isOpen || !canControl || !isSkyroomTheme()) return null;

  const isPlaying = state.status === 'playing';
  let statusMessage = intlMessages.stopped;
  if (state.status === 'playing') statusMessage = intlMessages.playing;
  if (state.status === 'paused') statusMessage = intlMessages.paused;

  return (
    <ModalSimple
      id={id}
      modalIsOpen={isOpen}
      className="skyroom-background-music-modal"
      data-test="skyroomBackgroundMusicModal"
      headerPosition="top"
      onRequestClose={close}
      title={intl.formatMessage(intlMessages.title)}
    >
      <div className="skyroom-background-music" dir="auto">
        <p className="skyroom-background-music__subtitle">
          {intl.formatMessage(intlMessages.subtitle)}
        </p>

        <section className="skyroom-background-music__section" aria-labelledby="background-music-tracks-title">
          <h3 id="background-music-tracks-title">
            {intl.formatMessage(intlMessages.defaultTracks)}
          </h3>
          <div className="skyroom-background-music__tracks" data-test="skyroomBackgroundMusicTracks">
            {BACKGROUND_MUSIC_TRACKS.map((track) => {
              const selected = state.source?.type === 'default'
                && state.source.trackId === track.id;
              return (
                <button
                  key={track.id}
                  type="button"
                  className="skyroom-background-music__track"
                  data-selected={selected ? 'true' : 'false'}
                  aria-pressed={selected}
                  onClick={() => publishSkyroomBackgroundMusicCommand({
                    type: 'select',
                    source: { type: 'default', trackId: track.id },
                  })}
                  data-test={`skyroomBackgroundMusicTrack-${track.id}`}
                >
                  <span className="skyroom-background-music__track-icon" aria-hidden="true">
                    <Icon iconName="audio_on" />
                  </span>
                  <span>{intl.formatMessage({ id: track.labelId })}</span>
                  <span className="skyroom-background-music__track-check" aria-hidden="true">
                    {selected ? <Icon iconName="check" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {state.source?.type === 'upload' ? (
          <div className="skyroom-background-music__personal" data-test="skyroomBackgroundMusicPersonalTrack">
            <span className="skyroom-background-music__personal-label">
              {intl.formatMessage(intlMessages.personalTrack)}
            </span>
            <span className="skyroom-background-music__personal-name" dir="auto" title={state.source.name}>
              {state.source.name}
            </span>
          </div>
        ) : null}

        <div className="skyroom-background-music__upload">
          <input
            ref={inputRef}
            className="skyroom-background-music__file-input"
            type="file"
            accept=".mp3,audio/mpeg"
            onChange={handleUpload}
            data-test="skyroomBackgroundMusicFileInput"
          />
          <button
            type="button"
            className="skyroom-background-music__upload-button"
            onClick={() => inputRef.current?.click()}
            disabled={uploadProgress !== null}
            data-test="skyroomBackgroundMusicUpload"
          >
            <Icon iconName="upload" />
            <span>{intl.formatMessage(intlMessages.addPersonal)}</span>
          </button>
          <span className="skyroom-background-music__upload-hint">
            {uploadProgress === null
              ? intl.formatMessage(intlMessages.uploadHint)
              : intl.formatMessage(intlMessages.uploading, { progress: uploadProgress })}
          </span>
          {uploadProgress !== null ? (
            <span className="skyroom-background-music__upload-progress" aria-hidden="true">
              <span style={{ width: `${uploadProgress}%` }} />
            </span>
          ) : null}
          {uploadError ? (
            <span className="skyroom-background-music__error" role="alert">
              {intl.formatMessage(uploadError)}
            </span>
          ) : null}
        </div>

        <div className="skyroom-background-music__settings">
          <label className="skyroom-background-music__volume" htmlFor="skyroom-background-music-volume">
            <span>
              {intl.formatMessage(intlMessages.volume)}
              <strong>
                {Math.round(state.volume * 100)}
                ٪
              </strong>
            </span>
            <input
              id="skyroom-background-music-volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={state.volume}
              onChange={(event) => publishSkyroomBackgroundMusicCommand({
                type: 'volume',
                volume: Number(event.target.value),
              })}
              aria-label={intl.formatMessage(intlMessages.volume)}
              data-test="skyroomBackgroundMusicVolume"
            />
          </label>
          <div className="skyroom-background-music__loop">
            <span>{intl.formatMessage(intlMessages.loop)}</span>
            <Toggle
              // @ts-ignore - JS component wrapped by intl does not expose its real props
              icons={false}
              checked={state.loop}
              onChange={() => {
                publishSkyroomBackgroundMusicCommand({
                  type: 'loop',
                  loop: !state.loop,
                });
              }}
              ariaLabel={intl.formatMessage(intlMessages.loop)}
              showToggleLabel={false}
              data-test="skyroomBackgroundMusicLoop"
            />
          </div>
        </div>

        {playbackIssue ? (
          <div className="skyroom-background-music__playback-error" role="alert">
            <span>
              {intl.formatMessage(
                playbackIssue === 'autoplay'
                  ? intlMessages.autoplayBlocked
                  : intlMessages.loadFailed,
              )}
            </span>
            <button type="button" onClick={retrySkyroomBackgroundMusicPlayback}>
              {intl.formatMessage(intlMessages.retryPlayback)}
            </button>
          </div>
        ) : null}

        <div className="skyroom-background-music__now" aria-live="polite">
          <span className="skyroom-background-music__now-track" dir="auto">
            {selectedTrackName || '—'}
          </span>
          <span className="skyroom-background-music__now-status">
            {intl.formatMessage(statusMessage)}
          </span>
        </div>

        <div className="skyroom-background-music__controls">
          <button
            type="button"
            className="skyroom-background-music__stop"
            onClick={() => publishSkyroomBackgroundMusicCommand({ type: 'stop' })}
            disabled={!state.source || state.status === 'stopped'}
            aria-label={intl.formatMessage(intlMessages.stop)}
            data-test="skyroomBackgroundMusicStop"
          >
            <span aria-hidden="true" />
            <span>{intl.formatMessage(intlMessages.stop)}</span>
          </button>
          <button
            type="button"
            className="skyroom-background-music__play"
            onClick={() => publishSkyroomBackgroundMusicCommand({
              type: isPlaying ? 'pause' : 'play',
            })}
            disabled={!state.source}
            aria-label={intl.formatMessage(isPlaying ? intlMessages.pause : intlMessages.play)}
            data-test="skyroomBackgroundMusicPlayPause"
          >
            <PlayPauseGlyph playing={isPlaying} />
            <span>{intl.formatMessage(isPlaying ? intlMessages.pause : intlMessages.play)}</span>
          </button>
        </div>
      </div>
    </ModalSimple>
  );
};

export default SkyroomBackgroundMusicModal;

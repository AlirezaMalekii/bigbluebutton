import React, {
  useCallback, useEffect, useMemo, useRef,
} from 'react';
import Auth from '/imports/ui/services/auth';
import useTimeSync from '/imports/ui/core/local-states/useTimeSync';
import logger from '/imports/startup/client/logger';
import { buildAbsoluteBbbUrl } from '/imports/ui/components/presentation/presentation-uploader/fileTypes';
import { getBackgroundMusicAssetUrl } from './catalog';
import {
  getExpectedBackgroundMusicPosition,
  publishSkyroomBackgroundMusicCommand,
  setSkyroomBackgroundMusicPlaybackIssue,
  setSkyroomBackgroundMusicPlaybackRetry,
  useSkyroomBackgroundMusicState,
} from './state';

const SEEK_TOLERANCE_SECONDS = 0.75;

const SkyroomBackgroundMusicPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state] = useSkyroomBackgroundMusicState();
  const [timeSync] = useTimeSync();

  const sourceUrl = useMemo(() => {
    if (!state.source) return null;
    if (state.source.type === 'default') {
      return getBackgroundMusicAssetUrl(state.source.trackId);
    }
    const absoluteUrl = buildAbsoluteBbbUrl(state.source.path);
    return absoluteUrl ? Auth.authenticateURL(absoluteUrl) : null;
  }, [state.source]);

  const expectedPosition = useCallback((audio: HTMLAudioElement): number => {
    const now = Date.now() + (timeSync || 0);
    const position = getExpectedBackgroundMusicPosition(state, now);
    if (state.loop && Number.isFinite(audio.duration) && audio.duration > 0) {
      return position % audio.duration;
    }
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      return Math.min(position, Math.max(0, audio.duration - 0.05));
    }
    return position;
  }, [state, timeSync]);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !sourceUrl || state.status !== 'playing') return;
    try {
      await audio.play();
      setSkyroomBackgroundMusicPlaybackIssue(null);
    } catch (error) {
      const isAutoplayBlock = error instanceof DOMException
        && (error.name === 'NotAllowedError' || error.name === 'AbortError');
      setSkyroomBackgroundMusicPlaybackIssue(isAutoplayBlock ? 'autoplay' : 'load');
      logger.warn({
        logCode: 'skyroom_background_music_playback_failed',
        extraInfo: { errorMessage: `${error}` },
      }, 'Background music playback failed');
    }
  }, [sourceUrl, state.status]);

  useEffect(() => {
    setSkyroomBackgroundMusicPlaybackRetry(play);
    return () => setSkyroomBackgroundMusicPlaybackRetry(null);
  }, [play]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    audio.pause();
    setSkyroomBackgroundMusicPlaybackIssue(null);
    if (!sourceUrl) {
      audio.removeAttribute('src');
      audio.load();
      return undefined;
    }

    const applyInitialState = () => {
      try {
        audio.currentTime = expectedPosition(audio);
      } catch (error) {
        logger.debug({
          logCode: 'skyroom_background_music_initial_seek_skipped',
          extraInfo: { errorMessage: `${error}` },
        }, 'Background music initial seek was not ready');
      }
      if (state.status === 'playing') play();
    };

    audio.src = sourceUrl;
    audio.load();
    audio.addEventListener('loadedmetadata', applyInitialState);
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) applyInitialState();

    return () => {
      audio.removeEventListener('loadedmetadata', applyInitialState);
    };
  }, [sourceUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !sourceUrl) return;

    audio.volume = state.volume;
    audio.loop = state.loop;

    if (state.status === 'stopped') {
      audio.pause();
      if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) audio.currentTime = 0;
      return;
    }

    const target = expectedPosition(audio);
    const drift = Math.abs(audio.currentTime - target);
    const tolerance = state.status === 'paused' ? 0.1 : SEEK_TOLERANCE_SECONDS;
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA && drift > tolerance) {
      audio.currentTime = target;
    }

    if (state.status === 'paused') {
      audio.pause();
    } else {
      play();
    }
  }, [expectedPosition, play, sourceUrl, state]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handleEnded = () => {
      publishSkyroomBackgroundMusicCommand({ type: 'ended' });
    };
    const handleError = () => {
      setSkyroomBackgroundMusicPlaybackIssue('load');
      logger.warn({
        logCode: 'skyroom_background_music_media_error',
        extraInfo: { mediaErrorCode: audio.error?.code },
      }, 'Background music media element reported an error');
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, []);

  return (
    // Instrumental background audio has no speech content to caption.
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio
      ref={audioRef}
      data-test="skyroomBackgroundMusicAudio"
      preload="auto"
      aria-hidden="true"
    />
  );
};

export default SkyroomBackgroundMusicPlayer;

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { EVENTS } from 'utils/constants';
import logger from 'utils/logger';
import player from 'utils/player';
import storage from 'utils/data/storage';
import {
  buildBackgroundMusicURL,
  getBackgroundMusicState,
  getCurrentBackgroundMusic,
} from './utils';

const DRIFT_TOLERANCE_SECONDS = 0.35;
const MIN_PLAYBACK_RATE = 0.25;
const MAX_PLAYBACK_RATE = 4;

const BackgroundMusic = () => {
  const element = useRef(null);
  const activeItem = useRef(null);
  const lastTimelineTime = useRef(0);
  const failedItem = useRef(null);
  const [item, setItem] = useState(null);

  const sync = useCallback((timelineTime = lastTimelineTime.current) => {
    const audio = element.current;
    const primary = player.primary;
    const currentItem = activeItem.current;
    if (!audio || !primary || primary.isDisposed?.() || !currentItem) return;

    const state = getBackgroundMusicState(currentItem, timelineTime);
    if (!state) return;

    audio.loop = state.loop;
    let targetTime = state.position;
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      targetTime = state.loop
        ? targetTime % audio.duration
        : Math.min(targetTime, Math.max(audio.duration - 0.05, 0));
    }

    try {
      if (Math.abs(audio.currentTime - targetTime) > DRIFT_TOLERANCE_SECONDS) {
        audio.currentTime = targetTime;
      }
    } catch (error) {
      logger.debug('background music seek deferred', error.name);
    }

    const primaryRate = primary.playbackRate?.() || 1;
    audio.playbackRate = Math.min(Math.max(primaryRate, MIN_PLAYBACK_RATE), MAX_PLAYBACK_RATE);
    const primaryVolume = primary.volume?.() ?? 1;
    audio.volume = Math.min(Math.max(primaryVolume * state.volume, 0), 1);
    audio.muted = primary.muted?.() ?? false;

    const reachedTrackEnd = !state.loop
      && Number.isFinite(audio.duration)
      && audio.duration > 0
      && state.position >= audio.duration;
    const shouldPlay = state.status === 'playing'
      && !reachedTrackEnd
      && !primary.paused?.()
      && !primary.ended?.();
    if (shouldPlay && audio.paused) {
      const promise = audio.play();
      if (promise) {
        promise.catch(error => {
          if (error.name !== 'AbortError' && failedItem.current !== currentItem) {
            failedItem.current = currentItem;
            logger.warn('background music playback failed', error.name);
          }
        });
      }
    } else if (!shouldPlay && !audio.paused) {
      audio.pause();
    }
  }, []);

  useEffect(() => {
    const handleTimeUpdate = event => {
      const time = event.detail.time;
      lastTimelineTime.current = time;
      const nextItem = getCurrentBackgroundMusic(storage.backgroundMusic, time);

      if (activeItem.current !== nextItem) {
        activeItem.current = nextItem;
        failedItem.current = null;
        setItem(nextItem);
        return;
      }

      sync(time);
    };

    document.addEventListener(EVENTS.TIME_UPDATE, handleTimeUpdate);
    return () => document.removeEventListener(EVENTS.TIME_UPDATE, handleTimeUpdate);
  }, [sync]);

  useEffect(() => {
    const primary = player.primary;
    if (!item || !primary || primary.isDisposed?.()) return undefined;
    const audio = element.current;
    const handlePrimaryChange = () => sync(primary.currentTime());
    const events = ['play', 'pause', 'ratechange', 'volumechange', 'seeking', 'seeked', 'ended'];
    events.forEach(event => primary.on(event, handlePrimaryChange));
    sync(primary.currentTime());

    return () => {
      events.forEach(event => primary.off(event, handlePrimaryChange));
      if (audio && !audio.paused) audio.pause();
    };
  }, [item, sync]);

  if (!item || !item.available || !item.mediaUrl) return null;

  return (
    // Instrumental background audio has no speech content to caption.
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <audio
      aria-hidden="true"
      data-testid="recording-background-music"
      key={`${item.mediaUrl}-${item.timestamp}`}
      onCanPlay={() => sync()}
      onError={() => {
        if (failedItem.current !== item) {
          failedItem.current = item;
          logger.warn('background music recording asset is unavailable');
        }
      }}
      onLoadedMetadata={() => sync()}
      preload="metadata"
      ref={element}
      src={buildBackgroundMusicURL(item.mediaUrl)}
      style={{ display: 'none' }}
    />
  );
};

export default BackgroundMusic;

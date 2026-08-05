import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  defineMessages,
  useIntl,
} from 'react-intl';
import Icon from 'components/utils/icon';
import { EVENTS } from 'utils/constants';
import logger from 'utils/logger';
import player from 'utils/player';
import storage from 'utils/data/storage';
import {
  buildExternalMediaURL,
  getCurrentExternalMedia,
  getExternalMediaState,
} from './utils';
import './index.scss';

const intlMessages = defineMessages({
  audioAria: {
    id: 'player.externalMedia.audio.aria',
    description: 'Aria label for synchronized external audio',
  },
  videoAria: {
    id: 'player.externalMedia.video.aria',
    description: 'Aria label for synchronized external video',
  },
  audioTitle: {
    id: 'player.externalMedia.audio.title',
    description: 'Fallback title for synchronized external audio',
  },
  videoTitle: {
    id: 'player.externalMedia.video.title',
    description: 'Fallback title for synchronized external video',
  },
  loading: {
    id: 'player.externalMedia.loading',
    description: 'External media loading status',
  },
  unavailable: {
    id: 'player.externalMedia.unavailable',
    description: 'External media unavailable status',
  },
});

const DRIFT_TOLERANCE_SECONDS = 0.35;
const MIN_PLAYBACK_RATE = 0.25;
const MAX_PLAYBACK_RATE = 4;

const ExternalMedia = () => {
  const intl = useIntl();
  const element = useRef(null);
  const activeItem = useRef(null);
  const lastTimelineTime = useRef(0);
  const [item, setItem] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const sync = useCallback((timelineTime = lastTimelineTime.current) => {
    const media = element.current;
    const primary = player.primary;
    const currentItem = activeItem.current;
    if (!media || !primary || primary.isDisposed?.() || !currentItem) return;

    const state = getExternalMediaState(currentItem, timelineTime);
    if (!state) return;

    if (Number.isFinite(media.duration)) {
      const targetTime = Math.min(state.mediaTime, Math.max(media.duration - 0.05, 0));
      if (Math.abs(media.currentTime - targetTime) > DRIFT_TOLERANCE_SECONDS) {
        media.currentTime = targetTime;
      }
    } else if (Math.abs(media.currentTime - state.mediaTime) > DRIFT_TOLERANCE_SECONDS) {
      media.currentTime = state.mediaTime;
    }

    const primaryRate = primary.playbackRate?.() || 1;
    media.playbackRate = Math.min(Math.max(primaryRate * state.rate, MIN_PLAYBACK_RATE), MAX_PLAYBACK_RATE);
    media.volume = primary.volume?.() ?? 1;
    media.muted = primary.muted?.() ?? false;

    const shouldPlay = state.playing && !primary.paused?.() && !primary.ended?.();
    if (shouldPlay && media.paused) {
      const promise = media.play();
      if (promise) {
        promise.catch((error) => {
          if (error.name !== 'AbortError') {
            logger.warn('external media play failed', error.name);
            setFailed(true);
          }
        });
      }
    } else if (!shouldPlay && !media.paused) {
      media.pause();
    }
  }, []);

  useEffect(() => {
    const handleTimeUpdate = (event) => {
      const time = event.detail.time;
      lastTimelineTime.current = time;
      const nextItem = getCurrentExternalMedia(storage.videos, time);

      if (activeItem.current !== nextItem) {
        activeItem.current = nextItem;
        setItem(nextItem);
        setLoaded(false);
        setFailed(false);
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
    const media = element.current;

    const handlePrimaryChange = () => sync(primary.currentTime());
    const events = ['play', 'pause', 'ratechange', 'volumechange', 'seeking', 'seeked', 'ended'];
    events.forEach(event => primary.on(event, handlePrimaryChange));
    sync(primary.currentTime());

    return () => {
      events.forEach(event => primary.off(event, handlePrimaryChange));
      if (media && !media.paused) media.pause();
    };
  }, [item, sync]);

  if (!item) return null;

  const isAudio = item.mediaType === 'audio';
  const title = item.mediaName || intl.formatMessage(isAudio ? intlMessages.audioTitle : intlMessages.videoTitle);
  const aria = intl.formatMessage(isAudio ? intlMessages.audioAria : intlMessages.videoAria);
  const unavailable = !item.available || !item.mediaUrl || failed;

  if (unavailable) {
    return (
      <div aria-label={aria} className="external-media-wrapper external-media-status" role="status">
        <span className="external-media-status-icon"><Icon name="videos" /></span>
        <strong>{title}</strong>
        <span>{intl.formatMessage(intlMessages.unavailable)}</span>
      </div>
    );
  }

  const mediaProps = {
    autoPlay: false,
    className: 'external-media-element',
    onCanPlay: () => {
      setLoaded(true);
      sync();
    },
    onError: () => setFailed(true),
    onLoadedMetadata: () => sync(),
    playsInline: true,
    preload: 'metadata',
    ref: element,
    src: buildExternalMediaURL(item.mediaUrl),
  };

  return (
    <div aria-label={aria} className="external-media-wrapper">
      {isAudio ? (
        <>
          <audio {...mediaProps} className="external-media-element external-media-audio-element" />
          <div className="external-media-audio-card">
            <span className="external-media-audio-icon"><Icon name="videos" /></span>
            <div className="external-media-audio-copy">
              <span>{intl.formatMessage(intlMessages.audioTitle)}</span>
              <strong>{title}</strong>
            </div>
          </div>
        </>
      ) : (
        <video {...mediaProps} />
      )}
      {!loaded ? (
        <div className="external-media-loading" role="status">
          <span className="external-media-spinner" />
          {intl.formatMessage(intlMessages.loading)}
        </div>
      ) : null}
    </div>
  );
};

export default ExternalMedia;

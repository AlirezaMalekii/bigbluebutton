import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  buildAparatEmbedUrl,
  extractAparatHash,
  isAparatEmbedUrl,
  parseAparatEmbed,
} from '../external-video-utils';

const APARAT_MATCH_URL = /aparat\.com/i;

/**
 * Aparat iframe has no reliable postMessage API. SafeMeet drives play/pause by
 * remounting the official /vt/frame embed (with autoplay on play). Seek/rate
 * are not available — PresenterSyncToolbar disables those for Aparat.
 */
export class AparatPlayer extends Component {
  static canPlay(url) {
    return APARAT_MATCH_URL.test(url) && (isAparatEmbedUrl(url) || !!parseAparatEmbed(url));
  }

  constructor(props) {
    super(props);

    // react-player expects the custom player instance on `this.player`.
    this.player = this;
    this.currentTime = 0;
    this.playbackRate = 1;
    this.iframeKey = 0;
    this._playing = false;
    this.container = null;

    this.getCurrentTime = this.getCurrentTime.bind(this);
    this.getEmbedUrl = this.getEmbedUrl.bind(this);
  }

  componentDidMount() {
    const { onMount, config } = this.props;
    const shouldAutoplay = Boolean(config?.aparat?.playing);
    if (shouldAutoplay) {
      this._playing = true;
    }
    if (onMount) {
      onMount(this);
    }
    this.load();
  }

  componentDidUpdate(prevProps) {
    const {
      config, url, onStart, onPlay,
    } = this.props;
    const prevUrl = prevProps.url;
    const prevPlaying = Boolean(prevProps.config?.aparat?.playing);
    const nextPlaying = Boolean(config?.aparat?.playing);

    if (url && url !== prevUrl) {
      this._playing = nextPlaying;
      this.remountIframe(() => {
        if (this._playing) {
          onStart?.();
          onPlay?.();
        }
      });
      return;
    }

    if (prevPlaying === nextPlaying) return;

    if (nextPlaying) {
      this.play();
    } else {
      this.pause();
    }
  }

  getAparatConfig() {
    const { config } = this.props;
    return config?.aparat || {};
  }

  getEmbedUrl(url) {
    const { url: propUrl } = this.props;
    const targetUrl = url || propUrl;
    const hash = extractAparatHash(targetUrl);
    if (!hash) {
      if (isAparatEmbedUrl(targetUrl)) {
        const fallbackHash = extractAparatHash(targetUrl);
        return fallbackHash ? buildAparatEmbedUrl(fallbackHash) : targetUrl;
      }
      return parseAparatEmbed(targetUrl) || targetUrl;
    }

    return buildAparatEmbedUrl(hash, {
      autoplay: this._playing || Boolean(this.getAparatConfig().playing),
      muted: false,
    });
  }

  getCurrentTime() {
    return this.currentTime;
  }

  getVolume() {
    return this.player ? 1 : 1;
  }

  getDuration() {
    return this.currentTime >= 0 ? 0 : 0;
  }

  getSecondsLoaded() {
    return this.currentTime >= 0 ? 0 : 0;
  }

  getPlaybackRate() {
    return this.playbackRate;
  }

  setPlaybackRate() {
    return this;
  }

  setVolume() {
    return this;
  }

  setLoop() {
    return this;
  }

  remountIframe(callback) {
    this.iframeKey += 1;
    this.forceUpdate(callback);
  }

  load() {
    Promise.resolve().then(() => {
      const { onReady, onStart, onPlay } = this.props;
      onReady?.();
      if (this._playing) {
        onStart?.();
        onPlay?.();
      }
    });
    return this;
  }

  play() {
    const { onPlay, onStart } = this.props;
    if (this._playing) {
      onPlay?.();
      return this;
    }
    this._playing = true;
    this.remountIframe(() => {
      onStart?.();
      onPlay?.();
    });
    return this;
  }

  pause() {
    const { onPause } = this.props;
    if (!this._playing) {
      onPause?.();
      return this;
    }
    this._playing = false;
    this.remountIframe(() => {
      onPause?.();
    });
    return this;
  }

  stop() {
    return this.pause();
  }

  seekTo() {
    return this;
  }

  mute() {
    return this;
  }

  unmute() {
    return this;
  }

  playVideo() {
    return this.play();
  }

  pauseVideo() {
    return this.pause();
  }

  render() {
    const { url } = this.props;
    // Clicks go to SafeMeet toolbar / viewer blocker — not Aparat's own chrome.
    const style = {
      width: '100%',
      height: '100%',
      margin: 0,
      padding: 0,
      border: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
    };

    return (
      <iframe
        key={`${url}-${this.iframeKey}-${this._playing ? 'play' : 'pause'}`}
        style={style}
        src={this.getEmbedUrl(url)}
        title="Aparat video player"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        tabIndex={-1}
        ref={(container) => {
          this.container = container;
        }}
      />
    );
  }
}

AparatPlayer.propTypes = {
  url: PropTypes.string,
  onMount: PropTypes.func,
  onReady: PropTypes.func,
  onStart: PropTypes.func,
  onPlay: PropTypes.func,
  onPause: PropTypes.func,
  config: PropTypes.shape({
    aparat: PropTypes.shape({
      playing: PropTypes.bool,
      isPresenter: PropTypes.bool,
    }),
  }),
};

AparatPlayer.displayName = 'AparatPlayer';

export default AparatPlayer;

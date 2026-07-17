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
 * Aparat has no reliable iframe playback API — `autoplay` query params are ignored
 * (embedAutoplay stays false). Users must use Aparat's own player UI.
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
    this._playing = false;
    this.container = null;

    this.getCurrentTime = this.getCurrentTime.bind(this);
    this.getEmbedUrl = this.getEmbedUrl.bind(this);
  }

  componentDidMount() {
    const { onMount } = this.props;
    if (onMount) {
      onMount(this);
    }
    this.load();
  }

  componentDidUpdate(prevProps) {
    const { url } = this.props;
    if (url && url !== prevProps.url) {
      this._playing = false;
    }
  }

  getEmbedUrl(url) {
    const { url: propUrl } = this.props;
    const targetUrl = url || propUrl;
    const hash = extractAparatHash(targetUrl);
    if (!hash) {
      return parseAparatEmbed(targetUrl) || targetUrl;
    }
    // Stable official frame URL — no autoplay remounts (Aparat ignores them).
    return buildAparatEmbedUrl(hash);
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

  load() {
    Promise.resolve().then(() => {
      const { onReady } = this.props;
      onReady?.();
    });
    return this;
  }

  // No-op: Aparat playback is only controllable via its native iframe UI.
  play() {
    const { onPlay, onStart } = this.props;
    this._playing = true;
    onStart?.();
    onPlay?.();
    return this;
  }

  pause() {
    const { onPause } = this.props;
    this._playing = false;
    onPause?.();
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
    const style = {
      width: '100%',
      height: '100%',
      margin: 0,
      padding: 0,
      border: 0,
      overflow: 'hidden',
      // Aparat's own controls must receive clicks (play, seek, volume, fullscreen).
      pointerEvents: 'auto',
    };

    return (
      <iframe
        key={url}
        style={style}
        src={this.getEmbedUrl(url)}
        title="Aparat video player"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
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
    }),
  }),
};

AparatPlayer.displayName = 'AparatPlayer';

export default AparatPlayer;

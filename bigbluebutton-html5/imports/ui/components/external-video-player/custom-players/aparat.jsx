import React, { Component } from 'react';
import {
  buildAparatEmbedUrl,
  extractAparatHash,
  isAparatEmbedUrl,
  parseAparatEmbed,
} from '../external-video-utils';

const APARAT_MATCH_URL = /aparat\.com/i;

export class AparatPlayer extends Component {
  static canPlay(url) {
    return APARAT_MATCH_URL.test(url) && (isAparatEmbedUrl(url) || !!parseAparatEmbed(url));
  }

  constructor(props) {
    super(props);

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
    // Notify react-player that the custom player is ready.
    this.load();
  }

  componentDidUpdate(prevProps) {
    const { config } = this.props;
    const prevPlaying = Boolean(prevProps.config?.aparat?.playing);
    const nextPlaying = Boolean(config?.aparat?.playing);
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
      if (isAparatEmbedUrl(targetUrl)) return targetUrl;
      return parseAparatEmbed(targetUrl) || targetUrl;
    }

    const aparatConfig = this.getAparatConfig();
    return buildAparatEmbedUrl(hash, {
      autoplay: this._playing || Boolean(aparatConfig.playing),
      // Prefer unmuted autoplay so viewers hear audio in meetings that already
      // have an active media context (listen-only / mic). Browser may still
      // require a prior gesture; presenter controls remain the sync source.
      muted: false,
      hideTitle: true,
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

  render() {
    const { url } = this.props;
    const { isPresenter } = this.getAparatConfig();
    // Always block iframe UI interaction — presenter uses SafeMeet sync controls.
    // Viewers must never play/pause locally.
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
        allow="autoplay; fullscreen; encrypted-media"
        allowFullScreen
        // Presenter/viewer both blocked; keep attribute for accessibility tooling.
        tabIndex={isPresenter ? -1 : -1}
        ref={(container) => {
          this.container = container;
        }}
      />
    );
  }
}

AparatPlayer.displayName = 'AparatPlayer';

export default AparatPlayer;

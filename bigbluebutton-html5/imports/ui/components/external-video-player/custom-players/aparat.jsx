import React, { Component } from 'react';
import { isAparatEmbedUrl, parseAparatEmbed } from '../external-video-utils';

const APARAT_MATCH_URL = /aparat\.com/i;

export class AparatPlayer extends Component {
  static canPlay(url) {
    return APARAT_MATCH_URL.test(url) && (isAparatEmbedUrl(url) || !!parseAparatEmbed(url));
  }

  constructor(props) {
    super(props);

    this.player = this;
    this._player = null;
    this.currentTime = 0;
    this.playbackRate = 1;
    this.getCurrentTime = this.getCurrentTime.bind(this);
    this.getEmbedUrl = this.getEmbedUrl.bind(this);
  }

  componentDidMount() {
    const { onMount } = this.props;
    if (onMount) {
      onMount(this);
    }
  }

  getEmbedUrl(url) {
    const { url: propUrl } = this.props;
    const targetUrl = url || propUrl;
    if (isAparatEmbedUrl(targetUrl)) return targetUrl;
    return parseAparatEmbed(targetUrl) || targetUrl;
  }

  getCurrentTime() {
    return this.currentTime;
  }

  getVolume() {
    return this.player ? 1 : 1;
  }

  getDuration() {
    return this;
  }

  getSecondsLoaded() {
    return this;
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
    Promise.resolve()
      .then(() => {
        const { onReady } = this.props;
        onReady();
      });
    return this;
  }

  play() {
    return this;
  }

  pause() {
    return this;
  }

  stop() {
    return this;
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
    const style = {
      width: '100%',
      height: '100%',
      margin: 0,
      padding: 0,
      border: 0,
      overflow: 'hidden',
    };
    const { url } = this.props;

    return (
      <iframe
        key={url}
        style={style}
        src={this.getEmbedUrl(url)}
        title="Aparat video player"
        allow="autoplay; fullscreen"
        allowFullScreen
        ref={(container) => {
          this.container = container;
        }}
      />
    );
  }
}

AparatPlayer.displayName = 'AparatPlayer';

export default AparatPlayer;

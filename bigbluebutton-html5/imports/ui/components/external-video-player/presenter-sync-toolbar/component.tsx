import React, { useCallback, useRef } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import Icon from '/imports/ui/components/common/icon/component';
import Styled from './styles';

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const SKIP_SECONDS = 5;

const intlMessages = defineMessages({
  play: {
    id: 'app.presentationMedia.play',
    description: 'Play shared media',
  },
  pause: {
    id: 'app.presentationMedia.pause',
    description: 'Pause shared media',
  },
  mute: {
    id: 'app.presentationMedia.mute',
    description: 'Mute shared media',
  },
  unmute: {
    id: 'app.presentationMedia.unmute',
    description: 'Unmute shared media',
  },
  seek: {
    id: 'app.externalVideo.seekLabel',
    description: 'Seek shared media timeline',
  },
  skipBack: {
    id: 'app.externalVideo.skipBack5',
    description: 'Skip back 5 seconds',
  },
  skipForward: {
    id: 'app.externalVideo.skipForward5',
    description: 'Skip forward 5 seconds',
  },
  playbackRate: {
    id: 'app.externalVideo.playbackRate',
    description: 'Playback speed control',
  },
});

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const formatRate = (rate: number) => `${rate}x`;

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

const SkipBackGlyph = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" fill="currentColor" />
  </svg>
);

const SkipForwardGlyph = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M13 6v12l8.5-6L13 6zM3.5 18l8.5-6-8.5-6v12z" fill="currentColor" />
  </svg>
);

export interface PresenterSyncToolbarProps {
  playing: boolean;
  played: number;
  loaded: number;
  duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  seekEnabled?: boolean;
  volumeEnabled?: boolean;
  rateEnabled?: boolean;
  onPlayPause: () => void;
  onSeek: (fraction: number) => void;
  onSkipSeconds: (deltaSeconds: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: (mute: boolean) => void;
}

const PresenterSyncToolbar: React.FC<PresenterSyncToolbarProps> = ({
  playing,
  played,
  loaded,
  duration,
  volume,
  muted,
  playbackRate,
  seekEnabled = true,
  volumeEnabled = true,
  rateEnabled = true,
  onPlayPause,
  onSeek,
  onSkipSeconds,
  onPlaybackRateChange,
  onVolumeChange,
  onMuteToggle,
}) => {
  const intl = useIntl();
  const progressRef = useRef<HTMLDivElement>(null);

  const currentSeconds = played * (duration || 0);
  const playedPercent = Math.min(100, Math.max(0, played * 100));
  const loadedPercent = Math.min(100, Math.max(0, (loaded || 0) * 100));
  const rateOptions = PLAYBACK_RATES.includes(playbackRate)
    ? PLAYBACK_RATES
    : [...PLAYBACK_RATES, playbackRate].sort((a, b) => a - b);

  const handleProgressClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!seekEnabled) return;
    const bar = progressRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    onSeek(ratio);
  }, [onSeek, seekEnabled]);

  const handleProgressKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!seekEnabled) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 0.05 : -0.05;
    onSeek(Math.min(1, Math.max(0, played + step)));
  }, [onSeek, played, seekEnabled]);

  const volumeIcon = muted || volume <= 0 ? 'volume_off' : 'volume_up';

  return (
    <Styled.Bar data-presenter-sync-toolbar="true">
      <Styled.LeftCluster>
        <Styled.PlayButton
          type="button"
          onClick={onPlayPause}
          aria-label={intl.formatMessage(playing ? intlMessages.pause : intlMessages.play)}
          data-test="presenterMediaPlayPause"
        >
          <PlayPauseGlyph playing={playing} />
        </Styled.PlayButton>

        <Styled.SkipButton
          type="button"
          disabled={!seekEnabled}
          onClick={() => onSkipSeconds(-SKIP_SECONDS)}
          aria-label={intl.formatMessage(intlMessages.skipBack)}
          data-test="presenterMediaSkipBack"
          title={`-${SKIP_SECONDS}s`}
        >
          <SkipBackGlyph />
          {SKIP_SECONDS}
        </Styled.SkipButton>

        <Styled.SkipButton
          type="button"
          disabled={!seekEnabled}
          onClick={() => onSkipSeconds(SKIP_SECONDS)}
          aria-label={intl.formatMessage(intlMessages.skipForward)}
          data-test="presenterMediaSkipForward"
          title={`+${SKIP_SECONDS}s`}
        >
          {SKIP_SECONDS}
          <SkipForwardGlyph />
        </Styled.SkipButton>
      </Styled.LeftCluster>

      <Styled.ProgressCluster>
        <Styled.Time>{formatTime(currentSeconds)}</Styled.Time>

        <Styled.ProgressTrack
          ref={progressRef}
          role="slider"
          tabIndex={seekEnabled ? 0 : -1}
          aria-disabled={!seekEnabled}
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration || 0)}
          aria-valuenow={Math.floor(currentSeconds)}
          aria-label={intl.formatMessage(intlMessages.seek)}
          onClick={handleProgressClick}
          onKeyDown={handleProgressKeyDown}
          $disabled={!seekEnabled}
        >
          <Styled.ProgressLoaded style={{ width: `${loadedPercent}%` }} />
          <Styled.ProgressPlayed style={{ width: `${playedPercent}%` }} />
          {seekEnabled ? (
            <Styled.ProgressThumb style={{ left: `${playedPercent}%` }} />
          ) : null}
        </Styled.ProgressTrack>

        <Styled.Time>{formatTime(duration || 0)}</Styled.Time>
      </Styled.ProgressCluster>

      <Styled.RightCluster>
        {rateEnabled ? (
          <Styled.RateSelect
            value={playbackRate}
            disabled={!rateEnabled}
            aria-label={intl.formatMessage(intlMessages.playbackRate)}
            data-test="presenterMediaPlaybackRate"
            onChange={(event) => onPlaybackRateChange(Number(event.target.value))}
          >
            {rateOptions.map((rate) => (
              <option key={rate} value={rate}>
                {formatRate(rate)}
              </option>
            ))}
          </Styled.RateSelect>
        ) : null}

        {volumeEnabled ? (
          <Styled.VolumeGroup>
            <Styled.IconButton
              type="button"
              onClick={() => onMuteToggle(!muted)}
              aria-label={intl.formatMessage(muted ? intlMessages.unmute : intlMessages.mute)}
            >
              <Icon iconName={volumeIcon} />
            </Styled.IconButton>
            <Styled.VolumeSlider
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => onVolumeChange(Number(event.target.value))}
              aria-label={intl.formatMessage(intlMessages.unmute)}
            />
          </Styled.VolumeGroup>
        ) : null}
      </Styled.RightCluster>
    </Styled.Bar>
  );
};

export default PresenterSyncToolbar;

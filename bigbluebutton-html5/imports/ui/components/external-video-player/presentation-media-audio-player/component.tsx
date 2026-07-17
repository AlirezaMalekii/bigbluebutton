import React, { useCallback, useRef } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import Icon from '/imports/ui/components/common/icon/component';
import Styled from './styles';

const intlMessages = defineMessages({
  audioPresentationLabel: {
    id: 'app.presentationMedia.audioLabel',
    description: 'Accessible label for shared audio presentation player',
  },
  play: {
    id: 'app.presentationMedia.play',
    description: 'Play shared presentation media',
  },
  pause: {
    id: 'app.presentationMedia.pause',
    description: 'Pause shared presentation media',
  },
  mute: {
    id: 'app.presentationMedia.mute',
    description: 'Mute shared presentation media',
  },
  unmute: {
    id: 'app.presentationMedia.unmute',
    description: 'Unmute shared presentation media',
  },
});

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
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

interface PresentationMediaAudioPlayerProps {
  title: string;
  playing: boolean;
  played: number;
  loaded: number;
  duration: number;
  volume: number;
  muted: boolean;
  /** Presenter sync controls; viewers follow GraphQL playing/time. */
  controlsEnabled?: boolean;
  onPlayPause: () => void;
  onSeek: (fraction: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: (mute: boolean) => void;
}

const PresentationMediaAudioPlayer: React.FC<PresentationMediaAudioPlayerProps> = ({
  title,
  playing,
  played,
  loaded,
  duration,
  volume,
  muted,
  controlsEnabled = false,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
}) => {
  const intl = useIntl();
  const progressRef = useRef<HTMLDivElement>(null);

  const currentSeconds = played * duration;
  const playedPercent = Math.min(100, Math.max(0, played * 100));
  const loadedPercent = Math.min(100, Math.max(0, (loaded || 0) * 100));

  const handleProgressClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!controlsEnabled) return;
    const bar = progressRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    onSeek(ratio);
  }, [controlsEnabled, onSeek]);

  const handleProgressKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!controlsEnabled) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 0.05 : -0.05;
    onSeek(Math.min(1, Math.max(0, played + step)));
  }, [controlsEnabled, onSeek, played]);

  const volumeIcon = muted || volume <= 0 ? 'volume_off' : 'volume_up';

  return (
    <Styled.Root
      data-presentation-media-audio="true"
      role="region"
      aria-label={intl.formatMessage(intlMessages.audioPresentationLabel)}
    >
      <Styled.Backdrop aria-hidden="true">
        <Styled.GlowRing />
        <Styled.Visual>
          <Styled.Disc $playing={playing}>
            <Styled.DiscInner>
              <Icon iconName="audio_on" />
            </Styled.DiscInner>
          </Styled.Disc>
          <Styled.Equalizer $playing={playing} aria-hidden="true">
            {[0, 1, 2, 3, 4].map((bar) => (
              <Styled.EqualizerBar key={bar} $index={bar} $playing={playing} />
            ))}
          </Styled.Equalizer>
        </Styled.Visual>
      </Styled.Backdrop>

      <Styled.Panel>
        <Styled.Title dir="auto" title={title}>{title}</Styled.Title>
        <Styled.Subtitle>{intl.formatMessage(intlMessages.audioPresentationLabel)}</Styled.Subtitle>

        <Styled.ProgressRow>
          <Styled.Time>{formatTime(currentSeconds)}</Styled.Time>
          <Styled.ProgressTrack
            ref={progressRef}
            role="slider"
            tabIndex={controlsEnabled ? 0 : -1}
            aria-disabled={!controlsEnabled}
            aria-valuemin={0}
            aria-valuemax={Math.floor(duration)}
            aria-valuenow={Math.floor(currentSeconds)}
            aria-label={title}
            onClick={handleProgressClick}
            onKeyDown={handleProgressKeyDown}
            style={{ cursor: controlsEnabled ? 'pointer' : 'default' }}
          >
            <Styled.ProgressLoaded style={{ width: `${loadedPercent}%` }} />
            <Styled.ProgressPlayed style={{ width: `${playedPercent}%` }} />
            {controlsEnabled ? (
              <Styled.ProgressThumb style={{ left: `${playedPercent}%` }} />
            ) : null}
          </Styled.ProgressTrack>
          <Styled.Time>{formatTime(duration)}</Styled.Time>
        </Styled.ProgressRow>

        <Styled.Controls>
          {controlsEnabled ? (
            <Styled.PlayButton
              type="button"
              onClick={onPlayPause}
              aria-label={intl.formatMessage(playing ? intlMessages.pause : intlMessages.play)}
            >
              <PlayPauseGlyph playing={playing} />
            </Styled.PlayButton>
          ) : (
            <Styled.PlayButton
              type="button"
              disabled
              aria-hidden="true"
              tabIndex={-1}
            >
              <PlayPauseGlyph playing={playing} />
            </Styled.PlayButton>
          )}

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
        </Styled.Controls>
      </Styled.Panel>
    </Styled.Root>
  );
};

export default PresentationMediaAudioPlayer;

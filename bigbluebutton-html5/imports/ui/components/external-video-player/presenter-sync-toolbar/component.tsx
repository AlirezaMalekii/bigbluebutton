import React, { useCallback, useRef } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import Icon from '/imports/ui/components/common/icon/component';
import Styled from './styles';

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

export interface PresenterSyncToolbarProps {
  playing: boolean;
  played: number;
  loaded: number;
  duration: number;
  volume: number;
  muted: boolean;
  seekEnabled?: boolean;
  volumeEnabled?: boolean;
  onPlayPause: () => void;
  onSeek: (fraction: number) => void;
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
  seekEnabled = true,
  volumeEnabled = true,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
}) => {
  const intl = useIntl();
  const progressRef = useRef<HTMLDivElement>(null);

  const currentSeconds = played * (duration || 0);
  const playedPercent = Math.min(100, Math.max(0, played * 100));
  const loadedPercent = Math.min(100, Math.max(0, (loaded || 0) * 100));

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
      <Styled.PlayButton
        type="button"
        onClick={onPlayPause}
        aria-label={intl.formatMessage(playing ? intlMessages.pause : intlMessages.play)}
        data-test="presenterMediaPlayPause"
      >
        <PlayPauseGlyph playing={playing} />
      </Styled.PlayButton>

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
    </Styled.Bar>
  );
};

export default PresenterSyncToolbar;

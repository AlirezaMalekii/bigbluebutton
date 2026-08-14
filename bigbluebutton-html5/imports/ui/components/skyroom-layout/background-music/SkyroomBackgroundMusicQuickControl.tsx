import React, { useMemo } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import { isSkyroomColumnLayout } from '../panel-toggles';
import { getBackgroundMusicCatalogTrack } from './catalog';
import {
  openSkyroomBackgroundMusic,
  retrySkyroomBackgroundMusicPlayback,
  useSkyroomBackgroundMusicPlaybackIssue,
  useSkyroomBackgroundMusicState,
} from './state';

const intlMessages = defineMessages({
  open: { id: 'app.skyroom.backgroundMusic.open', description: 'Open background music controls' },
  unlock: { id: 'app.skyroom.backgroundMusic.retryPlayback', description: 'Unlock browser background music playback' },
});

const SkyroomBackgroundMusicQuickControl: React.FC = () => {
  const intl = useIntl();
  const [state] = useSkyroomBackgroundMusicState();
  const [playbackIssue] = useSkyroomBackgroundMusicPlaybackIssue();
  const { data: currentUser } = useCurrentUser((user) => ({
    isModerator: user.isModerator,
    presenter: user.presenter,
  }));
  const canControl = Boolean(currentUser?.isModerator || currentUser?.presenter);

  const trackName = useMemo(() => {
    if (!state.source) return '';
    if (state.source.type === 'upload') return state.source.name;
    const track = getBackgroundMusicCatalogTrack(state.source.trackId);
    return track ? intl.formatMessage({ id: track.labelId }) : '';
  }, [intl, state.source]);

  if (!isSkyroomColumnLayout() || !state.source) return null;
  if (!canControl && playbackIssue !== 'autoplay') return null;

  const unlockPlayback = !canControl && playbackIssue === 'autoplay';
  const label = unlockPlayback
    ? intl.formatMessage(intlMessages.unlock)
    : `${intl.formatMessage(intlMessages.open)}: ${trackName}`;

  return (
    <button
      type="button"
      className="skyroom-background-music-quick"
      data-status={state.status}
      data-test="skyroomBackgroundMusicQuickControl"
      aria-label={label}
      title={label}
      onClick={unlockPlayback
        ? retrySkyroomBackgroundMusicPlayback
        : openSkyroomBackgroundMusic}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M9 18V5l10-2v13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="6.5" cy="18" r="2.5" fill="currentColor" />
        <circle cx="16.5" cy="16" r="2.5" fill="currentColor" />
      </svg>
      <span className="skyroom-background-music-quick__name" dir="auto">
        {unlockPlayback ? intl.formatMessage(intlMessages.unlock) : trackName}
      </span>
      <span className="skyroom-background-music-quick__bars" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </button>
  );
};

export default SkyroomBackgroundMusicQuickControl;

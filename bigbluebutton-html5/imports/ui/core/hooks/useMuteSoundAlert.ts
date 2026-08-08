import { useEffect, useRef } from 'react';
import AudioManager from '/imports/ui/services/audio-manager';
import { getSettingsSingletonInstance } from '/imports/ui/services/settings';
import { useReactiveVar } from '@apollo/client';
import logger from '/imports/startup/client/logger';
import AudioService from '/imports/ui/components/audio/service';

const MUTE_SOUND_PATH = '/resources/sounds/conf-muted.mp3';
const UNMUTE_SOUND_PATH = '/resources/sounds/conf-unmuted.mp3';

const useMuteSoundAlert = () => {
  /* eslint no-underscore-dangle: 0 */
  // @ts-ignore
  const isMuted = useReactiveVar(AudioManager._isMuted.value) as boolean;

  const prevMutedStateRef = useRef<boolean | undefined>(isMuted);

  useEffect(() => {
    const Settings = getSettingsSingletonInstance();
    const playAudio = Settings?.application?.muteUnmuteAudioAlerts;

    // SafeMeet: play client-side mute/unmute MP3s for all audio bridges
    // (fullaudio/FreeSWITCH + LiveKit). FreeSWITCH conference muted/unmuted
    // wavs are disabled so these HTML5 sounds remain the single source.
    if (!playAudio) {
      prevMutedStateRef.current = isMuted;
      return;
    }

    const hasMuteStateChanged = prevMutedStateRef.current !== isMuted;

    if (hasMuteStateChanged && typeof isMuted === 'boolean') {
      const soundToPlay = isMuted ? MUTE_SOUND_PATH : UNMUTE_SOUND_PATH;

      const basePath = window.meetingClientSettings.public.app.cdn
        + window.meetingClientSettings.public.app.basename;
      const fullSoundUrl = basePath + soundToPlay;

      AudioService.playAlertSound(fullSoundUrl).then((played) => {
        if (!played) {
          logger.error({
            logCode: 'useMuteSoundAlert_audio_play_failed',
          }, `Failed to play alert sound: ${soundToPlay}`);
        }
      });
    }

    prevMutedStateRef.current = isMuted;
  }, [isMuted]);
};

export default useMuteSoundAlert;

import { ExternalVideo } from '/imports/ui/Types/meeting';
import { isDirectVideoUrlValid } from './external-video-utils';

const isUrlValid = (url: string) => isDirectVideoUrlValid(url);

// Convert state (Number) to playing (Boolean)
const getPlayingState = (state: number) => {
  if (state === 1) return true;

  return false;
};

const calculateCurrentTime = (timeSync: number, externalVideoProps?: ExternalVideo) => {
  const playerCurrentTime = externalVideoProps?.playerCurrentTime ?? 0;

  const playerUpdatedAt = externalVideoProps?.updatedAt ?? Date.now();
  const playerUpdatedAtDate = new Date(playerUpdatedAt);
  const currentDate = new Date(Date.now() + (timeSync ?? 0));
  const isPaused = !externalVideoProps?.playerPlaying;
  const currentTime = isPaused
    ? playerCurrentTime
    : ((currentDate.getTime() - playerUpdatedAtDate.getTime()) / 1000)
    + (playerCurrentTime);

  return currentTime;
};

export {
  isUrlValid,
  getPlayingState,
  calculateCurrentTime,
};

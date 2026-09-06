import createUseLocalState from '/imports/ui/core/local-states/createUseLocalState';
import { getBackgroundMusicCatalogTrack } from './catalog';
import {
  isValidUploadTrackId,
  parseJsonObject,
  resolveBackgroundMusicStreamPath,
} from './background-music-policy';

export type BackgroundMusicStatus = 'playing' | 'paused' | 'stopped';

export type BackgroundMusicSource = {
  type: 'default';
  trackId: string;
} | {
  type: 'upload';
  trackId: string;
  path: string;
  name: string;
};

export type BackgroundMusicState = {
  source: BackgroundMusicSource | null;
  status: BackgroundMusicStatus;
  volume: number;
  loop: boolean;
  position: number;
  changedAt: number;
  revision: number;
};

export type BackgroundMusicCommand =
  | { type: 'select'; source: BackgroundMusicSource }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'stop' }
  | { type: 'volume'; volume: number }
  | { type: 'loop'; loop: boolean }
  | { type: 'ended' };

export type BackgroundMusicPlaybackIssue = 'autoplay' | 'load' | null;

export const INITIAL_BACKGROUND_MUSIC_STATE: BackgroundMusicState = {
  source: null,
  status: 'stopped',
  volume: 0.35,
  loop: true,
  position: 0,
  changedAt: 0,
  revision: 0,
};

const [
  useSkyroomBackgroundMusicState,
  setSkyroomBackgroundMusicState,
  backgroundMusicStateVar,
] = createUseLocalState<BackgroundMusicState>(INITIAL_BACKGROUND_MUSIC_STATE);

const [
  useSkyroomBackgroundMusicPlaybackIssue,
  setSkyroomBackgroundMusicPlaybackIssue,
] = createUseLocalState<BackgroundMusicPlaybackIssue>(null);

type CommandPublisher = (command: BackgroundMusicCommand) => Promise<void>;
type PlaybackRetry = () => Promise<void>;

let commandPublisher: CommandPublisher | null = null;
let playbackRetry: PlaybackRetry | null = null;

export const SKYROOM_BACKGROUND_MUSIC_OPEN_EVENT = 'skyroom:openBackgroundMusic';

export const openSkyroomBackgroundMusic = (): void => {
  window.dispatchEvent(new Event(SKYROOM_BACKGROUND_MUSIC_OPEN_EVENT));
};

export const setSkyroomBackgroundMusicCommandPublisher = (
  publisher: CommandPublisher | null,
): void => {
  commandPublisher = publisher;
};

export const publishSkyroomBackgroundMusicCommand = async (
  command: BackgroundMusicCommand,
): Promise<void> => {
  if (commandPublisher) await commandPublisher(command);
};

export const setSkyroomBackgroundMusicPlaybackRetry = (
  retry: PlaybackRetry | null,
): void => {
  playbackRetry = retry;
};

export const retrySkyroomBackgroundMusicPlayback = async (): Promise<void> => {
  if (playbackRetry) await playbackRetry();
};

export const getSkyroomBackgroundMusicState = (): BackgroundMusicState => (
  backgroundMusicStateVar()
);

export const getExpectedBackgroundMusicPosition = (
  state: BackgroundMusicState,
  now: number,
): number => {
  if (state.status !== 'playing' || state.changedAt <= 0) return state.position;
  return Math.max(0, state.position + ((now - state.changedAt) / 1000));
};

const sanitizeSource = (source: unknown): BackgroundMusicSource | null => {
  const candidate = parseJsonObject(source) as (Partial<BackgroundMusicSource> & {
    type?: string;
    path?: string;
    name?: string;
    trackId?: string;
  }) | null;
  if (!candidate) return null;

  if (
    candidate.type === 'default'
    && typeof candidate.trackId === 'string'
    && getBackgroundMusicCatalogTrack(candidate.trackId)
  ) {
    return { type: 'default', trackId: candidate.trackId };
  }

  if (
    candidate.type === 'upload'
    && isValidUploadTrackId(candidate.trackId)
    && typeof candidate.name === 'string'
  ) {
    return {
      type: 'upload',
      trackId: candidate.trackId,
      path: resolveBackgroundMusicStreamPath({
        path: candidate.path,
        trackId: candidate.trackId,
      }) || '',
      name: candidate.name.trim().slice(0, 120) || 'music.mp3',
    };
  }

  return null;
};

export const normalizeBackgroundMusicState = (
  payload: unknown,
): BackgroundMusicState | null => {
  const candidate = parseJsonObject(payload) as Partial<BackgroundMusicState> | null;
  if (!candidate) return null;
  const source = sanitizeSource(candidate.source);
  const validStatus = candidate.status === 'playing'
    || candidate.status === 'paused'
    || candidate.status === 'stopped';
  const volume = Number(candidate.volume);
  const position = Number(candidate.position);
  const changedAt = Number(candidate.changedAt);
  const revision = Number(candidate.revision);

  if (
    !validStatus
    || !Number.isFinite(volume)
    || !Number.isFinite(position)
    || !Number.isFinite(changedAt)
    || !Number.isFinite(revision)
  ) return null;

  if (candidate.source != null && !source) return null;

  return {
    source,
    status: source ? candidate.status as BackgroundMusicStatus : 'stopped',
    volume: Math.min(1, Math.max(0, volume)),
    loop: Boolean(candidate.loop),
    position: Math.max(0, position),
    changedAt: Math.max(0, changedAt),
    revision: Math.max(0, revision),
  };
};

export {
  setSkyroomBackgroundMusicPlaybackIssue,
  setSkyroomBackgroundMusicState,
  useSkyroomBackgroundMusicPlaybackIssue,
  useSkyroomBackgroundMusicState,
};

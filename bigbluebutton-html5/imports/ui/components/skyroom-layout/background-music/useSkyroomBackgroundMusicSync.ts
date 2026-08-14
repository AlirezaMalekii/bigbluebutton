import {
  useCallback, useEffect, useRef,
} from 'react';
import { useMutation } from '@apollo/client';
import createUseSubscription from '/imports/ui/core/hooks/createUseSubscription';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import useTimeSync from '/imports/ui/core/local-states/useTimeSync';
import logger from '/imports/startup/client/logger';
import { isSkyroomTheme } from '../panel-toggles';
import {
  SKYROOM_BACKGROUND_MUSIC_CHANNEL,
  SKYROOM_BACKGROUND_MUSIC_PERSIST,
  SKYROOM_BACKGROUND_MUSIC_PLUGIN,
  SKYROOM_BACKGROUND_MUSIC_PUSH,
  SKYROOM_BACKGROUND_MUSIC_RECORD_EVENT,
  SKYROOM_BACKGROUND_MUSIC_REPLACE,
  SKYROOM_BACKGROUND_MUSIC_SUBCHANNEL,
  SKYROOM_BACKGROUND_MUSIC_SUBSCRIPTION,
} from './graphql';
import {
  BackgroundMusicCommand,
  BackgroundMusicState,
  getExpectedBackgroundMusicPosition,
  getSkyroomBackgroundMusicState,
  normalizeBackgroundMusicState,
  setSkyroomBackgroundMusicCommandPublisher,
  setSkyroomBackgroundMusicState,
} from './state';

const ENTRY_WAIT_TIMEOUT_MS = 5000;
const VOLUME_BROADCAST_DEBOUNCE_MS = 120;

interface DataChannelRow {
  channelName: string;
  subChannelName: string;
  entryId: string;
  payloadJson?: unknown;
  updatedAt: string;
  pluginName: string;
}

const useBackgroundMusicSubscription = createUseSubscription<DataChannelRow>(
  SKYROOM_BACKGROUND_MUSIC_SUBSCRIPTION,
);

const isBackgroundMusicEntry = (
  entry: Partial<DataChannelRow>,
): entry is DataChannelRow => (
  entry.pluginName === SKYROOM_BACKGROUND_MUSIC_PLUGIN
  && entry.channelName === SKYROOM_BACKGROUND_MUSIC_CHANNEL
  && entry.subChannelName === SKYROOM_BACKGROUND_MUSIC_SUBCHANNEL
  && typeof entry.entryId === 'string'
  && typeof entry.updatedAt === 'string'
);

const buildNextState = (
  command: BackgroundMusicCommand,
  current: BackgroundMusicState,
  now: number,
  revision: number,
): BackgroundMusicState | null => {
  const anchoredPosition = getExpectedBackgroundMusicPosition(current, now);
  const base = {
    ...current,
    position: anchoredPosition,
    changedAt: now,
    revision,
  };

  switch (command.type) {
    case 'select':
      return {
        ...base,
        source: command.source,
        status: 'playing',
        position: 0,
      };
    case 'play':
      if (!current.source || current.status === 'playing') return null;
      return { ...base, status: 'playing', position: current.position };
    case 'pause':
      if (!current.source || current.status !== 'playing') return null;
      return { ...base, status: 'paused' };
    case 'stop':
      if (!current.source || (current.status === 'stopped' && current.position === 0)) return null;
      return { ...base, status: 'stopped', position: 0 };
    case 'volume': {
      const volume = Math.min(1, Math.max(0, command.volume));
      if (Math.abs(volume - current.volume) < 0.005) return null;
      return { ...base, volume };
    }
    case 'loop':
      if (command.loop === current.loop) return null;
      return { ...base, loop: command.loop };
    case 'ended':
      if (current.loop || current.status !== 'playing') return null;
      return { ...base, status: 'stopped', position: 0 };
    default:
      return null;
  }
};

export const useSkyroomBackgroundMusicSync = () => {
  const enabled = isSkyroomTheme();
  const { data: currentUser } = useCurrentUser((user) => ({
    isModerator: user.isModerator,
    presenter: user.presenter,
  }));
  const canControl = Boolean(currentUser?.isModerator || currentUser?.presenter);
  const [timeSync] = useTimeSync();
  const { data } = useBackgroundMusicSubscription();
  const [pushEntry] = useMutation(SKYROOM_BACKGROUND_MUSIC_PUSH);
  const [replaceEntry] = useMutation(SKYROOM_BACKGROUND_MUSIC_REPLACE);
  const [persistEvent] = useMutation(SKYROOM_BACKGROUND_MUSIC_PERSIST);

  const entryIdRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const creationPendingRef = useRef(false);
  const queuedStateRef = useRef<BackgroundMusicState | null>(null);
  const entryWaitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAppliedRevisionRef = useRef(0);
  const lastIssuedRevisionRef = useRef(0);
  const broadcastRef = useRef<((state: BackgroundMusicState) => Promise<void>) | null>(null);
  const volumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearEntryWaitTimer = useCallback(() => {
    if (entryWaitTimerRef.current) {
      clearTimeout(entryWaitTimerRef.current);
      entryWaitTimerRef.current = null;
    }
  }, []);

  const broadcastState = useCallback(async (state: BackgroundMusicState) => {
    if (!enabled || !canControl) return;
    if (inFlightRef.current || creationPendingRef.current) {
      queuedStateRef.current = state;
      return;
    }

    inFlightRef.current = true;
    const variables = {
      pluginName: SKYROOM_BACKGROUND_MUSIC_PLUGIN,
      channelName: SKYROOM_BACKGROUND_MUSIC_CHANNEL,
      subChannelName: SKYROOM_BACKGROUND_MUSIC_SUBCHANNEL,
      payloadJson: state,
      // Empty recipients make the entry public in BBB. Every meeting client
      // subscribes to the public channel and applies the same state locally.
      toRoles: [],
      toUserIds: [],
    };

    let stateBroadcasted = false;
    try {
      if (entryIdRef.current) {
        await replaceEntry({
          variables: {
            ...variables,
            entryId: entryIdRef.current,
          },
        });
      } else {
        creationPendingRef.current = true;
        await pushEntry({ variables });
        clearEntryWaitTimer();
        entryWaitTimerRef.current = setTimeout(() => {
          creationPendingRef.current = false;
          entryWaitTimerRef.current = null;
          logger.warn({
            logCode: 'skyroom_background_music_entry_timeout',
          }, 'Background music state entry was not observed after publishing');
          if (queuedStateRef.current) {
            const queued = queuedStateRef.current;
            queuedStateRef.current = null;
            broadcastRef.current?.(queued);
          }
        }, ENTRY_WAIT_TIMEOUT_MS);
      }
      stateBroadcasted = true;
    } catch (error) {
      creationPendingRef.current = false;
      clearEntryWaitTimer();
      logger.warn({
        logCode: 'skyroom_background_music_sync_failed',
        extraInfo: { errorMessage: `${error}` },
      }, 'Skyroom background music sync failed');
    } finally {
      if (stateBroadcasted) {
        try {
          await persistEvent({
            variables: {
              pluginName: SKYROOM_BACKGROUND_MUSIC_PLUGIN,
              eventName: SKYROOM_BACKGROUND_MUSIC_RECORD_EVENT,
              payloadJson: state,
            },
          });
        } catch (error) {
          logger.warn({
            logCode: 'skyroom_background_music_record_event_failed',
            extraInfo: { errorMessage: `${error}` },
          }, 'Background music state could not be added to the recording timeline');
        }
      }
      inFlightRef.current = false;
      if (!creationPendingRef.current && queuedStateRef.current) {
        const queued = queuedStateRef.current;
        queuedStateRef.current = null;
        broadcastRef.current?.(queued);
      }
    }
  }, [
    clearEntryWaitTimer,
    enabled,
    canControl,
    persistEvent,
    pushEntry,
    replaceEntry,
  ]);

  useEffect(() => {
    broadcastRef.current = broadcastState;
  }, [broadcastState]);

  useEffect(() => {
    if (!enabled) return;
    const latest = (data || []).filter(isBackgroundMusicEntry)[0];
    if (!latest) return;

    const normalized = normalizeBackgroundMusicState(latest.payloadJson);
    if (!normalized) {
      logger.warn({
        logCode: 'skyroom_background_music_invalid_state',
      }, 'Ignored invalid background music state');
      return;
    }

    entryIdRef.current = latest.entryId;
    creationPendingRef.current = false;
    clearEntryWaitTimer();

    if (normalized.revision >= lastAppliedRevisionRef.current) {
      lastAppliedRevisionRef.current = normalized.revision;
      lastIssuedRevisionRef.current = Math.max(
        lastIssuedRevisionRef.current,
        normalized.revision,
      );
      setSkyroomBackgroundMusicState(normalized);
    }

    if (queuedStateRef.current && !inFlightRef.current) {
      const queued = queuedStateRef.current;
      queuedStateRef.current = null;
      broadcastRef.current?.(queued);
    }
  }, [clearEntryWaitTimer, data, enabled]);

  useEffect(() => {
    if (!enabled || !canControl) {
      setSkyroomBackgroundMusicCommandPublisher(null);
      return undefined;
    }

    setSkyroomBackgroundMusicCommandPublisher(async (command) => {
      const current = getSkyroomBackgroundMusicState();
      const now = Date.now() + (timeSync || 0);
      const revision = Math.max(
        Math.floor(now),
        lastIssuedRevisionRef.current + 1,
        current.revision + 1,
      );
      const next = buildNextState(command, current, now, revision);
      if (!next) return;

      lastIssuedRevisionRef.current = revision;
      lastAppliedRevisionRef.current = revision;
      setSkyroomBackgroundMusicState(next);

      if (command.type === 'volume') {
        if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current);
        volumeTimerRef.current = setTimeout(() => {
          volumeTimerRef.current = null;
          broadcastRef.current?.(getSkyroomBackgroundMusicState());
        }, VOLUME_BROADCAST_DEBOUNCE_MS);
        return;
      }

      if (volumeTimerRef.current) {
        clearTimeout(volumeTimerRef.current);
        volumeTimerRef.current = null;
      }
      await broadcastState(next);
    });

    return () => {
      if (volumeTimerRef.current) {
        clearTimeout(volumeTimerRef.current);
        volumeTimerRef.current = null;
      }
      setSkyroomBackgroundMusicCommandPublisher(null);
    };
  }, [broadcastState, canControl, enabled, timeSync]);

  useEffect(() => () => {
    clearEntryWaitTimer();
    if (volumeTimerRef.current) clearTimeout(volumeTimerRef.current);
    setSkyroomBackgroundMusicCommandPublisher(null);
  }, [clearEntryWaitTimer]);

  return { enabled, canControl };
};

export default useSkyroomBackgroundMusicSync;

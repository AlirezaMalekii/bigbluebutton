import {
  useCallback, useEffect, useRef,
} from 'react';
import { useMutation } from '@apollo/client';
import createUseSubscription from '/imports/ui/core/hooks/createUseSubscription';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import {
  getGlobalSkyroomWebcamZoneOverrides,
  getSkyroomWebcamGlobalSyncEntryId,
  setGlobalSkyroomWebcamZones,
  setSkyroomWebcamZoneModeratorPublisher,
  setSkyroomWebcamZoneViewerContext,
} from '../webcam-zone-store';
import {
  SKYROOM_WEBCAM_ZONE_CHANNEL,
  SKYROOM_WEBCAM_ZONE_PLUGIN,
  SKYROOM_WEBCAM_ZONE_SUBCHANNEL,
} from './constants';
import { SKYROOM_WEBCAM_ZONE_PUSH, SKYROOM_WEBCAM_ZONE_REPLACE } from './mutations';
import SKYROOM_WEBCAM_ZONE_DATA_SUBSCRIPTION from './subscription';

const BROADCAST_DEBOUNCE_MS = 120;

interface DataChannelRow {
  channelName: string;
  subChannelName: string;
  entryId: string;
  payloadJson?: {
    zones?: Record<string, string>;
    version?: number;
  };
  updatedAt: string;
  pluginName: string;
}

const useSkyroomWebcamZoneDataSubscription = createUseSubscription<DataChannelRow>(
  SKYROOM_WEBCAM_ZONE_DATA_SUBSCRIPTION,
);

const isSkyroomWebcamZoneEntry = (
  entry: Partial<DataChannelRow>,
): entry is DataChannelRow => (
  entry.pluginName === SKYROOM_WEBCAM_ZONE_PLUGIN
  && entry.channelName === SKYROOM_WEBCAM_ZONE_CHANNEL
  && entry.subChannelName === SKYROOM_WEBCAM_ZONE_SUBCHANNEL
  && typeof entry.entryId === 'string'
  && typeof entry.updatedAt === 'string'
);

export const useSkyroomWebcamZoneSync = () => {
  const { data: currentUser } = useCurrentUser((user) => ({
    userId: user.userId,
    isModerator: user.isModerator,
  }));
  const isModerator = Boolean(currentUser?.isModerator);

  const { data } = useSkyroomWebcamZoneDataSubscription();
  const [pushEntry] = useMutation(SKYROOM_WEBCAM_ZONE_PUSH);
  const [replaceEntry] = useMutation(SKYROOM_WEBCAM_ZONE_REPLACE);
  const pendingBroadcast = useRef(false);
  const queuedZones = useRef<Record<string, string> | null>(null);
  const broadcastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAppliedVersion = useRef(0);

  useEffect(() => {
    setSkyroomWebcamZoneViewerContext({ isModerator });
  }, [isModerator]);

  useEffect(() => {
    const entries = (data || []).filter(isSkyroomWebcamZoneEntry);
    if (entries.length === 0) return;

    const latest = [...entries].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0];

    if (!latest?.payloadJson?.zones) return;

    const entryVersion = latest.payloadJson.version
      ?? new Date(latest.updatedAt).getTime();
    if (entryVersion <= lastAppliedVersion.current) return;

    lastAppliedVersion.current = entryVersion;
    setGlobalSkyroomWebcamZones(
      latest.payloadJson.zones,
      latest.entryId,
      latest.updatedAt,
      entryVersion,
    );
  }, [data]);

  const broadcastGlobalZones = useCallback(async (zones: Record<string, string>) => {
    if (!isModerator) return;

    if (pendingBroadcast.current) {
      queuedZones.current = zones;
      return;
    }

    pendingBroadcast.current = true;

    const version = Date.now();
    const payloadJson = {
      zones,
      version,
    };

    const variables = {
      pluginName: SKYROOM_WEBCAM_ZONE_PLUGIN,
      channelName: SKYROOM_WEBCAM_ZONE_CHANNEL,
      subChannelName: SKYROOM_WEBCAM_ZONE_SUBCHANNEL,
      payloadJson,
      toRoles: ['viewer', 'moderator'],
      toUserIds: [],
    };

    try {
      const entryId = getSkyroomWebcamGlobalSyncEntryId();
      if (entryId) {
        await replaceEntry({
          variables: {
            ...variables,
            entryId,
          },
        });
      } else {
        await pushEntry({ variables });
      }
      lastAppliedVersion.current = Math.max(lastAppliedVersion.current, version);
    } catch (error) {
      console.warn('Skyroom webcam zone sync failed', error);
    } finally {
      pendingBroadcast.current = false;
      const queued = queuedZones.current;
      queuedZones.current = null;
      if (queued) {
        broadcastGlobalZones(queued);
      }
    }
  }, [isModerator, pushEntry, replaceEntry]);

  const scheduleBroadcast = useCallback((zones: Record<string, string>) => {
    if (!isModerator) return;

    if (broadcastTimer.current) {
      clearTimeout(broadcastTimer.current);
    }

    broadcastTimer.current = setTimeout(() => {
      broadcastTimer.current = null;
      broadcastGlobalZones(zones);
    }, BROADCAST_DEBOUNCE_MS);
  }, [broadcastGlobalZones, isModerator]);

  useEffect(() => {
    if (!isModerator) {
      setSkyroomWebcamZoneModeratorPublisher(null);
      return undefined;
    }

    setSkyroomWebcamZoneModeratorPublisher((zones: Record<string, string>) => {
      scheduleBroadcast(zones ?? getGlobalSkyroomWebcamZoneOverrides());
    });

    return () => {
      setSkyroomWebcamZoneModeratorPublisher(null);
      if (broadcastTimer.current) {
        clearTimeout(broadcastTimer.current);
        broadcastTimer.current = null;
      }
    };
  }, [isModerator, scheduleBroadcast]);

  return { isModerator, userId: currentUser?.userId };
};

export default useSkyroomWebcamZoneSync;

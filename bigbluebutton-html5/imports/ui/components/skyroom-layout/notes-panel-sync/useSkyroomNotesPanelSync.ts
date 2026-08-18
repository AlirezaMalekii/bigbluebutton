import { useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@apollo/client';
import createUseSubscription from '/imports/ui/core/hooks/createUseSubscription';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import logger from '/imports/startup/client/logger';
import {
  getSkyroomNotesSyncEntryId,
  setSkyroomNotesFeatureVisible,
  setSkyroomNotesGlobalOpen,
  setSkyroomNotesSyncEntryId,
} from '../notes-panel-state';
import {
  SKYROOM_NOTES_PANEL_CHANNEL,
  SKYROOM_NOTES_PANEL_PLUGIN,
  SKYROOM_NOTES_PANEL_SUBCHANNEL,
} from './constants';
import { SKYROOM_WEBCAM_ZONE_PUSH, SKYROOM_WEBCAM_ZONE_REPLACE } from '../webcam-zone-sync/mutations';
import SKYROOM_WEBCAM_ZONE_DATA_SUBSCRIPTION from '../webcam-zone-sync/subscription';

interface DataChannelRow {
  channelName: string;
  subChannelName: string;
  entryId: string;
  payloadJson?: {
    open?: boolean;
    featureVisible?: boolean;
    version?: number;
  };
  updatedAt: string;
  pluginName: string;
}

const useSkyroomNotesPanelDataSubscription = createUseSubscription<DataChannelRow>(
  SKYROOM_WEBCAM_ZONE_DATA_SUBSCRIPTION,
);

const isSkyroomNotesPanelEntry = (
  entry: Partial<DataChannelRow>,
): entry is DataChannelRow => (
  entry.pluginName === SKYROOM_NOTES_PANEL_PLUGIN
  && entry.channelName === SKYROOM_NOTES_PANEL_CHANNEL
  && entry.subChannelName === SKYROOM_NOTES_PANEL_SUBCHANNEL
  && typeof entry.entryId === 'string'
  && typeof entry.updatedAt === 'string'
);

export const useSkyroomNotesPanelSync = () => {
  const { data: currentUser } = useCurrentUser((user) => ({
    isModerator: user.isModerator,
  }));
  const isModerator = Boolean(currentUser?.isModerator);

  const { data } = useSkyroomNotesPanelDataSubscription();
  const [pushEntry] = useMutation(SKYROOM_WEBCAM_ZONE_PUSH);
  const [replaceEntry] = useMutation(SKYROOM_WEBCAM_ZONE_REPLACE);
  const pendingBroadcast = useRef(false);
  const lastAppliedVersion = useRef(0);

  useEffect(() => {
    const entries = (data || []).filter(isSkyroomNotesPanelEntry);
    if (entries.length === 0) return;

    const latest = [...entries].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0];

    const { open, featureVisible, version } = latest?.payloadJson ?? {};

    const entryVersion = version ?? new Date(latest.updatedAt).getTime();
    if (entryVersion <= lastAppliedVersion.current) return;

    lastAppliedVersion.current = entryVersion;
    setSkyroomNotesSyncEntryId(latest.entryId);

    if (typeof featureVisible === 'boolean') {
      setSkyroomNotesFeatureVisible(featureVisible);
    }
    if (typeof open === 'boolean') {
      setSkyroomNotesGlobalOpen(open, { clearDismiss: true });
    }
  }, [data]);

  const broadcastPayload = useCallback(async (payloadJson: {
    open?: boolean;
    featureVisible?: boolean;
    version?: number;
  }) => {
    if (!isModerator || pendingBroadcast.current) return;
    pendingBroadcast.current = true;

    const version = payloadJson.version ?? Date.now();
    const payload = { ...payloadJson, version };

    const variables = {
      pluginName: SKYROOM_NOTES_PANEL_PLUGIN,
      channelName: SKYROOM_NOTES_PANEL_CHANNEL,
      subChannelName: SKYROOM_NOTES_PANEL_SUBCHANNEL,
      payloadJson: payload,
      toRoles: ['viewer', 'moderator'],
      toUserIds: [],
    };

    try {
      const entryId = getSkyroomNotesSyncEntryId();
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
      lastAppliedVersion.current = version;
    } catch (error) {
      logger.warn({
        logCode: 'skyroom_notes_panel_sync_failed',
        extraInfo: { errorMessage: `${error}` },
      }, 'Skyroom shared notes panel sync failed');
    } finally {
      pendingBroadcast.current = false;
    }
  }, [isModerator, pushEntry, replaceEntry]);

  const broadcastGlobalOpen = useCallback(async (open: boolean) => {
    await broadcastPayload({ open });
  }, [broadcastPayload]);

  const broadcastFeatureVisible = useCallback(async (featureVisible: boolean) => {
    await broadcastPayload({ featureVisible });
  }, [broadcastPayload]);

  useEffect(() => {
    if (!isModerator) return undefined;

    setSkyroomNotesModeratorBroadcast(broadcastGlobalOpen);
    setSkyroomNotesFeatureModeratorBroadcast(broadcastFeatureVisible);

    return () => {
      setSkyroomNotesModeratorBroadcast(null);
      setSkyroomNotesFeatureModeratorBroadcast(null);
    };
  }, [isModerator, broadcastGlobalOpen, broadcastFeatureVisible]);

  return { isModerator };
};

let moderatorBroadcast: ((open: boolean) => void) | null = null;
let featureModeratorBroadcast: ((visible: boolean) => void) | null = null;

export const setSkyroomNotesModeratorBroadcast = (
  fn: ((open: boolean) => void) | null,
): void => {
  moderatorBroadcast = fn;
};

export const setSkyroomNotesFeatureModeratorBroadcast = (
  fn: ((visible: boolean) => void) | null,
): void => {
  featureModeratorBroadcast = fn;
};

export const broadcastSkyroomNotesGlobalOpen = (open: boolean): void => {
  moderatorBroadcast?.(open);
};

export const broadcastSkyroomNotesFeatureVisible = (visible: boolean): void => {
  featureModeratorBroadcast?.(visible);
};

export default useSkyroomNotesPanelSync;

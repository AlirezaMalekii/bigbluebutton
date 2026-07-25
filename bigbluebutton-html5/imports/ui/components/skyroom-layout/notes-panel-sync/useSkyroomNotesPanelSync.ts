import { useCallback, useEffect, useRef } from 'react';
import { useMutation } from '@apollo/client';
import createUseSubscription from '/imports/ui/core/hooks/createUseSubscription';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import logger from '/imports/startup/client/logger';
import {
  getSkyroomNotesSyncEntryId,
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

    const { open, version } = latest?.payloadJson ?? {};
    if (typeof open !== 'boolean') return;

    const entryVersion = version ?? new Date(latest.updatedAt).getTime();
    if (entryVersion <= lastAppliedVersion.current) return;

    lastAppliedVersion.current = entryVersion;
    setSkyroomNotesSyncEntryId(latest.entryId);
    setSkyroomNotesGlobalOpen(open, { clearDismiss: true });
  }, [data]);

  const broadcastGlobalOpen = useCallback(async (open: boolean) => {
    if (!isModerator || pendingBroadcast.current) return;
    pendingBroadcast.current = true;

    const version = Date.now();
    const payloadJson = { open, version };

    const variables = {
      pluginName: SKYROOM_NOTES_PANEL_PLUGIN,
      channelName: SKYROOM_NOTES_PANEL_CHANNEL,
      subChannelName: SKYROOM_NOTES_PANEL_SUBCHANNEL,
      payloadJson,
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

  useEffect(() => {
    if (!isModerator) return undefined;

    setSkyroomNotesModeratorBroadcast(broadcastGlobalOpen);

    return () => setSkyroomNotesModeratorBroadcast(null);
  }, [isModerator, broadcastGlobalOpen]);

  return { isModerator };
};

let moderatorBroadcast: ((open: boolean) => void) | null = null;

export const setSkyroomNotesModeratorBroadcast = (
  fn: ((open: boolean) => void) | null,
): void => {
  moderatorBroadcast = fn;
};

export const broadcastSkyroomNotesGlobalOpen = (open: boolean): void => {
  moderatorBroadcast?.(open);
};

export default useSkyroomNotesPanelSync;

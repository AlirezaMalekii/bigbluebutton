/** Skyroom webcam zone overrides — global (moderator) + local (viewer self). */

import Storage from '/imports/ui/services/storage/session';
import { getSkyroomWebcamLayout } from './webcam-bounds-store';

export const SKYROOM_WEBCAM_ZONES = {
  SIDEBAR: 'sidebar',
  STAGE: 'stage',
  CENTER: 'center',
};

const LOCAL_ZONES_STORAGE_KEY = 'skyroomLocalWebcamZones';

let globalZoneOverrides = {};
let localZoneOverrides = {};
let globalSyncEntryId = null;
let globalSyncUpdatedAt = 0;
let isDraggingWebcam = false;
/** @type {{
 * streamKey: string,
 * sourceZone: string,
 * targetZone: string|null,
 * clientX: number,
 * clientY: number,
 * offsetX: number,
 * offsetY: number,
 * } | null}
 */
let dragPreview = null;
let onModeratorZonesChanged = null;
/** When false (viewers), personal local overrides sit on top of the moderator layout. */
let viewerContext = { isModerator: false };
const listeners = new Set();

const readLocalZonesFromStorage = () => {
  try {
    const stored = Storage.getItem(LOCAL_ZONES_STORAGE_KEY);
    if (stored && typeof stored === 'object') return stored;
  } catch (e) {
    // ignore corrupt session data
  }
  return {};
};

localZoneOverrides = readLocalZonesFromStorage();

const persistLocalZones = () => {
  Storage.setItem(LOCAL_ZONES_STORAGE_KEY, localZoneOverrides);
};

const notify = () => {
  listeners.forEach((fn) => fn());
};

export const SKYROOM_WEBCAM_LAYOUT_EVENT = 'skyroom-webcam-layout';

const requestLayoutRefresh = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('resize'));
  window.dispatchEvent(new CustomEvent(SKYROOM_WEBCAM_LAYOUT_EVENT));
};

export const subscribeSkyroomWebcamZones = (fn) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const getGlobalSkyroomWebcamZoneOverrides = () => ({ ...globalZoneOverrides });

export const getLocalSkyroomWebcamZoneOverrides = () => ({ ...localZoneOverrides });

export const setSkyroomWebcamZoneViewerContext = ({ isModerator = false } = {}) => {
  const next = Boolean(isModerator);
  if (viewerContext.isModerator === next) return;
  viewerContext = { isModerator: next };
  notify();
  requestLayoutRefresh();
};

export const isSkyroomWebcamZoneModeratorView = () => viewerContext.isModerator;

/**
 * Moderators see the shared (global) layout.
 * Viewers inherit the global layout but may place their own webcam locally on top.
 */
export const getSkyroomWebcamZoneOverrides = () => {
  if (viewerContext.isModerator) {
    return { ...globalZoneOverrides };
  }
  return {
    ...globalZoneOverrides,
    ...localZoneOverrides,
  };
};

export const getSkyroomWebcamZone = (streamKey) => {
  if (!viewerContext.isModerator && localZoneOverrides[streamKey]) {
    return localZoneOverrides[streamKey];
  }
  if (globalZoneOverrides[streamKey]) return globalZoneOverrides[streamKey];
  return localZoneOverrides[streamKey] || null;
};

export const getSkyroomWebcamGlobalSyncEntryId = () => globalSyncEntryId;

export const setSkyroomWebcamZoneModeratorPublisher = (handler) => {
  onModeratorZonesChanged = handler ?? null;
};

const pruneLocalOverridesForGlobalChange = (previousGlobal, nextGlobal) => {
  let localChanged = false;
  const keys = new Set([
    ...Object.keys(previousGlobal || {}),
    ...Object.keys(nextGlobal || {}),
  ]);

  keys.forEach((key) => {
    if (previousGlobal?.[key] !== nextGlobal?.[key] && localZoneOverrides[key]) {
      delete localZoneOverrides[key];
      localChanged = true;
    }
  });

  if (localChanged) {
    persistLocalZones();
  }
};

export const setGlobalSkyroomWebcamZones = (
  zones,
  entryId,
  updatedAt,
  payloadVersion,
) => {
  const nextUpdatedAt = updatedAt ? new Date(updatedAt).getTime() : Date.now();
  const version = payloadVersion ?? nextUpdatedAt;
  if (version > 0 && version <= globalSyncUpdatedAt) return;

  const previousGlobal = globalZoneOverrides;
  globalZoneOverrides = { ...(zones || {}) };
  pruneLocalOverridesForGlobalChange(previousGlobal, globalZoneOverrides);
  if (entryId) globalSyncEntryId = entryId;
  if (version > 0) globalSyncUpdatedAt = version;
  notify();
  requestLayoutRefresh();
};

export const setSkyroomWebcamZone = (streamKey, zone, { isModerator = false } = {}) => {
  if (!streamKey) return;

  const isValidZone = zone && Object.values(SKYROOM_WEBCAM_ZONES).includes(zone);

  if (zone === SKYROOM_WEBCAM_ZONES.CENTER) {
    const layout = getSkyroomWebcamLayout();
    if (layout?.stageMediaOpen || layout?.centerDropEnabled === false) {
      return;
    }
  }

  if (isModerator) {
    if (!isValidZone) {
      if (!globalZoneOverrides[streamKey]) return;
      const next = { ...globalZoneOverrides };
      delete next[streamKey];
      globalZoneOverrides = next;
    } else if (globalZoneOverrides[streamKey] === zone) {
      notify();
      requestLayoutRefresh();
      return;
    } else {
      globalZoneOverrides = { ...globalZoneOverrides, [streamKey]: zone };
    }
    notify();
    requestLayoutRefresh();
    onModeratorZonesChanged?.({ ...globalZoneOverrides });
    return;
  }

  if (!isValidZone) {
    if (!localZoneOverrides[streamKey]) return;
    const next = { ...localZoneOverrides };
    delete next[streamKey];
    localZoneOverrides = next;
    persistLocalZones();
    notify();
    requestLayoutRefresh();
    return;
  }

  if (localZoneOverrides[streamKey] === zone) {
    notify();
    requestLayoutRefresh();
    return;
  }
  localZoneOverrides = { ...localZoneOverrides, [streamKey]: zone };
  persistLocalZones();
  notify();
  requestLayoutRefresh();
};

export const clearSkyroomWebcamZones = () => {
  globalZoneOverrides = {};
  localZoneOverrides = {};
  globalSyncEntryId = null;
  globalSyncUpdatedAt = 0;
  viewerContext = { isModerator: false };
  isDraggingWebcam = false;
  dragPreview = null;
  Storage.removeItem(LOCAL_ZONES_STORAGE_KEY);
  notify();
};

export const getSkyroomWebcamDragPreview = () => dragPreview;

export const setSkyroomWebcamDragPreview = (preview) => {
  const next = preview
    ? {
      streamKey: preview.streamKey,
      sourceZone: preview.sourceZone,
      targetZone: preview.targetZone ?? null,
      clientX: preview.clientX,
      clientY: preview.clientY,
      offsetX: preview.offsetX,
      offsetY: preview.offsetY,
    }
    : null;

  if (!dragPreview && !next) return;

  const layoutDirty = !dragPreview
    || !next
    || dragPreview.streamKey !== next.streamKey
    || dragPreview.sourceZone !== next.sourceZone
    || dragPreview.targetZone !== next.targetZone;

  const visuallyUnchanged = dragPreview
    && next
    && dragPreview.streamKey === next.streamKey
    && dragPreview.sourceZone === next.sourceZone
    && dragPreview.targetZone === next.targetZone
    && dragPreview.clientX === next.clientX
    && dragPreview.clientY === next.clientY;

  if (visuallyUnchanged) return;

  dragPreview = next;
  notify();
  if (layoutDirty) {
    requestLayoutRefresh();
  }
};

export const clearSkyroomWebcamDragPreview = () => {
  if (!dragPreview) return;
  dragPreview = null;
  notify();
  requestLayoutRefresh();
};

export const setSkyroomWebcamDragging = (dragging) => {
  if (isDraggingWebcam === dragging) return;
  isDraggingWebcam = dragging;
  if (!dragging) {
    dragPreview = null;
  }
  notify();
  requestLayoutRefresh();
};

export const getSkyroomWebcamDragging = () => isDraggingWebcam;

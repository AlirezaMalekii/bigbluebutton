import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { InstancePresenceRecordType } from '@bigbluebutton/tldraw';
import { useMergedCursorData } from './hooks.ts';

const hasSamePresence = (current, next) => (
  current?.currentPageId === next.currentPageId
  && current?.userId === next.userId
  && current?.userName === next.userName
  && current?.color === next.color
  && current?.cursor?.x === next.cursor?.x
  && current?.cursor?.y === next.cursor?.y
  && current?.cursor?.type === next.cursor?.type
  && current?.cursor?.rotation === next.cursor?.rotation
);

/**
 * Keep the high-frequency cursor subscription outside the main Whiteboard
 * component. Presence updates go straight to the tldraw store and therefore
 * do not re-render the full editor on every cursor packet.
 */
const WhiteboardCursorPresenceSync = ({
  editor,
  currentPageId,
  currentUserId,
  currentUserIsPresenter,
  hideViewersCursor,
  isMultiUserActive,
  whiteboardWriters,
}) => {
  const otherCursors = useMergedCursorData();
  const knownPresenceIdsRef = useRef(new Set());
  const initializedEditorRef = useRef(null);

  useEffect(() => {
    if (!editor || !currentPageId) return;

    if (initializedEditorRef.current !== editor) {
      initializedEditorRef.current = editor;
      knownPresenceIdsRef.current = new Set(
        editor.store.allRecords()
          .filter((record) => (
            record.id.startsWith('instance_presence:')
            && record.userId !== currentUserId
          ))
          .map((record) => record.id),
      );
    }

    const writerIds = new Set(whiteboardWriters.map((writer) => writer.userId));
    const nextPresenceIds = new Set();
    const recordsToPut = [];
    const idsToRemove = new Set();

    otherCursors.forEach(({
      userId,
      xPercent,
      yPercent,
      presenter,
      name,
      isModerator: cursorIsModerator,
    }) => {
      const id = InstancePresenceRecordType.createId(userId);
      const active = xPercent !== -1 && yPercent !== -1;
      const canDisplay = userId !== currentUserId
        && writerIds.has(userId)
        && active
        && !(hideViewersCursor && !cursorIsModerator && !currentUserIsPresenter)
        && (presenter || isMultiUserActive);

      if (!canDisplay) {
        idsToRemove.add(id);
        return;
      }

      nextPresenceIds.add(id);
      const nextPresence = {
        ...InstancePresenceRecordType.create({
          id,
          currentPageId: `page:${currentPageId}`,
          userId,
          userName: name,
          cursor: {
            x: xPercent,
            y: yPercent,
            type: 'default',
            rotation: 0,
          },
          color: presenter ? '#FF0000' : '#70DB70',
        }),
        lastActivityTimestamp: Date.now(),
      };
      const currentPresence = editor.store.get(id);
      if (!hasSamePresence(currentPresence, nextPresence)) {
        recordsToPut.push(nextPresence);
      }
    });

    const currentUserPresenceId = currentUserId
      ? InstancePresenceRecordType.createId(currentUserId)
      : null;
    knownPresenceIdsRef.current.forEach((id) => {
      if (id === currentUserPresenceId) return;
      if (!nextPresenceIds.has(id)) idsToRemove.add(id);
    });
    nextPresenceIds.forEach((id) => idsToRemove.delete(id));

    if (idsToRemove.size > 0 || recordsToPut.length > 0) {
      editor.store.mergeRemoteChanges(() => {
        if (idsToRemove.size > 0) editor.store.remove([...idsToRemove]);
        if (recordsToPut.length > 0) editor.store.put(recordsToPut);
      });
    }

    knownPresenceIdsRef.current = nextPresenceIds;
  }, [
    currentPageId,
    currentUserId,
    currentUserIsPresenter,
    editor,
    hideViewersCursor,
    isMultiUserActive,
    otherCursors,
    whiteboardWriters,
  ]);

  return null;
};

WhiteboardCursorPresenceSync.propTypes = {
  editor: PropTypes.shape({
    store: PropTypes.shape({
      allRecords: PropTypes.func.isRequired,
      get: PropTypes.func.isRequired,
      mergeRemoteChanges: PropTypes.func.isRequired,
      put: PropTypes.func.isRequired,
      remove: PropTypes.func.isRequired,
    }).isRequired,
  }),
  currentPageId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  currentUserId: PropTypes.string,
  currentUserIsPresenter: PropTypes.bool,
  hideViewersCursor: PropTypes.bool,
  isMultiUserActive: PropTypes.bool.isRequired,
  whiteboardWriters: PropTypes.arrayOf(PropTypes.shape({
    userId: PropTypes.string.isRequired,
  })).isRequired,
};

WhiteboardCursorPresenceSync.defaultProps = {
  editor: null,
  currentPageId: null,
  currentUserId: null,
  currentUserIsPresenter: false,
  hideViewersCursor: false,
};

export default React.memo(WhiteboardCursorPresenceSync);

import React, { useCallback, useRef } from 'react';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import {
  clearSkyroomWebcamDragPreview,
  setSkyroomWebcamDragPreview,
  setSkyroomWebcamDragging,
  setSkyroomWebcamZone,
  SKYROOM_WEBCAM_ZONES,
} from '../webcam-zone-store';

const DRAG_THRESHOLD_PX = 6;

const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest(
    'button, [role="button"], a, input, select, textarea, [class*="MenuWrapper"], [class*="Dropdown"]',
  ));
};

const resolveDropZone = (clientX: number, clientY: number) => {
  const elements = document.elementsFromPoint(clientX, clientY);
  for (let i = 0; i < elements.length; i += 1) {
    const zone = elements[i].closest('[data-skyroom-drop-zone]')
      ?.getAttribute('data-skyroom-drop-zone');
    if (zone && Object.values(SKYROOM_WEBCAM_ZONES).includes(zone)) {
      return zone;
    }
  }
  return null;
};

interface SkyroomWebcamZoneDragProps {
  streamKey: string;
  sourceZone: string;
  enabled: boolean;
  isOwnStream: boolean;
  children: React.ReactNode;
}

const SkyroomWebcamZoneDrag: React.FC<SkyroomWebcamZoneDragProps> = ({
  streamKey,
  sourceZone,
  enabled,
  isOwnStream,
  children,
}) => {
  const { data: currentUser } = useCurrentUser((user) => ({
    isModerator: user.isModerator,
  }));
  const isModerator = Boolean(currentUser?.isModerator);
  const canDrag = enabled && (isModerator || isOwnStream);
  const dragStateRef = useRef({
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    active: false,
  });

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!canDrag || event.button !== 0 || isInteractiveTarget(event.target)) return;

    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      active: false,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const state = dragStateRef.current;

      if (!state.active) {
        const dx = Math.abs(moveEvent.clientX - state.startX);
        const dy = Math.abs(moveEvent.clientY - state.startY);
        if (dx < DRAG_THRESHOLD_PX && dy < DRAG_THRESHOLD_PX) return;
        state.active = true;
        setSkyroomWebcamDragging(true);
        setSkyroomWebcamDragPreview({
          streamKey,
          sourceZone,
          targetZone: null,
          clientX: moveEvent.clientX,
          clientY: moveEvent.clientY,
          offsetX: state.offsetX,
          offsetY: state.offsetY,
        });
      }

      const hoverZone = resolveDropZone(moveEvent.clientX, moveEvent.clientY);
      setSkyroomWebcamDragPreview({
        streamKey,
        sourceZone,
        targetZone: hoverZone,
        clientX: moveEvent.clientX,
        clientY: moveEvent.clientY,
        offsetX: state.offsetX,
        offsetY: state.offsetY,
      });
    };

    const finish = (endEvent: PointerEvent) => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);

      const state = dragStateRef.current;
      if (!state.active) return;

      const zone = resolveDropZone(endEvent.clientX, endEvent.clientY);
      if (zone) {
        setSkyroomWebcamZone(streamKey, zone, { isModerator });
      }

      clearSkyroomWebcamDragPreview();
      setSkyroomWebcamDragging(false);
      dragStateRef.current.active = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  }, [canDrag, isModerator, sourceZone, streamKey]);

  if (!canDrag) {
    return <>{children}</>;
  }

  return (
    <div
      className="skyroom-webcam-zone-drag"
      onPointerDown={handlePointerDown}
      style={{
        width: '100%',
        height: '100%',
        touchAction: 'none',
        cursor: 'grab',
      }}
    >
      {children}
    </div>
  );
};

export default SkyroomWebcamZoneDrag;

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getSkyroomWebcamDragPreview,
  subscribeSkyroomWebcamZones,
} from '../webcam-zone-store';
import { SKYROOM_WEBCAM_TILE_H, SKYROOM_WEBCAM_TILE_W } from '../camera-placement';

interface SkyroomWebcamDragLayerProps {
  renderFloatingTile: (streamKey: string) => React.ReactNode;
}

const SkyroomWebcamDragLayer: React.FC<SkyroomWebcamDragLayerProps> = ({
  renderFloatingTile,
}) => {
  const [preview, setPreview] = useState(getSkyroomWebcamDragPreview());

  useEffect(() => {
    const unsubscribe = subscribeSkyroomWebcamZones(() => {
      setPreview(getSkyroomWebcamDragPreview());
    });
    return unsubscribe;
  }, []);

  if (!preview || typeof document === 'undefined') return null;

  const left = preview.clientX - preview.offsetX;
  const top = preview.clientY - preview.offsetY;

  return createPortal(
    <div
      className="skyroom-webcam-drag-layer"
      data-test="skyroomWebcamDragLayer"
      style={{
        position: 'fixed',
        left,
        top,
        width: SKYROOM_WEBCAM_TILE_W,
        height: SKYROOM_WEBCAM_TILE_H,
        zIndex: 10001,
        pointerEvents: 'none',
      }}
    >
      {renderFloatingTile(preview.streamKey)}
    </div>,
    document.body,
  );
};

export default SkyroomWebcamDragLayer;

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { defineMessages, useIntl } from 'react-intl';
import { getSkyroomWebcamLayout } from '../webcam-bounds-store';
import {
  SKYROOM_WEBCAM_ZONES,
  getSkyroomWebcamDragging,
  subscribeSkyroomWebcamZones,
} from '../webcam-zone-store';
import Styled from '../webcam-drop-zones/styles';

const intlMessages = defineMessages({
  sidebarZone: {
    id: 'app.skyroom.webcamZone.sidebar',
    description: 'Drop zone above users panel',
  },
  stageZone: {
    id: 'app.skyroom.webcamZone.stage',
    description: 'Drop zone at top of page for viewer webcams',
  },
  centerZone: {
    id: 'app.skyroom.webcamZone.center',
    description: 'Drop zone in central presentation or whiteboard area',
  },
});

interface Bounds {
  top: number;
  left?: number | null;
  right?: number | null;
  width: number;
  height: number;
}

const toZoneStyle = (bounds: Bounds | null | undefined): React.CSSProperties | null => {
  if (!bounds) return null;
  return {
    position: 'fixed',
    top: bounds.top,
    left: bounds.left ?? undefined,
    right: bounds.right ?? undefined,
    width: bounds.width,
    height: bounds.height,
  };
};

const SkyroomWebcamDropZones: React.FC = () => {
  const intl = useIntl();
  const [dragging, setDragging] = useState(getSkyroomWebcamDragging());
  const [layout, setLayout] = useState(getSkyroomWebcamLayout());

  useEffect(() => {
    const unsubscribe = subscribeSkyroomWebcamZones(() => {
      setDragging(getSkyroomWebcamDragging());
      setLayout(getSkyroomWebcamLayout());
    });
    return unsubscribe;
  }, []);

  const layoutEl = typeof document !== 'undefined' ? document.getElementById('layout') : null;
  if (!layoutEl || !layout) return null;

  const sidebarDropStyle = toZoneStyle(layout.sidebarDrop ?? layout.sidebar);
  const stageStripStyle = toZoneStyle(layout.stageStrip);
  const centerStyle = toZoneStyle(layout.centerDrop ?? layout.center);

  const zones = [
    sidebarDropStyle && layout.sidebarDropEnabled ? {
      id: SKYROOM_WEBCAM_ZONES.SIDEBAR,
      style: sidebarDropStyle,
      label: intl.formatMessage(intlMessages.sidebarZone),
    } : null,
    stageStripStyle ? {
      id: SKYROOM_WEBCAM_ZONES.STAGE,
      style: stageStripStyle,
      label: intl.formatMessage(intlMessages.stageZone),
    } : null,
    centerStyle && layout.centerDropEnabled ? {
      id: SKYROOM_WEBCAM_ZONES.CENTER,
      style: centerStyle,
      label: intl.formatMessage(intlMessages.centerZone),
    } : null,
  ].filter(Boolean) as { id: string; style: React.CSSProperties; label: string }[];

  if (zones.length === 0) return null;

  return createPortal(
    <Styled.Overlay $active={dragging}>
      {zones.map((zone) => (
        <Styled.Zone
          key={zone.id}
          data-skyroom-drop-zone={zone.id}
          data-test={`skyroomWebcamDropZone-${zone.id}`}
          style={zone.style}
          $active={dragging}
        >
          <Styled.ZoneLabel $active={dragging}>{zone.label}</Styled.ZoneLabel>
        </Styled.Zone>
      ))}
    </Styled.Overlay>,
    layoutEl,
  );
};

export default SkyroomWebcamDropZones;

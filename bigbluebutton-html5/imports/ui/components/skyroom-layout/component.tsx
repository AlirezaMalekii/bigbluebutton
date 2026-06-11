import React from 'react';
import useSkyroomColumnLayout from './hook';
import SkyroomSharedNotesColumn from './shared-notes-column/component';
import useSkyroomWebcamZoneSync from './webcam-zone-sync/useSkyroomWebcamZoneSync';
import useSkyroomNotesPanelSync from './notes-panel-sync/useSkyroomNotesPanelSync';

/**
 * Mounts Skyroom column layout behaviour and optional shared-notes column.
 */
const SkyroomColumnController: React.FC = () => {
  useSkyroomColumnLayout();
  useSkyroomWebcamZoneSync();
  useSkyroomNotesPanelSync();
  return <SkyroomSharedNotesColumn />;
};

export default SkyroomColumnController;

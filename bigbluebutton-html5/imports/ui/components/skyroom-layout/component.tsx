import React from 'react';
import useSkyroomColumnLayout from './hook';
import SkyroomSharedNotesColumn from './shared-notes-column/component';
import SkyroomMobileZoneTabs from './mobile-zone-tabs/component';
import SkyroomMobileZoneFullscreenButtons from './mobile-zone-fullscreen/component';
import SkyroomMobileStatusRail from './mobile-status-rail/component';
import SkyroomMobileTalkingRail from './mobile-talking-rail/component';
import useGuestWaitingAutoFocus from './guest-waiting-auto-focus/hook';
import useSkyroomWebcamZoneSync from './webcam-zone-sync/useSkyroomWebcamZoneSync';
import useSkyroomNotesPanelSync from './notes-panel-sync/useSkyroomNotesPanelSync';
import useSkyroomMobileLayoutLoading from './loading/useSkyroomMobileLayoutLoading';

/**
 * Mounts Skyroom column layout behaviour, the shared-notes column, and the
 * mobile bottom-zone tab bar.
 */
const SkyroomColumnController: React.FC = () => {
  useSkyroomColumnLayout();
  useSkyroomWebcamZoneSync();
  useSkyroomNotesPanelSync();
  useSkyroomMobileLayoutLoading();
  useGuestWaitingAutoFocus();
  return (
    <>
      <SkyroomSharedNotesColumn />
      <SkyroomMobileZoneTabs />
      <SkyroomMobileZoneFullscreenButtons />
      <SkyroomMobileTalkingRail />
      <SkyroomMobileStatusRail />
    </>
  );
};

export default SkyroomColumnController;

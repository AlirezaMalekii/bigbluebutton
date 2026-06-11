import { useEffect, useState } from 'react';
import { layoutDispatch, layoutSelectInput } from '/imports/ui/components/layout/context';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import { Input } from '/imports/ui/components/layout/layoutTypes';
import { ACTIONS, CAMERADOCK_POSITION, PANELS } from '/imports/ui/components/layout/enums';
import Session from '/imports/ui/services/storage/in-memory';
import deviceInfo from '/imports/utils/deviceInfo';
import { SKYROOM_COLUMN_ATTR } from './column-layout';
import { clearSkyroomWebcamLayout } from './webcam-bounds-store';
import { clearSkyroomWebcamZones } from './webcam-zone-store';
import { isPublicChatOpen, isSkyroomNotesOpen } from './panel-toggles';
import { subscribeSkyroomNotesOpen } from './notes-panel-state';
import {
  applySkyroomWhiteLabelSettings,
  startSkyroomWhiteLabelDomWatch,
  stopSkyroomWhiteLabelDomWatch,
} from './white-label';

const syncSkyroomLayoutAttributes = (
  layoutEl: HTMLElement | null,
  usersOpen: boolean,
  chatOpen: boolean,
  notesOpen: boolean,
) => {
  if (!layoutEl) return;

  layoutEl.setAttribute('data-skyroom-users-visible', usersOpen ? 'true' : 'false');
  layoutEl.setAttribute('data-skyroom-chat-visible', chatOpen ? 'true' : 'false');
  layoutEl.setAttribute('data-skyroom-notes-visible', notesOpen ? 'true' : 'false');
  layoutEl.setAttribute(
    'data-skyroom-stage-full',
    (!usersOpen && !chatOpen && !notesOpen) ? 'true' : 'false',
  );
};

export const useSkyroomColumnLayout = () => {
  const layoutContextDispatch = layoutDispatch();
  const sidebarNavigation = layoutSelectInput((i: Input) => i.sidebarNavigation);
  const sidebarContent = layoutSelectInput((i: Input) => i.sidebarContent);
  const hasScreenShare = layoutSelectInput((i: Input) => i.screenShare.hasScreenShare);
  const numCameras = layoutSelectInput((i: Input) => i.cameraDock.numCameras);
  const presentationIsOpen = layoutSelectInput((i: Input) => i.presentation.isOpen);
  const { data: meetingData } = useMeeting((m) => ({
    componentsFlags: m.componentsFlags,
  }));
  const hasActiveScreenShare = hasScreenShare
    || Boolean(meetingData?.componentsFlags?.hasScreenshare);

  const usersOpen = sidebarNavigation.isOpen;
  const chatOpen = isPublicChatOpen(sidebarContent);
  const [notesOpen, setNotesOpen] = useState(isSkyroomNotesOpen);
  const screenshareMinimized = hasActiveScreenShare && !presentationIsOpen;

  useEffect(() => subscribeSkyroomNotesOpen(setNotesOpen), []);

  useEffect(() => {
    applySkyroomWhiteLabelSettings();
    startSkyroomWhiteLabelDomWatch();

    const layoutEl = document.getElementById('layout');
    if (layoutEl) {
      layoutEl.setAttribute(SKYROOM_COLUMN_ATTR, 'true');
      layoutEl.style.setProperty('--user-list-bg', '#121a28');
      layoutEl.style.setProperty('--color-content-background', '#101824');
      layoutEl.style.setProperty('--list-item-bg-hover', 'rgba(20, 169, 158, 0.12)');
      layoutEl.style.setProperty('--user-list-text', '#eef4fb');
      layoutEl.style.setProperty('--color-gray', '#aab6c7');
      layoutEl.style.setProperty('--color-gray-dark', '#eef4fb');
      layoutEl.style.setProperty('--color-text', '#d6dfeb');
    }

    document.documentElement.setAttribute('data-theme', 'dark');

    const openSkyroomColumn = () => {
      if (deviceInfo.isPhone) return;

      layoutContextDispatch({
        type: ACTIONS.SET_SIDEBAR_NAVIGATION_IS_OPEN,
        value: true,
      });
      layoutContextDispatch({
        type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN,
        value: true,
      });

      const PUBLIC_CHAT_ID = window.meetingClientSettings.public.chat.public_group_id;
      layoutContextDispatch({
        type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL,
        value: PANELS.CHAT,
      });
      layoutContextDispatch({
        type: ACTIONS.SET_ID_CHAT_OPEN,
        value: PUBLIC_CHAT_ID,
      });

      layoutContextDispatch({
        type: ACTIONS.SET_CAMERA_DOCK_POSITION,
        value: CAMERADOCK_POSITION.SIDEBAR_CONTENT_BOTTOM,
      });
    };

    openSkyroomColumn();

    const interval = window.setInterval(() => {
      if (Session.equals('layoutReady', true)) {
        openSkyroomColumn();
        window.dispatchEvent(new Event('resize'));
        window.clearInterval(interval);
      }
    }, 100);

    return () => {
      stopSkyroomWhiteLabelDomWatch();
      window.clearInterval(interval);
      if (layoutEl) {
        layoutEl.removeAttribute(SKYROOM_COLUMN_ATTR);
        layoutEl.removeAttribute('data-skyroom-users-visible');
        layoutEl.removeAttribute('data-skyroom-chat-visible');
        layoutEl.removeAttribute('data-skyroom-notes-visible');
        layoutEl.removeAttribute('data-skyroom-stage-full');
        layoutEl.removeAttribute('data-skyroom-presentation-minimized');
        layoutEl.removeAttribute('data-skyroom-stage-webcams');
        layoutEl.removeAttribute('data-skyroom-sidebar-webcam');
        layoutEl.removeAttribute('data-skyroom-split-cameras');
        layoutEl.removeAttribute('data-skyroom-webcam-float');
        layoutEl.style.removeProperty('--skyroom-sidebar-webcam-top');
        layoutEl.style.removeProperty('--skyroom-sidebar-webcam-left');
        layoutEl.style.removeProperty('--skyroom-sidebar-webcam-right');
        layoutEl.style.removeProperty('--skyroom-sidebar-webcam-width');
        layoutEl.style.removeProperty('--skyroom-sidebar-webcam-height');
        layoutEl.style.removeProperty('--skyroom-screenshare-top');
        layoutEl.style.removeProperty('--skyroom-screenshare-height');
        layoutEl.style.removeProperty('--skyroom-stage-webcam-height');
        layoutEl.style.removeProperty('--skyroom-stage-webcam-top');
        layoutEl.style.removeProperty('--skyroom-stage-webcam-left');
        layoutEl.style.removeProperty('--skyroom-stage-webcam-right');
        layoutEl.style.removeProperty('--skyroom-stage-webcam-width');
        clearSkyroomWebcamLayout();
        clearSkyroomWebcamZones();
        layoutEl.style.removeProperty('--user-list-bg');
        layoutEl.style.removeProperty('--color-content-background');
        layoutEl.style.removeProperty('--list-item-bg-hover');
        layoutEl.style.removeProperty('--user-list-text');
        layoutEl.style.removeProperty('--color-gray');
        layoutEl.style.removeProperty('--color-gray-dark');
        layoutEl.style.removeProperty('--color-text');
      }
    };
  }, [layoutContextDispatch]);

  useEffect(() => {
    const layoutEl = document.getElementById('layout');
    syncSkyroomLayoutAttributes(layoutEl, usersOpen, chatOpen, notesOpen);
    if (layoutEl) {
      if (hasActiveScreenShare) {
        layoutEl.setAttribute('data-skyroom-screen-share', 'true');
      } else {
        layoutEl.removeAttribute('data-skyroom-screen-share');
      }
      if (screenshareMinimized) {
        layoutEl.setAttribute('data-skyroom-presentation-minimized', 'true');
      } else {
        layoutEl.removeAttribute('data-skyroom-presentation-minimized');
      }
    }
    window.dispatchEvent(new Event('resize'));
  }, [usersOpen, chatOpen, notesOpen, hasActiveScreenShare, screenshareMinimized, numCameras, presentationIsOpen]);
};

export default useSkyroomColumnLayout;

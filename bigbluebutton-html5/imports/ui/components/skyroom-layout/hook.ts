import { useEffect, useRef, useState } from 'react';
import { layoutDispatch, layoutSelectInput } from '/imports/ui/components/layout/context';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import { Input } from '/imports/ui/components/layout/layoutTypes';
import { ACTIONS, CAMERADOCK_POSITION, PANELS } from '/imports/ui/components/layout/enums';
import Session from '/imports/ui/services/storage/in-memory';
import { SKYROOM_COLUMN_ATTR } from './column-layout';
import { clearSkyroomWebcamLayout } from './webcam-bounds-store';
import { clearSkyroomWebcamZones } from './webcam-zone-store';
import {
  isPublicChatOpen,
  isSkyroomNotesOpen,
  isSkyroomMobileViewport,
  openSkyroomMobileBox,
} from './panel-toggles';
import { useLayoutWebcamCount } from '/imports/ui/components/video-provider/hooks';
import { useVideoState } from '/imports/ui/components/video-provider/state';
import { subscribeSkyroomNotesOpen } from './notes-panel-state';
import {
  getSkyroomMobileActiveBox,
  setSkyroomMobileActiveBox,
} from './mobile-bottom-state';
import { setSkyroomMobileZoneFullscreen } from './mobile-zone-fullscreen-state';
import { resetSkyroomMobileStatusRail } from './mobile-status-rail-state';
import { resetSkyroomMobileTalkingRail } from './mobile-talking-rail-state';
import {
  applySkyroomWhiteLabelSettings,
  startSkyroomWhiteLabelDomWatch,
  stopSkyroomWhiteLabelDomWatch,
} from './white-label';
import { dispatchSkyroomLayoutResize } from './layout-resize';

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
  const layoutWebcamCount = useLayoutWebcamCount();
  const { isConnecting: isLocalWebcamConnecting } = useVideoState();
  const presentationIsOpen = layoutSelectInput((i: Input) => i.presentation.isOpen);
  const { data: meetingData } = useMeeting((m) => ({
    componentsFlags: m.componentsFlags,
  }));
  const hasActiveScreenShare = hasScreenShare
    || Boolean(meetingData?.componentsFlags?.hasScreenshare);

  const usersOpen = sidebarNavigation.isOpen;
  const chatOpen = isPublicChatOpen(sidebarContent);
  // Breakout shares the content sidebar with chat. The `chat-visible` layout attribute really
  // gates the content wrapper (see layout.css), so it must be true for breakout too — otherwise
  // the breakout management/join panel is hidden and unreachable.
  const breakoutOpen = sidebarContent.isOpen
    && sidebarContent.sidebarContentPanel === PANELS.BREAKOUT;
  const waitingUsersOpen = sidebarContent.isOpen
    && sidebarContent.sidebarContentPanel === PANELS.WAITING_USERS;
  const contentOpen = chatOpen || breakoutOpen || waitingUsersOpen;
  const [notesOpen, setNotesOpen] = useState(isSkyroomNotesOpen);
  const hasExternalVideo = layoutSelectInput((i: Input) => i.externalVideo.hasExternalVideo);
  const stageMediaMinimized = (hasActiveScreenShare || hasExternalVideo) && !presentationIsOpen;

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
      // Force a layout pass now that the column engine is active (avoids a phone
      // loading deadlock where layoutReady flips before data-skyroom-mobile is set).
      dispatchSkyroomLayoutResize();
    }

    document.documentElement.setAttribute('data-theme', 'dark');

    const openSkyroomColumn = () => {
      // Phone: default to Chat as the single bottom box (sets the explicit active box
      // too); the engine handles the top/bottom split and webcam placement.
      if (isSkyroomMobileViewport()) {
        openSkyroomMobileBox(layoutContextDispatch, 'chat');
        return;
      }

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
        dispatchSkyroomLayoutResize();
        window.clearInterval(interval);
        // LayoutObserver closes sidebar content on phones once layoutIsReady flips;
        // re-apply the mobile default after that effect so first join shows chat.
        if (isSkyroomMobileViewport()) {
          window.setTimeout(() => openSkyroomMobileBox(layoutContextDispatch, 'chat'), 0);
        }
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
        layoutEl.removeAttribute('data-skyroom-mobile');
        layoutEl.removeAttribute('data-skyroom-mobile-has-top');
        layoutEl.removeAttribute('data-skyroom-mobile-has-bottom');
        layoutEl.removeAttribute('data-skyroom-mobile-zone-fs');
        layoutEl.removeAttribute('data-skyroom-mobile-bottom-webcams');
        layoutEl.removeAttribute('data-skyroom-mobile-top-webcams');
        layoutEl.style.removeProperty('--skyroom-mobile-bottom-width');
        layoutEl.style.removeProperty('--skyroom-mobile-bottom-left');
        layoutEl.style.removeProperty('--skyroom-mobile-bottom-right');
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
        setSkyroomMobileZoneFullscreen(null);
        resetSkyroomMobileStatusRail();
        resetSkyroomMobileTalkingRail();
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
    syncSkyroomLayoutAttributes(layoutEl, usersOpen, contentOpen, notesOpen);
    if (layoutEl) {
      if (hasActiveScreenShare) {
        layoutEl.setAttribute('data-skyroom-screen-share', 'true');
      } else {
        layoutEl.removeAttribute('data-skyroom-screen-share');
      }
      if (stageMediaMinimized) {
        layoutEl.setAttribute('data-skyroom-presentation-minimized', 'true');
      } else {
        layoutEl.removeAttribute('data-skyroom-presentation-minimized');
      }
    }
  }, [usersOpen, contentOpen, notesOpen, hasActiveScreenShare, stageMediaMinimized]);

  // Phone: sync navbar-opened notes with the bottom zone. Tab-bar switches go through
  // openSkyroomMobileBox first (activeBox is updated synchronously); while notesOpen
  // is still true for a frame we must NOT yank back to notes — that caused the
  // notes→chat/users "needs two taps" bug.
  useEffect(() => {
    if (!isSkyroomMobileViewport()) return;
    const explicit = getSkyroomMobileActiveBox();

    if (notesOpen) {
      if (explicit === 'notes') return;
      // Another box selected, or user explicitly closed (null) — do not yank back to notes.
      // Only auto-select when selection is still unset (undefined).
      if (explicit !== undefined) return;

      layoutContextDispatch({ type: ACTIONS.SET_SIDEBAR_NAVIGATION_IS_OPEN, value: false });
      layoutContextDispatch({ type: ACTIONS.SET_SIDEBAR_NAVIGATION_PANEL, value: PANELS.NONE });
      layoutContextDispatch({ type: ACTIONS.SET_SIDEBAR_CONTENT_IS_OPEN, value: false });
      layoutContextDispatch({ type: ACTIONS.SET_SIDEBAR_CONTENT_PANEL, value: PANELS.NONE });
      layoutContextDispatch({ type: ACTIONS.SET_ID_CHAT_OPEN, value: '' });
      setSkyroomMobileActiveBox('notes');
    } else if (explicit === 'notes') {
      setSkyroomMobileActiveBox(null);
    }
  }, [notesOpen, layoutContextDispatch]);

  // Phone: if the breakout box was active and the breakout ended (panel auto-closes), release
  // the explicit selection so the bottom zone doesn't strand on an empty breakout panel.
  useEffect(() => {
    if (!isSkyroomMobileViewport()) return;
    if (getSkyroomMobileActiveBox() === 'breakout' && !breakoutOpen) {
      setSkyroomMobileActiveBox(null);
    }
  }, [breakoutOpen]);

  // Phone: release waiting-users box when the panel closes.
  useEffect(() => {
    if (!isSkyroomMobileViewport()) return;
    if (getSkyroomMobileActiveBox() === 'waiting' && !waitingUsersOpen) {
      setSkyroomMobileActiveBox(null);
    }
  }, [waitingUsersOpen]);

  // Phone: when a camera turns on (0 → >0) while something is shared on the stage,
  // auto-select the Webcams bottom box so the user sees it. (With nothing shared the
  // engine already fills the top zone with cameras, so no tab switch is needed.)
  const prevMeetingWebcamCountRef = useRef(layoutWebcamCount);
  useEffect(() => {
    const prev = prevMeetingWebcamCountRef.current;
    prevMeetingWebcamCountRef.current = layoutWebcamCount;
    if (!isSkyroomMobileViewport()) return;
    const stageActive = presentationIsOpen || hasActiveScreenShare;
    if (prev === 0 && layoutWebcamCount > 0 && stageActive) {
      openSkyroomMobileBox(layoutContextDispatch, 'webcams');
    }
  }, [layoutWebcamCount, presentationIsOpen, hasActiveScreenShare, layoutContextDispatch]);

  // While the local user is joining video on phone, show the webcams zone immediately
  // so LiveKit can mount and publish (numCameras may still be 0 until GraphQL catches up).
  useEffect(() => {
    if (!isSkyroomMobileViewport()) return;
    if (!isLocalWebcamConnecting) return;
    const stageActive = presentationIsOpen || hasActiveScreenShare;
    if (!stageActive) return;
    openSkyroomMobileBox(layoutContextDispatch, 'webcams');
  }, [
    isLocalWebcamConnecting,
    presentationIsOpen,
    hasActiveScreenShare,
    layoutContextDispatch,
  ]);

  useEffect(() => {
    const onResize = () => {
      if (!isSkyroomMobileViewport()) {
        setSkyroomMobileZoneFullscreen(null);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
};

export default useSkyroomColumnLayout;

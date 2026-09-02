import { useEffect, useReducer, useState } from 'react';
import { layoutSelectInput } from '/imports/ui/components/layout/context';
import { Input } from '/imports/ui/components/layout/layoutTypes';
import videoService from '/imports/ui/components/video-provider/service';
import { StreamItem } from '/imports/ui/components/video-provider/types';
import UserListService from '/imports/ui/components/user-list/service';
import {
  isPublicChatOpen,
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
} from './panel-toggles';
import {
  getSkyroomMobileActiveBox,
  resolveSkyroomMobileBox,
  subscribeSkyroomMobileBottom,
} from './mobile-bottom-state';
import { getSkyroomNotesOpen, subscribeSkyroomNotesOpen } from './notes-panel-state';
import { isPrivilegedStream } from './camera-placement';

/** Max remote webcams decoded while stage is active and the webcams tab is hidden. */
export const SKYROOM_MOBILE_STAGE_MAX_REMOTE_WEBCAMS = 1;

/**
 * The mobile webcams box is scrollable and must expose every active camera.
 * Decode cost is bounded by the SafeMeet viewport subscriber, not by removing
 * tiles from the list.
 */
export const SKYROOM_MOBILE_WEBCAMS_TAB_MAX_REMOTE_WEBCAMS = Number.POSITIVE_INFINITY;

/**
 * Sticky high-water mark so leaving the webcams tab does not immediately tear
 * LiveKit remotes down (that remount loop froze low-end Android clients).
 */
let stickyRemoteCap = SKYROOM_MOBILE_STAGE_MAX_REMOTE_WEBCAMS;

export const resetSkyroomMobileWebcamRemoteCap = () => {
  stickyRemoteCap = SKYROOM_MOBILE_STAGE_MAX_REMOTE_WEBCAMS;
};

/** Moderator/presenter first, then name — used before remote capping. */
export const sortSkyroomMobileRemoteWebcams = (a: StreamItem, b: StreamItem): number => {
  const pa = isPrivilegedStream(a);
  const pb = isPrivilegedStream(b);
  if (pa && !pb) return -1;
  if (!pa && pb) return 1;
  return UserListService.sortUsersByName(a, b);
};

export const computeSkyroomMobileWebcamsVisible = ({
  hasScreenShare,
  presentationIsOpen,
  numCameras,
  usersOpen,
  chatOpen,
  notesOpen,
}: {
  hasScreenShare: boolean;
  presentationIsOpen: boolean;
  numCameras: number;
  usersOpen: boolean;
  chatOpen: boolean;
  notesOpen: boolean;
}): boolean => {
  if (!isSkyroomMobileViewport() || !isSkyroomColumnLayout()) return true;
  if (numCameras <= 0) return false;

  const hasStage = Boolean(presentationIsOpen || hasScreenShare);
  if (!hasStage) return true;

  const activeBox = resolveSkyroomMobileBox({ usersOpen, chatOpen, notesOpen });
  if (activeBox === 'webcams') return true;

  // Layout may already own a webcam zone before activeBox catches up (tab race).
  if (typeof document !== 'undefined') {
    const layoutEl = document.getElementById('layout');
    if (
      layoutEl?.hasAttribute('data-skyroom-mobile-bottom-webcams')
      || layoutEl?.hasAttribute('data-skyroom-mobile-top-webcams')
    ) {
      return true;
    }
  }

  return false;
};

/**
 * True while another mobile bottom box owns the screen and the camera dock is
 * being hidden. IntersectionObserver can fire an all-false burst in that window
 * before the React `webcamsVisible` prop updates — applying it tore remotes
 * down and froze chat loading on some phones.
 */
export const isSkyroomMobileWebcamDockHidden = (): boolean => {
  if (!isSkyroomMobileViewport() || !isSkyroomColumnLayout()) return false;
  const box = getSkyroomMobileActiveBox();
  if (box === undefined || box === 'webcams') return false;
  if (typeof document === 'undefined') return true;
  const layoutEl = document.getElementById('layout');
  // Top-zone cameras stay live under chat/users when nothing is on stage.
  if (layoutEl?.hasAttribute('data-skyroom-mobile-top-webcams')) return false;
  return true;
};

export const limitSkyroomMobileStageRemoteWebcams = (
  streams: StreamItem[],
  { webcamsVisible = false }: { webcamsVisible?: boolean } = {},
): StreamItem[] => {
  const locals = streams.filter((vs) => videoService.isLocalStream(vs.stream));
  const remotes = streams
    .filter((vs) => !videoService.isLocalStream(vs.stream))
    .slice()
    .sort(sortSkyroomMobileRemoteWebcams);

  if (webcamsVisible) {
    stickyRemoteCap = Math.min(
      remotes.length,
      SKYROOM_MOBILE_WEBCAMS_TAB_MAX_REMOTE_WEBCAMS,
    );
  }

  // Visible tab: show the grid set. Hidden: keep sticky count so tab switches
  // do not remount remotes (CSS already gates dock visibility).
  const cap = webcamsVisible
    ? SKYROOM_MOBILE_WEBCAMS_TAB_MAX_REMOTE_WEBCAMS
    : Math.max(SKYROOM_MOBILE_STAGE_MAX_REMOTE_WEBCAMS, stickyRemoteCap);

  if (remotes.length <= cap) {
    return [...locals, ...remotes];
  }

  return [
    ...locals,
    ...remotes.slice(0, cap),
  ];
};

export const isSkyroomMobileStageMediaActive = (
  hasScreenShare: boolean,
  presentationIsOpen: boolean,
): boolean => (
  isSkyroomMobileViewport()
  && isSkyroomColumnLayout()
  && Boolean(presentationIsOpen || hasScreenShare)
);

/**
 * Reactive helper for video pipeline — true when the mobile bottom/top webcam
 * zone is the active panel (remote streams may be decoded).
 */
export const useSkyroomMobileWebcamsVisible = (): boolean => {
  const sidebarNavigation = layoutSelectInput((i: Input) => i.sidebarNavigation);
  const sidebarContent = layoutSelectInput((i: Input) => i.sidebarContent);
  const hasScreenShare = layoutSelectInput((i: Input) => i.screenShare.hasScreenShare);
  const presentationIsOpen = layoutSelectInput((i: Input) => i.presentation.isOpen);
  // Prefer layout cameraDock count to avoid a circular import with video-provider/hooks.
  const cameraDock = layoutSelectInput((i: Input) => i.cameraDock);
  const [notesOpen, setNotesOpen] = useState(getSkyroomNotesOpen);
  const [, bumpMobileBottom] = useReducer((x: number) => x + 1, 0);

  useEffect(() => subscribeSkyroomNotesOpen(setNotesOpen), []);
  useEffect(() => subscribeSkyroomMobileBottom(bumpMobileBottom), []);

  return computeSkyroomMobileWebcamsVisible({
    hasScreenShare,
    presentationIsOpen,
    numCameras: cameraDock?.numCameras ?? 0,
    usersOpen: sidebarNavigation.isOpen,
    chatOpen: isPublicChatOpen(sidebarContent),
    notesOpen,
  });
};

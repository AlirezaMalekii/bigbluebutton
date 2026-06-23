import { useEffect, useReducer, useState } from 'react';
import { layoutSelectInput } from '/imports/ui/components/layout/context';
import { Input } from '/imports/ui/components/layout/layoutTypes';
import videoService from '/imports/ui/components/video-provider/service';
import { StreamItem } from '/imports/ui/components/video-provider/types';
import {
  isPublicChatOpen,
  isSkyroomColumnLayout,
  isSkyroomMobileViewport,
} from './panel-toggles';
import { resolveSkyroomMobileBox, subscribeSkyroomMobileBottom } from './mobile-bottom-state';
import { getSkyroomNotesOpen, subscribeSkyroomNotesOpen } from './notes-panel-state';

/** Max remote webcams decoded while mobile stage (screenshare/slides) is active. */
export const SKYROOM_MOBILE_STAGE_MAX_REMOTE_WEBCAMS = 1;

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
  return activeBox === 'webcams';
};

export const limitSkyroomMobileStageRemoteWebcams = (streams: StreamItem[]): StreamItem[] => {
  const locals = streams.filter((vs) => videoService.isLocalStream(vs.stream));
  const remotes = streams.filter((vs) => !videoService.isLocalStream(vs.stream));

  if (remotes.length <= SKYROOM_MOBILE_STAGE_MAX_REMOTE_WEBCAMS) {
    return streams;
  }

  return [
    ...locals,
    ...remotes.slice(0, SKYROOM_MOBILE_STAGE_MAX_REMOTE_WEBCAMS),
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
  const numCameras = layoutSelectInput((i: Input) => i.cameraDock.numCameras);
  const [notesOpen, setNotesOpen] = useState(getSkyroomNotesOpen);
  const [, bumpMobileBottom] = useReducer((x: number) => x + 1, 0);

  useEffect(() => subscribeSkyroomNotesOpen(setNotesOpen), []);
  useEffect(() => subscribeSkyroomMobileBottom(bumpMobileBottom), []);

  return computeSkyroomMobileWebcamsVisible({
    hasScreenShare,
    presentationIsOpen,
    numCameras,
    usersOpen: sidebarNavigation.isOpen,
    chatOpen: isPublicChatOpen(sidebarContent),
    notesOpen,
  });
};

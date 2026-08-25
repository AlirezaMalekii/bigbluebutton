import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { createContext, useContextSelector } from 'use-context-selector';
import { useMutation } from '@apollo/client';
import { UserCameraDropdownInterface } from 'bigbluebutton-html-plugin-sdk';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import { layoutSelect, layoutSelectInput } from '/imports/ui/components/layout/context';
import { Layout, Input } from '/imports/ui/components/layout/layoutTypes';
import useSettings from '/imports/ui/services/settings/hooks/useSettings';
import { SETTINGS } from '/imports/ui/services/settings/enums';
import { useStorageKey } from '/imports/ui/services/storage/hooks';
import useWhoIsTalking from '/imports/ui/core/hooks/useWhoIsTalking';
import useWhoIsUnmuted from '/imports/ui/core/hooks/useWhoIsUnmuted';
import useDeduplicatedSubscription from '/imports/ui/core/hooks/useDeduplicatedSubscription';
import { RAISED_HAND_USERS } from '/imports/ui/core/graphql/queries/users';
import getFromUserSettings from '/imports/ui/services/users-settings';
import { filterByMeetingId } from '/imports/ui/core/utils/subscriptionFilters';
import { SET_CAMERA_PINNED } from '/imports/ui/core/graphql/mutations/userMutations';

export type VideoListCurrentUser = {
  userId?: string;
  pinned?: boolean;
  nameSortable?: string;
  name?: string;
  away?: boolean;
  disconnected?: boolean;
  role?: string;
  avatar?: string;
  color?: string;
  presenter?: boolean;
  clientType?: string;
  raiseHand?: boolean;
  isModerator?: boolean;
  reactionEmoji?: string;
};

type VideoListSharedState = {
  fullscreenElement: string;
  isRTL: boolean;
  layoutContextDispatch: (...args: unknown[]) => void;
  settingsSelfViewDisable: boolean;
  currentUser: VideoListCurrentUser | null;
  amIModerator: boolean;
  disabledCams: string[];
  talkingUsers: Record<string, boolean>;
  unmutedUsers: Record<string, boolean>;
  raisedHandPositions: Record<string, number>;
  hideNotifications: boolean;
  userCameraDropdownItems: UserCameraDropdownInterface[];
  setCameraPinned: (userId: string, pinned: boolean) => void;
  observeVideoTile: (element: Element, callback: (width: number) => void) => () => void;
};

type RaisedHandUser = {
  userId: string;
};

type TileResizeCallback = (width: number) => void;

const noop = () => {};
const noopObserveVideoTile = () => noop;
const EMPTY_USER_STATE: Record<string, boolean> = {};

const VideoListSharedStateContext = createContext<VideoListSharedState>({
  fullscreenElement: '',
  isRTL: false,
  layoutContextDispatch: noop,
  settingsSelfViewDisable: false,
  currentUser: null,
  amIModerator: false,
  disabledCams: [],
  talkingUsers: {},
  unmutedUsers: {},
  raisedHandPositions: {},
  hideNotifications: false,
  userCameraDropdownItems: [],
  setCameraPinned: noop,
  observeVideoTile: noopObserveVideoTile,
});

interface VideoListSharedStateProviderProps {
  children: React.ReactNode;
  layoutContextDispatch: (...args: unknown[]) => void;
  userCameraDropdownItems: UserCameraDropdownInterface[];
}

const VideoListSharedStateProvider: React.FC<VideoListSharedStateProviderProps> = ({
  children,
  layoutContextDispatch,
  userCameraDropdownItems,
}) => {
  const fullscreenElement = layoutSelect((i: Layout) => i.fullscreen.element);
  const isRTL = layoutSelect((i: Layout) => i.isRTL);
  // @ts-ignore Untyped settings object
  const { selfViewDisable: settingsSelfViewDisable } = useSettings(SETTINGS.APPLICATION);
  const { data: currentUser } = useCurrentUser((user) => ({
    userId: user.userId,
    pinned: user.pinned,
    nameSortable: user.nameSortable,
    name: user.name,
    away: user.away,
    disconnected: user.disconnected,
    role: user.role,
    avatar: user.avatar,
    color: user.color,
    presenter: user.presenter,
    clientType: user.clientType,
    raiseHand: user.raiseHand,
    isModerator: user.isModerator,
    reactionEmoji: user.reactionEmoji,
    locked: user.locked,
  }));
  const { data: currentMeeting } = useMeeting((meeting) => ({
    lockSettings: meeting.lockSettings,
    meetingId: meeting.meetingId,
  }));
  const storedDisabledCams = useStorageKey('disabledCams');
  const disabledCams = useMemo(() => (
    Array.isArray(storedDisabledCams)
      ? storedDisabledCams.filter((cameraId): cameraId is string => typeof cameraId === 'string')
      : []
  ), [storedDisabledCams]);
  const { data: talkingUsers } = useWhoIsTalking();
  const { data: unmutedUsers } = useWhoIsUnmuted();
  const { data: usersData } = useDeduplicatedSubscription<{ user: RaisedHandUser[] }>(RAISED_HAND_USERS);
  const [setCameraPinnedMutation] = useMutation(SET_CAMERA_PINNED);
  const tileResizeObserverRef = useRef<ResizeObserver | null>(null);
  const tileResizeCallbacksRef = useRef<Map<Element, TileResizeCallback>>(new Map());
  const { hideNotificationToasts } = layoutSelectInput((i: Input) => i.notificationsBar);
  const setCameraPinned = useCallback((userId: string, pinned: boolean) => {
    setCameraPinnedMutation({
      variables: { userId, pinned },
    });
  }, [setCameraPinnedMutation]);
  const observeVideoTile = useCallback((element: Element, callback: (width: number) => void) => {
    if (typeof ResizeObserver !== 'function') {
      callback(element.getBoundingClientRect().width);
      return noop;
    }

    if (!tileResizeObserverRef.current) {
      tileResizeObserverRef.current = new ResizeObserver((entries) => {
        entries.forEach((entry) => {
          tileResizeCallbacksRef.current.get(entry.target)?.(entry.contentRect.width);
        });
      });
    }

    tileResizeCallbacksRef.current.set(element, callback);
    tileResizeObserverRef.current.observe(element);
    callback(element.getBoundingClientRect().width);

    return () => {
      if (tileResizeCallbacksRef.current.get(element) !== callback) return;
      tileResizeObserverRef.current?.unobserve(element);
      tileResizeCallbacksRef.current.delete(element);
      if (tileResizeCallbacksRef.current.size === 0) {
        tileResizeObserverRef.current?.disconnect();
        tileResizeObserverRef.current = null;
      }
    };
  }, []);

  useEffect(() => () => {
    tileResizeObserverRef.current?.disconnect();
    tileResizeObserverRef.current = null;
    tileResizeCallbacksRef.current.clear();
  }, []);

  const hideUserList = Boolean(
    currentUser?.locked && currentMeeting?.lockSettings?.hideUserList,
  );
  const raisedHandPositions = useMemo(() => {
    if (hideUserList || !currentMeeting?.meetingId) return {};

    const raisedHands = filterByMeetingId(
      usersData?.user,
      currentMeeting.meetingId,
      RAISED_HAND_USERS,
      (user) => ({ mismatchedUserId: user.userId }),
    );

    return Object.fromEntries(
      raisedHands.map((user, index) => [user.userId, index + 1]),
    );
  }, [currentMeeting?.meetingId, hideUserList, usersData?.user]);
  const hideNotifications = hideNotificationToasts
    || getFromUserSettings('bbb_hide_notifications', false);

  const value = useMemo<VideoListSharedState>(() => ({
    fullscreenElement,
    isRTL,
    layoutContextDispatch,
    settingsSelfViewDisable: Boolean(settingsSelfViewDisable),
    currentUser: currentUser as VideoListCurrentUser | null,
    amIModerator: Boolean(currentUser?.isModerator),
    disabledCams,
    talkingUsers: talkingUsers || EMPTY_USER_STATE,
    unmutedUsers: unmutedUsers || EMPTY_USER_STATE,
    raisedHandPositions,
    hideNotifications,
    userCameraDropdownItems,
    setCameraPinned,
    observeVideoTile,
  }), [
    fullscreenElement,
    isRTL,
    layoutContextDispatch,
    settingsSelfViewDisable,
    currentUser,
    disabledCams,
    talkingUsers,
    unmutedUsers,
    raisedHandPositions,
    hideNotifications,
    userCameraDropdownItems,
    setCameraPinned,
    observeVideoTile,
  ]);

  return (
    <VideoListSharedStateContext.Provider value={value}>
      {children}
    </VideoListSharedStateContext.Provider>
  );
};

const useVideoListSharedState = <Selected, >(
  selector: (state: VideoListSharedState) => Selected,
) => useContextSelector(VideoListSharedStateContext, selector);

export {
  VideoListSharedStateProvider,
  useVideoListSharedState,
};

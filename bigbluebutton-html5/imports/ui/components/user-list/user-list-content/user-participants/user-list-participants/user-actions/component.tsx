import React from 'react';
import { PluginIconType } from 'bigbluebutton-html-plugin-sdk';
import { User } from '/imports/ui/Types/user';
import { LockSettings, UsersPolicies } from '/imports/ui/Types/meeting';
import { useIntl, defineMessages } from 'react-intl';
import * as PluginSdk from 'bigbluebutton-html-plugin-sdk';
import logger from '/imports/startup/client/logger';
import { UserListDropdownItemType } from 'bigbluebutton-html-plugin-sdk/dist/cjs/extensible-areas/user-list-dropdown-item/enums';
import {
  SET_ROLE,
  USER_EJECT_CAMERAS,
  CHAT_CREATE_WITH_USER,
} from './mutations';
import {
  SET_CAMERA_PINNED,
  EJECT_FROM_MEETING,
  EJECT_FROM_VOICE,
  SET_PRESENTER,
  SET_LOCKED,
  SET_USER_CHAT_LOCKED,
  SET_RAISE_HAND,
} from '/imports/ui/core/graphql/mutations/userMutations';
import {
  isVideoPinEnabledForCurrentUser,
  toggleVoice,
  isMe,
  generateActionsPermissions,
  isVoiceOnlyUser,
} from './service';

import { useIsChatEnabled, useIsPrivateChatEnabled, useIsReactionsEnabled } from '/imports/ui/services/features';
import { layoutDispatch } from '/imports/ui/components/layout/context';

import ConfirmationModal from '/imports/ui/components/common/modal/confirmation/component';

import Icon from '/imports/ui/components/common/icon/icon-ts/component';
import TooltipContainer from '/imports/ui/components/common/tooltip/container';
import { setPendingChat } from '/imports/ui/core/local-states/usePendingChat';
import useChat from '/imports/ui/core/hooks/useChat';
import { Chat } from '/imports/ui/Types/chat';
import { GraphqlDataHookSubscriptionResponse } from '/imports/ui/Types/hook';
import {
  openPrivateChatConversation,
  reopenPrivateChatFromClosed,
} from '/imports/ui/components/chat/private-chat-navigation';
import { isSkyroomColumnLayout } from '/imports/ui/components/skyroom-layout/panel-toggles';
import Styled from './styles';
import BBBMenu from '/imports/ui/components/common/menu/component';
import { useMutation } from '@apollo/client';
import { USER_SET_WHITEBOARD_WRITE_ACCESS } from '/imports/ui/components/presentation/mutations';
import useToggleVoice from '/imports/ui/components/audio/audio-graphql/hooks/useToggleVoice';
import useWhoIsUnmuted from '/imports/ui/core/hooks/useWhoIsUnmuted';
import { useModalRegistration } from '/imports/ui/core/singletons/modalController';

interface UserActionsProps {
  userListDropdownItems: PluginSdk.UserListDropdownInterface[];
  user: User;
  currentUser: User;
  lockSettings: LockSettings;
  usersPolicies: UsersPolicies;
  isBreakout: boolean;
  children: React.ReactNode;
  pageId: string;
  open: boolean;
  setOpenUserAction: React.Dispatch<React.SetStateAction<string | null>>;
  type?: 'raised-hand' | 'participant';
}

interface DropdownItem {
  key: string;
  label?: string;
  icon?: PluginIconType;
  tooltip?: string;
  allowed?: boolean;
  iconRight?: PluginIconType;
  textColor?: string;
  isSeparator?: boolean;
  dataTest?: string;
  contentFunction?: ((element: HTMLElement) => void);
  onClick?: (() => void);
}

const messages = defineMessages({
  UnpinUserWebcam: {
    id: 'app.userList.menu.webcamUnpin.label',
    description: 'label for pin user webcam',
  },
  PinUserWebcam: {
    id: 'app.userList.menu.webcamPin.label',
    description: 'label for pin user webcam',
  },
  StartPrivateChat: {
    id: 'app.userList.menu.chat.label',
    description: 'label for option to start a new private chat',
  },
  MuteUserAudioLabel: {
    id: 'app.userList.menu.muteUserAudio.label',
    description: 'Forcefully mute this user',
  },
  UnmuteUserAudioLabel: {
    id: 'app.userList.menu.unmuteUserAudio.label',
    description: 'Forcefully unmute this user',
  },
  removeWhiteboardAccess: {
    id: 'app.userList.menu.removeWhiteboardAccess.label',
    description: 'label to remove user whiteboard access',
  },
  giveWhiteboardAccess: {
    id: 'app.userList.menu.giveWhiteboardAccess.label',
    description: 'label to give user whiteboard access',
  },
  takePresenterLabel: {
    id: 'app.actionsBar.actionsDropdown.takePresenter',
    description: 'Set this user to be the presenter in this meeting',
  },
  makePresenterLabel: {
    id: 'app.userList.menu.makePresenter.label',
    description: 'label to make another user presenter',
  },
  PromoteUserLabel: {
    id: 'app.userList.menu.promoteUser.label',
    description: 'Forcefully promote this viewer to a moderator',
  },
  DemoteUserLabel: {
    id: 'app.userList.menu.demoteUser.label',
    description: 'Forcefully demote this moderator to a viewer',
  },
  UnlockUserLabel: {
    id: 'app.userList.menu.unlockUser.label',
    description: 'Unlock individual user',
  },
  LockUserLabel: {
    id: 'app.userList.menu.lockUser.label',
    description: 'Lock a unlocked user',
  },
  lockPublicChat: {
    id: 'app.userList.menu.lockPublicChat.label',
    description: 'label for option to lock user\'s public chat',
  },
  unlockPublicChat: {
    id: 'app.userList.menu.unlockPublicChat.label',
    description: 'label for option to lock user\'s public chat',
  },
  DirectoryLookupLabel: {
    id: 'app.userList.menu.directoryLookup.label',
    description: 'Directory lookup',
  },
  RemoveUserLabel: {
    id: 'app.userList.menu.removeUser.label',
    description: 'Forcefully remove this user from the meeting',
  },
  ejectUserCamerasLabel: {
    id: 'app.userList.menu.ejectUserCameras.label',
    description: 'label to eject user cameras',
  },
  multiUserLimitHasBeenReachedNotification: {
    id: 'app.whiteboard.toolbar.multiUserLimitHasBeenReachedNotification',
    description: 'message for when the maximum number of whiteboard writers has been reached',
  },
  removeUserConfirmation: {
    id: 'app.userList.menu.removeConfirmation.label',
    description: 'Confirmation message for removing a user from the meeting',
  },
  lowerUserHand: {
    id: 'app.actionsBar.reactions.lowUserHand',
    description: 'Label for lowering a user raised hand',
  },
  userActionsMenu: {
    id: 'app.userList.userActions.menu',
    description: 'Open user actions menu',
    defaultMessage: 'User actions',
  },
  sharingWebcam: {
    id: 'app.userList.sharingWebcam',
    description: 'Tooltip for webcam-on status in the user row',
  },
  presenter: {
    id: 'app.userList.presenter',
    description: 'Tooltip for presenter status in the user row',
  },
  muted: {
    id: 'app.userList.muted',
    description: 'Tooltip for muted microphone status in the user row',
  },
  unmuted: {
    id: 'app.userList.unmuted',
    description: 'Tooltip for unmuted microphone status in the user row',
  },
  reaction: {
    id: 'app.userList.reaction',
    description: 'Tooltip for reaction status in the user row',
  },
});
const makeDropdownPluginItem: (
  userDropdownItems: PluginSdk.UserListDropdownInterface[]) => DropdownItem[] = (
    userDropdownItems: PluginSdk.UserListDropdownInterface[],
  ) => userDropdownItems.map(
    (userDropdownItem: PluginSdk.UserListDropdownInterface) => {
      const returnValue: DropdownItem = {
        isSeparator: false,
        key: userDropdownItem.id,
        iconRight: undefined,
        onClick: undefined,
        label: undefined,
        icon: undefined,
        tooltip: undefined,
        textColor: undefined,
        allowed: undefined,
        dataTest: undefined,
      };
      switch (userDropdownItem.type) {
        case UserListDropdownItemType.OPTION: {
          const dropdownButton = userDropdownItem as PluginSdk.UserListDropdownOption;
          returnValue.label = dropdownButton.label;
          returnValue.tooltip = dropdownButton.tooltip;
          returnValue.icon = dropdownButton.icon;
          returnValue.allowed = dropdownButton.allowed;
          returnValue.onClick = dropdownButton.onClick;
          returnValue.dataTest = dropdownButton.dataTest;
          break;
        }
        case UserListDropdownItemType.FIXED_CONTENT_INFORMATION: {
          const dropdownButton = userDropdownItem as PluginSdk.UserListDropdownFixedContentInformation;
          returnValue.label = dropdownButton.label;
          returnValue.icon = dropdownButton.icon;
          returnValue.iconRight = dropdownButton.iconRight;
          returnValue.textColor = dropdownButton.textColor;
          returnValue.allowed = dropdownButton.allowed;
          returnValue.dataTest = dropdownButton.dataTest;
          break;
        }
        case UserListDropdownItemType.GENERIC_CONTENT_INFORMATION: {
          const dropdownButton = userDropdownItem as PluginSdk.UserListDropdownGenericContentInformation;
          returnValue.allowed = dropdownButton.allowed;
          returnValue.contentFunction = dropdownButton.contentFunction;
          returnValue.dataTest = dropdownButton.dataTest;
          break;
        }
        case UserListDropdownItemType.SEPARATOR: {
          const dropdownSeparator = userDropdownItem as PluginSdk.UserListDropdownSeparator;
          returnValue.allowed = true;
          returnValue.isSeparator = true;
          returnValue.dataTest = dropdownSeparator.dataTest;
          break;
        }
        default:
          break;
      }
      return returnValue;
    },
  );

const UserActions: React.FC<UserActionsProps> = ({
  user,
  currentUser,
  lockSettings,
  usersPolicies,
  isBreakout,
  children,
  pageId = '',
  userListDropdownItems,
  open,
  setOpenUserAction,
  type = 'participant',
}) => {
  const intl = useIntl();
  const layoutContextDispatch = layoutDispatch();

  const {
    isOpen: isConfirmationModalOpen,
    open: openCofirmationModal,
    close: closeConfirmationModal,
  } = useModalRegistration({
    id: 'userActionsConfirmationModal',
    priority: 'low',
  });

  const setIsConfirmationModalOpen = (value: boolean) => {
    if (value) openCofirmationModal();
    else closeConfirmationModal();
  };

  const [userSetWhiteboardWriteAccess] = useMutation(USER_SET_WHITEBOARD_WRITE_ACCESS);
  const voiceToggle = useToggleVoice();
  const isChatEnabled = useIsChatEnabled();
  const isPrivateChatEnabled = useIsPrivateChatEnabled();
  const reactionsEnabled = useIsReactionsEnabled();

  const handleWhiteboardAccessChange = async (newWhiteboardWriteAccess: boolean) => {
    // There is no presentation available, so access cannot be granted.
    if (!pageId) return;
    try {
      // Determine if the user has access
      const { userId, whiteboardWriteAccess } = user;

      if (newWhiteboardWriteAccess !== whiteboardWriteAccess) {
        // Update user whiteboardWriteAccess
        await userSetWhiteboardWriteAccess({
          variables: {
            userIds: [userId],
            allUsers: false,
            whiteboardWriteAccess: newWhiteboardWriteAccess,
          },
        });
      }
    } catch (error) {
      logger.warn({
        logCode: 'user_action_whiteboard_access_failed',
      }, 'Error updating whiteboard access.');
    }
  };

  const { data: unmutedUsers } = useWhoIsUnmuted();
  const isMuted = !unmutedUsers[user.userId];

  const actionsnPermitions = generateActionsPermissions(
    user,
    currentUser,
    lockSettings,
    usersPolicies,
    isBreakout,
    isMuted,
  );
  const {
    allowedToChatPrivately,
    allowedToMuteAudio,
    allowedToUnmuteAudio,
    allowedToChangeWhiteboardAccess,
    allowedToSetPresenter,
    allowedToPromote,
    allowedToDemote,
    allowedToChangeUserLockStatus,
    allowedToRemove,
    allowedToEjectCameras,
  } = actionsnPermitions;

  const userLocked = user.locked
    && lockSettings?.hasActiveLockSetting
    && !user.isModerator;

  const userChatLocked = user.userLockSettings?.disablePublicChat;

  const userDropdownItems = userListDropdownItems.filter(
    (item: PluginSdk.UserListDropdownInterface) => (user?.userId === item?.userId),
  );

  const hasWhiteboardAccess = user?.whiteboardWriteAccess === true;

  const [setRole] = useMutation(SET_ROLE);
  const [chatCreateWithUser] = useMutation(CHAT_CREATE_WITH_USER);
  const { data: chats } = useChat((chat) => ({
    chatId: chat.chatId,
    participant: chat.participant,
  })) as GraphqlDataHookSubscriptionResponse<Partial<Chat>[]>;
  const [setCameraPinned] = useMutation(SET_CAMERA_PINNED);
  const [ejectFromMeeting] = useMutation(EJECT_FROM_MEETING);
  const [ejectFromVoice] = useMutation(EJECT_FROM_VOICE);
  const [setPresenter] = useMutation(SET_PRESENTER);
  const [setLocked] = useMutation(SET_LOCKED);
  const [setUserChatLocked] = useMutation(SET_USER_CHAT_LOCKED);
  const [userEjectCameras] = useMutation(USER_EJECT_CAMERAS);
  const [setRaiseHand] = useMutation(SET_RAISE_HAND);

  const removeUser = (userId: string, banUser: boolean) => {
    if (isVoiceOnlyUser(user.userId)) {
      ejectFromVoice({
        variables: {
          userId,
          banUser,
        },
      });
    } else {
      ejectFromMeeting({
        variables: {
          userId,
          banUser,
        },
      });
    }
  };
  const titleActions = userDropdownItems.filter(
    (item: PluginSdk.UserListDropdownInterface) => (
      item?.type === UserListDropdownItemType.TITLE_ACTION),
  );
  const dropdownOptions = [
    {
      allowed: true,
      key: 'userName',
      label: user.name,
      titleActions,
      isTitle: true,
    },
    ...makeDropdownPluginItem(userDropdownItems.filter(
      (item: PluginSdk.UserListDropdownInterface) => (
        item?.type === UserListDropdownItemType.FIXED_CONTENT_INFORMATION
        || item?.type === UserListDropdownItemType.GENERIC_CONTENT_INFORMATION
        || (item?.type === UserListDropdownItemType.SEPARATOR
          && (item as PluginSdk.UserListDropdownSeparator)?.position
          === PluginSdk.UserListDropdownSeparatorPosition.BEFORE)) && type === 'participant',
    )),
    {
      allowed: user?.cameras?.length > 0
        && isVideoPinEnabledForCurrentUser(currentUser) && type === 'participant',
      key: 'pinVideo',
      label: user?.pinned
        ? intl.formatMessage(messages.UnpinUserWebcam)
        : intl.formatMessage(messages.PinUserWebcam),
      onClick: () => {
        // toggle user pinned status
        setCameraPinned({
          variables: {
            userId: user.userId,
            pinned: !user?.pinned,
          },
        });
      },
      icon: user?.pinned ? 'pin-video_off' : 'pin-video_on',
    },
    {
      allowed: (() => {
        const preventSelfChat = user.userId !== currentUser.userId;
        const moderatorOverride = currentUser.isModerator
          && allowedToChatPrivately;
        const regularUserCondition = (isPrivateChatEnabled
          && isChatEnabled
          && !lockSettings?.disablePrivateChat
          && !isVoiceOnlyUser(user.userId))
          || user.isModerator;

        const isAllowed = preventSelfChat
          && (moderatorOverride || regularUserCondition || !currentUser.locked)
          && type === 'participant';

        return isAllowed;
      })(),
      key: 'activeChat',
      label: intl.formatMessage(messages.StartPrivateChat),
      onClick: () => {
        setOpenUserAction(null);
        const existingChat = chats?.find(
          (chat) => chat.participant?.userId === user.userId,
        );

        if (existingChat?.chatId) {
          reopenPrivateChatFromClosed(existingChat.chatId);
          openPrivateChatConversation(layoutContextDispatch, existingChat.chatId);
          return;
        }

        setPendingChat(user.userId);
        chatCreateWithUser({
          variables: {
            userId: user.userId,
          },
        });
        openPrivateChatConversation(layoutContextDispatch, '');
      },
      icon: 'chat',
      dataTest: 'startPrivateChat',
    },
    {
      allowed: isChatEnabled
        && !user.isModerator
        && currentUser.isModerator
        && !isVoiceOnlyUser(user.userId)
        && type === 'participant',
      key: 'lockChat',
      label: userChatLocked
        ? intl.formatMessage(messages.unlockPublicChat)
        : intl.formatMessage(messages.lockPublicChat),
      onClick: () => {
        try {
          setUserChatLocked({ variables: { userId: user.userId, disablePubChat: !userChatLocked } });
        } catch (e) {
          logger.error('Error on trying to toggle muted');
        }
        setOpenUserAction(null);
      },
      icon: userChatLocked ? 'unlock' : 'lock',
      dataTest: 'togglePublicChat',
    },
    {
      allowed: allowedToMuteAudio
        && type === 'participant',
      key: 'mute',
      label: intl.formatMessage(messages.MuteUserAudioLabel),
      onClick: () => {
        toggleVoice(user.userId, true, voiceToggle);
        setOpenUserAction(null);
      },
      icon: 'mute',
    },
    {
      allowed: allowedToUnmuteAudio
        && !lockSettings?.disableMic
        && type === 'participant',
      key: 'unmute',
      label: intl.formatMessage(messages.UnmuteUserAudioLabel),
      onClick: () => {
        toggleVoice(user.userId, false, voiceToggle);
        setOpenUserAction(null);
      },
      icon: 'unmute',
      dataTest: 'unmuteUser',
    },
    {
      allowed: allowedToChangeWhiteboardAccess
        && !user.presenter
        && !isVoiceOnlyUser(user.userId)
        && pageId,
      key: 'changeWhiteboardAccess',
      label: hasWhiteboardAccess
        ? intl.formatMessage(messages.removeWhiteboardAccess)
        : intl.formatMessage(messages.giveWhiteboardAccess),
      onClick: () => {
        handleWhiteboardAccessChange(!hasWhiteboardAccess);
        setOpenUserAction(null);
      },
      icon: 'pen_tool',
      dataTest: 'changeWhiteboardAccess',
    },
    {
      allowed: allowedToSetPresenter && !isVoiceOnlyUser(user.userId) && type === 'participant',
      key: 'setPresenter',
      label: isMe(user.userId)
        ? intl.formatMessage(messages.takePresenterLabel)
        : intl.formatMessage(messages.makePresenterLabel),
      onClick: () => {
        setPresenter({
          variables: {
            userId: user.userId,
          },
        });
        setOpenUserAction(null);
      },
      icon: 'presentation',
      dataTest: isMe(user.userId) ? 'takePresenter' : 'makePresenter',
    },
    {
      allowed: allowedToPromote && type === 'participant',
      key: 'promote',
      label: intl.formatMessage(messages.PromoteUserLabel),
      onClick: () => {
        setRole({
          variables: {
            userId: user.userId,
            role: 'MODERATOR',
          },
        });
        setOpenUserAction(null);
      },
      icon: 'promote',
      dataTest: 'promoteToModerator',
    },
    {
      allowed: allowedToDemote && type === 'participant',
      key: 'demote',
      label: intl.formatMessage(messages.DemoteUserLabel),
      onClick: () => {
        setRole({
          variables: {
            userId: user.userId,
            role: 'VIEWER',
          },
        });
        setOpenUserAction(null);
      },
      icon: 'user',
      dataTest: 'demoteToViewer',
    },
    {
      allowed: allowedToChangeUserLockStatus,
      key: 'unlockUser',
      label: userLocked ? intl.formatMessage(messages.UnlockUserLabel, { userName: user.name })
        : intl.formatMessage(messages.LockUserLabel, { userName: user.name }),
      onClick: () => {
        setLocked({
          variables: {
            userId: user.userId,
            locked: !userLocked,
          },
        });
        setOpenUserAction(null);
      },
      icon: userLocked ? 'unlock' : 'lock',
      dataTest: 'unlockUserButton',
    },
    {
      allowed: allowedToRemove && type === 'participant',
      key: 'remove',
      label: intl.formatMessage(messages.RemoveUserLabel, { 0: user.name }),
      onClick: () => {
        setIsConfirmationModalOpen(true);
        setOpenUserAction(null);
      },
      icon: 'circle_close',
      dataTest: 'removeUser',
    },
    {
      allowed: allowedToEjectCameras
        && user?.cameras?.length > 0
        && type === 'participant',
      key: 'ejectUserCameras',
      label: intl.formatMessage(messages.ejectUserCamerasLabel),
      onClick: () => {
        userEjectCameras({
          variables: {
            userId: user.userId,
          },
        });
        setOpenUserAction(null);
      },
      icon: 'video_off',
      dataTest: 'ejectCamera',
    },
    {
      allowed: user.raiseHand && (currentUser?.isModerator || currentUser?.userId === user.userId),
      key: 'lowerHand',
      label: intl.formatMessage(messages.lowerUserHand, { userName: user.name }),
      onClick: () => {
        setRaiseHand({
          variables: {
            userId: user.userId,
            raiseHand: false,
          },
        });
      },
      icon: 'hand',
    },
    ...makeDropdownPluginItem(userDropdownItems.filter(
      (item: PluginSdk.UserListDropdownInterface) => (
        item?.type !== UserListDropdownItemType.FIXED_CONTENT_INFORMATION
        && item?.type !== UserListDropdownItemType.GENERIC_CONTENT_INFORMATION
        && !(item?.type === UserListDropdownItemType.SEPARATOR
          && (item as PluginSdk.UserListDropdownSeparator)?.position
          === PluginSdk.UserListDropdownSeparatorPosition.BEFORE)
      ),
    )),
  ];

  const actions = dropdownOptions.filter((key) => key.allowed);
  const iconActions = actions.filter((action): action is DropdownItem => {
    if ('isTitle' in action) return false;
    const item = action as DropdownItem;
    return !item.isSeparator && Boolean(item.onClick) && Boolean(item.icon);
  });

  const renderActionIcon = (action: DropdownItem) => {
    let iconName: string | null = null;
    if (typeof action.icon === 'string') {
      iconName = action.icon;
    } else if (
      action.icon
      && typeof action.icon === 'object'
      && 'iconName' in action.icon
    ) {
      iconName = action.icon.iconName;
    }

    if (!iconName) return null;

    return (
      <TooltipContainer key={action.key} title={action.tooltip || action.label || ''}>
        <Styled.ActionIconButton
          type="button"
          aria-label={action.label}
          data-test={action.dataTest}
          onClick={(e) => {
            e.stopPropagation();
            action.onClick?.();
            setOpenUserAction(null);
          }}
        >
          <Icon iconName={iconName} />
        </Styled.ActionIconButton>
      </TooltipContainer>
    );
  };

  if (iconActions.length === 0 || user.bot) {
    return (
      <Styled.NoPointerEvents>
        {children}
      </Styled.NoPointerEvents>
    );
  }

  const skyroomMenuActions = iconActions.map((action) => {
    const {
      icon: rawIcon, key, label, dataTest,
    } = action;
    let icon: PluginIconType | undefined = rawIcon;
    if (typeof rawIcon === 'object' && rawIcon && 'iconName' in rawIcon) {
      const { iconName } = rawIcon;
      icon = iconName;
    }
    return {
      key,
      label,
      icon,
      dataTest,
      onClick: () => {
        action.onClick?.();
        setOpenUserAction(null);
      },
    };
  });

  const isRTL = document.documentElement.getAttribute('dir') === 'rtl';
  const useSkyroomActionsMenu = isSkyroomColumnLayout();
  const voiceJoined = Boolean(user.voice?.joined) && !user.voice?.deafened;
  const showPresenterStatus = Boolean(user.presenter);
  const showWebcamStatus = Boolean(user?.cameras?.length > 0);
  const showReactionStatus = reactionsEnabled
    && Boolean(user.reactionEmoji)
    && user.reactionEmoji !== 'none'
    && !user.away;
  const microphoneStatusLabel = intl.formatMessage(isMuted ? messages.muted : messages.unmuted);
  const webcamStatusLabel = intl.formatMessage(messages.sharingWebcam);
  const presenterStatusLabel = intl.formatMessage(messages.presenter);
  const reactionStatusLabel = intl.formatMessage(
    messages.reaction,
    { reaction: user.reactionEmoji },
  );
  const existingPrivateChat = chats?.find(
    (chat) => chat.participant?.userId === user.userId,
  );
  const canOpenPrivateChatOnRowClick = useSkyroomActionsMenu
    && Boolean(existingPrivateChat?.chatId);

  const openExistingPrivateChatFromRow = () => {
    if (!existingPrivateChat?.chatId) return;
    setOpenUserAction(null);
    reopenPrivateChatFromClosed(existingPrivateChat.chatId);
    openPrivateChatConversation(layoutContextDispatch, existingPrivateChat.chatId);
  };

  const skyroomStatusCluster = useSkyroomActionsMenu ? (
    <Styled.LeftActionsCluster dir="ltr" data-test="userRowStatusCluster">
      <Styled.ActionMenuWrap onClick={(e) => e.stopPropagation()}>
        <BBBMenu
          dataTest={`userActionsMenu-${user.userId}`}
          overrideMobileStyles
          trigger={(
            <Styled.SkyroomActionsTrigger
              size="sm"
              color="light"
              hideLabel
              icon="more"
              label={intl.formatMessage(messages.userActionsMenu)}
              aria-label={intl.formatMessage(messages.userActionsMenu)}
              data-test="userActionsMenuTrigger"
              className="skyroom-user-actions-trigger"
            />
          )}
          actions={skyroomMenuActions}
          customStyles={{ zIndex: 1010 }}
          opts={{
            id: `user-actions-menu-${user.userId}`,
            keepMounted: false,
            transitionDuration: 0,
            elevation: 8,
            disableScrollLock: true,
            className: 'skyroom-user-actions-menu',
            BackdropProps: { invisible: true },
            anchorOrigin: {
              vertical: 'bottom',
              horizontal: isRTL ? 'left' : 'right',
            },
            transformOrigin: {
              vertical: 'top',
              horizontal: isRTL ? 'left' : 'right',
            },
          }}
        />
      </Styled.ActionMenuWrap>
      <Styled.StatusIconBar>
        {voiceJoined ? (
          <TooltipContainer title={microphoneStatusLabel}>
            <Styled.StatusIcon
              data-test={isMuted ? 'userRowMuted' : 'userRowUnmuted'}
              role="img"
              aria-label={microphoneStatusLabel}
            >
              <Icon iconName={isMuted ? 'mute' : 'unmute'} />
            </Styled.StatusIcon>
          </TooltipContainer>
        ) : null}
        {showWebcamStatus ? (
          <TooltipContainer title={webcamStatusLabel}>
            <Styled.StatusIcon
              data-test="userRowWebcam"
              role="img"
              aria-label={webcamStatusLabel}
            >
              <Icon iconName={user?.pinned === true ? 'pin-video_on' : 'video'} />
            </Styled.StatusIcon>
          </TooltipContainer>
        ) : null}
        {showPresenterStatus ? (
          <TooltipContainer title={presenterStatusLabel}>
            <Styled.StatusIcon
              data-test="userRowPresenter"
              role="img"
              aria-label={presenterStatusLabel}
            >
              <Icon iconName="presentation" />
            </Styled.StatusIcon>
          </TooltipContainer>
        ) : null}
        {showReactionStatus ? (
          <TooltipContainer title={reactionStatusLabel}>
            <Styled.StatusReaction
              data-test="userRowReaction"
              role="img"
              aria-label={reactionStatusLabel}
            >
              {user.reactionEmoji}
            </Styled.StatusReaction>
          </TooltipContainer>
        ) : null}
      </Styled.StatusIconBar>
    </Styled.LeftActionsCluster>
  ) : null;

  return (
    <Styled.UserRow>
      <Styled.UserRowMain
        $clickable={canOpenPrivateChatOnRowClick}
        data-test={canOpenPrivateChatOnRowClick ? 'openPrivateChatFromUserRow' : undefined}
        onClick={canOpenPrivateChatOnRowClick ? openExistingPrivateChatFromRow : undefined}
      >
        {children}
      </Styled.UserRowMain>
      {useSkyroomActionsMenu ? skyroomStatusCluster : (
        <Styled.ActionIconBar
          aria-hidden={!open}
          onClick={(e) => e.stopPropagation()}
        >
          {iconActions.map(renderActionIcon)}
        </Styled.ActionIconBar>
      )}
      {isConfirmationModalOpen ? (
        <ConfirmationModal
          intl={intl}
          title={intl.formatMessage(messages.removeUserConfirmation, { userName: user.name })}
          checkboxMessageId="app.userlist.menu.removeConfirmation.desc"
          confirmParam={user.userId}
          onConfirm={removeUser}
          confirmButtonDataTest="removeUserConfirmation"
          {...{
            onRequestClose: () => setIsConfirmationModalOpen(false),
            priority: 'low',
            setIsOpen: setIsConfirmationModalOpen,
            isOpen: isConfirmationModalOpen,
          }}
        />
      ) : null}
    </Styled.UserRow>
  );
};

export default UserActions;

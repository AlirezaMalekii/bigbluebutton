/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, { ReactNode, useContext } from 'react';
import * as PluginSdk from 'bigbluebutton-html-plugin-sdk';
import {
  UserListItemAdditionalInformationType,
} from 'bigbluebutton-html-plugin-sdk/dist/cjs/extensible-areas/user-list-item-additional-information/enums';
import Styled from './styles';
import browserInfo from '/imports/utils/browserInfo';
import { defineMessages, useIntl } from 'react-intl';
import Icon from '/imports/ui/components/common/icon/icon-ts/component';
import { User } from '/imports/ui/Types/user';
import TooltipContainer from '/imports/ui/components/common/tooltip/container';
import Auth from '/imports/ui/services/auth';
import { LockSettings } from '/imports/ui/Types/meeting';
import { uniqueId } from '/imports/utils/string-utils';
import { convertRemToPixels } from '/imports/utils/dom-utils';
import { PluginsContext } from '/imports/ui/components/components-data/plugin-context/context';
import {
  useIsRaiseHandEnabled,
  useIsReactionsEnabled,
} from '/imports/ui/services/features';
import useWhoIsTalking from '/imports/ui/core/hooks/useWhoIsTalking';
import useWhoIsUnmuted from '/imports/ui/core/hooks/useWhoIsUnmuted';
import { getSettingsSingletonInstance } from '/imports/ui/services/settings';
import { isSkyroomColumnLayout } from '/imports/ui/components/skyroom-layout/panel-toggles';
import SkyroomModeratorBadge from '/imports/ui/components/skyroom-layout/user-avatars/SkyroomModeratorBadge';
import SkyroomViewerBadge from '/imports/ui/components/skyroom-layout/user-avatars/SkyroomViewerBadge';
import useUnreadPrivateChatsBySender from '/imports/ui/core/hooks/useUnreadPrivateChatsBySender';

const messages = defineMessages({
  moderator: {
    id: 'app.userList.moderator',
    description: 'Text for identifying moderator user',
  },
  mobile: {
    id: 'app.userList.mobile',
    description: 'Text for identifying mobile user',
  },
  guest: {
    id: 'app.userList.guest',
    description: 'Text for identifying guest user',
  },
  sharingWebcam: {
    id: 'app.userList.sharingWebcam',
    description: 'Text for identifying who is sharing webcam',
  },
  locked: {
    id: 'app.userList.locked',
    description: 'Text for identifying locked user',
  },
  breakoutRoom: {
    id: 'app.createBreakoutRoom.room',
    description: 'breakout room',
  },
  you: {
    id: 'app.userList.you',
    description: 'Text for identifying your user',
  },
  meetingTabHidden: {
    id: 'app.userList.meetingTabHidden',
    description: 'Tooltip when participant meeting tab is not active',
  },
  raisedHand: {
    id: 'app.userList.raisedHand',
    description: 'Text for identifying users with raised hand',
  },
  privateMessageUnread: {
    id: 'app.userList.privateMessageUnread',
    description: 'Text for identifying users with unread private messages',
  },
});

const { isChrome, isFirefox, isEdge } = browserInfo;

const getIconComponent = (
  icon: PluginSdk.PluginIconType,
  isUserListAdditionalInformation: boolean = false,
): React.ReactNode => {
  if (typeof icon === 'string') {
    if (isUserListAdditionalInformation) return <Styled.UserAdditionalInformationIcon iconName={icon} />;
    return <Icon iconName={icon} />;
  }
  if (icon && typeof icon === 'object' && 'iconName' in icon) {
    if (isUserListAdditionalInformation) return <Styled.UserAdditionalInformationIcon iconName={icon.iconName} />;
    return <Icon iconName={icon.iconName} />;
  }
  if (icon && typeof icon === 'object' && 'svgContent' in icon) {
    const svgContent = icon.svgContent as ReactNode;
    if (isUserListAdditionalInformation) {
      return (
        <Styled.SvgContentUserListIconMargin>
          {svgContent}
        </Styled.SvgContentUserListIconMargin>
      );
    }
    return <Styled.SvgContentUserListIcon>{svgContent}</Styled.SvgContentUserListIcon>;
  }
  return null;
};

interface EmojiProps {
  emoji: { native: string; };
  native: string;
  size: number;
}
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'em-emoji': EmojiProps;
    }
  }
}

interface UserListItemProps {
  user: User;
  lockSettings: LockSettings;
  index: number;
  isMeetingTabHidden?: boolean;
}

const renderUserListItemIconsFromPlugin = (
  userItemsFromPlugin: PluginSdk.UserListItemAdditionalInformationInterface[],
) => userItemsFromPlugin.filter(
  (item) => item.type === UserListItemAdditionalInformationType.ICON,
).map((item: PluginSdk.UserListItemAdditionalInformationInterface) => {
  const itemToRender = item as PluginSdk.UserListItemIcon;
  return (
    <Styled.IconRightContainer
      key={item.id}
      data-test={itemToRender.dataTest}
    >
      {getIconComponent(itemToRender.icon)}
    </Styled.IconRightContainer>
  );
});

const Emoji: React.FC<EmojiProps> = ({ emoji, native, size }) => (
  <em-emoji emoji={emoji} native={native} size={size} />
);

const UserListItem: React.FC<UserListItemProps> = ({
  user, lockSettings, index, isMeetingTabHidden = false,
}) => {
  const { pluginsExtensibleAreasAggregatedState } = useContext(PluginsContext);
  let userItemsFromPlugin = [] as PluginSdk.UserListItemAdditionalInformationInterface[];
  if (pluginsExtensibleAreasAggregatedState.userListItemAdditionalInformation) {
    userItemsFromPlugin = pluginsExtensibleAreasAggregatedState.userListItemAdditionalInformation.filter((item) => {
      const userListItem = item as PluginSdk.UserListItemAdditionalInformationInterface;
      return userListItem.userId === user.userId;
    }) as PluginSdk.UserListItemAdditionalInformationInterface[];
  }

  const intl = useIntl();
  const unreadPrivateChatsBySender = useUnreadPrivateChatsBySender();
  const privateChatUnread = unreadPrivateChatsBySender.get(user.userId)?.unread ?? 0;
  const { data: talkingUsers } = useWhoIsTalking();
  const { data: unmutedUsers } = useWhoIsUnmuted();
  const voiceUser = {
    ...user.voice,
    talking: talkingUsers[user.userId],
    muted: !unmutedUsers[user.userId],
  };
  const subs = [];

  const LABEL = window.meetingClientSettings.public.user.label;

  if (user.isModerator && LABEL.moderator) {
    subs.push(intl.formatMessage(messages.moderator));
  }
  if (user.guest && LABEL.guest) {
    subs.push(intl.formatMessage(messages.guest));
  }
  if (user.mobile && LABEL.mobile) {
    subs.push(intl.formatMessage(messages.mobile));
  }
  if ((user.locked || user.userLockSettings?.disablePublicChat)
      && (user.userLockSettings?.disablePublicChat || lockSettings?.hasActiveLockSetting) && !user.isModerator) {
    subs.push(
      <span key={uniqueId('lock-')} className="skyroom-user-sub-item">
        <Icon iconName="lock" />
        <span className="skyroom-user-sub-text">{intl.formatMessage(messages.locked)}</span>
      </span>,
    );
  }
  if (user.lastBreakoutRoom?.isUserCurrentlyInRoom) {
    subs.push(
      <span key={uniqueId('breakout-')} className="skyroom-user-sub-item">
        <Icon iconName="rooms" />
        <span className="skyroom-user-sub-text">
          {user.lastBreakoutRoom?.isDefaultName
            ? intl.formatMessage(messages.breakoutRoom, { roomNumber: user.lastBreakoutRoom?.sequence })
            : user.lastBreakoutRoom?.shortName}
        </span>
      </span>,
    );
  }
  if (user?.cameras?.length > 0 && LABEL.sharingWebcam) {
    subs.push(
      <span key={uniqueId('webcam-')} className="skyroom-user-sub-item">
        {user?.pinned === true
          ? <Icon iconName="pin-video_on" />
          : <Icon iconName="video" />}
        <span className="skyroom-user-sub-text">{intl.formatMessage(messages.sharingWebcam)}</span>
      </span>,
    );
  }
  const raiseHandEnabled = useIsRaiseHandEnabled();
  if (raiseHandEnabled && user.raiseHand && isSkyroomColumnLayout()) {
    subs.push(
      <span
        key="raise-hand"
        className="skyroom-user-sub-item skyroom-user-raise-hand"
        data-test="raiseHandUserIndicator"
      >
        <Icon iconName="hand" />
        <span className="skyroom-user-sub-text">{intl.formatMessage(messages.raisedHand)}</span>
      </span>,
    );
  }
  if (privateChatUnread > 0) {
    subs.push(
      <span
        key="private-message-unread"
        className="skyroom-user-sub-item skyroom-user-private-message"
        data-test="privateMessageUnreadIndicator"
      >
        <Icon iconName="chat" />
        <span className="skyroom-user-sub-text">
          {intl.formatMessage(messages.privateMessageUnread, { count: privateChatUnread })}
        </span>
      </span>,
    );
  }
  userItemsFromPlugin.filter(
    (item) => item.type === UserListItemAdditionalInformationType.LABEL,
  ).forEach((item) => {
    const itemToRender = item as PluginSdk.UserListItemLabel;
    subs.push(
      <span key={itemToRender.id} data-test={itemToRender.dataTest} className="skyroom-user-sub-item">
        { itemToRender.icon
          && getIconComponent(itemToRender.icon, true) }
        <span className="skyroom-user-sub-text">{itemToRender.label}</span>
      </span>,
    );
  });

  const reactionsEnabled = useIsReactionsEnabled();
  const skyroomColumn = isSkyroomColumnLayout();

  const userAvatarFiltered = (user.away === true) ? '' : user.avatar;

  const emojiIcons = [
    {
      id: 'clock7',
      native: '⏰',
    },
  ];

  const getIconUser = () => {
    const emojiSize = convertRemToPixels(1.3);

    if (user.isDialIn) {
      return <Icon iconName="volume_level_2" />;
    }
    if (user.away === true) {
      return reactionsEnabled
        ? <Emoji key="away" emoji={emojiIcons[0]} native={emojiIcons[0].native} size={emojiSize} />
        : <Icon iconName="time" />;
    }
    // Skyroom: reaction lives in the left status cluster, not on the avatar.
    if (!skyroomColumn && user.reactionEmoji && user.reactionEmoji !== 'none') {
      return user.reactionEmoji;
    }
    if (user.name && userAvatarFiltered.length === 0) {
      if (skyroomColumn) {
        if (user.isModerator || user.role === 'MODERATOR') {
          return <SkyroomModeratorBadge />;
        }
        if (!user.bot) {
          return <SkyroomViewerBadge />;
        }
      }
      if (user.isModerator || user.role === 'MODERATOR') {
        return <i className="icon-bbb-star_filled" aria-hidden />;
      }
      if (user.presenter) {
        return <i className="icon-bbb-presentation" aria-hidden />;
      }
      if (user.bot) {
        return <i className="icon-bbb-group_chat" aria-hidden />;
      }
      return <i className="icon-bbb-user" aria-hidden />;
    }
    return '';
  };

  const avatarContent = getIconUser();

  const hasWhiteboardAccess = user?.whiteboardWriteAccess === true;
  // Skyroom moves mic/presenter off the avatar circle into the left status cluster.
  const showAvatarStatusBadges = !skyroomColumn;

  function addSeparator(elements: (string | JSX.Element)[]) {
    const modifiedElements: (string | JSX.Element)[] = [];
    const skyroomCompact = isSkyroomColumnLayout();

    elements.forEach((element, index) => {
      if (typeof element === 'string' && skyroomCompact) {
        modifiedElements.push(
          <span key={uniqueId('sub-')} className="skyroom-user-sub-item skyroom-user-sub-label">{element}</span>,
        );
      } else if (skyroomCompact && React.isValidElement(element)) {
        const existingClass = (element.props as { className?: string }).className || '';
        modifiedElements.push(
          React.cloneElement(element, {
            className: `skyroom-user-sub-item ${existingClass}`.trim(),
          } as { className: string }),
        );
      } else {
        modifiedElements.push(element);
      }
      if (!skyroomCompact && index !== elements.length - 1) {
        modifiedElements.push(
          <span key={uniqueId('separator-')}> | </span>,
        );
      }
    });
    return modifiedElements;
  }

  const Settings = getSettingsSingletonInstance();
  const animations = Settings?.application?.animations;

  return (
    <Styled.UserItemContents
      id={`user-index-${index}`}
      tabIndex={-1}
      data-test={(user.userId === Auth.userID) ? 'userListItemCurrent' : 'userListItem'}
      role="listitem"
      aria-label={user.name}
      data-id={user.extId}
    >
      <Styled.Avatar
        data-test={user.isModerator ? 'moderatorAvatar' : 'viewerAvatar'}
        data-test-presenter={user.presenter ? '' : undefined}
        data-test-avatar="userAvatar"
        moderator={user.isModerator}
        presenter={showAvatarStatusBadges && user.presenter}
        talking={voiceUser?.talking}
        muted={showAvatarStatusBadges && voiceUser?.muted}
        listenOnly={showAvatarStatusBadges && (voiceUser?.listenOnly || voiceUser?.listenOnlyInputDevice)}
        voice={showAvatarStatusBadges && voiceUser?.joined && !voiceUser?.deafened}
        noVoice={showAvatarStatusBadges && (!voiceUser?.joined || voiceUser?.deafened)}
        color={user.color}
        whiteboardAccess={showAvatarStatusBadges && hasWhiteboardAccess}
        animations={animations}
        avatar={userAvatarFiltered}
        isChrome={isChrome}
        isFirefox={isFirefox}
        isEdge={isEdge}
      >
        {avatarContent}
      </Styled.Avatar>
      <Styled.UserNameContainer data-test="userNameContainer">
        <Styled.UserName>
          <TooltipContainer title={user.name} role="button">
            <span>{user.name}</span>
          </TooltipContainer>
          &nbsp;
          {(user.userId === Auth.userID) ? `(${intl.formatMessage(messages.you)})` : ''}
        </Styled.UserName>
        <Styled.UserNameSub data-test={user.mobile ? 'mobileUser' : undefined}>
          {subs.length ? addSeparator(subs) : null}
        </Styled.UserNameSub>
      </Styled.UserNameContainer>
      {renderUserListItemIconsFromPlugin(userItemsFromPlugin)}
      {isMeetingTabHidden ? (
        <Styled.IconRightContainer data-test="meetingTabHiddenIcon">
          <TooltipContainer
            title={intl.formatMessage(messages.meetingTabHidden)}
            placement="top"
          >
            <Styled.MeetingTabHiddenIconWrap
              role="img"
              aria-label={intl.formatMessage(messages.meetingTabHidden)}
              onClick={(e) => e.stopPropagation()}
            >
              <Styled.MeetingTabHiddenIcon iconName="desktop" />
            </Styled.MeetingTabHiddenIconWrap>
          </TooltipContainer>
        </Styled.IconRightContainer>
      ) : null}
    </Styled.UserItemContents>
  );
};

export default UserListItem;

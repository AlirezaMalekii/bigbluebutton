import styled, { css } from 'styled-components';

import {
  userIndicatorsOffset,
  smPaddingX,
} from '/imports/ui/stylesheets/styled-components/general';
import {
  fontSizeBase,
} from '/imports/ui/stylesheets/styled-components/typography';

import {
  colorWhite,
  userListBg,
  colorSuccess,
  colorGrayDark,
} from '/imports/ui/stylesheets/styled-components/palette';

import Header from '/imports/ui/components/common/control-header/component';
import { ChatTime as ChatTimeBase } from './message-header/styles';

interface ChatWrapperProps {
  sameSender: boolean;
  messageHighlight: boolean;
  isPresentationUpload?: boolean;
  isCustomPluginMessage: boolean;
}

interface ChatMessageContentWrapperProps {
  sameSender: boolean;
  isCustomPluginMessage: boolean;
  $isSystemSender: boolean;
  $editing: boolean;
  $highlight: boolean;
  $reactionPopoverIsOpen: boolean;
  $keyboardFocused: boolean;
  $emphasizedMessage: boolean;
}

interface ChatAvatarProps {
  avatar: string;
  color: string;
  moderator: boolean;
  emoji?: string;
}

export const FlexColumn = styled.div`
  display: flex;
  flex-flow: column;
  gap: 2px;
`;

export const ChatWrapper = styled.div<ChatWrapperProps>`
  pointer-events: auto;
  display: flex;
  flex-flow: column;
  gap: 2px;
  position: relative;
  font-size: ${fontSizeBase};
  position: relative;

  [dir='rtl'] & {
    direction: rtl;
  }

  ${({ isPresentationUpload }) => isPresentationUpload && `
      margin-top: 0.75rem;
      padding: 0;
      word-break: break-word;
      background: transparent;
      border: none;
      border-inline-start: none;
    `}
  ${({ messageHighlight }) => messageHighlight && `
    background-color: rgba(80, 220, 220, 0.08);
    border-left: 2px solid rgba(80, 220, 220, 0.28);
    border-radius: 0px 3px 3px 0px;
    padding: 4px 2px;
  `}
  ${({ isCustomPluginMessage }) => isCustomPluginMessage && `
    margin: 0;
    padding: 0;
  `}
`;

export const ChatMessageContentWrapper = styled.div<ChatMessageContentWrapperProps>`
  display: flex;
  flex-flow: column;
  width: 100%;
  border-radius: 9px;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.06);

  ${({ $isSystemSender, isCustomPluginMessage }) => !$isSystemSender && !isCustomPluginMessage
  && `
    background: rgba(20, 30, 44, 0.84);
  `}

  ${({ $highlight, isCustomPluginMessage }) => ($highlight && !isCustomPluginMessage) && `
    &:hover {
      border: 1px solid rgba(80, 220, 220, 0.18);
    }
  `}

  ${({
    $editing, $reactionPopoverIsOpen, $keyboardFocused,
    isCustomPluginMessage,
  }) => !isCustomPluginMessage && ($reactionPopoverIsOpen || $editing || $keyboardFocused)
    && `
    background: rgba(22, 34, 50, 0.9) !important;
    border-color: rgba(80, 220, 220, 0.24) !important;
  `}

  .chat-message-container:focus & {
    background: rgba(22, 34, 50, 0.9) !important;
    border-color: rgba(80, 220, 220, 0.24) !important;
  }

  ${({ $emphasizedMessage, isCustomPluginMessage }) => (!isCustomPluginMessage && $emphasizedMessage) && `
    background: rgba(30, 46, 66, 0.92);
    border-color: rgba(80, 220, 220, 0.2);

    &:hover {
      border: 1px solid rgba(80, 220, 220, 0.28);
    }
  `}
`;

export const ChatContentFooter = styled.div`
  justify-content: flex-end;
  gap: 0.25rem;
  position: absolute;
  bottom: 0.2rem;
  line-height: 1;
  font-size: 80%;
  display: flex;
  background-color: inherit;
  border-radius: 0.5rem;

  [dir="rtl"] & {
    left: 0.25rem;
  }

  [dir="ltr"] & {
    right: 0.25rem;
  }
`;

export const ChatHeader = styled(Header)`
  ${({ isRTL }) => isRTL && `
    padding-left: ${smPaddingX};
  `}

  ${({ isRTL }) => !isRTL && `
    padding-right: ${smPaddingX};
  `}
`;

export const ChatAvatar = styled.div<ChatAvatarProps>`
  flex: 0 0 1.125rem;
  margin: 0 0.35rem 0 0;
  box-flex: 0;
  position: relative;
  height: 1.125rem;
  width: 1.125rem;
  border-radius: 50%;
  text-align: center;
  font-size: .58rem;
  border: 2px solid transparent;
  user-select: none;
  ${({ color }) => css`
    background-color: ${color};
  `}

  &:after,
  &:before {
    content: "";
    position: absolute;
    width: 0;
    height: 0;
    padding-top: .5rem;
    padding-right: 0;
    padding-left: 0;
    padding-bottom: 0;
    color: inherit;
    top: auto;
    left: auto;
    bottom: ${userIndicatorsOffset};
    right: ${userIndicatorsOffset};
    border: 1.5px solid ${userListBg};
    border-radius: 50%;
    background-color: ${colorSuccess};
    color: ${colorWhite};
    opacity: 0;
    font-family: 'bbb-icons';
    font-size: .65rem;
    line-height: 0;
    text-align: center;
    vertical-align: middle;
    letter-spacing: -.65rem;
    z-index: 1;

    [dir="rtl"] & {
      left: ${userIndicatorsOffset};
      right: auto;
      padding-right: .65rem;
      padding-left: 0;
    }
  }

  ${({ moderator }) => moderator && `
    border-radius: 4px;
  `}
  
  // ================ image ================
  ${({ avatar, emoji, color }) => avatar?.length !== 0 && !emoji && css`
      background-image: url(${avatar});
      background-repeat: no-repeat;
      background-size: cover;
      background-position: center;
      border: 1px solid ${color};
    `}
  // ================ image ================

  // ================ content ================
  color: ${colorWhite} !important;
  font-size: 95%;
  text-transform: capitalize;
  display: flex;
  justify-content: center;
  align-items:center;
  // ================ content ================

  & .react-loading-skeleton {
    height: 1.125rem;
    width: 1.125rem;
  }
`;

export const Container = styled.div<{ $sequence: number }>`
  display: flex;
  flex-direction: column;
  user-select: text;
  outline: none;

  &:not(:first-of-type) {
    margin-top: 4px;
  }

  &[data-focusable="false"] {
    pointer-events: none;
  }
`;

export const MessageItemWrapper = styled.div`
  display: flex;
  flex-direction: row;
  padding: 4px 8px 6px;
`;

export const PluginInformationMetadata = styled.div`
  font-size: 70%;
  font-style: italic;
  color: ${colorGrayDark};
  padding: 0 .25rem 0 0;
  text-align: end;
`;

export const DeleteMessage = styled.span`
  color: rgba(198, 208, 220, 0.72);
  padding: 5px 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
`;

export const ChatHeading = styled.div`
  display: flex;
`;

export const EditLabel = styled.span`
  color: rgba(198, 208, 220, 0.62);
  font-style: italic;
  font-size: 75%;
  display: flex;
  align-items: center;
  gap: 0.125rem;
  line-height: 1;
`;

export const ChatTime = styled(ChatTimeBase)`
  font-style: italic;
  color: rgba(198, 208, 220, 0.62);
  display: none;

  .chat-message-container:focus &,
  .chat-message-container-keyboard-focused &,
  .chat-message-content:hover & {
    display: flex;
  }
`;

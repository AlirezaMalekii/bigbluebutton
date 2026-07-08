import React, { useCallback, useState } from 'react';
import { useMutation, useReactiveVar } from '@apollo/client';
import { defineMessages, useIntl } from 'react-intl';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import connectionStatus from '/imports/ui/core/graphql/singletons/connectionStatus';
import { CHAT_SEND_MESSAGE } from '/imports/ui/components/chat/chat-graphql/chat-message-form/mutations';
import {
  OverlayForm,
  OverlayInput,
  OverlaySendButton,
} from './styles';

const intlMessages = defineMessages({
  placeholder: {
    id: 'app.screenShareChatOverlay.inputPlaceholder',
    description: 'Overlay chat input placeholder',
  },
  submit: {
    id: 'app.screenShareChatOverlay.submit',
    description: 'Overlay chat send button',
  },
  disconnected: {
    id: 'app.chat.disconnected',
    description: 'Disconnected chat message',
  },
  locked: {
    id: 'app.chat.locked',
    description: 'Locked chat message',
  },
});

interface OverlayChatFormProps {
  isRTL: boolean;
}

const OverlayChatForm: React.FC<OverlayChatFormProps> = ({ isRTL }) => {
  const intl = useIntl();
  const [message, setMessage] = useState('');
  const [sendError, setSendError] = useState('');
  const isConnected = useReactiveVar(connectionStatus.getConnectedStatusVar());
  const CHAT_CONFIG = window.meetingClientSettings.public.chat;
  const publicGroupChatId = CHAT_CONFIG.public_group_id;

  const { data: currentUser } = useCurrentUser((user) => ({
    isModerator: user?.isModerator,
    locked: user?.locked,
    userLockSettings: user?.userLockSettings,
  }));

  const { data: meeting } = useMeeting((m) => ({
    lockSettings: m?.lockSettings,
  }));

  const [sendMessage, { loading }] = useMutation(CHAT_SEND_MESSAGE);

  const isModerator = !!currentUser?.isModerator;
  const isLocked = !!currentUser?.locked || !!currentUser?.userLockSettings?.disablePublicChat;
  const disablePublicChat = !!meeting?.lockSettings?.disablePublicChat
    || !!currentUser?.userLockSettings?.disablePublicChat;
  const chatLocked = !isModerator && isLocked && disablePublicChat;
  const disabled = !isConnected || chatLocked || loading;

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || disabled) return;

    setSendError('');
    try {
      await sendMessage({
        variables: {
          chatId: publicGroupChatId,
          chatMessageInMarkdownFormat: trimmed,
          replyToMessageId: null,
        },
      });
      setMessage('');
    } catch {
      setSendError(intl.formatMessage({
        id: 'app.chat.errorOnSendMessage',
        description: 'Error sending message',
      }));
    }
  }, [disabled, intl, message, publicGroupChatId, sendMessage]);

  let placeholder = intl.formatMessage(intlMessages.placeholder);
  if (chatLocked) {
    placeholder = intl.formatMessage(intlMessages.locked);
  } else if (!isConnected) {
    placeholder = intl.formatMessage(intlMessages.disconnected);
  }

  return (
    <OverlayForm onSubmit={handleSubmit} $isRTL={isRTL}>
      <OverlayInput
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        dir={isRTL ? 'rtl' : 'ltr'}
        aria-label={placeholder}
        rows={1}
      />
      <OverlaySendButton type="submit" disabled={disabled || !message.trim()}>
        {intl.formatMessage(intlMessages.submit)}
      </OverlaySendButton>
      {sendError ? <span>{sendError}</span> : null}
    </OverlayForm>
  );
};

export default OverlayChatForm;

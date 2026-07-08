import React, { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client';
import { defineMessages, useIntl } from 'react-intl';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import useMeeting from '/imports/ui/core/hooks/useMeeting';
import { CHAT_SEND_MESSAGE } from '/imports/ui/components/chat/chat-graphql/chat-message-form/mutations';
import {
  OverlayErrorText,
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
  const disabled = chatLocked || loading;

  const submitMessage = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;

    setSendError('');
    try {
      await sendMessage({
        variables: {
          chatId: publicGroupChatId,
          chatMessageInMarkdownFormat: trimmed,
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

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    submitMessage();
  }, [submitMessage]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  }, [submitMessage]);

  let placeholder = intl.formatMessage(intlMessages.placeholder);
  if (chatLocked) {
    placeholder = intl.formatMessage(intlMessages.locked);
  }

  return (
    <OverlayForm onSubmit={handleSubmit} $isRTL={isRTL}>
      <OverlayInput
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        dir={isRTL ? 'rtl' : 'ltr'}
        aria-label={placeholder}
        rows={1}
      />
      <OverlaySendButton type="submit" disabled={disabled || !message.trim()}>
        {intl.formatMessage(intlMessages.submit)}
      </OverlaySendButton>
      {sendError ? <OverlayErrorText>{sendError}</OverlayErrorText> : null}
    </OverlayForm>
  );
};

export default OverlayChatForm;

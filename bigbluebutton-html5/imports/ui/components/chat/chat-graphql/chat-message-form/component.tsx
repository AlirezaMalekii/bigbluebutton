/* eslint-disable @typescript-eslint/ban-ts-comment */
import React, {
  ChangeEvent,
  RefObject,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { useLazyQuery, useMutation, useReactiveVar } from '@apollo/client';
import TextareaAutosize from 'react-autosize-textarea';
import { ChatFormCommandsEnum } from 'bigbluebutton-html-plugin-sdk/dist/cjs/ui-commands/chat/form/enums';
import { FillChatFormCommandArguments } from 'bigbluebutton-html-plugin-sdk/dist/cjs/ui-commands/chat/form/types';
import { UI_DATA_LISTENER_SUBSCRIBED } from 'bigbluebutton-html-plugin-sdk/dist/cjs/ui-data/hooks/consts';
import { ChatFormUiDataPayloads } from 'bigbluebutton-html-plugin-sdk/dist/cjs/ui-data/domain/chat/form/types';
import * as PluginSdk from 'bigbluebutton-html-plugin-sdk';
import { layoutSelect } from '/imports/ui/components/layout/context';
import { defineMessages, useIntl } from 'react-intl';
import {
  useIsEditChatMessageEnabled, useIsEmojiPickerEnabled,
} from '/imports/ui/services/features';
import { checkText } from 'smile2emoji';
import Styled from './styles';
import deviceInfo from '/imports/utils/deviceInfo';
import { getAllShortCodes } from '/imports/utils/emoji-utils';
import usePreviousValue from '/imports/ui/hooks/usePreviousValue';
import useChat from '/imports/ui/core/hooks/useChat';
import useCurrentUser from '/imports/ui/core/hooks/useCurrentUser';
import { Chat } from '/imports/ui/Types/chat';
import { Layout } from '../../../layout/layoutTypes';
import useMeeting from '/imports/ui/core/hooks/useMeeting';

import ChatOfflineIndicator from './chat-offline-indicator/component';
import { isSkyroomColumnLayout } from '/imports/ui/components/skyroom-layout/panel-toggles';
import SkyroomComposer from '/imports/ui/components/skyroom-layout/chat-composer/styles';
import SkyroomStickerStyled from '/imports/ui/components/skyroom-layout/chat-stickers/styles';
import SkyroomStickerPanel from '/imports/ui/components/skyroom-layout/chat-stickers/component';
import { ChatEvents } from '/imports/ui/core/enums/chat';
import { CHAT_SEND_MESSAGE, CHAT_SET_TYPING } from './mutations';
import Storage from '/imports/ui/services/storage/session';
import { indexOf, without } from '/imports/utils/array-utils';
import { GraphqlDataHookSubscriptionResponse } from '/imports/ui/Types/hook';
import { throttle } from '/imports/utils/throttle';
import logger from '/imports/startup/client/logger';
import { CHAT_EDIT_MESSAGE_MUTATION } from '../chat-message-list/page/chat-message/mutations';
import {
  LastSentMessageData,
  LastSentMessageResponse,
  USER_LAST_SENT_PRIVATE_CHAT_MESSAGE_QUERY,
  USER_LAST_SENT_PUBLIC_CHAT_MESSAGE_QUERY,
} from './queries';
import Auth from '/imports/ui/services/auth';
import connectionStatus from '/imports/ui/core/graphql/singletons/connectionStatus';

const CLOSED_CHAT_LIST_KEY = 'closedChatList';
const START_TYPING_THROTTLE_INTERVAL = 1000;
const RTL_CHAR_REGEX = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const LTR_CHAR_REGEX = /[A-Za-z]/;

interface ChatMessageFormProps {
  minMessageLength: number,
  maxMessageLength: number,
  // Lint disable here because this variable can be undefined
  // eslint-disable-next-line react/no-unused-prop-types
  idChatOpen: string,
  isRTL: boolean,
  chatId: string,
  connected: boolean,
  disabled: boolean,
  locked: boolean,
  partnerIsLoggedOut: boolean,
  title: string,
  getUserLastSentMessage: () => Promise<LastSentMessageData | null>,
}

const messages = defineMessages({
  submitLabel: {
    id: 'app.chat.submitLabel',
    description: 'Chat submit button label',
  },
  inputLabel: {
    id: 'app.chat.inputLabel',
    description: 'Chat message input label',
  },
  emojiButtonLabel: {
    id: 'app.chat.emojiButtonLabel',
    description: 'Chat message emoji picker button label',
  },
  inputPlaceholder: {
    id: 'app.chat.inputPlaceholder',
    description: 'Chat message input placeholder',
  },
  errorMaxMessageLength: {
    id: 'app.chat.errorMaxMessageLength',
  },
  errorOnSendMessage: {
    id: 'app.chat.errorOnSendMessage',
  },
  errorServerDisconnected: {
    id: 'app.chat.disconnected',
  },
  errorChatLocked: {
    id: 'app.chat.locked',
  },
  singularTyping: {
    id: 'app.chat.singularTyping',
    description: 'used to indicate when 1 user is typing',
  },
  pluralTyping: {
    id: 'app.chat.pluralTyping',
    description: 'used to indicate when multiple user are typing',
  },
  severalPeople: {
    id: 'app.chat.severalPeople',
    description: 'displayed when 4 or more users are typing',
  },
  titlePublic: {
    id: 'app.chat.titlePublic',
    description: 'Public chat title',
  },
  titlePrivate: {
    id: 'app.chat.titlePrivate',
    description: 'Private chat title',
  },
});

type EditingMessage = { chatId: string; messageId: string, message: string };

const ChatMessageForm: React.FC<ChatMessageFormProps> = ({
  title,
  disabled,
  partnerIsLoggedOut,
  minMessageLength,
  maxMessageLength,
  chatId,
  connected,
  locked,
  isRTL,
  getUserLastSentMessage,
}) => {
  const intl = useIntl();
  const [hasErrors, setHasErrors] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState('');
  const [inputDir, setInputDir] = React.useState<'rtl' | 'ltr'>(isRTL ? 'rtl' : 'ltr');
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiPickerButtonRef = useRef<HTMLDivElement>(null);
  // Skyroom sticker (popular-emoji) quick-pick — mutually exclusive with the emoji picker.
  const [showStickerPicker, setShowStickerPicker] = React.useState(false);
  const stickerButtonRef = useRef<HTMLButtonElement>(null);
  const [isTextAreaFocused, setIsTextAreaFocused] = React.useState(false);
  const [repliedMessageId, setRepliedMessageId] = React.useState<string | null>(null);
  const [emojisToExclude, setEmojisToExclude] = React.useState<string[]>([]);
  const editingMessage = React.useRef<EditingMessage | null>(null);
  const textAreaRef: RefObject<TextareaAutosize> = useRef<TextareaAutosize>(null);
  const { isMobile } = deviceInfo;
  const prevChatId = usePreviousValue(chatId);
  const messageRef = useRef<string>('');
  const messageBeforeEditingRef = useRef<string | null>(null);
  messageRef.current = message;
  const updateUnsentMessages = (chatId: string, message: string) => {
    const unsentMessages = Storage.getItem('unsentMessages') as Record<string, string> || {};
    unsentMessages[chatId] = message;
    Storage.setItem('unsentMessages', unsentMessages);
  };

  const [chatSetTyping] = useMutation(CHAT_SET_TYPING);

  const [chatSendMessage, {
    loading: chatSendMessageLoading, error: chatSendMessageError,
  }] = useMutation(CHAT_SEND_MESSAGE);
  const [
    chatEditMessage,
    { loading: chatEditMessageLoading },
  ] = useMutation(CHAT_EDIT_MESSAGE_MUTATION);

  const CHAT_CONFIG = window.meetingClientSettings.public.chat;
  const PUBLIC_CHAT_ID = CHAT_CONFIG.public_id;
  const PUBLIC_GROUP_CHAT_ID = CHAT_CONFIG.public_group_id;
  const AUTO_CONVERT_EMOJI = window.meetingClientSettings.public.chat.autoConvertEmoji;
  const ENABLE_EMOJI_PICKER = useIsEmojiPickerEnabled();
  const ENABLE_TYPING_INDICATOR = CHAT_CONFIG.typingIndicator.enabled;
  const DISABLE_EMOJIS = CHAT_CONFIG.disableEmojis;

  const handleUserTyping = (hasError?: boolean) => {
    if (hasError || !ENABLE_TYPING_INDICATOR) return;

    chatSetTyping({
      variables: {
        chatId: chatId === PUBLIC_CHAT_ID ? PUBLIC_GROUP_CHAT_ID : chatId,
      },
    });
  };

  const throttleHandleUserTyping = useMemo(() => throttle(
    handleUserTyping, START_TYPING_THROTTLE_INTERVAL, {
      leading: true,
      trailing: false,
    },
  ), [chatId]);

  useEffect(() => {
    setMessageHint();
    if (!isMobile) {
      if (textAreaRef?.current) textAreaRef.current.textarea.focus();
    }

    return () => {
      const unsentMessage = messageRef.current;
      updateUnsentMessages(chatId, unsentMessage);
    };
  }, []);

  useEffect(() => {
    // load all shortcodes and aliases for emojis to exclude
    let emojisToExclude = [
      ...DISABLE_EMOJIS,
    ];

    emojisToExclude.forEach(async (shortcode) => {
      const shortcodes = await getAllShortCodes(shortcode);

      emojisToExclude = Array.from(new Set([...emojisToExclude, ...shortcodes]));
      setEmojisToExclude(emojisToExclude);
    });
  }, []);

  useEffect(() => {
    const loadExcludedEmojis = async () => {
      let allExcluded = [...DISABLE_EMOJIS];

      // eslint-disable-next-line no-restricted-syntax
      for (const shortcode of DISABLE_EMOJIS) {
        // eslint-disable-next-line no-await-in-loop
        const shortcodes = await getAllShortCodes(shortcode);
        allExcluded = [...allExcluded, ...shortcodes];
      }

      const newEmojisToExclude = Array.from(new Set(allExcluded));

      setEmojisToExclude(newEmojisToExclude);
    };

    if (DISABLE_EMOJIS?.length > 0) {
      loadExcludedEmojis();
    }
  }, [DISABLE_EMOJIS]);

  useEffect(() => {
    const unsentMessages = Storage.getItem('unsentMessages') as Record<string, string> || {};

    if (prevChatId) {
      updateUnsentMessages(prevChatId, message);
    }

    const unsentMessage = unsentMessages[chatId] || '';
    setMessage(unsentMessage);

    if (!isMobile) {
      if (textAreaRef?.current) textAreaRef.current.textarea.focus();
    }
    setError(null);
    setHasErrors(false);
  }, [chatId]);

  useEffect(() => {
    setMessageHint();
  }, [connected, locked, partnerIsLoggedOut]);

  useEffect(() => {
    const shouldRestoreFocus = textAreaRef.current
      && !chatSendMessageLoading
      && isTextAreaFocused
      && document.activeElement !== textAreaRef.current.textarea;

    if (shouldRestoreFocus) {
      textAreaRef.current.textarea.focus();
    }
  }, [chatSendMessageLoading, textAreaRef.current]);

  const setMessageHint = () => {
    let chatDisabledHint = null;

    if (disabled && !partnerIsLoggedOut) {
      if (connected) {
        if (locked) {
          chatDisabledHint = messages.errorChatLocked;
        }
      } else {
        chatDisabledHint = messages.errorServerDisconnected;
      }
    }

    setHasErrors(disabled);
    setError(chatDisabledHint ? intl.formatMessage(chatDisabledHint) : null);
  };

  const handleEmojiSelect = (emojiObject: { native: string }): void => {
    const txtArea = textAreaRef?.current?.textarea;
    if (!txtArea) return;
    const cursor = txtArea.selectionStart;

    setMessage(
      message.slice(0, cursor)
      + emojiObject.native
      + message.slice(cursor),
    );

    const newCursor = cursor + emojiObject.native.length;
    setTimeout(() => txtArea.setSelectionRange(newCursor, newCursor), 10);
  };

  const customCheckText = (input: string): string => {
    const placeholderMap: Record<string, string> = {};

    emojisToExclude.forEach((shortcode, index) => {
      const placeholder = `__EXCLUDE_${index}__`;
      const target = `:${shortcode}:`;
      placeholderMap[placeholder] = target;
      // eslint-disable-next-line no-param-reassign
      input = input.split(target).join(placeholder);
    });

    let result = checkText(input);

    Object.entries(placeholderMap).forEach(([placeholder, original]) => {
      result = result.split(placeholder).join(original);
    });

    return result;
  };

  const handleMessageChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    let newMessage = null;
    let newError = null;
    if (AUTO_CONVERT_EMOJI) {
      newMessage = customCheckText(e.target.value);
    } else {
      newMessage = e.target.value;
    }

    if (newMessage.length > maxMessageLength) {
      newError = intl.formatMessage(
        messages.errorMaxMessageLength,
        { maxMessageLength },
      );
      newMessage = newMessage.substring(0, maxMessageLength);
    }
    setMessage(newMessage);
    const firstStrongChar = newMessage.trim().charAt(0);
    if (firstStrongChar) {
      if (RTL_CHAR_REGEX.test(firstStrongChar)) {
        setInputDir('rtl');
      } else if (LTR_CHAR_REGEX.test(firstStrongChar)) {
        setInputDir('ltr');
      }
    } else {
      setInputDir(isRTL ? 'rtl' : 'ltr');
    }
    setError(newError);
    throttleHandleUserTyping(newError != null);
  };

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(PluginSdk.ChatFormUiDataNames.CURRENT_CHAT_INPUT_TEXT, {
      detail: {
        text: message,
      },
    }));
  }, [message]);

  useEffect(() => {
    if (editingMessage.current) {
      textAreaRef.current?.dispatchEvent?.('autosize:update');
    }
  }, [message]);

  useEffect(() => {
    const firstStrongChar = message.trim().charAt(0);
    if (!firstStrongChar) {
      setInputDir(isRTL ? 'rtl' : 'ltr');
      return;
    }
    if (RTL_CHAR_REGEX.test(firstStrongChar)) {
      setInputDir('rtl');
      return;
    }
    if (LTR_CHAR_REGEX.test(firstStrongChar)) {
      setInputDir('ltr');
      return;
    }
    setInputDir(isRTL ? 'rtl' : 'ltr');
  }, [message, isRTL]);

  useEffect(() => {
    const handleReplyIntention = (e: Event) => {
      if (e instanceof CustomEvent) {
        setRepliedMessageId(e.detail.messageId);
        textAreaRef.current?.textarea.focus();
      }
    };

    const handleEditingMessage = (e: Event) => {
      if (e instanceof CustomEvent) {
        if (textAreaRef.current) {
          if (messageBeforeEditingRef.current === null) {
            messageBeforeEditingRef.current = messageRef.current;
          }
          editingMessage.current = e.detail;
          setMessage(e.detail.message);
          textAreaRef.current?.textarea.focus();
        }
      }
    };

    const handleCancelEditingMessage = (e: Event) => {
      if (e instanceof CustomEvent) {
        if (editingMessage.current) {
          if (messageBeforeEditingRef.current !== null) {
            setMessage(messageBeforeEditingRef.current);
            messageBeforeEditingRef.current = null;
          }
          editingMessage.current = null;
        }
      }
    };

    const handleCancelReplyIntention = (e: Event) => {
      if (e instanceof CustomEvent) {
        setRepliedMessageId(null);
      }
    };

    window.addEventListener(ChatEvents.CHAT_REPLY_INTENTION, handleReplyIntention);
    window.addEventListener(ChatEvents.CHAT_EDIT_REQUEST, handleEditingMessage);
    window.addEventListener(ChatEvents.CHAT_CANCEL_EDIT_REQUEST, handleCancelEditingMessage);
    window.addEventListener(ChatEvents.CHAT_CANCEL_REPLY_INTENTION, handleCancelReplyIntention);

    return () => {
      window.removeEventListener(ChatEvents.CHAT_REPLY_INTENTION, handleReplyIntention);
      window.removeEventListener(ChatEvents.CHAT_EDIT_REQUEST, handleEditingMessage);
      window.removeEventListener(ChatEvents.CHAT_CANCEL_EDIT_REQUEST, handleCancelEditingMessage);
      window.removeEventListener(ChatEvents.CHAT_CANCEL_REPLY_INTENTION, handleCancelReplyIntention);
    };
  }, []);

  const renderForm = () => {
    const formRef = useRef<HTMLFormElement | null>(null);
    const CHAT_EDIT_ENABLED = useIsEditChatMessageEnabled();
    const hasSelectedTextInChat = useRef(false);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLInputElement> | Event) => {
      e.preventDefault();

      const msg = message;

      if (msg.length < minMessageLength || chatSendMessageLoading) return;

      if (disabled
        || msg.length > maxMessageLength) {
        setHasErrors(true);
        return;
      }

      const sendCancelEvents = () => {
        if (repliedMessageId) {
          window.dispatchEvent(
            new CustomEvent(ChatEvents.CHAT_CANCEL_REPLY_INTENTION),
          );
        }
        if (editingMessage) {
          window.dispatchEvent(
            new CustomEvent(ChatEvents.CHAT_CANCEL_EDIT_REQUEST),
          );
        }
      };

      if (editingMessage.current && !chatEditMessageLoading) {
        chatEditMessage({
          variables: {
            chatId: editingMessage.current.chatId,
            messageId: editingMessage.current.messageId,
            chatMessageInMarkdownFormat: msg,
          },
        }).then(() => {
          sendCancelEvents();
        }).catch((e) => {
          logger.error({
            logCode: 'chat_edit_message_error',
            extraInfo: {
              errorName: e?.name,
              errorMessage: e?.message,
            },
          }, `Editing the message failed: ${e?.message}`);
        });
      } else if (!chatSendMessageLoading) {
        chatSendMessage({
          variables: {
            chatMessageInMarkdownFormat: msg,
            chatId: chatId === PUBLIC_CHAT_ID ? PUBLIC_GROUP_CHAT_ID : chatId,
            replyToMessageId: repliedMessageId,
          },
        }).then(() => {
          sendCancelEvents();
        });
      }
      const currentClosedChats = Storage.getItem(CLOSED_CHAT_LIST_KEY) as string[];

      // Remove the chat that user send messages from the session.
      if (indexOf(currentClosedChats, chatId) > -1) {
        Storage.setItem(CLOSED_CHAT_LIST_KEY, without(currentClosedChats, chatId));
      }

      setMessage('');
      updateUnsentMessages(chatId, '');
      setError(null);
      setHasErrors(false);
      setShowEmojiPicker(false);
      const sentMessageEvent = new CustomEvent(ChatEvents.SENT_MESSAGE);
      window.dispatchEvent(sentMessageEvent);
    };

    const handleMessageKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // TODO Prevent send message pressing enter on mobile and/or virtual keyboard
      if (e.keyCode === 13 && !e.shiftKey) {
        e.preventDefault();

        const event = new Event('submit', {
          bubbles: true,
          cancelable: true,
        });
        handleSubmit(event);
      }
      if (e.key === 'ArrowUp' && !editingMessage.current && messageRef.current === '' && CHAT_EDIT_ENABLED) {
        e.preventDefault();
        getUserLastSentMessage().then((msg) => {
          if (msg) {
            window.dispatchEvent(
              new CustomEvent(ChatEvents.CHAT_EDIT_REQUEST, {
                detail: {
                  messageId: msg.messageId,
                  chatId: msg.chatId,
                  message: msg.message,
                },
              }),
            );
            window.dispatchEvent(
              new CustomEvent(ChatEvents.CHAT_CANCEL_REPLY_INTENTION),
            );
          }
        });
      }
    };
    const handleFillChatFormThroughPlugin = ((
      event: CustomEvent<FillChatFormCommandArguments>,
    ) => setMessage(event.detail.text)) as EventListener;
    useEffect(() => {
      // Define functions to first inform ui data hooks that subscribe to these events
      const updateUiDataHookChatFormChangedForPlugin = () => {
        window.dispatchEvent(new CustomEvent(PluginSdk.ChatFormUiDataNames.CHAT_INPUT_IS_FOCUSED, {
          detail: {
            value: isTextAreaFocused,
          } as ChatFormUiDataPayloads[PluginSdk.ChatFormUiDataNames.CHAT_INPUT_IS_FOCUSED],
        }));
      };
      const updateUiDataHookChatInputTextPlugin = () => {
        window.dispatchEvent(new CustomEvent(PluginSdk.ChatFormUiDataNames.CURRENT_CHAT_INPUT_TEXT, {
          detail: {
            text: message,
          } as ChatFormUiDataPayloads[PluginSdk.ChatFormUiDataNames.CURRENT_CHAT_INPUT_TEXT],
        }));
      };

      // When component mount, add event listener to send first information
      // about these ui data hooks to plugin
      window.addEventListener(
        `${UI_DATA_LISTENER_SUBSCRIBED}-${PluginSdk.ChatFormUiDataNames.CHAT_INPUT_IS_FOCUSED}`,
        updateUiDataHookChatFormChangedForPlugin,
      );
      window.addEventListener(
        `${UI_DATA_LISTENER_SUBSCRIBED}-${PluginSdk.ChatFormUiDataNames.CURRENT_CHAT_INPUT_TEXT}`,
        updateUiDataHookChatInputTextPlugin,
      );
      window.addEventListener(ChatFormCommandsEnum.FILL, handleFillChatFormThroughPlugin);

      // Before component unmount, remove event listeners for plugin ui data hooks
      return () => {
        window.removeEventListener(
          `${UI_DATA_LISTENER_SUBSCRIBED}-${PluginSdk.ChatFormUiDataNames.CHAT_INPUT_IS_FOCUSED}`,
          updateUiDataHookChatFormChangedForPlugin,
        );
        window.removeEventListener(
          `${UI_DATA_LISTENER_SUBSCRIBED}-${PluginSdk.ChatFormUiDataNames.CURRENT_CHAT_INPUT_TEXT}`,
          updateUiDataHookChatInputTextPlugin,
        );
        window.removeEventListener(ChatFormCommandsEnum.FILL, handleFillChatFormThroughPlugin);
      };
    }, []);

    useEffect(() => {
      const handleClick = (event: MouseEvent) => {
        const chatList = document.getElementById('chat-list');
        if (chatList?.contains(event.target as Node)) {
          const selection = window.getSelection()?.toString();
          if (selection?.length === 0 && !hasSelectedTextInChat.current) {
            textAreaRef.current?.textarea.focus();
          }
        }
      };

      /**
       * Workaround for Firefox. `Selection.toString()` always returns empty string.
       */
      const handleSelectionChange = () => {
        const selection = window.getSelection();
        const chatList = document.getElementById('chat-list');
        hasSelectedTextInChat.current = (
          (selection?.focusOffset ?? 0) > 0
          && Boolean(chatList?.contains(selection?.anchorNode as Node))
        );
      };

      document.addEventListener('click', handleClick);
      document.addEventListener('selectionchange', handleSelectionChange);

      return () => {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('selectionchange', handleSelectionChange);
      };
    }, []);

    useEffect(() => {
      if (chatSendMessageError && error == null) {
        logger.debug('Error on sending chat message: ', chatSendMessageError?.message);
        setError(intl.formatMessage(messages.errorOnSendMessage));
      }
    }, [chatSendMessageError]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const button = emojiPickerButtonRef.current;
        if (
          (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node))
          && (button && !button.contains(event.target as Node))
        ) {
          setShowEmojiPicker(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    const skyroomComposer = isSkyroomColumnLayout();

    const messageInputProps = {
      id: 'message-input',
      ref: textAreaRef,
      dir: inputDir,
      placeholder: intl.formatMessage(messages.inputPlaceholder, { chatName: title }),
      'aria-label': intl.formatMessage(messages.inputLabel, { chatName: title }),
      'aria-invalid': hasErrors ? 'true' as const : 'false' as const,
      autoCorrect: 'off' as const,
      autoComplete: 'off' as const,
      spellCheck: true,
      disabled: disabled || partnerIsLoggedOut,
      value: message,
      onFocus: () => {
        window.dispatchEvent(new CustomEvent(PluginSdk.ChatFormUiDataNames.CHAT_INPUT_IS_FOCUSED, {
          detail: { value: true },
        }));
        setIsTextAreaFocused(true);
      },
      onBlur: () => {
        window.dispatchEvent(new CustomEvent(PluginSdk.ChatFormUiDataNames.CHAT_INPUT_IS_FOCUSED, {
          detail: { value: false },
        }));
      },
      onChange: handleMessageChange,
      onKeyDown: handleMessageKeyDown,
      onPaste: (e: React.ClipboardEvent) => { e.stopPropagation(); },
      onCut: (e: React.ClipboardEvent) => { e.stopPropagation(); },
      onCopy: (e: React.ClipboardEvent) => { e.stopPropagation(); },
      async: true,
    };

    const emojiPickerNode = showEmojiPicker ? (
      <Styled.EmojiPickerWrapper ref={emojiPickerRef}>
        <Styled.EmojiPicker
          onEmojiSelect={(emojiObject: { native: string }) => handleEmojiSelect(emojiObject)}
          showPreview={false}
          showSkinTones={false}
        />
      </Styled.EmojiPickerWrapper>
    ) : null;

    const emojiButtonNode = ENABLE_EMOJI_PICKER ? (
      <div ref={emojiPickerButtonRef}>
        {skyroomComposer ? (
          <SkyroomComposer.EmojiButton
            onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }}
            icon="happy"
            color="light"
            ghost
            type="button"
            size="sm"
            hideLabel
            label={intl.formatMessage(messages.emojiButtonLabel)}
            data-test="emojiPickerButton"
            disabled={disabled || partnerIsLoggedOut || chatSendMessageLoading}
          />
        ) : (
          <Styled.EmojiButton
            onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }}
            icon="happy"
            color="light"
            ghost
            type="button"
            circle
            hideLabel
            label={intl.formatMessage(messages.emojiButtonLabel)}
            data-test="emojiPickerButton"
            disabled={disabled || partnerIsLoggedOut || chatSendMessageLoading}
          />
        )}
      </div>
    ) : null;

    // Skyroom sticker quick-pick — popular emoji inserted via the same path as the
    // emoji picker (handleEmojiSelect). Skyroom composer only.
    const stickerPickerNode = (skyroomComposer && showStickerPicker) ? (
      <SkyroomStickerPanel
        onSelect={(native: string) => handleEmojiSelect({ native })}
        onClose={() => setShowStickerPicker(false)}
        triggerRef={stickerButtonRef}
      />
    ) : null;

    const stickerButtonNode = skyroomComposer ? (
      <SkyroomStickerStyled.StickerButton
        ref={stickerButtonRef}
        type="button"
        aria-label={intl.formatMessage(messages.emojiButtonLabel)}
        data-test="stickerPickerButton"
        disabled={disabled || partnerIsLoggedOut || chatSendMessageLoading}
        onClick={() => { setShowStickerPicker((v) => !v); setShowEmojiPicker(false); }}
      >
        😊
      </SkyroomStickerStyled.StickerButton>
    ) : null;

    const sendButtonNode = skyroomComposer ? (
      <SkyroomComposer.SendButton
        hideLabel
        size="sm"
        aria-label={intl.formatMessage(messages.submitLabel)}
        type="submit"
        disabled={disabled || partnerIsLoggedOut || chatSendMessageLoading}
        label={intl.formatMessage(messages.submitLabel)}
        color="primary"
        icon="send"
        onClick={() => { }}
        data-test="sendMessageButton"
      />
    ) : (
      <Styled.SendButton
        hideLabel
        circle
        aria-label={intl.formatMessage(messages.submitLabel)}
        type="submit"
        disabled={disabled || partnerIsLoggedOut || chatSendMessageLoading}
        label={intl.formatMessage(messages.submitLabel)}
        color="primary"
        icon="send"
        onClick={() => { }}
        data-test="sendMessageButton"
      />
    );

    if (skyroomComposer) {
      return (
        <SkyroomComposer.Form
          ref={formRef}
          onSubmit={handleSubmit}
          data-skyroom-composer="true"
        >
          {emojiPickerNode}
          {stickerPickerNode}
          <SkyroomComposer.Row data-test="skyroomChatComposer">
            <SkyroomComposer.InputWrapper>
              <SkyroomComposer.Textarea
                id={messageInputProps.id}
                ref={messageInputProps.ref}
                dir={messageInputProps.dir}
                placeholder={messageInputProps.placeholder}
                aria-label={messageInputProps['aria-label']}
                aria-invalid={messageInputProps['aria-invalid']}
                autoCorrect={messageInputProps.autoCorrect}
                autoComplete={messageInputProps.autoComplete}
                spellCheck={messageInputProps.spellCheck}
                disabled={messageInputProps.disabled}
                value={messageInputProps.value}
                onFocus={messageInputProps.onFocus}
                onBlur={messageInputProps.onBlur}
                onChange={messageInputProps.onChange}
                onKeyDown={messageInputProps.onKeyDown}
                onPaste={messageInputProps.onPaste}
                onCut={messageInputProps.onCut}
                onCopy={messageInputProps.onCopy}
                async={messageInputProps.async}
              />
              {stickerButtonNode}
              {emojiButtonNode}
            </SkyroomComposer.InputWrapper>
            {sendButtonNode}
          </SkyroomComposer.Row>
          {error ? (
            <SkyroomComposer.ErrorText data-test="errorTypingIndicator">
              {error}
            </SkyroomComposer.ErrorText>
          ) : null}
        </SkyroomComposer.Form>
      );
    }

    return (
      <Styled.Form
        ref={formRef}
        onSubmit={handleSubmit}
        isRTL={isRTL}
      >
        {emojiPickerNode}
        <Styled.Wrapper>
          <Styled.InputWrapper>
            <Styled.Input
              id={messageInputProps.id}
              ref={messageInputProps.ref}
              dir={messageInputProps.dir}
              placeholder={messageInputProps.placeholder}
              aria-label={messageInputProps['aria-label']}
              aria-invalid={messageInputProps['aria-invalid']}
              autoCorrect={messageInputProps.autoCorrect}
              autoComplete={messageInputProps.autoComplete}
              spellCheck={messageInputProps.spellCheck}
              disabled={messageInputProps.disabled}
              value={messageInputProps.value}
              onFocus={messageInputProps.onFocus}
              onBlur={messageInputProps.onBlur}
              onChange={messageInputProps.onChange}
              onKeyDown={messageInputProps.onKeyDown}
              onPaste={messageInputProps.onPaste}
              onCut={messageInputProps.onCut}
              onCopy={messageInputProps.onCopy}
              async={messageInputProps.async}
            />
            {emojiButtonNode}
          </Styled.InputWrapper>
          <div style={{ zIndex: 10 }}>
            {sendButtonNode}
          </div>
        </Styled.Wrapper>
        {error ? (
          <Styled.ChatMessageError data-test="errorTypingIndicator">
            {error}
          </Styled.ChatMessageError>
        ) : null}
      </Styled.Form>
    );
  };

  return renderForm();
};

const ChatMessageFormContainer: React.FC = () => {
  const intl = useIntl();
  const idChatOpen: string = layoutSelect((i: Layout) => i.idChatOpen);
  const isRTL = layoutSelect((i: Layout) => i.isRTL);
  const isConnected = useReactiveVar(connectionStatus.getConnectedStatusVar());
  const { data: chat } = useChat((c: Partial<Chat>) => ({
    participant: c?.participant,
    chatId: c?.chatId,
    public: c?.public,
  }), idChatOpen) as GraphqlDataHookSubscriptionResponse<Partial<Chat>>;

  const { data: currentUser } = useCurrentUser((c) => ({
    isModerator: c?.isModerator,
    userLockSettings: c?.userLockSettings,
    locked: c?.locked,
  }));

  const title = chat?.participant?.name
    ? intl.formatMessage(messages.titlePrivate, { participantName: chat?.participant?.name })
    : intl.formatMessage(messages.titlePublic);

  const { data: meeting } = useMeeting((m) => ({
    lockSettings: m?.lockSettings,
  }));

  const isModerator = currentUser?.isModerator;
  const isPublicChat = chat?.public;
  const isLocked = currentUser?.locked || currentUser?.userLockSettings?.disablePublicChat;
  const disablePublicChat = meeting?.lockSettings?.disablePublicChat
    || currentUser?.userLockSettings?.disablePublicChat;
  const disablePrivateChat = meeting?.lockSettings?.disablePrivateChat;

  let locked = false;

  if (!isModerator) {
    if (isPublicChat) {
      locked = (isLocked && disablePublicChat) || false;
    } else {
      locked = (isLocked && disablePrivateChat && !chat?.participant?.isModerator) || false;
    }
  }

  const userLastSentMessageQuery = chat?.public
    ? USER_LAST_SENT_PUBLIC_CHAT_MESSAGE_QUERY
    : USER_LAST_SENT_PRIVATE_CHAT_MESSAGE_QUERY;

  const [loadUserLastSentMessage] = useLazyQuery<LastSentMessageResponse>(
    userLastSentMessageQuery,
    {
      variables: chat?.public ? {
        userId: Auth.userID,
      } : {
        userId: Auth.userID,
        requestedChatId: idChatOpen,
      },
      fetchPolicy: 'no-cache',
    },
  );

  const getUserLastSentMessage = useCallback(
    async () => {
      const { data } = await loadUserLastSentMessage();
      if (data) {
        if ('chat_message_public' in data) {
          return data.chat_message_public[0] ?? null;
        }
        return data.chat_message_private[0] ?? null;
      }
      return null;
    },
    [loadUserLastSentMessage],
  );

  if (chat?.participant && !chat.participant.currentlyInMeeting) {
    return <ChatOfflineIndicator participantName={chat.participant.name} />;
  }

  const CHAT_CONFIG = window.meetingClientSettings.public.chat;

  const disabled = locked && !isModerator && disablePrivateChat && !isPublicChat && !chat?.participant?.isModerator;

  return (
    <ChatMessageForm
      {...{
        minMessageLength: CHAT_CONFIG.min_message_length,
        maxMessageLength: CHAT_CONFIG.max_message_length,
        idChatOpen,
        chatId: idChatOpen,
        connected: true, // TODO: monitoring network status
        disabled: ((isPublicChat ? locked : disabled) || !isConnected) ?? false,
        title,
        isRTL,
        // if participant is not defined, it means that the chat is public
        partnerIsLoggedOut: chat?.participant ? !chat?.participant?.currentlyInMeeting : false,
        locked: locked ?? false,
        getUserLastSentMessage,
      }}
    />
  );
};

export default ChatMessageFormContainer;
